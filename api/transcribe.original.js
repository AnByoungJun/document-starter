import Groq, { toFile } from 'groq-sdk';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const config = {
  api: { bodyParser: false },
};

// ffprobe로 파일 내 creation_time 추출
function getCreationTime(inputPath) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return resolve(null);
      const ct = metadata?.format?.tags?.creation_time;
      resolve(ct || null);
    });
  });
}

// ffmpeg으로 오디오를 분할 (초 단위)
function splitAudio(inputPath, outputDir, segmentSeconds) {
  return new Promise((resolve, reject) => {
    const outputPattern = path.join(outputDir, 'chunk_%03d.mp3');
    ffmpeg(inputPath)
      .outputOptions([
        `-f segment`,
        `-segment_time ${segmentSeconds}`,
        `-c:a libmp3lame`,
        `-q:a 5`,
        `-ar 16000`,
        `-ac 1`,
      ])
      .output(outputPattern)
      .on('end', () => {
        const files = fs.readdirSync(outputDir)
          .filter((f) => f.startsWith('chunk_'))
          .sort()
          .map((f) => path.join(outputDir, f));
        resolve(files);
      })
      .on('error', reject)
      .run();
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({ maxFileSize: 200 * 1024 * 1024 }); // 200MB

  let files;
  try {
    [, files] = await form.parse(req);
  } catch (err) {
    return res.status(400).json({ error: '파일 업로드 실패: ' + err.message });
  }

  const audioFile = files.audio?.[0];
  if (!audioFile) {
    return res.status(400).json({ error: '음성 파일이 없습니다.' });
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transcribe-'));

  try {
    // 파일 메타데이터에서 녹음 시작 시각 추출
    const creationTime = await getCreationTime(audioFile.filepath);
    console.log('[Transcribe] 파일명:', audioFile.originalFilename);
    console.log('[Transcribe] creation_time:', creationTime || '없음 (lastModified 폴백 사용)');

    // ffmpeg으로 20분(1200초) 단위 분할 → mp3로 변환
    const chunkPaths = await splitAudio(audioFile.filepath, tmpDir, 1200);

    let fullText = '';
    for (const chunkPath of chunkPaths) {
      const buffer = fs.readFileSync(chunkPath);
      const file = await toFile(buffer, path.basename(chunkPath), { type: 'audio/mpeg' });
      const result = await groq.audio.transcriptions.create({
        file,
        model: 'whisper-large-v3-turbo',
        language: 'ko',
        response_format: 'text',
      });
      fullText += (fullText ? ' ' : '') + result;
    }

    res.status(200).json({ text: fullText, creationTime });
  } catch (err) {
    console.error('Transcription error:', err);
    const msg = err?.error?.error?.message || err.message || '음성 변환 중 오류가 발생했습니다.';
    res.status(500).json({ error: msg });
  } finally {
    // 임시 파일 정리
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    try { fs.unlinkSync(audioFile.filepath); } catch {}
  }
}

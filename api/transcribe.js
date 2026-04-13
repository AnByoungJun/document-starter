import Groq, { toFile } from 'groq-sdk';
import { del } from '@vercel/blob';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { blobUrl, filename } = req.body ?? {};
  if (!blobUrl) {
    return res.status(400).json({ error: 'blobUrl이 필요합니다.' });
  }

  try {
    // Blob에서 파일 다운로드
    const response = await fetch(blobUrl);
    if (!response.ok) throw new Error('Blob 파일 다운로드 실패');
    const buffer = Buffer.from(await response.arrayBuffer());

    const ext = (filename || 'audio.mp3').split('.').pop().toLowerCase();
    const mimeMap = {
      mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4',
      wav: 'audio/wav', webm: 'audio/webm', ogg: 'audio/ogg',
    };
    const mime = mimeMap[ext] || 'audio/mpeg';
    const file = await toFile(buffer, filename || `audio.${ext}`, { type: mime });

    const result = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      language: 'ko',
      response_format: 'text',
    });

    res.status(200).json({ text: result, creationTime: null });
  } catch (err) {
    console.error('Transcription error:', err);
    const msg = err?.error?.error?.message || err.message || '음성 변환 중 오류가 발생했습니다.';
    res.status(500).json({ error: msg });
  } finally {
    // 처리 완료 후 Blob 파일 삭제
    try { await del(blobUrl); } catch {}
  }
}

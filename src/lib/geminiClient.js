import { buildPrompt, SYSTEM_PROMPT } from './prompts';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Gemini API 키로 직접 스트리밍 호출
// onText(chunk): 텍스트 청크가 도착할 때마다 호출
// signal: AbortController.signal
export async function streamGemini({ documentType, fields, apiKey, model, signal, onText }) {
  if (!buildPrompt[documentType]) {
    throw new Error('지원하지 않는 문서 종류입니다.');
  }
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.');
  }

  const prompt = buildPrompt[documentType](fields);
  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.7,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let errMsg = `Gemini API 오류 (${res.status})`;
    try {
      const data = await res.json();
      errMsg = data?.error?.message || errMsg;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed?.error) throw new Error(parsed.error.message || 'Gemini API 오류');
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) onText(text);
      } catch (err) {
        if (err.name !== 'SyntaxError') throw err;
      }
    }
  }
}

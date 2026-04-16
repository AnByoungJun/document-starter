import { useState, useCallback, useRef } from 'react';
import { streamGemini } from '../lib/geminiClient';

export function useDocumentGenerator() {
  const [output, setOutputState] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generationMs, setGenerationMs] = useState(null);
  const startTimeRef = useRef(null);
  const abortControllerRef = useRef(null);

  const generate = useCallback(async (documentType, fields, options = {}) => {
    const { aiProvider = 'groq', geminiKey = '', geminiModel = 'gemini-2.5-flash' } = options;

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setOutputState('');
    setError(null);
    setIsLoading(true);
    setGenerationMs(null);
    startTimeRef.current = Date.now();

    // Gemini 분기: 사용자 키로 브라우저에서 직접 호출
    if (aiProvider === 'gemini' && geminiKey) {
      try {
        await streamGemini({
          documentType,
          fields,
          apiKey: geminiKey,
          model: geminiModel,
          signal: abortControllerRef.current.signal,
          onText: (text) => setOutputState((prev) => prev + text),
        });
        setGenerationMs(Date.now() - startTimeRef.current);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Gemini 호출 중 오류가 발생했습니다.');
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType, fields, aiProvider }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `서버 오류 (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 마지막 불완전한 라인은 버퍼에 유지

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            setGenerationMs(Date.now() - startTimeRef.current);
            break;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) setOutputState((prev) => prev + parsed.text);
          } catch (parseErr) {
            if (parseErr.message !== 'Unexpected end of JSON input') {
              throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setOutputState('');
    setError(null);
    setGenerationMs(null);
    setIsLoading(false);
  }, []);

  const setOutput = useCallback((text, ms) => {
    setOutputState(text);
    setGenerationMs(ms ?? null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { output, isLoading, error, generationMs, generate, reset, setOutput };
}

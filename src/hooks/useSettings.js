import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEYS = {
  provider: 'doc-starter:provider',
  geminiKey: 'doc-starter:gemini-key',
  geminiModel: 'doc-starter:gemini-model',
};

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

function readStorage(key, fallback = '') {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function useSettings() {
  const [provider, setProviderState] = useState('groq');
  const [geminiKey, setGeminiKeyState] = useState('');
  const [geminiModel, setGeminiModelState] = useState(DEFAULT_GEMINI_MODEL);

  useEffect(() => {
    setProviderState(readStorage(STORAGE_KEYS.provider, 'groq'));
    setGeminiKeyState(readStorage(STORAGE_KEYS.geminiKey, ''));
    setGeminiModelState(readStorage(STORAGE_KEYS.geminiModel, DEFAULT_GEMINI_MODEL));
  }, []);

  const setProvider = useCallback((next) => {
    setProviderState(next);
    try { localStorage.setItem(STORAGE_KEYS.provider, next); } catch { /* ignore */ }
  }, []);

  const setGeminiKey = useCallback((next) => {
    const trimmed = (next || '').trim();
    setGeminiKeyState(trimmed);
    try {
      if (trimmed) localStorage.setItem(STORAGE_KEYS.geminiKey, trimmed);
      else localStorage.removeItem(STORAGE_KEYS.geminiKey);
    } catch { /* ignore */ }
  }, []);

  const setGeminiModel = useCallback((next) => {
    setGeminiModelState(next);
    try { localStorage.setItem(STORAGE_KEYS.geminiModel, next); } catch { /* ignore */ }
  }, []);

  // 실제 사용할 provider 결정 (Gemini 선택했지만 키 없으면 groq로 폴백)
  const effectiveProvider = provider === 'gemini' && geminiKey ? 'gemini' : 'groq';

  return {
    provider,
    setProvider,
    geminiKey,
    setGeminiKey,
    geminiModel,
    setGeminiModel,
    effectiveProvider,
  };
}

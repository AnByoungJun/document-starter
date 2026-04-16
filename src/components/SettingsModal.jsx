import { useState, useEffect } from 'react';

export default function SettingsModal({
  isOpen,
  onClose,
  provider,
  setProvider,
  geminiKey,
  setGeminiKey,
  geminiModel,
  setGeminiModel,
}) {
  const [localKey, setLocalKey] = useState(geminiKey);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | 'success' | 'error'
  const [testMsg, setTestMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalKey(geminiKey);
      setTestResult(null);
      setTestMsg('');
    }
  }, [isOpen, geminiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    setGeminiKey(localKey);
    onClose();
  };

  const handleClear = () => {
    setLocalKey('');
    setGeminiKey('');
    setTestResult(null);
    setTestMsg('');
  };

  const handleTest = async () => {
    if (!localKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    setTestMsg('');
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(localKey.trim())}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setTestResult('success');
        setTestMsg('정상 동작합니다.');
      } else {
        setTestResult('error');
        setTestMsg(data?.error?.message || `오류 (${res.status})`);
      }
    } catch (err) {
      setTestResult('error');
      setTestMsg(err.message || '네트워크 오류');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">AI 모델 설정</p>
              <p className="text-xs text-gray-400 mt-0.5">사용할 AI 제공사를 선택하세요</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* Provider 선택 */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">AI 제공사</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setProvider('groq')}
                className={`px-3 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  provider === 'groq'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">Groq (기본)</div>
                <div className="text-xs text-gray-400 mt-0.5">서버 제공 · 무료</div>
              </button>
              <button
                onClick={() => setProvider('gemini')}
                className={`px-3 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  provider === 'gemini'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">Gemini</div>
                <div className="text-xs text-gray-400 mt-0.5">개인 키 사용</div>
              </button>
            </div>
          </div>

          {/* Gemini 설정 */}
          {provider === 'gemini' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Gemini API 키 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={localKey}
                    onChange={(e) => { setLocalKey(e.target.value); setTestResult(null); }}
                    placeholder="AIzaSy..."
                    className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded"
                  >
                    {showKey ? '🙈' : '👁'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  키는 브라우저에만 저장되며 서버로 전송되지 않습니다.{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline"
                  >
                    키 발급
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">사용 모델</label>
                <select
                  value={geminiModel}
                  onChange={(e) => { setGeminiModel(e.target.value); setTestResult(null); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (추천)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                  <option value="gemini-flash-latest">gemini-flash-latest</option>
                  <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                </select>
              </div>

              {/* 키 테스트 */}
              <div className="flex gap-2">
                <button
                  onClick={handleTest}
                  disabled={!localKey.trim() || testing}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  {testing ? '테스트 중...' : '🔍 키 테스트'}
                </button>
                {localKey && (
                  <button
                    onClick={handleClear}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    🗑️ 키 삭제
                  </button>
                )}
              </div>

              {testResult && (
                <div className={`px-3 py-2 rounded-lg text-sm ${
                  testResult === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  {testResult === 'success' ? '✓ ' : '⚠️ '}{testMsg}
                </div>
              )}

              {/* 안내 */}
              <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
                💡 Gemini API는 사용량에 따라 과금됩니다. 본인의 Google Cloud 결제 계정으로 청구됩니다.
              </div>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

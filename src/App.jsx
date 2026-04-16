import { useState, useCallback, useEffect, useRef } from 'react';
import DocumentTypeSelector from './components/DocumentTypeSelector';
import FormRenderer from './components/FormRenderer';
import DocumentOutput from './components/DocumentOutput';
import WeeklyItemsBoard from './components/WeeklyItemsBoard';
import SettingsModal from './components/SettingsModal';
import { useDocumentGenerator } from './hooks/useDocumentGenerator';
import { useSettings } from './hooks/useSettings';

export default function App() {
  const [selectedType, setSelectedType] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const {
    provider: aiProvider,
    setProvider: setAiProvider,
    geminiKey,
    setGeminiKey,
    geminiModel,
    setGeminiModel,
    effectiveProvider,
  } = useSettings();
  // 문서 타입별 결과물 및 폼값 저장
  const [savedOutputs, setSavedOutputs] = useState({});
  const [savedForms, setSavedForms] = useState({});
  const { output, isLoading, error, generationMs, generate, reset, setOutput } = useDocumentGenerator();
  const outputRef = useRef(null);

  // Gemini 선택했는데 키가 없으면 자동으로 설정 모달 오픈
  const handleAiProviderChange = useCallback((next) => {
    setAiProvider(next);
    if (next === 'gemini' && !geminiKey) {
      setIsSettingsOpen(true);
    }
  }, [setAiProvider, geminiKey]);

  // 생성 시작 시 문서 출력 영역으로 자동 스크롤
  useEffect(() => {
    if (isLoading && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isLoading]);

  const handleTypeSelect = useCallback((type) => {
    // 현재 결과물 및 폼값 저장
    if (selectedType) {
      if (output) {
        setSavedOutputs((prev) => ({ ...prev, [selectedType.id]: { output, generationMs } }));
      }
      setSavedForms((prev) => ({ ...prev, [selectedType.id]: formValues }));
    }
    setSelectedType(type);
    // 이전에 저장된 폼값 복원
    setFormValues(savedForms[type.id] || {});
    // 이전에 저장된 결과물이 있으면 복원, 없으면 초기화
    const saved = savedOutputs[type.id];
    if (saved) {
      setOutput(saved.output, saved.generationMs);
    } else {
      reset();
    }
  }, [selectedType, output, generationMs, formValues, savedOutputs, savedForms, reset, setOutput]);

  const handleFieldChange = useCallback((fieldId, value, autoSubmit = false) => {
    setFormValues((prev) => {
      const next = { ...prev, [fieldId]: value };
      if (autoSubmit && selectedType) {
        setTimeout(() => generate(selectedType.id, next, { aiProvider: effectiveProvider, geminiKey, geminiModel }), 0);
      }
      return next;
    });
  }, [selectedType, generate, effectiveProvider, geminiKey, geminiModel]);

  const handleBatchChange = useCallback((updates) => {
    setFormValues((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleGenerate = useCallback((overrideValues) => {
    if (!selectedType) return;
    generate(selectedType.id, overrideValues ?? formValues, { aiProvider: effectiveProvider, geminiKey, geminiModel });
  }, [selectedType, formValues, generate, effectiveProvider, geminiKey, geminiModel]);

  const handleReset = useCallback(() => {
    if (selectedType) {
      setSavedOutputs((prev) => { const n = { ...prev }; delete n[selectedType.id]; return n; });
      setSavedForms((prev) => { const n = { ...prev }; delete n[selectedType.id]; return n; });
    }
    setFormValues({});
    reset();
  }, [selectedType, reset]);

  const handleOutputReset = useCallback(() => {
    if (selectedType) {
      setSavedOutputs((prev) => { const n = { ...prev }; delete n[selectedType.id]; return n; });
    }
    reset();
  }, [selectedType, reset]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
            문
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">문서 스타터</h1>
            <p className="text-xs text-gray-500">Claude AI 업무 문서 자동 작성</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {aiProvider === 'gemini' && !geminiKey && (
              <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-md border border-amber-200">
                Gemini 키 미설정 (Groq로 폴백)
              </span>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="AI 모델 설정"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
        {/* 전역 로딩바 — isLoading 동안 항상 헤더 하단에 표시 */}
        {isLoading && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400"
              style={{
                width: '40%',
                animation: 'loadingBar 1.4s ease-in-out infinite',
              }}
            />
          </div>
        )}
      </header>
      <style>{`
        @keyframes loadingBar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>

      {/* 메인 */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* 문서 타입 선택 */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <DocumentTypeSelector selected={selectedType} onSelect={handleTypeSelect} />
        </section>

        {/* 특수 타입: 주간현황판 */}
        {selectedType?.special === 'weekly' && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-fade-in">
            <WeeklyItemsBoard key={selectedType.id} />
          </section>
        )}


        {/* 폼 입력 */}
        {selectedType && !selectedType.special && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-fade-in">
            <FormRenderer
              key={selectedType.id}
              docType={selectedType}
              values={formValues}
              onChange={handleFieldChange}
              onBatchChange={handleBatchChange}
              onSubmit={handleGenerate}
              isLoading={isLoading}
              output={output}
              aiProvider={aiProvider}
              onAiProviderChange={handleAiProviderChange}
              onScrollToOutput={() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              onReset={handleOutputReset}
              onRestoreOutput={setOutput}
              generationMs={generationMs}
            />
          </section>
        )}

        {/* 문서 출력 */}
        {!selectedType?.special && (isLoading || output || error) && (
          <section ref={outputRef} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <DocumentOutput
              output={output}
              isLoading={isLoading}
              error={error}
              generationMs={generationMs}
              documentType={selectedType?.id}
              aiProvider={aiProvider}
              onRegenerate={handleGenerate}
              onReset={handleReset}
            />
          </section>
        )}
      </main>

      {/* 푸터 */}
      <footer className="text-center py-8 text-xs text-gray-400">
        문서 스타터 — Claude AI로 구동됩니다
      </footer>

      {/* 설정 모달 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        provider={aiProvider}
        setProvider={setAiProvider}
        geminiKey={geminiKey}
        setGeminiKey={setGeminiKey}
        geminiModel={geminiModel}
        setGeminiModel={setGeminiModel}
      />
    </div>
  );
}

import { useRef, useState, useEffect } from 'react';
import { upload } from '@vercel/blob/client';
import { COLOR_CLASSES } from '../config/documentTypes';
import MondayWeeklyImport from './MondayWeeklyImport';

function formatKoreanDatetime(ts) {
  const d = new Date(ts);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const weekday = weekdays[d.getDay()];
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours < 12 ? '오전' : '오후';
  const h = hours % 12 || 12;
  const m = minutes > 0 ? ` ${String(minutes).padStart(2, '0')}분` : '';
  return `${year}년 ${month}월 ${date}일 (${weekday}) ${ampm} ${h}시${m}`;
}

function AudioUploader({ onTranscribed, isLoading, onScrollToOutput, output }) {
  const [status, setStatus] = useState('idle'); // idle | blobUploading | transcribing | done | error
  const prevIsLoading = useRef(false);

  // 생성 완료(isLoading true→false) 시 자동 스크롤
  useEffect(() => {
    if (prevIsLoading.current && !isLoading && status === 'done') {
      setTimeout(() => onScrollToOutput?.(), 80);
    }
    prevIsLoading.current = isLoading;
  }, [isLoading, status, onScrollToOutput]);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [estimatedDatetime, setEstimatedDatetime] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setErrorMsg('');

    try {
      // 1단계: Blob 업로드
      setStatus('blobUploading');
      let blob;
      try {
        blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/blob-upload',
        });
      } catch (uploadErr) {
        throw new Error(`파일 업로드 실패: ${uploadErr.message}`);
      }

      // 2단계: Whisper 변환
      setStatus('transcribing');
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blobUrl: blob.url, filename: file.name }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(text); }
      if (!res.ok) throw new Error(data.error);

      const ts = file.lastModified;
      const datetime = formatKoreanDatetime(ts);
      setEstimatedDatetime(datetime);
      onTranscribed(data.text, datetime);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || '변환 실패. 파일 형식 및 크기를 확인해 주세요.');
      console.error(err);
    }
  };

  const isBusy = status === 'blobUploading' || status === 'transcribing';

  // 단계 정의
  const steps = [
    {
      key: 'upload',
      label: '파일 업로드',
      active: status === 'blobUploading',
      done: ['transcribing', 'done'].includes(status),
    },
    {
      key: 'transcribe',
      label: '음성 → 텍스트 변환 (Whisper AI)',
      active: status === 'transcribing',
      done: status === 'done',
    },
    {
      key: 'generate',
      label: 'AI 회의록 작성',
      active: isLoading && status === 'done',
      done: !isLoading && status === 'done',
    },
  ];

  return (
    <div className="mb-4 space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/mp4,video/webm"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* idle: 드롭존 스타일 업로드 영역 */}
      {status === 'idle' && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-teal-300 rounded-xl bg-teal-50 hover:bg-teal-100 hover:border-teal-400 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3 3m3-3l3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.344 11.095" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-teal-700">음성 파일을 업로드하세요</p>
            <p className="text-xs text-teal-500 mt-1">mp3, mp4, wav, m4a, webm · 최대 200MB</p>
          </div>
        </button>
      )}

      {/* 처리 중 / 완료 */}
      {status !== 'idle' && status !== 'error' && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-3">
          {/* 파일명 + 다시 선택 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-teal-600">🎙️</span>
              <span className="text-sm font-semibold text-teal-800 truncate max-w-[200px]">{fileName}</span>
            </div>
            {!isBusy && (
              <button
                type="button"
                onClick={() => { setStatus('idle'); inputRef.current?.click(); }}
                className="text-xs text-teal-600 hover:text-teal-800 underline shrink-0"
              >
                다시 선택
              </button>
            )}
          </div>

          {/* 진행 단계 */}
          <div className="space-y-2 pt-1">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center gap-2.5">
                {step.done ? (
                  <span className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                ) : step.active ? (
                  <svg className="w-5 h-5 text-teal-500 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0 flex items-center justify-center">
                    <span className="text-xs text-gray-400 font-bold">{i + 1}</span>
                  </span>
                )}
                <span className={`text-xs font-medium ${
                  step.done ? 'text-teal-700' :
                  step.active ? 'text-teal-600' :
                  'text-gray-400'
                }`}>
                  {step.label}
                  {step.active && <span className="ml-1 animate-pulse">...</span>}
                </span>
              </div>
            ))}

            {/* AI 생성 중 로딩바 */}
            {status === 'done' && isLoading && (
              <div className="mt-2 rounded-lg overflow-hidden border border-teal-200 bg-teal-50">
                <div className="flex items-center gap-2 px-3 py-2">
                  <svg className="w-3.5 h-3.5 text-teal-500 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="text-xs font-medium text-teal-700">AI가 회의록을 작성하고 있습니다...</span>
                </div>
                <div className="h-1 bg-teal-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-300 via-teal-500 to-teal-300"
                    style={{ width: '40%', animation: 'loadingBar 1.4s ease-in-out infinite' }}
                  />
                </div>
              </div>
            )}

            {/* 완료 배너 */}
            {status === 'done' && !isLoading && output && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-teal-500 rounded-lg">
                <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-semibold text-white">회의록 작성 완료 — 아래에서 확인하세요</span>
              </div>
            )}

            {estimatedDatetime && status === 'done' && !isLoading && (
              <p className="text-xs text-teal-500 pl-1 mt-1">회의 일시 추정: {estimatedDatetime}</p>
            )}
          </div>
        </div>
      )}

      {/* 에러 */}
      {status === 'error' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
          <p className="text-sm text-red-600">{errorMsg || '변환 실패. 파일 형식 및 크기를 확인해 주세요.'}</p>
          <button
            type="button"
            onClick={() => { setStatus('idle'); setErrorMsg(''); }}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}

export default function FormRenderer({ docType, values, onChange, onBatchChange, onSubmit, isLoading, output, aiProvider, onAiProviderChange, onScrollToOutput, onReset, onRestoreOutput, generationMs }) {
  const [audioMode, setAudioMode] = useState(false);
  const [activeInputMode, setActiveInputMode] = useState('audio'); // manual | audio
  const [manualValues, setManualValues] = useState({}); // 속성 정보 입력 탭 전용 독립 state
  const savedOutputs = useRef({ audio: null, manual: null }); // 탭별 output 저장
  const [mondayImported, setMondayImported] = useState(null); // imported weekly data
  if (!docType) return null;

  const colors = COLOR_CLASSES[docType.color];
  const isMeetingMinutes = docType.id === '회의록';

  // 회의록 수동 모드는 manualValues 기준으로 유효성 검사
  const activeValues = isMeetingMinutes && activeInputMode === 'manual' ? manualValues : values;
  const requiredFieldsValid = docType.fields.filter((f) => f.required).every((f) => activeValues[f.id]?.trim());
  const isValid = isMeetingMinutes
    ? activeInputMode === 'audio'
      ? audioMode
      : requiredFieldsValid
    : requiredFieldsValid;

  const handleTranscribed = (text, datetime) => {
    setAudioMode(true);
    if (datetime && !values.datetime) {
      onChange('datetime', datetime);
    }
    onChange('discussions', (values.discussions ? values.discussions + '\n\n' : '') + text, true);
  };

  const handleMondayImport = (result) => {
    setMondayImported(result);
    const { from, to } = result.weekRange;
    const fmt = (s) => {
      const [y, m, d] = s.split('-');
      return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
    };

    // Monday 실제 상태값 그대로 그룹핑
    const groups = {};

    for (const item of result.items) {
      const label = (item.status || '상태 없음').trim();
      if (!groups[label]) groups[label] = [];
      const lines = [`- ${item.name}${item.person ? ` (${item.person})` : ''}${item.date ? ` [${item.date}]` : ''}`];
      for (const u of item.updates || []) {
        if (u.body) lines.push(`    · ${u.creator ? `[${u.creator}] ` : ''}${u.body}`);
      }
      groups[label].push(lines.join('\n'));
    }

    const updates = { period: `${fmt(from)} ~ ${fmt(to)}` };

    const parts = [];
    for (const [label, items] of Object.entries(groups)) {
      parts.push(`[${label}]\n${items.join('\n')}`);
    }
    if (parts.length > 0) updates.inProgress = parts.join('\n\n');

    onBatchChange(updates);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isMeetingMinutes && activeInputMode === 'manual') {
      onSubmit(manualValues);
    } else {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {docType.label} 정보 입력
        </h2>
        {docType.id === '주간보고' && (
          <MondayWeeklyImport onImport={handleMondayImport} />
        )}
      </div>

      {docType.id === '회의록' && (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-1.5 flex gap-1">
          <button
            type="button"
            onClick={() => {
              if (activeInputMode !== 'audio') {
                savedOutputs.current.manual = output ? { output, generationMs } : null;
                setActiveInputMode('audio');
                const saved = savedOutputs.current.audio;
                if (saved) onRestoreOutput?.(saved.output, saved.generationMs);
                else onReset?.();
              }
            }}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              activeInputMode === 'audio'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-transparent text-gray-600 hover:bg-white'
            }`}
          >
            음성 파일
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeInputMode !== 'manual') {
                savedOutputs.current.audio = output ? { output, generationMs } : null;
                setActiveInputMode('manual');
                const saved = savedOutputs.current.manual;
                if (saved) onRestoreOutput?.(saved.output, saved.generationMs);
                else onReset?.();
              }
            }}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
              activeInputMode === 'manual'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-transparent text-gray-600 hover:bg-white'
            }`}
          >
            직접 입력
          </button>
        </div>
      )}

      {docType.id === '회의록' && activeInputMode === 'audio' && (
        <AudioUploader onTranscribed={handleTranscribed} isLoading={isLoading} onScrollToOutput={onScrollToOutput} output={output} />
      )}

      {/* Monday에서 불러온 이번 주 아이템 미리보기 */}
      {mondayImported && mondayImported.items.length > 0 && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700">
              Monday 보드에서 불러온 아이템 ({mondayImported.items.length}개)
            </span>
            <button
              type="button"
              onClick={() => setMondayImported(null)}
              className="text-xs text-purple-400 hover:text-purple-600"
            >
              닫기
            </button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {mondayImported.items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs text-purple-800">
                <span className="font-medium truncate flex-1">{item.name}</span>
                {item.person && <span className="text-purple-500 shrink-0">{item.person}</span>}
                {item.status && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 shrink-0">
                    {item.status}
                  </span>
                )}
                {item.updates?.length > 0 && (
                  <span className="text-purple-400 shrink-0">업데이트 {item.updates.length}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(docType.id !== '회의록' || activeInputMode === 'manual') && docType.fields.map((field) => {
          const isManualMode = isMeetingMinutes && activeInputMode === 'manual';
          const fieldValue = isManualMode ? (manualValues[field.id] || '') : (values[field.id] || '');
          const handleFieldChange = isManualMode
            ? (val) => setManualValues((prev) => ({ ...prev, [field.id]: val }))
            : (val) => onChange(field.id, val);
          // Monday에서 불러온 inProgress 필드는 실제 상태값으로 그룹핑해서 표시
          const isMondayInProgress = mondayImported && field.id === 'inProgress';
          const mondayGroups = isMondayInProgress
            ? mondayImported.items.reduce((acc, item) => {
                const label = (item.status || '상태 없음').trim();
                if (!acc[label]) acc[label] = [];
                acc[label].push(item);
                return acc;
              }, {})
            : null;
          const getStatusColor = (status) => {
            const s = (status || '').toLowerCase();
            if (/완료|done|complete|finished|closed/.test(s)) return { bg: 'bg-green-50', border: 'border-green-200', divider: 'divide-green-100', dot: 'bg-green-500', text: 'text-green-700', badge: 'bg-green-100 text-green-700' };
            if (/진행|progress|working|active/.test(s)) return { bg: 'bg-blue-50', border: 'border-blue-200', divider: 'divide-blue-100', dot: 'bg-blue-500', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' };
            if (/대기|wait|pending/.test(s)) return { bg: 'bg-yellow-50', border: 'border-yellow-200', divider: 'divide-yellow-100', dot: 'bg-yellow-500', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' };
            if (/이슈|issue|error|bug|문제/.test(s)) return { bg: 'bg-red-50', border: 'border-red-200', divider: 'divide-red-100', dot: 'bg-red-500', text: 'text-red-700', badge: 'bg-red-100 text-red-700' };
            if (/보류|blocked|suspend/.test(s)) return { bg: 'bg-orange-50', border: 'border-orange-200', divider: 'divide-orange-100', dot: 'bg-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' };
            return { bg: 'bg-gray-50', border: 'border-gray-200', divider: 'divide-gray-100', dot: 'bg-gray-400', text: 'text-gray-600', badge: 'bg-gray-100 text-gray-600' };
          };

          return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
              {isMondayInProgress && mondayGroups && Object.keys(mondayGroups).length > 0 && (
                <span className="ml-2 text-xs font-normal text-purple-500">
                  ({mondayImported.items.length}개)
                </span>
              )}
            </label>

            {isMondayInProgress && mondayGroups && Object.keys(mondayGroups).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(mondayGroups).map(([label, groupItems]) => {
                  const c = getStatusColor(label);
                  return (
                    <div key={label} className={`rounded-lg border ${c.border} overflow-hidden`}>
                      <div className={`px-3 py-2 ${c.bg} flex items-center gap-2 border-b ${c.border}`}>
                        <span className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                        <span className={`text-xs font-semibold ${c.text}`}>{label}</span>
                        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded ${c.badge}`}>{groupItems.length}개</span>
                      </div>
                      <div className={`divide-y ${c.divider}`}>
                        {groupItems.map((item) => (
                          <div key={item.id} className={`px-3 py-2.5 ${c.bg}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800 flex-1">{item.name}</span>
                              {item.person && <span className="text-xs text-gray-500 shrink-0">{item.person}</span>}
                              {item.date && <span className="text-xs text-gray-400 shrink-0">{item.date}</span>}
                            </div>
                            {item.updates?.length > 0 && (
                              <div className="mt-1.5 space-y-1">
                                {item.updates.map((u) => (
                                  <div key={u.createdAt} className="text-xs text-gray-600 leading-relaxed">
                                    <p className="whitespace-pre-wrap">{u.body}</p>
                                    {u.creator && <span className="font-medium text-gray-500">— {u.creator}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : field.type === 'textarea' ? (
              <textarea
                value={fieldValue}
                onChange={(e) => handleFieldChange(e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className={`
                  w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none
                  placeholder:text-gray-400 focus:outline-none focus:border-transparent
                  focus:ring-2 ${colors.ring} transition-shadow
                `}
              />
            ) : field.type === 'select' ? (
              <select
                value={fieldValue}
                onChange={(e) => handleFieldChange(e.target.value)}
                className={`
                  w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                  focus:outline-none focus:border-transparent focus:ring-2 ${colors.ring}
                  transition-shadow bg-white
                `}
              >
                <option value="">선택해주세요</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={fieldValue}
                onChange={(e) => handleFieldChange(e.target.value)}
                placeholder={field.placeholder}
                className={`
                  w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                  placeholder:text-gray-400 focus:outline-none focus:border-transparent
                  focus:ring-2 ${colors.ring} transition-shadow
                `}
              />
            )}
          </div>
          );
        })}
      </div>

      {/* AI 엔진 선택 */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 px-0.5">AI 엔진 선택</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              id: 'gemini',
              name: 'Gemini',
              sub: 'Google · 2.5 Flash',
              desc: '최신 구글 AI, 긴 문서에 강함',
              gradient: 'from-blue-500 to-cyan-400',
              icon: (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
                </svg>
              ),
            },
            {
              id: 'groq',
              name: 'GROQ',
              sub: 'Llama 3.3 · 70B',
              desc: '빠른 속도, 안정적인 생성',
              gradient: 'from-orange-500 to-pink-500',
              icon: (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              ),
            },
          ].map((model) => {
            const isSelected = aiProvider === model.id;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => onAiProviderChange(model.id)}
                className={`relative flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-gray-900 bg-gray-900 text-white shadow-md'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${model.gradient} flex items-center justify-center text-white shrink-0`}>
                  {model.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold leading-tight">{model.name}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>{model.sub}</p>
                  <p className={`text-xs mt-1 leading-tight ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>{model.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {!(isMeetingMinutes && activeInputMode === 'audio') && (
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className={`
            w-full py-3 px-6 rounded-xl text-white font-semibold text-sm
            transition-all duration-150
            ${isValid && !isLoading
              ? `${colors.button} shadow-sm hover:shadow-md active:scale-[0.98]`
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              문서 생성 중...
            </span>
          ) : (
            `✨ ${docType.label} 생성하기`
          )}
        </button>
      )}
    </form>
  );
}

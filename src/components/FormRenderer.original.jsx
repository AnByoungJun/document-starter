import { useRef, useState } from 'react';
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

function AudioUploader({ onTranscribed, isLoading }) {
  const [status, setStatus] = useState('idle'); // idle | uploading | done | error
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [estimatedDatetime, setEstimatedDatetime] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setStatus('uploading');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // 파일 내 creation_time 우선, 없으면 lastModified 폴백
      const ts = data.creationTime ? new Date(data.creationTime).getTime() : file.lastModified;
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

  return (
    <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-teal-600 text-lg">🎙️</span>
        <span className="text-sm font-semibold text-teal-800">음성 파일로 회의록 생성</span>
        <span className="text-xs text-teal-500">(mp3, mp4, wav, m4a, webm · 최대 200MB)</span>
      </div>

      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/mp4,video/webm"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          disabled={status === 'uploading'}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
        >
          {status === 'uploading' ? '변환 중...' : '파일 선택'}
        </button>
        {fileName && (
          <span className="text-sm text-gray-600 truncate">{fileName}</span>
        )}
      </div>

      {status === 'uploading' && (
        <div className="flex items-center gap-2 text-teal-600 text-sm">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Whisper AI가 음성을 텍스트로 변환하고 있습니다... (파일 크기에 따라 시간이 걸릴 수 있습니다)
        </div>
      )}
      {status === 'done' && (
        <div className="text-sm text-teal-700 font-medium space-y-1.5">
          {/* 단계별 진행 표시 */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="text-teal-700">음성 → 텍스트 변환 완료</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 text-teal-500 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="text-teal-600">AI가 회의록을 작성하고 있습니다...</span>
                </>
              ) : (
                <>
                  <span className="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-teal-700">회의록 생성 완료</span>
                </>
              )}
            </div>
          </div>
          {estimatedDatetime && (
            <p className="text-xs text-teal-600 font-normal pl-6">회의 일시 추정: {estimatedDatetime} (파일 녹음 메타데이터 기준)</p>
          )}
        </div>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-600">{errorMsg || '변환 실패. 파일 형식 및 크기를 확인해 주세요.'}</p>
      )}
    </div>
  );
}

export default function FormRenderer({ docType, values, onChange, onSubmit, isLoading, aiProvider, onAiProviderChange }) {
  const [audioMode, setAudioMode] = useState(false);
  const [mondayImported, setMondayImported] = useState(null); // imported weekly data
  if (!docType) return null;

  const colors = COLOR_CLASSES[docType.color];
  const isValid = audioMode
    ? true
    : docType.fields.filter((f) => f.required).every((f) => values[f.id]?.trim());

  const handleTranscribed = (text, datetime) => {
    setAudioMode(true);
    if (datetime && !values.datetime) {
      onChange('datetime', datetime);
    }
    onChange('discussions', (values.discussions ? values.discussions + '\n\n' : '') + text, true);
  };

  const handleMondayImport = (result) => {
    setMondayImported(result);
    // 기간 자동 입력
    const { from, to } = result.weekRange;
    const fmt = (s) => {
      const [y, m, d] = s.split('-');
      return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
    };
    onChange('period', `${fmt(from)} ~ ${fmt(to)}`);

    // 완료 / 진행 중으로 분류 (업데이트 내용 포함)
    console.log('[Monday Import] 감지된 컬럼:', result.columns);
    console.log('[Monday Import] 전체 컬럼 목록:', result.allColumns);
    console.log('[Monday Import] 아이템 상태 목록:', result.items.map((i) => ({ name: i.name, status: i.status })));
    const doneItems = [];
    const progressItems = [];
    for (const item of result.items) {
      const s = (item.status || '').trim().toLowerCase();
      const lines = [`- ${item.name}${item.person ? ` (${item.person})` : ''}${item.date ? ` [${item.date}]` : ''}`];
      for (const u of item.updates || []) {
        if (u.body) lines.push(`    · ${u.creator ? `[${u.creator}] ` : ''}${u.body}`);
      }
      const block = lines.join('\n');
      if (/완료|done|complete|finished|closed/.test(s)) doneItems.push(block);
      else progressItems.push(block);
    }
    if (doneItems.length > 0) onChange('completed', doneItems.join('\n'));
    if (progressItems.length > 0) onChange('inProgress', progressItems.join('\n'));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {docType.label} 정보 입력
        </h2>
        {docType.id === '주간보고' && (
          <MondayWeeklyImport onImport={handleMondayImport} />
        )}
      </div>

      {docType.id === '회의록' && (
        <AudioUploader onTranscribed={handleTranscribed} isLoading={isLoading} />
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
        {docType.fields.map((field) => {
          // Monday에서 불러온 완료/진행중 필드는 카드 형식으로 표시
          const isMondayField = mondayImported && (field.id === 'completed' || field.id === 'inProgress');
          const mondayFieldItems = isMondayField
            ? mondayImported.items.filter((item) => {
                const s = (item.status || '').trim().toLowerCase();
                const isDone = /완료|done|complete|finished|closed/.test(s);
                return field.id === 'completed' ? isDone : !isDone;
              })
            : [];

          return (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
              {isMondayField && mondayFieldItems.length > 0 && (
                <span className="ml-2 text-xs font-normal text-purple-500">
                  ({mondayFieldItems.length}개)
                </span>
              )}
            </label>

            {isMondayField && mondayFieldItems.length > 0 ? (
              <div className={`rounded-lg border overflow-hidden ${field.id === 'completed' ? 'border-green-200' : 'border-blue-200'}`}>
                <div className={`space-y-0 divide-y ${field.id === 'completed' ? 'divide-green-100' : 'divide-blue-100'}`}>
                  {mondayFieldItems.map((item) => (
                    <div key={item.id} className={`px-3 py-2.5 ${field.id === 'completed' ? 'bg-green-50' : 'bg-blue-50'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${field.id === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`} />
                        <span className="text-sm font-medium text-gray-800 flex-1">{item.name}</span>
                        {item.person && <span className="text-xs text-gray-500 shrink-0">{item.person}</span>}
                        {item.date && <span className="text-xs text-gray-400 shrink-0">{item.date}</span>}
                      </div>
                      {item.updates?.length > 0 && (
                        <div className="mt-1.5 ml-3.5 space-y-1">
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
            ) : field.type === 'textarea' ? (
              <textarea
                value={values[field.id] || ''}
                onChange={(e) => onChange(field.id, e.target.value)}
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
                value={values[field.id] || ''}
                onChange={(e) => onChange(field.id, e.target.value)}
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
                value={values[field.id] || ''}
                onChange={(e) => onChange(field.id, e.target.value)}
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
    </form>
  );
}

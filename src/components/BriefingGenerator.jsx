import { useState, useEffect, useCallback } from 'react';
import { useDocumentGenerator } from '../hooks/useDocumentGenerator';
import { formatDate, getDaysOverdue } from '../utils/dateUtils';

// 섹션 정의 (헤더 키워드 → 스타일)
const SECTIONS = [
  {
    key: '오늘의 핵심',
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    titleColor: 'text-yellow-800',
    bodyColor: 'text-yellow-900',
    large: true,
    icon: '⚡',
  },
  {
    key: '완료 현황',
    bg: 'bg-green-50',
    border: 'border-green-200',
    titleColor: 'text-green-700',
    bodyColor: 'text-green-900',
    icon: '✅',
  },
  {
    key: '오늘 집중',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    titleColor: 'text-blue-700',
    bodyColor: 'text-blue-900',
    icon: '🎯',
  },
  {
    key: '지연 주의',
    bg: 'bg-red-50',
    border: 'border-2 border-red-400',
    titleColor: 'text-red-700',
    bodyColor: 'text-red-900',
    icon: '⚠️',
  },
  {
    key: '마무리 멘트',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    titleColor: 'text-gray-500',
    bodyColor: 'text-gray-700',
    italic: true,
    icon: '💬',
  },
];

// 마크다운 output을 섹션 배열로 파싱
function parseSections(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const result = [];
  let current = null;

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)/);
    if (headerMatch) {
      if (current) result.push(current);
      const title = headerMatch[1].trim();
      const def = SECTIONS.find((s) => title.includes(s.key));
      current = { title, body: [], def: def || null };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) result.push(current);
  return result.filter((s) => s.body.join('').trim());
}

// 마크다운 인라인 → 텍스트 (간단 처리)
function renderLine(line) {
  return line.replace(/\*\*(.+?)\*\*/g, '$1');
}

export default function BriefingGenerator({ done = [], inProgress = [], delayed = [] }) {
  const { output, isLoading, error, generationMs, generate, reset } = useDocumentGenerator();
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // 경과 시간 카운터
  useEffect(() => {
    if (!isLoading) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isLoading]);

  const handleGenerate = useCallback(() => {
    setHasGenerated(true);
    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });
    const fields = {
      today,
      done: done.map((i) => `- ${i.name}${i.deadline ? ` (마감: ${formatDate(i.deadline)})` : ''}${i.person ? `, 담당: ${i.person}` : ''}`).join('\n'),
      inProgress: inProgress.map((i) => `- ${i.name}${i.deadline ? ` (마감: ${formatDate(i.deadline)})` : ''}${i.person ? `, 담당: ${i.person}` : ''}`).join('\n'),
      delayed: delayed.map((i) => {
        const d = getDaysOverdue(i.deadline);
        return `- ${i.name}${i.deadline ? ` (마감: ${formatDate(i.deadline)})` : ''}${d > 0 ? `, D+${d} 지연` : ''}`;
      }).join('\n'),
      doneCount: done.length,
      inProgressCount: inProgress.length,
      delayedCount: delayed.length,
    };
    generate('오늘브리핑', fields, 'gemini');
  }, [done, inProgress, delayed, generate]);

  const handleReset = () => {
    reset();
    setHasGenerated(false);
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = output;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sections = parseSections(output);
  const isDone = !isLoading && !!output && !!generationMs;

  // ── 생성 전: 버튼만 표시 ──────────────────────────────────────
  if (!hasGenerated) {
    return (
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <span>✨</span>
          오늘 브리핑 생성
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">오늘 브리핑</h3>
          <p className="text-xs text-gray-400 mt-0.5">Gemini AI가 생성한 오늘의 업무 요약</p>
        </div>
        {isDone && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                copied
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {copied ? '✓ 복사됨' : '복사하기'}
            </button>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              다시 생성
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              닫기
            </button>
          </div>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          <div>
            <p>{error}</p>
            <button onClick={handleGenerate} className="mt-1 text-xs font-medium text-red-700 hover:text-red-900">다시 시도 →</button>
          </div>
        </div>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="flex items-center gap-2.5">
            <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-gray-500">브리핑을 작성하는 중...</p>
            <span className="text-xs text-gray-400 tabular-nums">{elapsed}초</span>
          </div>
          {/* 스트리밍 미리보기 */}
          {output && (
            <div className="w-full mt-2 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed max-h-48 overflow-hidden relative">
              {output}
              <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-gray-50 to-transparent" />
            </div>
          )}
        </div>
      )}

      {/* 섹션 카드 */}
      {!isLoading && sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((section, i) => {
            const def = section.def;
            const bg = def?.bg ?? 'bg-gray-50';
            const border = def?.border ?? 'border-gray-200';
            const titleColor = def?.titleColor ?? 'text-gray-600';
            const bodyColor = def?.bodyColor ?? 'text-gray-800';
            const isLarge = def?.large ?? false;

            const bodyLines = section.body
              .join('\n')
              .split('\n')
              .filter((l) => l.trim());

            return (
              <div
                key={i}
                className={`rounded-xl border p-4 ${bg} ${border} ${isLarge ? 'p-6' : ''}`}
              >
                <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${titleColor}`}>
                  {def?.icon && <span className="mr-1">{def.icon}</span>}
                  {section.title}
                </p>
                <div className={`space-y-1 ${isLarge ? 'text-base' : 'text-sm'} ${bodyColor} ${def?.italic ? 'italic' : ''}`}>
                  {bodyLines.map((line, j) => {
                    const isBullet = line.startsWith('- ') || line.startsWith('• ');
                    const text = renderLine(isBullet ? line.slice(2) : line);
                    return isBullet ? (
                      <div key={j} className="flex items-start gap-1.5">
                        <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${def?.key === '지연 주의' ? 'bg-red-400' : def?.key === '완료 현황' ? 'bg-green-400' : def?.key === '오늘 집중' ? 'bg-blue-400' : 'bg-gray-400'}`} />
                        <span>{text}</span>
                      </div>
                    ) : (
                      <p key={j}>{text}</p>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 완료 후: 절약 시간 배너 */}
      {isDone && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 rounded-xl text-xs text-gray-500">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
          생성 {(generationMs / 1000).toFixed(1)}초
          <span className="text-gray-300">|</span>
          직접 작성 시 약 10분 절약
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import TimeSavingBadge from './TimeSavingBadge';
import MondayExportButton from './MondayExportButton';

// 인라인 마크다운(볼드, 이탤릭) 처리
function renderInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
}

// 마크다운을 HTML로 변환하는 렌더러
function renderMarkdown(text) {
  if (!text) return '';

  const lines = text.split('\n');
  const html = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trimEnd();

    // h1
    if (/^# (.+)$/.test(trimmed)) {
      const content = trimmed.slice(2);
      html.push(`<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-3 pb-2 border-b-2 border-gray-200">${renderInline(content)}</h1>`);
    }
    // h2
    else if (/^## (.+)$/.test(trimmed)) {
      const content = trimmed.slice(3);
      html.push(`<h2 class="text-lg font-bold text-gray-800 mt-5 mb-2">${renderInline(content)}</h2>`);
    }
    // h3
    else if (/^### (.+)$/.test(trimmed)) {
      const content = trimmed.slice(4);
      html.push(`<h3 class="text-base font-semibold text-gray-700 mt-4 mb-1">${renderInline(content)}</h3>`);
    }
    // 구분선
    else if (/^---$/.test(trimmed)) {
      html.push('<hr class="border-gray-200 my-4" />');
    }
    // 서브 불릿 (2~4칸 들여쓰기)
    else if (/^( {2,}|\t)- (.+)$/.test(raw)) {
      const content = raw.replace(/^( {2,}|\t)- /, '');
      html.push(`<div class="flex gap-2 pl-6 mt-1"><span class="text-gray-300 shrink-0 mt-0.5">–</span><span class="text-sm text-gray-600 leading-relaxed">${renderInline(content)}</span></div>`);
    }
    // 일반 불릿
    else if (/^- (.+)$/.test(trimmed)) {
      const content = trimmed.slice(2);
      html.push(`<div class="flex gap-2 pl-2 mt-2"><span class="text-gray-400 shrink-0 mt-0.5 font-bold">•</span><span class="text-sm text-gray-700 leading-relaxed">${renderInline(content)}</span></div>`);
    }
    // 번호 리스트
    else if (/^(\d+)\. (.+)$/.test(trimmed)) {
      const [, num, content] = trimmed.match(/^(\d+)\. (.+)$/);
      html.push(`<div class="flex gap-2 pl-2 mt-2"><span class="text-gray-500 font-semibold shrink-0 text-sm min-w-[1.2rem]">${num}.</span><span class="text-sm text-gray-700 leading-relaxed">${renderInline(content)}</span></div>`);
    }
    // 빈 줄
    else if (trimmed === '') {
      html.push('<div class="mt-2"></div>');
    }
    // 일반 텍스트
    else {
      html.push(`<p class="text-sm text-gray-700 leading-relaxed mt-1">${renderInline(trimmed)}</p>`);
    }
  }

  return html.join('\n');
}

export default function DocumentOutput({ output, isLoading, error, generationMs, documentType, aiProvider, onRegenerate, onReset }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = output;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (error) {
    return (
      <div className="animate-fade-in p-4 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-start gap-2">
          <span className="text-red-500 text-lg">⚠️</span>
          <div>
            <p className="font-semibold text-red-700 text-sm">오류가 발생했습니다</p>
            <p className="text-red-600 text-sm mt-0.5">{error}</p>
            <button
              onClick={onRegenerate}
              className="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && !output) return null;

  return (
    <div className="animate-fade-in space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          생성된 문서
        </h2>
        {output && !isLoading && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleCopy}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                transition-all duration-150
                ${copied
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }
              `}
            >
              {copied ? '✓ 복사됨' : '📋 복사'}
            </button>
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              🔄 재생성
            </button>
            {(documentType === '회의록' || documentType === '주간보고') && (
              <MondayExportButton output={output} documentType={documentType} />
            )}
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              ✕ 닫기
            </button>
          </div>
        )}
      </div>

      {/* 절약 시간 배지 */}
      <TimeSavingBadge documentType={documentType} generationMs={generationMs} />

      {/* 문서 본문 */}
      <div className="relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* 스트리밍 중 인디케이터 */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 animate-pulse" />
        )}

        <div className="p-6 min-h-[200px]">
          {output ? (
            <>
              <div
                className="max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(output) }}
              />
              {/* 스트리밍 커서 */}
              {isLoading && (
                <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />
              )}
            </>
          ) : (
            /* 첫 텍스트 오기 전 스켈레톤 */
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center gap-2 mb-6">
                <svg className="h-4 w-4 text-blue-400 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  {aiProvider === 'gemini' ? 'Gemini' : 'GROQ'}가 문서를 작성하고 있습니다
                </span>
              </div>
              {/* 제목 스켈레톤 */}
              <div className="h-6 bg-gray-200 rounded-lg w-2/5" />
              <div className="h-px bg-gray-100 w-full" />
              {/* 본문 스켈레톤 라인들 */}
              <div className="space-y-2.5 pt-1">
                <div className="h-3.5 bg-gray-100 rounded w-full" />
                <div className="h-3.5 bg-gray-100 rounded w-11/12" />
                <div className="h-3.5 bg-gray-100 rounded w-4/5" />
              </div>
              <div className="space-y-2.5 pt-3">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-3.5 bg-gray-100 rounded w-full" />
                <div className="h-3.5 bg-gray-100 rounded w-10/12" />
                <div className="h-3.5 bg-gray-100 rounded w-3/4" />
              </div>
              <div className="space-y-2.5 pt-3">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3.5 bg-gray-100 rounded w-full" />
                <div className="h-3.5 bg-gray-100 rounded w-9/12" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

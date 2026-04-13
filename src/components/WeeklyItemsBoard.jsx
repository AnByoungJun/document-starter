import { useState, useEffect } from 'react';
import { useWeeklyItems } from '../hooks/useWeeklyItems';
import { formatDate, getDaysOverdue } from '../utils/dateUtils';
import BriefingGenerator from './BriefingGenerator';

// ── Monday 아이콘 ─────────────────────────────────────────────

function MondayIcon({ className = 'w-5 h-5', colored = false }) {
  if (colored) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <circle cx="5" cy="12" r="3.5" fill="#F62B54" />
        <circle cx="12" cy="12" r="3.5" fill="#FFCB00" />
        <circle cx="19" cy="12" r="3.5" fill="#00CA72" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="3.5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="19" cy="12" r="3.5" />
    </svg>
  );
}

// ── 보드 선택 단계 ────────────────────────────────────────────

function BoardSelector({ onSelect }) {
  const [step, setStep] = useState('workspace');
  const [workspaces, setWorkspaces] = useState([]);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedWs, setSelectedWs] = useState(null);
  const [search, setSearch] = useState('');

  const loadWorkspaces = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/monday?action=workspaces');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorkspaces(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWorkspaces(); }, []);

  const handleSelectWorkspace = async (ws) => {
    setSelectedWs(ws);
    setSearch('');
    setStep('board');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/monday?action=boards&workspaceId=${ws.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBoards(data);
    } catch (err) {
      setError(err.message);
      setStep('workspace');
    } finally {
      setLoading(false);
    }
  };

  const items = step === 'workspace' ? workspaces : boards;
  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      {/* 상단 브랜딩 */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-md">
          <MondayIcon className="w-6 h-6" colored />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">Monday.com 연결</p>
          <p className="text-xs text-gray-400">이번 주 마감 현황 불러오기</p>
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2 mb-8">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${step === 'workspace' ? 'text-gray-900' : 'text-gray-400'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 'workspace' ? 'bg-gray-900 text-white' : 'bg-green-500 text-white'
          }`}>
            {step === 'workspace' ? '1' : '✓'}
          </span>
          워크스페이스
        </div>
        <div className={`w-8 h-px ${step === 'board' ? 'bg-gray-900' : 'bg-gray-200'}`} />
        <div className={`flex items-center gap-1.5 text-xs font-medium ${step === 'board' ? 'text-gray-900' : 'text-gray-300'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 'board' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-400'
          }`}>
            2
          </span>
          보드
        </div>
      </div>

      {/* 카드 */}
      <div className="w-full max-w-sm">
        {/* 에러 */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            <div className="flex-1">
              <p>{error}</p>
              <button onClick={loadWorkspaces} className="mt-1 text-xs font-medium text-red-700 hover:text-red-900">
                다시 시도 →
              </button>
            </div>
          </div>
        )}

        {/* 뒤로가기 + 검색 */}
        {!loading && !error && (
          <div className="mb-3">
            {step === 'board' && (
              <button
                onClick={() => { setStep('workspace'); setSearch(''); }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                <span className="font-medium">{selectedWs?.name}</span>
                <span>으로 돌아가기</span>
              </button>
            )}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={step === 'workspace' ? '워크스페이스 검색...' : '보드 검색...'}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-colors"
              />
            </div>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-10 text-gray-400">
            <svg className="animate-spin h-6 w-6 text-[#F62B54]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm">{step === 'workspace' ? '워크스페이스를' : '보드를'} 불러오는 중...</p>
          </div>
        )}

        {/* 목록 */}
        {!loading && !error && (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
            {filtered.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">검색 결과가 없습니다.</div>
            )}
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => step === 'workspace' ? handleSelectWorkspace(item) : onSelect(item, selectedWs)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    step === 'workspace' ? 'bg-gradient-to-br from-indigo-400 to-purple-500' : 'bg-gradient-to-br from-[#F62B54] to-orange-400'
                  }`}>
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{item.name}</span>
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 아이템 카드 ───────────────────────────────────────────────

function ItemCard({ item, variant }) {
  const overdue = variant === 'delayed' ? getDaysOverdue(item.deadline) : 0;

  return (
    <div className={`rounded-xl border p-3 space-y-1.5 ${
      variant === 'done' ? 'bg-green-50 border-green-200' :
      variant === 'delayed' ? 'bg-red-50 border-red-200' :
      'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium leading-snug flex-1 ${
          variant === 'done' ? 'text-green-900 line-through opacity-70' :
          variant === 'delayed' ? 'text-red-900' : 'text-blue-900'
        }`}>
          {item.name}
        </p>
        {variant === 'delayed' && overdue > 0 && (
          <span className="shrink-0 px-1.5 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
            D+{overdue}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {item.deadline && (
          <span className={`text-xs ${
            variant === 'done' ? 'text-green-600' :
            variant === 'delayed' ? 'text-red-600' : 'text-blue-600'
          }`}>
            {formatDate(item.deadline)}
          </span>
        )}
        {item.person && (
          <span className="text-xs text-gray-500 bg-white/70 px-1.5 py-0.5 rounded">
            {item.person}
          </span>
        )}
        {item.status && (
          <span className="text-xs text-gray-500 bg-white/70 px-1.5 py-0.5 rounded">
            {item.status}
          </span>
        )}
      </div>
    </div>
  );
}

// ── 섹션 (접기/펼치기) ────────────────────────────────────────

function Section({ title, count, variant, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  const headerClass = {
    done: 'bg-green-100 border-green-200 text-green-800',
    inProgress: 'bg-blue-100 border-blue-200 text-blue-800',
    delayed: 'bg-red-100 border-red-200 text-red-800',
  }[variant];

  const countClass = {
    done: 'bg-green-200 text-green-800',
    inProgress: 'bg-blue-200 text-blue-800',
    delayed: 'bg-red-200 text-red-800',
  }[variant];

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border font-semibold text-sm transition-colors ${headerClass}`}
      >
        <span className="flex items-center gap-2">
          <span>{open ? '▾' : '▸'}</span>
          {title}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${countClass}`}>
          {count}건
        </span>
      </button>
      {open && (
        <div className="space-y-2 pl-1">
          {count === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">해당 항목이 없습니다.</p>
          ) : children}
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────

export default function WeeklyItemsBoard() {
  const [boardId, setBoardId] = useState(null);
  const [boardName, setBoardName] = useState('');

  const { done, inProgress, delayed, loading, error, refetch } = useWeeklyItems(boardId);

  const handleSelectBoard = (board) => {
    setBoardId(board.id);
    setBoardName(board.name);
  };

  if (!boardId) {
    return <BoardSelector onSelect={handleSelectBoard} />;
  }

  return (
    <div className="space-y-4">
      {/* 보드 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900">{boardName}</h3>
          <p className="text-xs text-gray-500 mt-0.5">이번 주 마감 아이템 현황</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            disabled={loading}
            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg disabled:opacity-50"
          >
            {loading ? '새로고침 중...' : '새로고침'}
          </button>
          <button
            onClick={() => setBoardId(null)}
            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg"
          >
            보드 변경
          </button>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
          <button onClick={refetch} className="ml-2 underline text-red-500">다시 시도</button>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-400 text-sm">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          이번 주 아이템을 불러오는 중...
        </div>
      )}

      {/* 3단 그리드 */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Section title="완료" count={done.length} variant="done">
              {done.map((item) => (
                <ItemCard key={item.id} item={item} variant="done" />
              ))}
            </Section>

            <Section title="진행중" count={inProgress.length} variant="inProgress">
              {inProgress.map((item) => (
                <ItemCard key={item.id} item={item} variant="inProgress" />
              ))}
            </Section>

            <Section title="지연" count={delayed.length} variant="delayed" defaultOpen={delayed.length > 0}>
              {delayed.map((item) => (
                <ItemCard key={item.id} item={item} variant="delayed" />
              ))}
            </Section>
          </div>

          <BriefingGenerator done={done} inProgress={inProgress} delayed={delayed} />
        </>
      )}
    </div>
  );
}

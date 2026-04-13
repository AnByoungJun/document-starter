import { useState } from 'react';

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

function formatWeekRange(from, to) {
  if (!from || !to) return '';
  const fmt = (s) => {
    const [, m, d] = s.split('-');
    return `${parseInt(m)}월 ${parseInt(d)}일`;
  };
  return `${fmt(from)} ~ ${fmt(to)}`;
}

function statusColor(text) {
  if (!text) return 'bg-gray-100 text-gray-500';
  const t = text.toLowerCase();
  if (/완료|done|complete/.test(t)) return 'bg-green-100 text-green-700';
  if (/진행|progress|working|in/.test(t)) return 'bg-blue-100 text-blue-700';
  if (/대기|wait|pending|todo/.test(t)) return 'bg-yellow-100 text-yellow-700';
  if (/중단|hold|block/.test(t)) return 'bg-red-100 text-red-700';
  return 'bg-purple-100 text-purple-700';
}

const ITEM_COLORS = [
  '#F62B54', '#FF7A00', '#FFCB00', '#00CA72', '#00A9FF',
  '#9B59B6', '#E67E22', '#1ABC9C', '#3498DB', '#E74C3C',
];
const itemColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return ITEM_COLORS[h % ITEM_COLORS.length];
};

export default function MondayWeeklyImport({ onImport }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('workspace'); // workspace | board | result
  const [workspaces, setWorkspaces] = useState([]);
  const [boards, setBoards] = useState([]);
  const [selected, setSelected] = useState({ workspace: null, board: null });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedItem, setExpandedItem] = useState(null);
  const [search, setSearch] = useState('');

  const reset = () => {
    setStep('workspace');
    setWorkspaces([]);
    setBoards([]);
    setSelected({ workspace: null, board: null });
    setResult(null);
    setErrorMsg('');
    setSearch('');
  };

  const handleOpen = async () => {
    reset();
    setIsOpen(true);
    setLoading(true);
    try {
      const res = await fetch('/api/monday?action=workspaces');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorkspaces(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkspace = async (ws) => {
    setSelected((p) => ({ ...p, workspace: ws }));
    setSearch('');
    setStep('board');
    setLoading(true);
    try {
      const res = await fetch(`/api/monday?action=boards&workspaceId=${ws.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBoards(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBoard = async (board) => {
    setSelected((p) => ({ ...p, board }));
    setStep('result');
    setLoading(true);
    try {
      const res = await fetch(`/api/monday?action=weekly-items&boardId=${board.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setErrorMsg(err.message);
      setStep('board');
    } finally {
      setLoading(false);
    }
  };

  // 현재 단계에서 보여줄 목록
  const listItems = step === 'workspace' ? workspaces : step === 'board' ? boards : [];
  const filtered = listItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F62B54] hover:bg-[#d9243f] text-white rounded-lg text-sm font-medium transition-colors"
      >
        <MondayIcon className="w-3.5 h-3.5" />
        Monday에서 불러오기
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>

            {/* ── 헤더 ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
                  <MondayIcon className="w-5 h-5" colored />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">
                    {step === 'result' && selected.board ? selected.board.name : '이번 주 업무 불러오기'}
                  </p>
                  {step === 'result' && selected.workspace && (
                    <p className="text-xs text-gray-400 mt-0.5">{selected.workspace.name}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── 스텝 인디케이터 (선택 단계에서만) ── */}
            {step !== 'result' && (
              <div className="flex items-center gap-2 px-6 pt-4 pb-0 shrink-0">
                {['workspace', 'board'].map((s, i) => {
                  const labels = ['워크스페이스', '보드'];
                  const isDone = (s === 'workspace' && step === 'board');
                  const isActive = step === s;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${isActive ? 'text-gray-900' : isDone ? 'text-gray-400' : 'text-gray-300'}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          isDone ? 'bg-green-500 text-white' : isActive ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-400'
                        }`}>
                          {isDone ? '✓' : i + 1}
                        </span>
                        {labels[i]}
                      </div>
                      {i < 1 && <div className={`w-6 h-px ${step === 'board' ? 'bg-gray-400' : 'bg-gray-200'}`} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── 본문 ── */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">

              {/* 에러 */}
              {errorMsg && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 mb-4">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                  </svg>
                  <div>
                    <p>{errorMsg}</p>
                    <button type="button" onClick={reset} className="mt-1 text-xs font-medium text-red-700 hover:text-red-900">다시 시도 →</button>
                  </div>
                </div>
              )}

              {/* 로딩 */}
              {loading && (
                <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
                  <svg className="animate-spin h-6 w-6 text-[#F62B54]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <p className="text-sm">불러오는 중...</p>
                </div>
              )}

              {/* 워크스페이스 / 보드 선택 */}
              {!loading && !errorMsg && (step === 'workspace' || step === 'board') && (
                <div className="space-y-3">
                  {step === 'board' && (
                    <button
                      type="button"
                      onClick={() => { setStep('workspace'); setSearch(''); }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                      <span className="font-medium">{selected.workspace?.name}</span>으로 돌아가기
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
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    {filtered.length === 0 && (
                      <p className="text-center py-6 text-sm text-gray-400">검색 결과가 없습니다.</p>
                    )}
                    {filtered.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => step === 'workspace' ? handleSelectWorkspace(item) : handleSelectBoard(item)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl text-left transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: itemColor(item.name) }}
                          >
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
                </div>
              )}

              {/* 결과 */}
              {!loading && !errorMsg && step === 'result' && result && (
                <div className="space-y-3">
                  {/* 주간 범위 + 보드 변경 */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
                      </svg>
                      {formatWeekRange(result.weekRange.from, result.weekRange.to)}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setStep('board'); setResult(null); }}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      보드 변경
                    </button>
                  </div>

                  {result.items.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                      <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                      </svg>
                      <p className="text-sm">이번 주에 해당하는 아이템이 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {result.items.map((item) => {
                        const isExpanded = expandedItem === item.id;
                        return (
                          <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                            >
                              <svg className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                              <span className="text-sm font-medium text-gray-800 flex-1 truncate">{item.name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.person && (
                                  <span className="text-xs text-gray-400">{item.person}</span>
                                )}
                                {item.status && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(item.status)}`}>
                                    {item.status}
                                  </span>
                                )}
                                {item.date && (
                                  <span className="text-xs text-gray-400">{item.date}</span>
                                )}
                                {item.updates.length > 0 && (
                                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                    {item.updates.length}
                                  </span>
                                )}
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2.5">
                                {item.updates.length === 0 ? (
                                  <p className="text-xs text-gray-400">업데이트 내용이 없습니다.</p>
                                ) : (
                                  item.updates.map((u) => (
                                    <div key={u.createdAt} className="text-xs">
                                      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                                        <span className="font-semibold text-gray-700">{u.creator || '알 수 없음'}</span>
                                        <span className="text-gray-300">·</span>
                                        <span>{new Date(u.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                      <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{u.body}</p>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── 하단 액션 ── */}
            {step === 'result' && result && !loading && (
              <div className="flex gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                >
                  닫기
                </button>
                {result.items.length > 0 && onImport && (
                  <button
                    type="button"
                    onClick={() => { onImport(result); setIsOpen(false); }}
                    className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    보고서에 추가
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

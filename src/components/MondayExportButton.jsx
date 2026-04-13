import { useState } from 'react';

function MondayIcon({ className = 'w-4 h-4', colored = false }) {
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

export default function MondayExportButton({ output, documentType }) {
  const docLabel = documentType === '주간보고' ? '주간보고' : '회의록';
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('workspace'); // workspace | board | group | confirm
  const [workspaces, setWorkspaces] = useState([]);
  const [boards, setBoards] = useState([]);
  const [groups, setGroups] = useState([]);
  const [docColumn, setDocColumn] = useState(null);
  const [selected, setSelected] = useState({ workspace: null, board: null, group: null });
  const [itemName, setItemName] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');

  const reset = () => {
    setStep('workspace');
    setWorkspaces([]);
    setBoards([]);
    setGroups([]);
    setSelected({ workspace: null, board: null, group: null });
    setItemName('');
    setStatus(null);
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
      setStatus('error');
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
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBoard = async (board) => {
    setSelected((p) => ({ ...p, board }));
    setSearch('');
    setStep('group');
    setLoading(true);
    try {
      const res = await fetch(`/api/monday?action=groups&boardId=${board.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGroups(data.groups);
      setDocColumn(data.docColumn);
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGroup = (group) => {
    setSelected((p) => ({ ...p, group }));
    setSearch('');
    setStep('confirm');
  };

  const handleExport = async () => {
    if (!itemName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/monday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: selected.board.id,
          groupId: selected.group.id,
          itemName: itemName.trim(),
          content: output,
          docColumnId: docColumn?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // 스텝 순서
  const stepOrder = ['workspace', 'board', 'group', 'confirm'];
  const stepLabels = ['워크스페이스', '보드', '그룹', '확인'];
  const currentIdx = stepOrder.indexOf(step);

  // 현재 단계의 목록 아이템
  const listItems =
    step === 'workspace' ? workspaces :
    step === 'board' ? boards :
    step === 'group' ? groups : [];
  const nameKey = step === 'group' ? 'title' : 'name';
  const filtered = listItems.filter((i) => i[nameKey].toLowerCase().includes(search.toLowerCase()));

  const handleBack = () => {
    const prev = stepOrder[currentIdx - 1];
    if (prev) { setStep(prev); setSearch(''); }
  };

  const handleListSelect = (item) => {
    if (step === 'workspace') handleSelectWorkspace(item);
    else if (step === 'board') handleSelectBoard(item);
    else if (step === 'group') handleSelectGroup(item);
  };

  // 이름 기반 결정적 색상 (워크스페이스/보드/그룹마다 고유 색상)
  const ITEM_COLORS = [
    '#F62B54', '#FF7A00', '#FFCB00', '#00CA72', '#00A9FF',
    '#9B59B6', '#E67E22', '#1ABC9C', '#3498DB', '#E74C3C',
  ];
  const itemColor = (name = '') => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return ITEM_COLORS[h % ITEM_COLORS.length];
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F62B54] hover:bg-[#d9243f] text-white rounded-lg text-sm font-medium transition-colors"
      >
        <MondayIcon className="w-3.5 h-3.5" />
        Monday에 등록
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
                    {status === 'success' ? '등록 완료' : `${docLabel} 등록`}
                  </p>
                  {step === 'confirm' && !status && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[selected.workspace?.name, selected.board?.name, selected.group?.title].filter(Boolean).join(' › ')}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── 스텝 인디케이터 ── */}
            {!status && step !== 'confirm' && (
              <div className="flex items-center gap-1 px-6 pt-4 pb-0 shrink-0">
                {stepOrder.slice(0, 3).map((s, i) => {
                  const isDone = i < currentIdx;
                  const isActive = step === s;
                  return (
                    <div key={s} className="flex items-center gap-1">
                      <div className={`flex items-center gap-1 text-xs font-medium ${isActive ? 'text-gray-900' : isDone ? 'text-gray-400' : 'text-gray-300'}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isDone ? 'bg-green-500 text-white' : isActive ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-400'
                        }`}>
                          {isDone ? '✓' : i + 1}
                        </span>
                        {stepLabels[i]}
                      </div>
                      {i < 2 && <div className={`w-3 h-px shrink-0 ${i < currentIdx ? 'bg-gray-400' : 'bg-gray-200'}`} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── 본문 ── */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">

              {/* 성공 */}
              {status === 'success' && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">등록이 완료됐습니다</p>
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="font-medium text-gray-700">{selected.group.title}</span> 그룹에<br />
                      <span className="font-medium text-gray-700">{itemName}</span> 아이템으로 저장됐습니다.
                    </p>
                  </div>
                </div>
              )}

              {/* 에러 */}
              {status === 'error' && (
                <div className="space-y-4 py-2">
                  <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                    </svg>
                    <div>
                      <p>{errorMsg}</p>
                      <button onClick={reset} className="mt-1 text-xs font-medium text-red-700 hover:text-red-900">다시 시도 →</button>
                    </div>
                  </div>
                </div>
              )}

              {/* 로딩 */}
              {loading && !status && (
                <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
                  <svg className="animate-spin h-6 w-6 text-[#F62B54]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <p className="text-sm">불러오는 중...</p>
                </div>
              )}

              {/* 목록 선택 (워크스페이스 / 보드 / 그룹) */}
              {!loading && !status && (step === 'workspace' || step === 'board' || step === 'group') && (
                <div className="space-y-3">
                  {currentIdx > 0 && (
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                      <span className="font-medium">
                        {step === 'board' ? selected.workspace?.name : selected.board?.name}
                      </span>으로 돌아가기
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
                      placeholder={step === 'workspace' ? '워크스페이스 검색...' : step === 'board' ? '보드 검색...' : '그룹 검색...'}
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {filtered.length === 0 && (
                      <p className="text-center py-6 text-sm text-gray-400">검색 결과가 없습니다.</p>
                    )}
                    {filtered.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleListSelect(item)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl text-left transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: itemColor(item[nameKey]) }}
                          >
                            {item[nameKey].charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{item[nameKey]}</span>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 확인 단계 */}
              {!loading && !status && step === 'confirm' && (
                <div className="space-y-4">
                  {/* 선택 요약 */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                    {[
                      { label: '워크스페이스', value: selected.workspace?.name },
                      { label: '보드', value: selected.board?.name },
                      { label: '그룹', value: selected.group?.title },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{label}</span>
                        <span className="font-medium text-gray-800">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* 아이템 이름 입력 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      아이템 이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="예) 2025년 5월 마케팅 전략 회의"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                    />
                  </div>

                  <p className="text-xs text-gray-400 text-center">
                    {docColumn
                      ? <><span className="text-teal-600 font-medium">"{docColumn.title}" Doc 컬럼</span>에 {docLabel}이 기록됩니다.</>
                      : `${docLabel}이 업데이트로 추가됩니다.`}
                  </p>
                </div>
              )}
            </div>

            {/* ── 하단 액션 ── */}
            {(status === 'success' || (!loading && !status && step === 'confirm')) && (
              <div className="flex gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
                {status === 'success' ? (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                  >
                    닫기
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => { setStep('group'); setSearch(''); }}
                      className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                    >
                      뒤로
                    </button>
                    <button
                      onClick={handleExport}
                      disabled={!itemName.trim() || loading}
                      className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      등록하기
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

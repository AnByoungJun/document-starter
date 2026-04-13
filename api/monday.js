const MONDAY_API_URL = 'https://api.monday.com/v2';

async function mondayQuery(query, apiToken) {
  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiToken,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors.map((e) => e.message).join(', '));
  return data.data;
}

// 텍스트를 Delta Format 블록 content로 변환
function toBlockContent(text) {
  return JSON.stringify({
    alignment: 'left',
    direction: 'ltr',
    deltaFormat: [{ insert: text + '\n' }],
  });
}

// 회의록 텍스트를 단락 배열로 분할
function splitIntoParagraphs(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default async function handler(req, res) {
  const apiToken = process.env.MONDAY_API_TOKEN;
  if (!apiToken) {
    return res.status(500).json({ error: 'Monday.com API 토큰이 설정되지 않았습니다.' });
  }

  // GET: 워크스페이스 목록
  if (req.method === 'GET' && req.query.action === 'workspaces') {
    try {
      const data = await mondayQuery(`
        query { workspaces(limit: 50) { id name } }
      `, apiToken);
      return res.status(200).json(data.workspaces);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET: 보드 목록
  if (req.method === 'GET' && req.query.action === 'boards') {
    const { workspaceId } = req.query;
    try {
      const data = await mondayQuery(`
        query { boards(workspace_ids: [${workspaceId}], state: active, limit: 50, board_kind: public) { id name type } }
      `, apiToken);
      const filtered = data.boards.filter((b) => b.type === 'board');
      return res.status(200).json(filtered);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET: 그룹 목록 + Doc 컬럼 ID 함께 반환
  if (req.method === 'GET' && req.query.action === 'groups') {
    const { boardId } = req.query;
    try {
      const data = await mondayQuery(`
        query {
          boards(ids: [${boardId}]) {
            groups { id title }
            columns { id title type }
          }
        }
      `, apiToken);
      const groups = data.boards[0]?.groups || [];
      const docColumn = data.boards[0]?.columns?.find((c) => c.type === 'doc') || null;
      return res.status(200).json({ groups, docColumn });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET: 이번 주 아이템 목록 (주간보고용)
  if (req.method === 'GET' && req.query.action === 'weekly-items') {
    const { boardId } = req.query;

    // HTML 태그 제거
    const stripHtml = (html) =>
      (html || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    try {
      const data = await mondayQuery(`
        query {
          boards(ids: [${boardId}]) {
            columns { id title type }
            items_page(limit: 500) {
              items {
                id
                name
                updates(limit: 10) {
                  id
                  body
                  created_at
                  creator { name }
                }
                column_values {
                  id
                  type
                  text
                  value
                }
              }
            }
          }
        }
      `, apiToken);

      const board = data.boards[0];
      const columns = board?.columns || [];
      const items = board?.items_page?.items || [];

      // 날짜/기간, 담당자, 상태 컬럼 찾기 (한국어 이름 우선, 타입 폴백)
      const dateCol =
        columns.find((c) => (c.type === 'timeline' || c.type === 'date') && /기간|일정|날짜|period|date/i.test(c.title)) ||
        columns.find((c) => c.type === 'timeline') ||
        columns.find((c) => c.type === 'date');

      const personCol =
        columns.find((c) => c.type === 'people' && /담당자|담당|person|assignee/i.test(c.title)) ||
        columns.find((c) => c.type === 'people');

      const statusCol =
        columns.find((c) => (c.type === 'color' || c.type === 'status') && /상태|status/i.test(c.title)) ||
        columns.find((c) => c.type === 'color') ||
        columns.find((c) => c.type === 'status');

      // 이번 주 월~일 범위 계산
      const now = new Date();
      const day = now.getDay(); // 0=일, 1=월 ...
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);
      friday.setHours(23, 59, 59, 999);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const toDate = (str) => { const d = new Date(str); d.setHours(0,0,0,0); return d; };

      const DONE_PATTERN = /완료|done|complete|finished|closed/i;

      const weeklyItems = items.filter((item) => {
        const cv = item.column_values.find((c) => c.id === dateCol?.id);
        if (!cv || !cv.value) return false;
        try {
          const parsed = JSON.parse(cv.value);
          let start, end;
          if (parsed.from) { start = toDate(parsed.from); end = toDate(parsed.to || parsed.from); }
          else if (parsed.date) { start = toDate(parsed.date); end = start; }
          else return false;

          // 이번 주와 날짜가 겹치는 아이템
          const overlapsThisWeek = start <= sunday && end >= monday;

          // 이전 기간 미완료 아이템: 종료일이 이번 주 월요일 전이고 완료 상태가 아님
          const statusVal = item.column_values.find((c) => c.id === statusCol?.id);
          const statusText = statusVal?.text || '';
          const isDone = DONE_PATTERN.test(statusText);
          const isOverdue = end < monday && !isDone;

          return overlapsThisWeek || isOverdue;
        } catch { return false; }
      }).map((item) => {
        const getVal = (col) => item.column_values.find((c) => c.id === col?.id);
        const updates = (item.updates || [])
          .map((u) => ({
            body: stripHtml(u.body),
            creator: u.creator?.name || '',
            createdAt: u.created_at,
          }))
          .filter((u) => u.body);
        // status text가 비어있으면 value JSON에서 index로 레이블 추출 시도
        const statusCv = getVal(statusCol);
        let statusText = statusCv?.text || '';
        if (!statusText && statusCv?.value) {
          try {
            const parsed = JSON.parse(statusCv.value);
            statusText = parsed.label?.text || parsed.label || '';
          } catch { /* ignore */ }
        }

        // 마감일(end date) 추출
        let deadline = null;
        const dateCv = getVal(dateCol);
        if (dateCv?.value) {
          try {
            const dParsed = JSON.parse(dateCv.value);
            deadline = dParsed.to || dParsed.from || dParsed.date || null;
          } catch { /* ignore */ }
        }

        return {
          id: item.id,
          name: item.name,
          date: getVal(dateCol)?.text || '',
          deadline, // ISO date string (YYYY-MM-DD) for classification
          person: getVal(personCol)?.text || '',
          status: statusText,
          updates,
        };
      });

      return res.status(200).json({
        items: weeklyItems,
        columns: {
          date: dateCol ? { id: dateCol.id, title: dateCol.title } : null,
          person: personCol ? { id: personCol.id, title: personCol.title } : null,
          status: statusCol ? { id: statusCol.id, title: statusCol.title, type: statusCol.type } : null,
        },
        allColumns: columns.map((c) => ({ id: c.id, title: c.title, type: c.type })),
        weekRange: {
          from: monday.toISOString().split('T')[0],
          to: friday.toISOString().split('T')[0],
        },
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST: 그룹에 새 아이템 생성 + Doc 컬럼에 회의록 기록
  if (req.method === 'POST') {
    const { boardId, groupId, itemName, content, docColumnId } = req.body ?? {};
    if (!boardId || !groupId || !itemName || !content) {
      return res.status(400).json({ error: 'boardId, groupId, itemName, content가 필요합니다.' });
    }

    try {
      // 1단계: 그룹에 새 아이템 생성
      const createData = await mondayQuery(`
        mutation { create_item(board_id: ${boardId}, group_id: "${groupId}", item_name: ${JSON.stringify(itemName)}) { id name } }
      `, apiToken);
      const itemId = createData.create_item.id;

      // Doc 컬럼이 없으면 업데이트(코멘트)로 fallback
      if (!docColumnId) {
        const updateData = await mondayQuery(`
          mutation { create_update(item_id: ${itemId}, body: ${JSON.stringify(content)}) { id } }
        `, apiToken);
        return res.status(200).json({ success: true, itemId, mode: 'update', updateId: updateData.create_update.id });
      }

      // 2단계: Doc 컬럼에 새 문서 생성
      const docData = await mondayQuery(`
        mutation {
          create_doc(location: {
            board: { item_id: ${itemId}, column_id: "${docColumnId}" }
          }) { id }
        }
      `, apiToken);
      const docId = docData.create_doc.id;

      // 3단계: 회의록 단락별로 블록 추가 (순서 유지: after_block_id로 이전 블록 뒤에 삽입)
      const paragraphs = splitIntoParagraphs(content);
      let lastBlockId = null;
      for (const para of paragraphs) {
        let blockType = 'normal_text';
        let cleanPara = para;

        // # 회의록 → 큰 제목 (large_title) + 아래 구분선 자동 추가
        if (/^# /.test(para)) {
          blockType = 'large_title';
          cleanPara = para.replace(/^# /, '');

          const afterClause1 = lastBlockId ? `after_block_id: "${lastBlockId}",` : '';
          const titleBlock = await mondayQuery(`
            mutation {
              create_doc_block(
                type: large_title,
                doc_id: ${docId},
                ${afterClause1}
                content: ${JSON.stringify(toBlockContent(cleanPara))}
              ) { id }
            }
          `, apiToken);
          lastBlockId = titleBlock.create_doc_block.id;

          // 제목 아래 구분선 추가
          const dividerBlock = await mondayQuery(`
            mutation {
              create_doc_block(
                type: normal_text,
                doc_id: ${docId},
                after_block_id: "${lastBlockId}",
                content: ${JSON.stringify(toBlockContent('─'.repeat(49)))}
              ) { id }
            }
          `, apiToken);
          lastBlockId = dividerBlock.create_doc_block.id;
          continue;
        }
        // ## 제목 → 중간 제목 (medium_title)
        else if (/^## /.test(para)) {
          blockType = 'medium_title';
          cleanPara = para.replace(/^## /, '');
        }
        // **가. 나. 다. / **결정사항 종합** / **후속 조치 사항** / **다음 회의** 등 → 소제목 (small_title)
        else if (/^\*\*[가-힣]\./.test(para) || /^\*\*.+\*\*$/.test(para)) {
          blockType = 'small_title';
          cleanPara = para.replace(/\*\*/g, '');
        }
        // --- 구분선 → 긴 구분선
        else if (/^---$/.test(para)) {
          cleanPara = '─'.repeat(49);
        }
        // 일반 볼드(**텍스트**) 제거
        else {
          cleanPara = para.replace(/\*\*/g, '');
        }

        const afterClause = lastBlockId ? `after_block_id: "${lastBlockId}",` : '';
        const blockData = await mondayQuery(`
          mutation {
            create_doc_block(
              type: ${blockType},
              doc_id: ${docId},
              ${afterClause}
              content: ${JSON.stringify(toBlockContent(cleanPara))}
            ) { id }
          }
        `, apiToken);
        lastBlockId = blockData.create_doc_block.id;
      }

      return res.status(200).json({ success: true, itemId, mode: 'doc', docId });
    } catch (err) {
      console.error('Monday API error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

import Groq from 'groq-sdk';

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = '당신은 대한민국 기업 환경에 맞는 전문적인 업무 문서를 작성하는 전문가입니다. 마크다운 형식을 사용하고, 명확하고 간결하며 전문적인 어조로 작성하세요. 반드시 한국어로 작성하세요. 단, 고유명사·브랜드명·인증명·약어(예: GS인증, AI, IT 등)는 원문 그대로 사용하세요.';

async function streamGroq(prompt, res) {
  const stream = await groqClient.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    stream: true,
    max_tokens: 4000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  });
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
  }
}

async function streamGemini(prompt, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://document-starter.vercel.app',
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
      } catch {}
    }
  }
}

// 문서별 프롬프트 생성 함수
const buildPrompt = {
  업무요청서: (f) => `당신은 전문 비즈니스 문서 작성자입니다. 아래 정보를 바탕으로 격식체의 업무 요청서를 작성해주세요.

[입력 정보]
- 요청 제목: ${f.title}
- 요청 부서/담당자: ${f.requester}
- 요청 배경 및 목적: ${f.background}
- 요청 내용 (상세): ${f.content}
- 기대 결과물: ${f.expected}
- 완료 기한: ${f.deadline}
- 우선순위: ${f.priority}

다음 형식으로 작성하세요:

# 업무 요청서

**문서 번호**: [자동 생성]
**요청일**: [작성일]
**요청 부서/담당자**: ${f.requester}
**우선순위**: ${f.priority}

---

## 1. 요청 개요

## 2. 요청 배경 및 목적

## 3. 요청 내용 (상세)

## 4. 기대 결과물

## 5. 완료 기한 및 일정

## 6. 기타 참고 사항`,

  회의안건: (f) => `당신은 전문 비즈니스 문서 작성자입니다. 아래 정보를 바탕으로 체계적인 회의 안건 문서를 작성해주세요.

[입력 정보]
- 회의 제목: ${f.title}
- 회의 일시: ${f.datetime}
- 회의 장소: ${f.location}
- 참석자: ${f.attendees}
- 회의 목적: ${f.purpose}
- 논의 안건: ${f.topics}
- 사전 준비 사항: ${f.preparation}

다음 형식으로 작성하세요:

# 회의 안건

**회의명**: ${f.title}
**일시**: ${f.datetime}
**장소**: ${f.location}
**참석자**: ${f.attendees}

---

**회의 목적**: (한 문장으로 요약)

---

논의 안건을 가/나/다 순서로 구성하고, 각 안건 아래에 세부 내용을 bullet point로 정리하세요. 아래 형식을 따르세요:

**가. [첫 번째 안건 제목]**
- [핵심 논의 내용]
  - [세부 사항]
- [운영 방안 또는 고려 사항]
  - [세부 사항]
- 논의 사항: [논의할 내용]
- 결정 사항: [결정이 필요한 내용]

**나. [두 번째 안건 제목]**
- [핵심 논의 내용]
  - [세부 사항]
- 논의 사항: [논의할 내용]
- 결정 사항: [결정이 필요한 내용]

(안건 수에 따라 다/라/마 순으로 계속)

---

**사전 준비 사항**
- [준비 항목]`,

  회의록: (f) => `당신은 전문 비즈니스 문서 작성자입니다. 아래 정보를 바탕으로 체계적인 회의록을 작성해주세요. 논의 내용이 길더라도 핵심만 추출하여 간결하게 정리하세요. 한국어로 작성하되, 고유명사·인증명·약어는 원문 그대로 사용하세요.

[입력 정보]
- 회의 제목: ${f.title || '미정'}
- 회의 일시: ${f.datetime || '미정'}
- 회의 장소: ${f.location || '미정'}
- 참석자: ${f.attendees || '미정'}
- 회의 목적: ${f.purpose || ''}
- 논의 내용: ${f.discussions}
- 결정사항: ${f.decisions || ''}
- 후속 조치 사항: ${f.actions || ''}
- 다음 회의 일정: ${f.nextMeeting || '미정'}

다음 형식으로 작성하세요:

# 회의록

**회의명**: ${f.title || '미정'}
**일시**: ${f.datetime || '미정'}
**장소**: ${f.location || '미정'}
**참석자**: ${f.attendees || '미정'}

---

**회의 목적**: (한 문장으로 요약)

---

논의 내용을 가/나/다 순서로 구성하고, 각 안건 아래에 세부 내용을 bullet point로 정리하세요:

**가. [첫 번째 논의 항목 제목]**
- [논의된 핵심 내용]
  - [세부 내용 또는 발언 요약]
- 결정사항: [이 안건의 결정 내용]

**나. [두 번째 논의 항목 제목]**
- [논의된 핵심 내용]
  - [세부 내용]
- 결정사항: [이 안건의 결정 내용]

(안건 수에 따라 다/라/마 순으로 계속)

---

**결정사항 종합**
- [전체 결정사항 목록]

**후속 조치 사항**
- [담당자]: [조치 내용] ([기한])

**다음 회의**: ${f.nextMeeting || '미정'}`,

  주간보고: (f) => `당신은 전문 비즈니스 문서 작성자입니다. 아래 정보를 바탕으로 명확하고 구조적인 주간 업무 보고서를 작성해주세요.

[입력 정보]
- 보고 기간: ${f.period}
- 이번 주 완료 업무: ${f.completed || '(진행 중인 업무 데이터에 [완료] 태그로 포함됨)'}
- 현재 진행 중인 업무: ${f.inProgress}
- 다음 주 계획: ${f.nextPlan}
- 이슈 및 리스크: ${f.issues}

진행 중인 업무 데이터는 [태그명] 형태로 구분되어 있을 수 있습니다. 데이터에 존재하는 태그를 그대로 섹션 제목으로 사용해 분리하여 작성하세요. 태그가 없는 경우 하나의 섹션으로 작성하세요.

다음 형식으로 작성하세요. 각 섹션은 담당자별로 구분하여 작성하세요. 항목은 반드시 "- 내용" 형식의 불릿으로 작성하고, 볼드(**)나 별표(*)를 항목 앞에 붙이지 마세요:

# 주간 업무 보고

**보고 기간**: ${f.period}
**보고일**: [작성일]

---

## 1. 완료 업무
(완료 항목이 있으면 담당자별로 작성, 없으면 섹션 생략)

## 2. [태그명]
(데이터에 있는 태그마다 섹션 생성. 각 섹션은 담당자별로 구분. 없으면 섹션 생략)

### [담당자명]
- [항목]

## (마지막) 다음 주 업무 계획
- [계획 항목] (없으면 "미정" 으로 작성)`,

  이슈보고: (f) => `당신은 전문 비즈니스 문서 작성자입니다. 아래 정보를 바탕으로 명확하고 체계적인 이슈 보고서를 작성해주세요.

[입력 정보]
- 이슈 제목: ${f.title}
- 이슈 유형: ${f.issueType}
- 발생 일시: ${f.occurredAt}
- 보고자: ${f.reporter}
- 이슈 내용 (상세): ${f.description}
- 영향 범위: ${f.impact}
- 심각도: ${f.severity}
- 원인 분석: ${f.cause}
- 조치 사항 (완료/예정): ${f.action}
- 재발 방지 대책: ${f.prevention}

다음 형식으로 작성하세요:

# 이슈 보고서

**이슈 제목**: ${f.title}
**이슈 유형**: ${f.issueType}
**심각도**: ${f.severity}
**발생 일시**: ${f.occurredAt}
**보고자**: ${f.reporter}

---

## 1. 이슈 개요

## 2. 이슈 상세 내용

## 3. 영향 범위 및 피해 현황

## 4. 원인 분석

## 5. 조치 사항

## 6. 재발 방지 대책

## 7. 향후 모니터링 계획`,

  오늘브리핑: (f) => `오늘은 ${f.today}입니다.
아래는 이번 주 monday.com 업무 현황입니다.

완료된 항목 (${f.doneCount}건):
${f.done || '없음'}

오늘 마감 또는 진행 중인 항목 (${f.inProgressCount}건):
${f.inProgress || '없음'}

지연된 항목 (${f.delayedCount}건):
${f.delayed || '없음'}

위 현황을 바탕으로 오늘 아침 팀에게 공유할 업무 브리핑을 작성해줘.
형식은 반드시 아래 마크다운 헤더를 그대로 사용할 것:

## 오늘의 핵심 챙길 것
(3줄 이내 핵심 요약)

## 완료 현황
(완료된 항목 정리)

## 오늘 집중할 항목
(오늘 마감/진행 중 항목)

## 지연 주의 항목
(지연 항목이 있을 때만 작성. 없으면 이 섹션 전체 생략)

## 마무리 멘트
(한 줄, 팀장이 팀원에게 공유하는 따뜻하고 실무적인 마무리)

톤: 간결하고 실무적으로, 팀장이 팀원에게 공유하는 느낌으로. 한국어로 작성.`,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { documentType, fields, aiProvider = 'groq' } = req.body ?? {};

  if (!documentType || !fields) {
    return res.status(400).json({ error: '문서 타입과 입력 정보가 필요합니다.' });
  }

  if (!buildPrompt[documentType]) {
    return res.status(400).json({ error: '지원하지 않는 문서 종류입니다.' });
  }

  // SSE 스트리밍 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    if (aiProvider === 'gemini') {
      // Gemini: 컨텍스트 윈도우가 크므로 청크 분할 없이 바로 스트리밍
      const prompt = buildPrompt[documentType](fields);
      await streamGemini(prompt, res);
    } else {
      // GROQ: 회의록 긴 텍스트는 청크 요약 후 최종 생성
      if (documentType === '회의록' && fields.discussions && fields.discussions.length > 8000) {
        const CHUNK_SIZE = 8000;
        const text = fields.discussions;
        const chunks = [];
        for (let i = 0; i < text.length; i += CHUNK_SIZE) {
          chunks.push(text.slice(i, i + CHUNK_SIZE));
        }

        // 1단계: 각 청크를 순차 요약
        const summaries = [];
        for (let i = 0; i < chunks.length; i++) {
          const summaryRes = await groqClient.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 1500,
            messages: [
              { role: 'system', content: '회의 내용을 간결하게 한국어로 요약하되, 고유명사·인증명·약어는 원문 그대로 사용하세요. 핵심 논의사항, 결정사항, 후속 조치 사항 위주로 정리하세요.' },
              { role: 'user', content: `[${i + 1}/${chunks.length} 부분]\n${chunks[i]}` },
            ],
          });
          summaries.push(summaryRes.choices[0].message.content);
          res.write(`data: ${JSON.stringify({ text: '' })}\n\n`);
        }

        // 2단계: 요약본 합쳐서 최종 회의록 생성 (스트리밍)
        const combinedSummary = summaries.join('\n\n---\n\n');
        const finalFields = { ...fields, discussions: combinedSummary };
        const prompt = buildPrompt[documentType](finalFields);
        await streamGroq(prompt, res);
      } else {
        const trimmedFields = { ...fields };
        if (documentType === '회의록' && fields.discussions?.length > 8000) {
          trimmedFields.discussions = fields.discussions.slice(0, 8000);
        }
        const prompt = buildPrompt[documentType](trimmedFields);
        await streamGroq(prompt, res);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('AI API error:', error);
    const errMsg = error?.error?.error?.message || error?.message || '문서 생성 중 오류가 발생했습니다.';
    const errPayload = JSON.stringify({ error: errMsg });
    res.write(`data: ${errPayload}\n\n`);
    res.end();
  }
}

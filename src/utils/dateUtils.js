export function getThisWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=일, 1=월
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

export function getDaysOverdue(deadlineStr) {
  if (!deadlineStr) return 0;
  const deadline = new Date(deadlineStr);
  deadline.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today - deadline) / 86400000));
}

export function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const { monday, sunday } = getThisWeekRange();
  const date = new Date(dateStr);
  return date >= monday && date <= sunday;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const match = String(dateStr).match(/(\d{4}-\d{2}-\d{2})/);
  if (!match) return dateStr;
  const date = new Date(match[1] + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}

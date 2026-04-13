import { useState, useEffect, useCallback } from 'react';

export function useWeeklyItems(boardId) {
  const [done, setDone] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [delayed, setDelayed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/monday?action=weekly-items&boardId=${boardId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const nextDone = [];
      const nextInProgress = [];
      const nextDelayed = [];

      for (const item of json.items) {
        const isDone = /완료|done/i.test(item.status);
        if (isDone) {
          nextDone.push(item);
        } else if (item.deadline) {
          const deadline = new Date(item.deadline + 'T00:00:00');
          if (deadline < today) {
            nextDelayed.push(item);
          } else {
            nextInProgress.push(item);
          }
        } else {
          nextInProgress.push(item);
        }
      }

      setDone(nextDone);
      setInProgress(nextInProgress);
      setDelayed(nextDelayed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => { load(); }, [load]);

  return { done, inProgress, delayed, loading, error, refetch: load };
}

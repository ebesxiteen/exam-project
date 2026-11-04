import { useEffect } from "react";
import { useAsync } from "../../shared/hooks/useAsync.js";
import { resultsApi } from "./resultsApi.js";

const POLL_INTERVAL_MS = 10_000;

export function useExamResults(examId) {
  const { data, error, loading, reload } = useAsync(() => resultsApi.list(examId), [examId]);

  useEffect(() => {
    const id = setInterval(reload, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [reload]);

  return { rows: data ?? [], error, loading, reload };
}

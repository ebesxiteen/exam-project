import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext.jsx";
import { resultsApi } from "../features/results/resultsApi.js";
import ScoreTable from "../features/results/ScoreTable.jsx";
import { summarizeResults } from "../features/results/summarizeResults.js";
import { useExamResults } from "../features/results/useExamResults.js";
import { tokenStore } from "../shared/api/tokenStore.js";
import { Alert, AsyncBoundary, Button, DownloadButton, PageHeader } from "../shared/ui";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function ViolationsStream({ examId }) {
  const [violations, setViolations] = useState([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);

  const toggle = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
      setConnected(false);
      return;
    }
    const token = tokenStore.token;
    const url = `${BASE}/api/v1/exams/${examId}/violations/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.connected) { setConnected(true); return; }
      setViolations((prev) => [data, ...prev].slice(0, 100));
    };
    es.onerror = () => { es.close(); esRef.current = null; setConnected(false); };
  };

  useEffect(() => () => esRef.current?.close(), []);

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
        <strong>Vi phạm real-time</strong>
        <button onClick={toggle} style={{ fontSize: "0.8rem" }}>
          {connected ? "Dừng theo dõi" : "Bắt đầu theo dõi"}
        </button>
        {connected && <span style={{ color: "green", fontSize: "0.8rem" }}>● Đang kết nối</span>}
      </div>
      {violations.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "#888" }}>Chưa có vi phạm nào được ghi nhận.</p>
      ) : (
        <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "4px 8px" }}>Thời gian</th>
              <th style={{ textAlign: "left", padding: "4px 8px" }}>Loại vi phạm</th>
              <th style={{ textAlign: "left", padding: "4px 8px" }}>Attempt ID</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((v) => (
              <tr key={v.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: "4px 8px" }}>{new Date(v.occurred_at).toLocaleTimeString()}</td>
                <td style={{ padding: "4px 8px" }}>{v.type}</td>
                <td style={{ padding: "4px 8px" }}>{v.attempt_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const { examId } = useParams();
  const { user } = useAuth();
  const { rows, loading, error, reload } = useExamResults(examId);
  const [downloadError, setDownloadError] = useState(null);
  const summary = summarizeResults(rows);

  return (
    <>
      <PageHeader
        title={`Bảng điểm đề #${examId}`}
        subtitle={`${summary.total} bài làm · ${summary.submitted} đã nộp · điểm trung bình ${summary.average}`}
        actions={
          <>
            <DownloadButton
              fetcher={() => resultsApi.downloadCsv(examId)}
              filename={`exam_${examId}_results.csv`}
              onError={setDownloadError}
            >
              Tải CSV
            </DownloadButton>
            <Button as={Link} to="/" variant="secondary">
              Quay lại
            </Button>
          </>
        }
      />
      {downloadError && <Alert onClose={() => setDownloadError(null)}>{downloadError.message}</Alert>}
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        <ScoreTable rows={rows} />
      </AsyncBoundary>
      {user?.role === "teacher" && <ViolationsStream examId={examId} />}
    </>
  );
}

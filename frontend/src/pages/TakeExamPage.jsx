import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { attemptsApi } from "../features/attempts/attemptsApi.js";
import ExamTimerBar from "../features/attempts/ExamTimerBar.jsx";
import QuestionCard from "../features/attempts/QuestionCard.jsx";
import { useAttemptSession } from "../features/attempts/useAttemptSession.js";
import { Alert, Button, ConfirmDialog, Spinner } from "../shared/ui";

export default function TakeExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const onFinished = useCallback((attemptId) => navigate(`/attempts/${attemptId}/result`, { replace: true }), [navigate]);
  const session = useAttemptSession(examId, { onFinished });

  // Lưu attemptId vào ref để dùng trong event listener
  const attemptIdRef = useRef(null);
  if (session.ready && session.attemptId != null) attemptIdRef.current = session.attemptId;

  useEffect(() => {
    if (!session.ready) return;

    const report = (type) => {
      const id = attemptIdRef.current;
      if (id != null) attemptsApi.reportViolation(id, type).catch(() => {});
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") report("tab_switch");
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) report("fullscreen_exit");
    };

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [session.ready]);

  if (session.error && !session.ready) return <Alert>{session.error.message}</Alert>;
  if (!session.ready) return <Spinner label="Đang tải đề..." />;

  return (
    <>
      <ExamTimerBar
        answered={Object.keys(session.answers).length}
        total={session.questions.length}
        remaining={session.remaining}
        saveState={session.saveState}
      />
      {session.error && <Alert>{session.error.message}</Alert>}

      {session.questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          index={index}
          question={question}
          value={session.answers[question.id]}
          onChange={session.choose}
        />
      ))}

      <Button onClick={() => setConfirming(true)} disabled={session.submitting}>
        Nộp bài
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Nộp bài?"
        message="Bạn không thể sửa đáp án sau khi nộp."
        confirmLabel="Nộp bài"
        loading={session.submitting}
        onConfirm={session.submit}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

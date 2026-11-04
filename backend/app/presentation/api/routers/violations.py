"""Vi phạm trong thi: thí sinh ghi nhận, giám thị theo dõi real-time qua SSE."""
import asyncio
import json
import logging
from collections import defaultdict
from datetime import UTC, datetime

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.domain import rules
from app.domain.entities import ROLE_ADMIN, ROLE_TEACHER, User, Violation
from app.domain.errors import UnauthorizedError
from app.presentation.api.dependencies import Student, UowDep, token_blacklist, tokens, uow_factory

log = logging.getLogger("exam.violations")
router = APIRouter(prefix="/api/v1", tags=["Violations (giám sát thi)"])

# Event bus in-memory: exam_id → list of subscriber queues
_subscribers: dict[int, list[asyncio.Queue]] = defaultdict(list)


class ViolationIn(BaseModel):
    type: str  # tab_switch | fullscreen_exit | copy_paste | camera_blocked | ...


class ViolationOut(BaseModel):
    id: int
    attempt_id: int
    type: str
    occurred_at: datetime

    @classmethod
    def from_entity(cls, v: Violation) -> "ViolationOut":
        return cls(id=v.id, attempt_id=v.attempt_id, type=v.type, occurred_at=v.occurred_at)


@router.post("/attempts/{attempt_id}/violations", response_model=ViolationOut,
             status_code=status.HTTP_201_CREATED)
async def report_violation(attempt_id: int, data: ViolationIn, uow: UowDep, user: Student):
    """Thí sinh ghi nhận hành vi vi phạm (đổi tab, thoát toàn màn hình...). Giám thị nhận ngay qua SSE."""
    async with uow:
        attempt = await uow.attempts.get(attempt_id)
        if attempt is None or attempt.user_id != user.id:
            from app.domain.errors import NotFoundError
            raise NotFoundError("Bài làm không tồn tại")
        violation = await uow.violations.add(Violation(attempt_id=attempt_id, type=data.type,
                                                       occurred_at=datetime.now(UTC).replace(tzinfo=None)))
        await uow.commit()

    out = ViolationOut.from_entity(violation)
    # Broadcast tới tất cả subscriber đang theo dõi đề thi này
    for q in _subscribers.get(attempt.exam_id, []):
        await q.put(out)

    log.info("Vi phạm [%s] - attempt %d (user %d)", data.type, attempt_id, user.id)
    return out


async def _get_teacher_from_token(token: Annotated[Optional[str], Query()] = None) -> User:
    """Dependency cho SSE: đọc token từ query param vì EventSource không hỗ trợ Authorization header."""
    if not token:
        raise UnauthorizedError("Thiếu token")
    if token_blacklist.get(token) is not None:
        raise UnauthorizedError("Token đã bị thu hồi")
    from app.application.use_cases.auth import Authenticate
    async with uow_factory() as uow:
        user = await Authenticate(uow, tokens).execute(token)
    rules.ensure_role(user, ROLE_TEACHER, ROLE_ADMIN)
    return user


@router.get("/exams/{exam_id}/violations", response_model=list[ViolationOut])
async def list_exam_violations(exam_id: int, uow: UowDep,
                               teacher: Annotated[User, Depends(_get_teacher_from_token)]):
    """Lấy toàn bộ lịch sử vi phạm của một đề thi (cho giáo viên)."""
    async with uow:
        violations = await uow.violations.list_by_exam(exam_id)
    return [ViolationOut.from_entity(v) for v in violations]


@router.get("/exams/{exam_id}/violations/stream")
async def stream_violations(exam_id: int, teacher: Annotated[User, Depends(_get_teacher_from_token)]):
    """SSE stream: giám thị subscribe để nhận vi phạm real-time khi thí sinh ghi nhận."""

    async def event_generator():
        q: asyncio.Queue = asyncio.Queue()
        _subscribers[exam_id].append(q)
        try:
            yield "data: {\"connected\": true}\n\n"
            while True:
                try:
                    violation: ViolationOut = await asyncio.wait_for(q.get(), timeout=30)
                    yield f"data: {json.dumps(violation.model_dump(mode='json'))}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            _subscribers[exam_id].remove(q)

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

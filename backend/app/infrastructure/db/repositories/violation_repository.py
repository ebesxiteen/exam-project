from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import Violation
from app.infrastructure.db.orm_models import AttemptORM, ViolationORM


def _to_violation(orm: ViolationORM) -> Violation:
    return Violation(id=orm.id, attempt_id=orm.attempt_id, type=orm.type, occurred_at=orm.occurred_at)


class SqlAlchemyViolationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, violation: Violation) -> Violation:
        orm = ViolationORM(attempt_id=violation.attempt_id, type=violation.type)
        self.session.add(orm)
        await self.session.flush()
        return _to_violation(orm)

    async def list_by_attempt(self, attempt_id: int) -> list[Violation]:
        rows = (await self.session.execute(
            select(ViolationORM).where(ViolationORM.attempt_id == attempt_id).order_by(ViolationORM.occurred_at)
        )).scalars().all()
        return [_to_violation(r) for r in rows]

    async def list_by_exam(self, exam_id: int) -> list[Violation]:
        rows = (await self.session.execute(
            select(ViolationORM)
            .join(AttemptORM, AttemptORM.id == ViolationORM.attempt_id)
            .where(AttemptORM.exam_id == exam_id)
            .order_by(ViolationORM.occurred_at)
        )).scalars().all()
        return [_to_violation(r) for r in rows]

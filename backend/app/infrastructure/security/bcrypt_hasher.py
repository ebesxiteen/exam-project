import asyncio

import bcrypt as _bcrypt


def _hash_sync(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


def _verify_sync(password: str, stored: str) -> bool:
    return _bcrypt.checkpw(password.encode(), stored.encode())


class BcryptHasher:
    """Băm mật khẩu bằng bcrypt. Chạy ở luồng riêng để không chặn event loop."""

    def __init__(self) -> None:
        self._dummy_hash = _hash_sync("dummy-password")

    async def hash(self, password: str) -> str:
        return await asyncio.to_thread(_hash_sync, password)

    async def verify(self, password: str, stored: str | None) -> bool:
        if stored is None:
            await asyncio.to_thread(_verify_sync, password, self._dummy_hash)
            return False
        return await asyncio.to_thread(_verify_sync, password, stored)

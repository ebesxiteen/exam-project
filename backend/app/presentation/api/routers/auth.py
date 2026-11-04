import time
from datetime import UTC, datetime
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.presentation.api.dependencies import (
    CurrentUser,
    LoginDep,
    RegisterStudentDep,
    UowDep,
    login_rate_limit,
    hasher,
    oauth2_scheme,
    token_blacklist,
    tokens,
)
from app.presentation.api.schemas.auth import ChangePasswordIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterIn, use_case: RegisterStudentDep):
    """Sinh viên tự đăng ký. Giáo viên/Admin do Admin tạo qua /api/users."""
    return UserOut.model_validate(await use_case.execute(data.username, data.password, data.full_name))


@router.post("/login", response_model=TokenOut, dependencies=[Depends(login_rate_limit)])
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], use_case: LoginDep):
    token, user = await use_case.execute(form.username, form.password)
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@router.post("/refresh", response_model=TokenOut)
async def refresh(user: CurrentUser):
    """Làm mới access token. Gửi token hiện tại trong header Authorization, nhận token mới."""
    new_token = tokens.create(user.id, user.role)
    return TokenOut(access_token=new_token, user=UserOut.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(token: Annotated[str, Depends(oauth2_scheme)], user: CurrentUser):
    """Thu hồi token hiện tại. Token bị vô hiệu ngay lập tức cho đến khi hết hạn."""
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        exp = payload.get("exp", 0)
        ttl = max(exp - time.time(), 1.0)
    except Exception:
        ttl = float(tokens.expire_minutes * 60)
    token_blacklist.set(token, True, ttl=ttl)


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(data: ChangePasswordIn, user: CurrentUser, uow: UowDep):
    """Đổi mật khẩu. Cần cung cấp mật khẩu hiện tại để xác minh."""
    if not await hasher.verify(data.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mật khẩu hiện tại không đúng")
    new_hash = await hasher.hash(data.new_password)
    async with uow:
        await uow.users.update_password(user.id, new_hash)
        await uow.commit()


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser):
    return UserOut.model_validate(user)

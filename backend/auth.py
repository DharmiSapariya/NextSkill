import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

# Import database models and session dependency generator
from models import User, get_db

logger = logging.getLogger("nextskill.auth")

# Force strict secret checking for production environments
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not JWT_SECRET_KEY:
    if ENVIRONMENT == "production":
        raise RuntimeError("CRITICAL: JWT_SECRET_KEY must be set in production environment!")
    JWT_SECRET_KEY = "dev-insecure-secret-change-me"
    logger.warning("Using insecure fallback JWT_SECRET_KEY for non-production environment.")

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    """Hashes a password using bcrypt via passlib."""
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored bcrypt hash."""
    try:
        return pwd_context.verify(password, hashed_password)
    except Exception as exc:
        logger.error("Error verifying password hash: %s", exc)
        return False


def create_access_token(user_id: int) -> str:
    """Generates a signed JWT access token for a given user ID."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Dependency that extracts and validates the JWT bearer token,
    returning the authenticated database User object.
    """
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            credentials.credentials, 
            JWT_SECRET_KEY, 
            algorithms=[JWT_ALGORITHM]
        )
        user_id_raw: Optional[str] = payload.get("sub")
        if user_id_raw is None:
            raise unauthorized
        user_id = int(user_id_raw)
    except (JWTError, TypeError, ValueError):
        raise unauthorized

    # Query scoped per-request database session
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise unauthorized
        
    return user


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that enforces administrative privileges on the authenticated user."""
    if not current_user.is_admin:
        logger.warning("Admin access denied: user id=%s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Admin access required"
        )
    return current_user
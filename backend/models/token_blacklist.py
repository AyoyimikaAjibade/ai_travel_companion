from datetime import datetime
from sqlmodel import Field
import uuid
import hashlib

from .base import BaseModel

class TokenBlacklist(BaseModel, table=True):
    __tablename__ = "token_blacklist"
    
    token_hash: str = Field(unique=True, index=True, nullable=False)
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False, index=True)
    expires_at: datetime = Field(nullable=False, index=True)
    blacklisted_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    
    @staticmethod
    def hash_token(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()


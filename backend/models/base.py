from datetime import datetime
from typing import Any, Dict, Optional
from sqlmodel import SQLModel, Field
import uuid

class BaseModel(SQLModel):
    """
    Base model with common fields for all database models.
    """
    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False,
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        index=True,
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
    )
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            uuid.UUID: str,
        }
    
    def dict(self, *args, **kwargs) -> Dict[str, Any]:
        """Override dict to handle UUID serialization."""
        d = super().dict(*args, **kwargs)
        for k, v in d.items():
            if isinstance(v, uuid.UUID):
                d[k] = str(v)
        return d

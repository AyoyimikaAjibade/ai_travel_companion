from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship, Column, JSON
import uuid

class PlanBase(SQLModel):
    total_price: float = Field(ge=0, nullable=False)
    score: Optional[float] = Field(default=None, ge=0, le=10)
    explanation: Optional[str] = Field(default=None)
    flight: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    hotel: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    car: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    attractions: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    deeplinks: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    ai_generated: bool = Field(default=False, nullable=False)
    manual: bool = Field(default=False, nullable=False)

class PlanCreate(PlanBase):
    chat_id: uuid.UUID

class PlanUpdate(SQLModel):
    total_price: Optional[float] = Field(None, ge=0)
    score: Optional[float] = Field(None, ge=0, le=10)
    explanation: Optional[str] = None
    flight: Optional[Dict[str, Any]] = None
    hotel: Optional[Dict[str, Any]] = None
    car: Optional[Dict[str, Any]] = None
    attractions: Optional[Dict[str, Any]] = None
    deeplinks: Optional[Dict[str, Any]] = None
    ai_generated: Optional[bool] = None
    manual: Optional[bool] = None

class Plan(PlanBase, table=True):
    __tablename__ = "plans"
    
    plan_id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    created_time: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        index=True
    )
    updated_time: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False
    )
    
    chat_id: uuid.UUID = Field(foreign_key="chats.id", nullable=False)
    
    chat: "Chat" = Relationship(back_populates="plans")


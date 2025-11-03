"""
Database models for the AI Travel Companion application.
"""

from .base import BaseModel
from .user import User, UserPreference
from .chat import Chat, ChatCreate, ChatPublic, ChatUpdate
from .plan import Plan, PlanBase, PlanCreate, PlanUpdate
from .chat_message import ChatMessage, ChatMessageCreate, ChatMessageUpdate

__all__ = [
    'BaseModel',
    'User', 'UserPreference',
    'Chat', 'ChatCreate', 'ChatPublic', 'ChatUpdate',
    'Plan', 'PlanBase', 'PlanCreate', 'PlanUpdate',
    'ChatMessage', 'ChatMessageCreate', 'ChatMessageUpdate'
]

"""
Redis cache connection and configuration.
"""

import json
from typing import Optional, Any, Dict, List
import redis
from redis.exceptions import RedisError
from core.config import settings
import logging

logger = logging.getLogger(__name__)


class CacheService:
    """Redis cache service for temporary storage of plans and chat messages."""
    
    def __init__(self):
        """Initialize Redis connection."""
        try:
            if settings.REDIS_URL:
                self.redis_client = redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5
                )
            else:
                self.redis_client = redis.Redis(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    db=settings.REDIS_DB,
                    password=settings.REDIS_PASSWORD,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5
                )
            # Test connection
            self.redis_client.ping()
            logger.info("Redis connection established successfully")
        except RedisError as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis_client = None
    
    def is_available(self) -> bool:
        """Check if Redis is available."""
        if self.redis_client is None:
            return False
        try:
            self.redis_client.ping()
            return True
        except RedisError:
            return False
    
    # Plan caching methods
    def save_plan_draft(self, chat_id: str, slot_id: str, plan_data: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Save a draft plan to Redis."""
        if not self.is_available():
            return False
        
        try:
            key = f"plan:draft:{chat_id}:{slot_id}"
            ttl = ttl or settings.CACHE_TTL_PLANS
            self.redis_client.setex(
                key,
                ttl,
                json.dumps(plan_data, default=str)
            )
            # Also maintain a list of draft plans for this chat
            list_key = f"plans:draft:{chat_id}"
            self.redis_client.sadd(list_key, key)
            self.redis_client.expire(list_key, ttl)
            return True
        except RedisError as e:
            logger.error(f"Error saving plan draft to Redis: {e}")
            return False
    
    def get_plan_draft(self, chat_id: str, slot_id: str) -> Optional[Dict[str, Any]]:
        """Get a draft plan from Redis."""
        if not self.is_available():
            return None
        
        try:
            key = f"plan:draft:{chat_id}:{slot_id}"
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
            return None
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Error getting plan draft from Redis: {e}")
            return None
    
    def get_all_draft_plans(self, chat_id: str) -> List[Dict[str, Any]]:
        """Get all draft plans for a chat."""
        if not self.is_available():
            return []
        
        try:
            list_key = f"plans:draft:{chat_id}"
            plan_keys = self.redis_client.smembers(list_key)
            plans = []
            for key in plan_keys:
                data = self.redis_client.get(key)
                if data:
                    plans.append(json.loads(data))
            return plans
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Error getting draft plans from Redis: {e}")
            return []
    
    def delete_plan_draft(self, chat_id: str, slot_id: str) -> bool:
        """Delete a draft plan from Redis."""
        if not self.is_available():
            return False
        
        try:
            key = f"plan:draft:{chat_id}:{slot_id}"
            self.redis_client.delete(key)
            list_key = f"plans:draft:{chat_id}"
            self.redis_client.srem(list_key, key)
            return True
        except RedisError as e:
            logger.error(f"Error deleting plan draft from Redis: {e}")
            return False
    
    def delete_all_draft_plans(self, chat_id: str) -> bool:
        """Delete all draft plans for a chat."""
        if not self.is_available():
            return False
        
        try:
            list_key = f"plans:draft:{chat_id}"
            plan_keys = self.redis_client.smembers(list_key)
            if plan_keys:
                self.redis_client.delete(*plan_keys)
            self.redis_client.delete(list_key)
            return True
        except RedisError as e:
            logger.error(f"Error deleting all draft plans from Redis: {e}")
            return False
    
    # Chat message caching methods
    def save_chat_message(self, chat_id: str, slot_id: str, message: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Save a chat message to Redis list."""
        if not self.is_available():
            return False
        
        try:
            key = f"messages:{chat_id}:{slot_id}"
            ttl = ttl or settings.CACHE_TTL_CHAT_MESSAGES
            self.redis_client.rpush(key, json.dumps(message, default=str))
            self.redis_client.expire(key, ttl)
            return True
        except RedisError as e:
            logger.error(f"Error saving chat message to Redis: {e}")
            return False
    
    def get_chat_messages(self, chat_id: str, slot_id: str) -> List[Dict[str, Any]]:
        """Get all chat messages for a chat session."""
        if not self.is_available():
            return []
        
        try:
            key = f"messages:{chat_id}:{slot_id}"
            messages = self.redis_client.lrange(key, 0, -1)
            return [json.loads(msg) for msg in messages]
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Error getting chat messages from Redis: {e}")
            return []
    
    def delete_chat_messages(self, chat_id: str, slot_id: str) -> bool:
        """Delete all chat messages for a chat session."""
        if not self.is_available():
            return False
        
        try:
            key = f"messages:{chat_id}:{slot_id}"
            self.redis_client.delete(key)
            return True
        except RedisError as e:
            logger.error(f"Error deleting chat messages from Redis: {e}")
            return False
    
    # Chat session caching
    def save_chat_session(self, chat_id: str, slot_id: str, session_data: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Save chat session data (slots, current state, etc.)."""
        if not self.is_available():
            return False
        
        try:
            key = f"session:{chat_id}:{slot_id}"
            ttl = ttl or settings.CACHE_TTL_CHAT_MESSAGES
            self.redis_client.setex(
                key,
                ttl,
                json.dumps(session_data, default=str)
            )
            return True
        except RedisError as e:
            logger.error(f"Error saving chat session to Redis: {e}")
            return False
    
    def get_chat_session(self, chat_id: str, slot_id: str) -> Optional[Dict[str, Any]]:
        """Get chat session data."""
        if not self.is_available():
            return None
        
        try:
            key = f"session:{chat_id}:{slot_id}"
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
            return None
        except (RedisError, json.JSONDecodeError) as e:
            logger.error(f"Error getting chat session from Redis: {e}")
            return None
    
    def delete_chat_session(self, chat_id: str, slot_id: str) -> bool:
        """Delete chat session data."""
        if not self.is_available():
            return False
        
        try:
            key = f"session:{chat_id}:{slot_id}"
            self.redis_client.delete(key)
            return True
        except RedisError as e:
            logger.error(f"Error deleting chat session from Redis: {e}")
            return False


# Global cache service instance
cache_service = CacheService()


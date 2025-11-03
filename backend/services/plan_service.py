"""
Plan service for travel plan management operations.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID

from .base_service import BaseService
from repositories.plan_repository import PlanRepository
from models.plan import Plan, PlanCreate, PlanUpdate
from core.cache import cache_service


class PlanService(BaseService[Plan]):
    """Service for plan management operations."""
    
    def __init__(self):
        self.plan_repository = PlanRepository()
        super().__init__(self.plan_repository)
    
    def get_chat_plans(self, db: Session, chat_id: UUID, skip: int = 0, limit: int = 100) -> List[Plan]:
        """Get all plans for a specific chat."""
        return self.plan_repository.get_chat_plans(db, chat_id, skip=skip, limit=limit)
    
    def create_plan(self, db: Session, plan_create: PlanCreate) -> Plan:
        """Create a new plan."""
        return self.plan_repository.create(db, plan_create)
    
    def create_plan_draft(self, chat_id: UUID, slot_id: str, plan_data: Dict[str, Any]) -> bool:
        """Save a draft plan to Redis cache (not yet in database)."""
        return cache_service.save_plan_draft(str(chat_id), slot_id, plan_data)
    
    def get_plan_draft(self, chat_id: UUID, slot_id: str) -> Optional[Dict[str, Any]]:
        """Get a draft plan from Redis cache."""
        return cache_service.get_plan_draft(str(chat_id), slot_id)
    
    def get_all_draft_plans(self, chat_id: UUID) -> List[Dict[str, Any]]:
        """Get all draft plans for a chat from Redis."""
        return cache_service.get_all_draft_plans(str(chat_id))
    
    def update_plan_draft(self, chat_id: UUID, slot_id: str, plan_data: Dict[str, Any]) -> bool:
        """Update a draft plan in Redis cache."""
        return cache_service.save_plan_draft(str(chat_id), slot_id, plan_data)
    
    def delete_plan_draft(self, chat_id: UUID, slot_id: str) -> bool:
        """Delete a draft plan from Redis cache."""
        return cache_service.delete_plan_draft(str(chat_id), slot_id)
    
    def confirm_plan(self, db: Session, chat_id: UUID, slot_id: str, plan_data: Dict[str, Any]) -> Plan:
        """Confirm and save a plan from Redis cache to PostgreSQL database."""
        # Create plan from cached data
        plan_create = PlanCreate(
            chat_id=chat_id,
            total_price=plan_data.get('total_price', 0),
            score=plan_data.get('score'),
            explanation=plan_data.get('explanation'),
            flight_data=plan_data.get('flight_data'),
            hotel_data=plan_data.get('hotel_data'),
            car_data=plan_data.get('car_data'),
            attractions_data=plan_data.get('attractions_data'),
            deeplinks=plan_data.get('deeplinks', {}),
            ai_generated=plan_data.get('ai_generated', True),
            manual=plan_data.get('manual', False)
        )
        
        plan = self.create_plan(db, plan_create)
        
        # Delete from cache after successful save
        cache_service.delete_plan_draft(str(chat_id), slot_id)
        
        return plan
    
    def bulk_confirm_plans(self, db: Session, chat_id: UUID, slot_ids: List[str]) -> List[Plan]:
        """Bulk confirm multiple plans from Redis cache to PostgreSQL."""
        confirmed_plans = []
        
        for slot_id in slot_ids:
            plan_data = cache_service.get_plan_draft(str(chat_id), slot_id)
            if plan_data:
                plan = self.confirm_plan(db, chat_id, slot_id, plan_data)
                if plan:
                    confirmed_plans.append(plan)
        
        return confirmed_plans
    
    def get_best_plans(self, db: Session, chat_id: UUID, limit: int = 5) -> List[Plan]:
        """Get best plans for a chat ordered by score."""
        return self.plan_repository.get_best_plans_for_chat(db, chat_id, limit=limit)
    
    def get_cheapest_plans(self, db: Session, chat_id: UUID, limit: int = 5) -> List[Plan]:
        """Get cheapest plans for a chat."""
        return self.plan_repository.get_cheapest_plans_for_chat(db, chat_id, limit=limit)
    
    def get_ai_generated_plans(self, db: Session, chat_id: UUID, skip: int = 0, limit: int = 100) -> List[Plan]:
        """Get AI-generated plans for a chat."""
        return self.plan_repository.get_ai_generated_plans(db, chat_id, skip=skip, limit=limit)
    
    def get_manual_plans(self, db: Session, chat_id: UUID, skip: int = 0, limit: int = 100) -> List[Plan]:
        """Get manually created plans for a chat."""
        return self.plan_repository.get_manual_plans(db, chat_id, skip=skip, limit=limit)
    
    def search_plans(self, db: Session, search_params: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[Plan]:
        """Search plans with various filters."""
        return self.plan_repository.search_plans(db, search_params, skip=skip, limit=limit)
    
    def update_plan(self, db: Session, plan_id: UUID, plan_update: PlanUpdate) -> Optional[Plan]:
        """Update plan information."""
        plan = self.plan_repository.get_by_id(db, plan_id)
        if not plan:
            return None
        
        return self.plan_repository.update(db, plan, plan_update)
    
    def calculate_plan_score(self, plan_data: Dict[str, Any]) -> float:
        """Calculate plan score based on various factors."""
        # This is a dummy implementation - you would implement your actual scoring logic
        base_score = 5.0
        
        # Factor in price (lower price = higher score)
        price = plan_data.get('total_price', 1000)
        price_score = max(0, 10 - (price / 100))  # Simplified scoring
        
        # Factor in completeness (having all components)
        completeness_score = 0
        if plan_data.get('flight_data'):
            completeness_score += 2
        if plan_data.get('hotel_data'):
            completeness_score += 2
        if plan_data.get('car_data'):
            completeness_score += 1
        if plan_data.get('attractions_data'):
            completeness_score += 1
        
        # Combine scores (you would implement more sophisticated logic)
        final_score = min(10, (base_score + price_score + completeness_score) / 3)
        return round(final_score, 2)
    
    def update_plan_score(self, db: Session, plan_id: UUID) -> Optional[Plan]:
        """Recalculate and update plan score."""
        plan = self.plan_repository.get_by_id(db, plan_id)
        if not plan:
            return None
        
        # Get plan data for scoring
        plan_data = {
            'total_price': plan.total_price,
            'flight_data': plan.flight_data,
            'hotel_data': plan.hotel_data,
            'car_data': plan.car_data,
            'attractions_data': plan.attractions_data
        }
        
        new_score = self.calculate_plan_score(plan_data)
        return self.plan_repository.update_plan_score(db, plan_id, new_score)
    
    def get_plan_recommendations(self, db: Session, chat_id: UUID, user_preferences: Dict[str, Any] = None) -> List[Plan]:
        """Get plan recommendations based on user preferences."""
        # This is a dummy implementation - you would implement ML-based recommendations
        search_params = {'chat_id': chat_id}
        
        if user_preferences:
            if 'max_budget' in user_preferences:
                search_params['max_price'] = user_preferences['max_budget']
            
            if 'min_score' in user_preferences:
                search_params['min_score'] = user_preferences['min_score']
            
            # Add more preference-based filtering
        
        return self.plan_repository.search_plans(db, search_params, limit=10)
    
    def compare_plans(self, db: Session, plan_ids: List[UUID]) -> Dict[str, Any]:
        """Compare multiple plans."""
        plans = []
        for plan_id in plan_ids:
            plan = self.plan_repository.get_by_id(db, plan_id)
            if plan:
                plans.append(plan)
        
        if not plans:
            return {}
        
        comparison = {
            'plans': plans,
            'price_range': {
                'min': min(p.total_price for p in plans),
                'max': max(p.total_price for p in plans)
            },
            'score_range': {
                'min': min(p.score for p in plans if p.score),
                'max': max(p.score for p in plans if p.score)
            },
            'features': {
                'has_flight': [p.id for p in plans if p.flight_data],
                'has_hotel': [p.id for p in plans if p.hotel_data],
                'has_car': [p.id for p in plans if p.car_data],
                'has_attractions': [p.id for p in plans if p.attractions_data]
            },
            'generation_types': {
                'ai_generated': [p.id for p in plans if p.ai_generated],
                'manual': [p.id for p in plans if p.manual]
            }
        }
        
        return comparison
    
    def bulk_update_plans(self, db: Session, chat_id: UUID, updates: Dict[str, Any]) -> List[Plan]:
        """Bulk update all plans for a chat."""
        plans = self.get_chat_plans(db, chat_id)
        updated_plans = []
        
        for plan in plans:
            updated_plan = self.plan_repository.update(db, plan, updates)
            updated_plans.append(updated_plan)
        
        return updated_plans

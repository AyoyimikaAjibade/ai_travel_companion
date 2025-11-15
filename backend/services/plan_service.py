"""
Plan service for travel plan management operations.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID

from .base_service import BaseService
from repositories.plan_repository import PlanRepository
from models.plan import Plan, PlanCreate, PlanUpdate


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
    
    def confirm_plan(self, db: Session, chat_id: UUID, slot_id: str, plan_data: Dict[str, Any]) -> Plan:
        """
        Save a plan directly to PostgreSQL database.
        
        This method can be used to:
        - Save plans from AI service responses
        - Save manually created/edited plans
        - Save plans from any source
        
        Args:
            db: Database session
            chat_id: Chat ID this plan belongs to
            slot_id: Slot ID for tracking (optional, can be empty string)
            plan_data: Plan data dictionary
        
        Returns:
            Created Plan object
        """
        # Create plan from data
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
        return plan
    
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
        
        # Handle attractions_data - can be dict with "items" key or list
        attractions_data = plan_data.get('attractions_data')
        if attractions_data:
            if isinstance(attractions_data, dict) and attractions_data.get("items"):
                if len(attractions_data.get("items", [])) > 0:
                    completeness_score += 1
            elif isinstance(attractions_data, list) and len(attractions_data) > 0:
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

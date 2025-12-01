from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID

from .base_service import BaseService
from repositories.plan_repository import PlanRepository
from models.plan import Plan, PlanCreate, PlanUpdate


class PlanService(BaseService[Plan]):
    
    def __init__(self):
        self.plan_repository = PlanRepository()
        super().__init__(self.plan_repository)
    
    def get_chat_plans(self, db: Session, chat_id: UUID, skip: int = 0, limit: int = 100) -> List[Plan]:
        return self.plan_repository.get_chat_plans(db, chat_id, skip=skip, limit=limit)
    
    def create_plan(self, db: Session, plan_create: PlanCreate) -> Plan:
        return self.plan_repository.create(db, plan_create)
    
    def confirm_plan(self, db: Session, chat_id: UUID, slot_id: str, plan_data: Dict[str, Any]) -> Plan:
        from repositories.chat_repository import ChatRepository
        chat_repo = ChatRepository()
        if not chat_repo.get_by_id(db, chat_id):
            raise ValueError(f"Chat with id {chat_id} does not exist")
        plan_create = PlanCreate(
            chat_id=chat_id,
            total_price=plan_data.get('total_price', 0),
            score=plan_data.get('score'),
            explanation=plan_data.get('explanation'),
            flight=plan_data.get('flight'),
            hotel=plan_data.get('hotel'),
            car=plan_data.get('car'),
            attractions=plan_data.get('attractions'),
            deeplinks=plan_data.get('deeplinks', {}),
            ai_generated=plan_data.get('ai_generated', True),
            manual=plan_data.get('manual', False)
        )
        
        plan = self.create_plan(db, plan_create)
        return plan
    
    def get_best_plans(self, db: Session, chat_id: UUID, limit: int = 5) -> List[Plan]:
        return self.plan_repository.get_best_plans_for_chat(db, chat_id, limit=limit)
    
    def get_cheapest_plans(self, db: Session, chat_id: UUID, limit: int = 5) -> List[Plan]:
        return self.plan_repository.get_cheapest_plans_for_chat(db, chat_id, limit=limit)
    
    def get_ai_generated_plans(self, db: Session, chat_id: UUID, skip: int = 0, limit: int = 100) -> List[Plan]:
        return self.plan_repository.get_ai_generated_plans(db, chat_id, skip=skip, limit=limit)
    
    def get_manual_plans(self, db: Session, chat_id: UUID, skip: int = 0, limit: int = 100) -> List[Plan]:
        return self.plan_repository.get_manual_plans(db, chat_id, skip=skip, limit=limit)
    
    def search_plans(self, db: Session, search_params: Dict[str, Any], skip: int = 0, limit: int = 100) -> List[Plan]:
        return self.plan_repository.search_plans(db, search_params, skip=skip, limit=limit)
    
    def update_plan(self, db: Session, plan_id: UUID, plan_update: PlanUpdate) -> Optional[Plan]:
        plan = self.plan_repository.get_by_id(db, plan_id)
        if not plan:
            return None
        
        return self.plan_repository.update(db, plan, plan_update)
    
    def calculate_plan_score(self, plan_data: Dict[str, Any]) -> float:
        base_score = 5.0
        
        price = plan_data.get('total_price', 1000)
        price_score = max(0, 10 - (price / 100))
        
        completeness_score = 0
        if plan_data.get('flight'):
            completeness_score += 2
        if plan_data.get('hotel'):
            completeness_score += 2
        if plan_data.get('car'):
            completeness_score += 1
        
        attractions = plan_data.get('attractions')
        if attractions:
            if isinstance(attractions, dict) and attractions.get("items"):
                if len(attractions.get("items", [])) > 0:
                    completeness_score += 1
            elif isinstance(attractions, list) and len(attractions) > 0:
                completeness_score += 1
        
        final_score = min(10, (base_score + price_score + completeness_score) / 3)
        return round(final_score, 2)
    
    def update_plan_score(self, db: Session, plan_id: UUID) -> Optional[Plan]:
        plan = self.plan_repository.get_by_id(db, plan_id)
        if not plan:
            return None
        
        plan_data = {
            'total_price': plan.total_price,
            'flight': plan.flight,
            'hotel': plan.hotel,
            'car': plan.car,
            'attractions': plan.attractions
        }
        
        new_score = self.calculate_plan_score(plan_data)
        return self.plan_repository.update_plan_score(db, plan_id, new_score)
    
    def get_plan_recommendations(self, db: Session, chat_id: UUID, user_preferences: Dict[str, Any] = None) -> List[Plan]:
        search_params = {'chat_id': chat_id}
        
        if user_preferences:
            if 'max_budget' in user_preferences:
                search_params['max_price'] = user_preferences['max_budget']
            
            if 'min_score' in user_preferences:
                search_params['min_score'] = user_preferences['min_score']
        
        return self.plan_repository.search_plans(db, search_params, limit=10)
    
    def compare_plans(self, db: Session, plan_ids: List[UUID]) -> Dict[str, Any]:
        if not plan_ids:
            return {}
        
        plans = []
        for plan_id in plan_ids:
            plan = self.plan_repository.get_by_id(db, plan_id)
            if plan:
                plans.append(plan)
        
        if not plans:
            return {}
        
        scores = [p.score for p in plans if p.score is not None]
        
        comparison = {
            'plans': plans,
            'price_range': {
                'min': min(p.total_price for p in plans) if plans else 0,
                'max': max(p.total_price for p in plans) if plans else 0
            },
            'score_range': {
                'min': min(scores) if scores else None,
                'max': max(scores) if scores else None
            },
            'features': {
                'has_flight': [str(p.plan_id) for p in plans if p.flight],
                'has_hotel': [str(p.plan_id) for p in plans if p.hotel],
                'has_car': [str(p.plan_id) for p in plans if p.car],
                'has_attractions': [str(p.plan_id) for p in plans if p.attractions]
            },
            'generation_types': {
                'ai_generated': [str(p.plan_id) for p in plans if p.ai_generated],
                'manual': [str(p.plan_id) for p in plans if p.manual]
            }
        }
        
        return comparison
    
    def bulk_update_plans(self, db: Session, chat_id: UUID, plan_update: PlanUpdate) -> List[Plan]:
        plans = self.get_chat_plans(db, chat_id)
        updated_plans = []
        
        for plan in plans:
            try:
                updated_plan = self.plan_repository.update(db, plan, plan_update)
                if updated_plan:
                    updated_plans.append(updated_plan)
            except Exception:
                continue
        
        return updated_plans

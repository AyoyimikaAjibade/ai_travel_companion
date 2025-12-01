from typing import Optional, List
from sqlalchemy.orm import Session
from uuid import UUID

from .base_repository import BaseRepository
from models.plan import Plan


class PlanRepository(BaseRepository[Plan]):
    
    def __init__(self):
        super().__init__(Plan)
    
    def update(self, db, db_obj: Plan, obj_in) -> Plan:
        from datetime import datetime
        try:
            if hasattr(obj_in, 'model_dump'):
                update_data = obj_in.model_dump(exclude_unset=True)
            elif hasattr(obj_in, 'dict'):
                update_data = obj_in.dict(exclude_unset=True)
            elif isinstance(obj_in, dict):
                update_data = obj_in
            else:
                update_data = obj_in
            
            for field, value in update_data.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)
            
            db_obj.updated_time = datetime.utcnow()
            
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except Exception as e:
            db.rollback()
            raise
    
    def get_chat_plans(self, db: Session, chat_id: UUID, skip: int = 0, limit: int = 100) -> List[Plan]:
        return db.query(Plan).filter(
            Plan.chat_id == chat_id
        ).order_by(Plan.created_time.desc()).offset(skip).limit(limit).all()
    
    def get_plans_by_score_range(self, db: Session, min_score: float, max_score: float, skip: int = 0, limit: int = 100) -> List[Plan]:
        return db.query(Plan).filter(
            Plan.score >= min_score,
            Plan.score <= max_score
        ).offset(skip).limit(limit).all()
    
    def get_plans_by_price_range(self, db: Session, min_price: float, max_price: float, skip: int = 0, limit: int = 100) -> List[Plan]:
        return db.query(Plan).filter(
            Plan.total_price >= min_price,
            Plan.total_price <= max_price
        ).offset(skip).limit(limit).all()
    
    def get_best_plans_for_chat(self, db: Session, chat_id: UUID, limit: int = 5) -> List[Plan]:
        return db.query(Plan).filter(
            Plan.chat_id == chat_id,
            Plan.score.isnot(None)
        ).order_by(
            Plan.score.desc(),
            Plan.created_time.desc()
        ).limit(limit).all()
    
    def get_cheapest_plans_for_chat(self, db: Session, chat_id: UUID, limit: int = 5) -> List[Plan]:
        return db.query(Plan).filter(
            Plan.chat_id == chat_id
        ).order_by(
            Plan.total_price.asc(),
            Plan.created_time.desc()
        ).limit(limit).all()
    
    def get_ai_generated_plans(self, db: Session, chat_id: UUID, skip: int = 0, limit: int = 100) -> List[Plan]:
        return db.query(Plan).filter(
            Plan.chat_id == chat_id,
            Plan.ai_generated == True
        ).order_by(Plan.created_time.desc()).offset(skip).limit(limit).all()
    
    def get_manual_plans(self, db: Session, chat_id: UUID, skip: int = 0, limit: int = 100) -> List[Plan]:
        return db.query(Plan).filter(
            Plan.chat_id == chat_id,
            Plan.manual == True
        ).order_by(Plan.created_time.desc()).offset(skip).limit(limit).all()
    
    def search_plans(self, db: Session, search_params: dict, skip: int = 0, limit: int = 100) -> List[Plan]:
        query = db.query(Plan)
        
        if 'chat_id' in search_params:
            query = query.filter(Plan.chat_id == search_params['chat_id'])
        
        if 'min_price' in search_params:
            query = query.filter(Plan.total_price >= search_params['min_price'])
        
        if 'max_price' in search_params:
            query = query.filter(Plan.total_price <= search_params['max_price'])
        
        if 'min_score' in search_params:
            query = query.filter(Plan.score >= search_params['min_score'])
        
        if 'max_score' in search_params:
            query = query.filter(Plan.score <= search_params['max_score'])
        
        if 'has_flight' in search_params and search_params['has_flight']:
            query = query.filter(Plan.flight.isnot(None))
        
        if 'has_hotel' in search_params and search_params['has_hotel']:
            query = query.filter(Plan.hotel.isnot(None))
        
        if 'has_car' in search_params and search_params['has_car']:
            query = query.filter(Plan.car.isnot(None))
        
        if 'ai_generated' in search_params:
            query = query.filter(Plan.ai_generated == search_params['ai_generated'])
        
        if 'manual' in search_params:
            query = query.filter(Plan.manual == search_params['manual'])
        
        from sqlalchemy import nullslast
        query = query.order_by(
            nullslast(Plan.score.desc()),
            Plan.created_time.desc()
        )
        
        return query.offset(skip).limit(limit).all()
    
    def get_by_id(self, db: Session, plan_id: UUID) -> Optional[Plan]:
        return db.query(Plan).filter(Plan.plan_id == plan_id).first()
    
    def exists(self, db: Session, plan_id: UUID) -> bool:
        return db.query(Plan).filter(Plan.plan_id == plan_id).first() is not None
    
    def delete(self, db: Session, plan_id: UUID) -> Optional[Plan]:
        try:
            plan = self.get_by_id(db, plan_id)
            if plan:
                db.delete(plan)
                db.commit()
            return plan
        except Exception as e:
            db.rollback()
            raise
    
    def update_plan_score(self, db: Session, plan_id: UUID, score: float) -> Optional[Plan]:
        try:
            plan = self.get_by_id(db, plan_id)
            if plan:
                plan.score = score
                db.commit()
                db.refresh(plan)
            return plan
        except Exception:
            db.rollback()
            return None


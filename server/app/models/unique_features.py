"""
Unique AI Models (Phase 7):
1. KitchenEvent: Configurable Indian holidays, regional festivals, and custom local kitchen events
2. DailyActionPlan: Persistent and editable daily kitchen morning briefing
"""
from datetime import datetime, date, timezone
from app.extensions import db


class KitchenEvent(db.Model):
    __tablename__ = "kitchen_events"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    kitchen_id = db.Column(db.Integer, db.ForeignKey("kitchens.id", ondelete="SET NULL"), nullable=True)
    title = db.Column(db.String(120), nullable=False)
    event_date = db.Column(db.Date, nullable=False, index=True)
    event_type = db.Column(db.String(32), default="festival", nullable=False) # festival, public_holiday, local_event, catering_order, exam_period
    expected_impact = db.Column(db.Float, default=1.20, nullable=False) # e.g. 1.25 for +25%, 0.8 for -20%
    expected_extra_portions = db.Column(db.Float, default=0.0, nullable=False)
    target_menu_item_id = db.Column(db.Integer, db.ForeignKey("menu_items.id", ondelete="SET NULL"), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    target_menu_item = db.relationship("MenuItem", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "kitchenId": self.kitchen_id,
            "title": self.title,
            "eventDate": self.event_date.isoformat() if self.event_date else None,
            "eventType": self.event_type,
            "expectedImpact": self.expected_impact,
            "impactPercentage": round((self.expected_impact - 1.0) * 100, 1),
            "expectedExtraPortions": self.expected_extra_portions,
            "targetMenuItemId": self.target_menu_item_id,
            "targetMenuItemName": self.target_menu_item.name if self.target_menu_item else "All Dishes",
            "notes": self.notes or "",
            "isActive": self.is_active,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }


class DailyActionPlan(db.Model):
    __tablename__ = "daily_action_plans"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    kitchen_id = db.Column(db.Integer, db.ForeignKey("kitchens.id", ondelete="SET NULL"), nullable=True)
    plan_date = db.Column(db.Date, nullable=False, index=True)
    status = db.Column(db.String(32), default="draft", nullable=False) # draft, approved, completed
    menu_targets_json = db.Column(db.Text, nullable=True) # JSON list of dishes and adjusted prep portions
    prep_tasks_json = db.Column(db.Text, nullable=True) # JSON list of mise-en-place ingredient prep tasks
    urgent_purchases_json = db.Column(db.Text, nullable=True) # JSON list of today's morning purchase pickups
    fefo_priorities_json = db.Column(db.Text, nullable=True) # JSON list of near-expiry batches to cook
    risk_alerts_json = db.Column(db.Text, nullable=True) # JSON list of surplus waste risk alerts
    manager_notes = db.Column(db.Text, nullable=True)
    signed_off_by = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint("kitchen_id", "plan_date", name="uq_kitchen_plan_date"),
    )

    def to_dict(self):
        import json
        return {
            "id": self.id,
            "kitchenId": self.kitchen_id,
            "planDate": self.plan_date.isoformat() if self.plan_date else None,
            "status": self.status,
            "menuTargets": json.loads(self.menu_targets_json) if self.menu_targets_json else [],
            "prepTasks": json.loads(self.prep_tasks_json) if self.prep_tasks_json else [],
            "urgentPurchases": json.loads(self.urgent_purchases_json) if self.urgent_purchases_json else [],
            "fefoPriorities": json.loads(self.fefo_priorities_json) if self.fefo_priorities_json else [],
            "riskAlerts": json.loads(self.risk_alerts_json) if self.risk_alerts_json else [],
            "managerNotes": self.manager_notes or "",
            "signedOffBy": self.signed_off_by or "",
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None
        }


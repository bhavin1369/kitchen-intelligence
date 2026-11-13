from datetime import datetime
from app.extensions import db

class MenuItem(db.Model):
    __tablename__ = "menu_items"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    kitchen_id = db.Column(db.Integer, db.ForeignKey("kitchens.id", ondelete="SET NULL"), nullable=True)
    name = db.Column(db.String(120), nullable=False, index=True)
    category = db.Column(db.String(64), nullable=False, index=True) # Starters, Mains, Biryani, Breads, Desserts, Beverages
    price = db.Column(db.Float, nullable=False)
    cost_price = db.Column(db.Float, default=0.0)
    margin_percent = db.Column(db.Float, default=0.0)
    is_available = db.Column(db.Boolean, default=True, nullable=False)
    is_veg = db.Column(db.Boolean, default=True, nullable=False)
    prep_time_minutes = db.Column(db.Integer, default=15)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    recipes = db.relationship("Recipe", backref="menu_item", cascade="all, delete-orphan", lazy="joined")
    forecasts = db.relationship("Forecast", backref="menu_item", cascade="all, delete-orphan", lazy="dynamic")

    def calculate_cost_and_margin(self):
        """Calculates total BOM ingredient cost per portion and derived profit margin %"""
        total_cost = 0.0
        for r in self.recipes:
            if r.ingredient:
                # Cost contribution = ingredient.unit_cost * quantity * (1 + prep_loss_percentage/100)
                loss_factor = 1.0 + (r.prep_loss_percentage / 100.0 if r.prep_loss_percentage else 0.0)
                total_cost += r.quantity * r.ingredient.unit_cost * loss_factor
        self.cost_price = round(total_cost, 2)
        if self.price > 0:
            self.margin_percent = round(((self.price - self.cost_price) / self.price) * 100, 1)
        return self.cost_price, self.margin_percent

    def to_dict(self, include_bom=False):
        data = {
            "id": self.id,
            "kitchenId": self.kitchen_id,
            "name": self.name,
            "category": self.category,
            "price": self.price,
            "costPrice": self.cost_price,
            "marginPercent": self.margin_percent,
            "status": "active" if self.is_available else "inactive",
            "isAvailable": self.is_available,
            "isVeg": self.is_veg,
            "prepTimeMinutes": self.prep_time_minutes,
            "description": self.description,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }
        if include_bom:
            data["ingredients"] = [r.to_dict() for r in self.recipes]
        return data


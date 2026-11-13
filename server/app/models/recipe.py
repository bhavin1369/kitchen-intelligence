from datetime import datetime
from app.extensions import db

class Recipe(db.Model):
    __tablename__ = "recipes"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    menu_item_id = db.Column(db.Integer, db.ForeignKey("menu_items.id", ondelete="CASCADE"), nullable=False, index=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey("ingredients.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity = db.Column(db.Float, nullable=False) # Portion quantity
    unit = db.Column(db.String(16), nullable=False) # kg, g, l, ml, pcs
    prep_loss_percentage = db.Column(db.Float, default=0.0) # Trimming loss or shrinkage %
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("menu_item_id", "ingredient_id", name="uq_recipe_menu_ingredient"),
    )

    def to_dict(self):
        ing = self.ingredient
        unit_cost = ing.unit_cost if ing else 0.0
        loss_factor = 1.0 + ((self.prep_loss_percentage or 0.0) / 100.0)
        cost_contrib = round(self.quantity * unit_cost * loss_factor, 2)

        return {
            "id": self.id,
            "menuItemId": self.menu_item_id,
            "ingredientId": self.ingredient_id,
            "ingredientName": ing.name if ing else "Unknown",
            "category": ing.category if ing else "",
            "quantityPerPortion": self.quantity,
            "unit": self.unit,
            "prepLossPercent": self.prep_loss_percentage,
            "unitCost": unit_cost,
            "costContribution": cost_contrib,
            "currentStock": ing.current_stock if ing else 0.0,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }


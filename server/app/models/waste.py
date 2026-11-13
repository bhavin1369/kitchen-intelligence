from datetime import datetime
from app.extensions import db

class WasteRecord(db.Model):
    __tablename__ = "waste_records"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    kitchen_id = db.Column(db.Integer, db.ForeignKey("kitchens.id", ondelete="SET NULL"), nullable=True)
    log_number = db.Column(db.String(64), unique=True, nullable=False, index=True)
    item_type = db.Column(db.String(32), default="ingredient", nullable=False) # 'ingredient' or 'prepared_item'
    ingredient_id = db.Column(db.Integer, db.ForeignKey("ingredients.id", ondelete="RESTRICT"), nullable=True, index=True)
    menu_item_id = db.Column(db.Integer, db.ForeignKey("menu_items.id", ondelete="SET NULL"), nullable=True, index=True)
    item_name = db.Column(db.String(120), nullable=True)
    batch_id = db.Column(db.Integer, db.ForeignKey("inventory_batches.id", ondelete="SET NULL"), nullable=True)
    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(16), nullable=False)
    financial_loss = db.Column(db.Float, nullable=False)
    reason = db.Column(db.String(64), nullable=False) # Spoilage, Expiry, Overproduction, Preparation Waste, Quality Rejection
    logged_by = db.Column(db.String(64), default="Head Chef", nullable=False)
    notes = db.Column(db.Text, nullable=True)
    logged_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    ingredient = db.relationship("Ingredient", lazy="joined")
    menu_item = db.relationship("MenuItem", lazy="joined")
    batch = db.relationship("InventoryBatch", lazy="joined")

    def to_dict(self):
        resolved_name = self.item_name
        if not resolved_name:
            if self.item_type == "prepared_item" and self.menu_item:
                resolved_name = self.menu_item.name
            elif self.ingredient:
                resolved_name = self.ingredient.name
            else:
                resolved_name = "Unknown Item"

        return {
            "id": self.id,
            "logNumber": self.log_number,
            "itemType": self.item_type,
            "ingredientId": self.ingredient_id,
            "menuItemId": self.menu_item_id,
            "itemName": resolved_name,
            "ingredientName": resolved_name, # backwards compatibility
            "batchRef": self.batch.batch_number if self.batch else "Direct Stock",
            "quantityLost": self.quantity,
            "unit": self.unit,
            "financialLoss": round(self.financial_loss, 2),
            "reason": self.reason,
            "loggedBy": self.logged_by,
            "notes": self.notes or "",
            "timestamp": self.logged_at.strftime("%H:%M") if self.logged_at else "",
            "date": self.logged_at.strftime("%Y-%m-%d") if self.logged_at else "",
            "aiRecommendation": "Optimize prep buffer and monitor cold storage temperature."
        }


class Forecast(db.Model):
    __tablename__ = "forecasts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    kitchen_id = db.Column(db.Integer, db.ForeignKey("kitchens.id", ondelete="SET NULL"), nullable=True)
    menu_item_id = db.Column(db.Integer, db.ForeignKey("menu_items.id", ondelete="CASCADE"), nullable=False, index=True)
    forecast_date = db.Column(db.Date, nullable=False, index=True)
    predicted_quantity = db.Column(db.Float, nullable=False)
    actual_quantity = db.Column(db.Float, nullable=True)
    confidence_lower = db.Column(db.Float, nullable=True)
    confidence_upper = db.Column(db.Float, nullable=True)
    baseline_quantity = db.Column(db.Float, nullable=True)
    factors_json = db.Column(db.Text, nullable=True) # JSON of festival, weather, day-of-week multipliers
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("forecast_date", "menu_item_id", name="uq_forecast_date_menu_item"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "menuItemId": self.menu_item_id,
            "menuItemName": self.menu_item.name if self.menu_item else "Unknown Dish",
            "forecastDate": self.forecast_date.isoformat() if self.forecast_date else None,
            "predictedQuantity": self.predicted_quantity,
            "actualQuantity": self.actual_quantity,
            "confidenceLower": self.confidence_lower,
            "confidenceUpper": self.confidence_upper,
            "baselineQuantity": self.baseline_quantity,
            "factors": self.factors_json,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }


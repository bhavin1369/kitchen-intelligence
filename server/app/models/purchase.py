from datetime import datetime
from app.extensions import db

class Purchase(db.Model):
    __tablename__ = "purchases"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    kitchen_id = db.Column(db.Integer, db.ForeignKey("kitchens.id", ondelete="SET NULL"), nullable=True)
    po_number = db.Column(db.String(64), unique=True, nullable=False, index=True)
    supplier_name = db.Column(db.String(120), nullable=False)
    contact = db.Column(db.String(120), nullable=True)
    lead_time = db.Column(db.String(64), default="12-24 hours")
    order_date = db.Column(db.Date, nullable=False)
    delivery_due_date = db.Column(db.Date, nullable=True)
    total_estimated_cost = db.Column(db.Float, default=0.0, nullable=False)
    status = db.Column(db.String(32), default="draft", nullable=False) # draft, approved, sent, received, cancelled
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    items = db.relationship("PurchaseItem", backref="purchase", cascade="all, delete-orphan", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "kitchenId": self.kitchen_id,
            "poNumber": self.po_number,
            "supplierName": self.supplier_name,
            "contact": self.contact or "",
            "leadTime": self.lead_time or "24 hours",
            "orderDate": self.order_date.isoformat() if self.order_date else None,
            "deliveryDueDate": self.delivery_due_date.isoformat() if self.delivery_due_date else None,
            "totalEstimatedCost": self.total_estimated_cost,
            "status": self.status,
            "notes": self.notes,
            "items": [it.to_dict() for it in self.items],
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }


class PurchaseItem(db.Model):
    __tablename__ = "purchase_items"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    purchase_id = db.Column(db.Integer, db.ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False, index=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey("ingredients.id", ondelete="RESTRICT"), nullable=False)
    forecasted_demand = db.Column(db.Float, default=0.0)
    current_stock = db.Column(db.Float, default=0.0)
    recommended_quantity = db.Column(db.Float, nullable=False)
    approved_quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(16), nullable=False)
    unit_cost = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    ingredient = db.relationship("Ingredient", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "purchaseId": self.purchase_id,
            "ingredientId": self.ingredient_id,
            "ingredientName": self.ingredient.name if self.ingredient else "Unknown",
            "forecastedDemand": self.forecasted_demand,
            "currentStock": self.current_stock,
            "recommendedPurchase": self.recommended_quantity,
            "approvedQuantity": self.approved_quantity,
            "unit": self.unit,
            "unitCost": self.unit_cost,
            "subtotal": self.subtotal
        }


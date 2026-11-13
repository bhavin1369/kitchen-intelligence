from datetime import datetime, date
from app.extensions import db

class InventoryBatch(db.Model):
    __tablename__ = "inventory_batches"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_number = db.Column(db.String(64), nullable=False, index=True)
    initial_quantity = db.Column(db.Float, nullable=False)
    remaining_quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(16), nullable=False)
    unit_cost = db.Column(db.Float, nullable=False)
    received_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date, nullable=False, index=True)
    supplier_name = db.Column(db.String(120), nullable=True)
    status = db.Column(db.String(32), default="active", nullable=False) # active, depleted, expired, discarded
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    movements = db.relationship("StockMovement", backref="batch", lazy="dynamic")

    @property
    def days_to_expiry(self):
        if not self.expiry_date:
            return 999
        delta = self.expiry_date - date.today()
        return delta.days

    @property
    def shelf_life_status(self):
        days = self.days_to_expiry
        if days < 0:
            return "expired"
        elif days <= 1:
            return "critical"
        elif days <= 3:
            return "warning"
        return "fresh"

    def to_dict(self):
        days = self.days_to_expiry
        status_label = self.shelf_life_status
        val_risk = round(self.remaining_quantity * self.unit_cost, 2) if status_label in ("critical", "warning") else 0.0

        return {
            "id": self.id,
            "batchNumber": self.batch_number,
            "ingredientId": self.ingredient_id,
            "ingredientName": self.ingredient.name if self.ingredient else "Unknown",
            "initialQuantity": self.initial_quantity,
            "quantityRemaining": round(self.remaining_quantity, 2),
            "unit": self.unit,
            "unitCost": self.unit_cost,
            "receivedDate": self.received_date.isoformat() if self.received_date else None,
            "expiryDate": self.expiry_date.isoformat() if self.expiry_date else None,
            "daysToExpiry": days,
            "supplierName": self.supplier_name or "Standard Supplier",
            "shelfLifeStatus": status_label,
            "status": self.status,
            "financialValueAtRisk": val_risk,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }


class StockMovement(db.Model):
    __tablename__ = "stock_movements"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey("ingredients.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_id = db.Column(db.Integer, db.ForeignKey("inventory_batches.id", ondelete="SET NULL"), nullable=True, index=True)
    movement_type = db.Column(db.String(32), nullable=False) # purchase, sales_consumption, waste, manual_adjustment
    quantity = db.Column(db.Float, nullable=False) # Can be negative for deductions or positive for additions
    unit = db.Column(db.String(16), nullable=False)
    unit_cost = db.Column(db.Float, default=0.0)
    reference_id = db.Column(db.String(64), nullable=True) # e.g. ORD-1042, PO-101, WST-01
    reference_type = db.Column(db.String(32), nullable=True) # sales_order, purchase_order, waste_log
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "ingredientId": self.ingredient_id,
            "ingredientName": self.ingredient.name if self.ingredient else "Unknown",
            "batchId": self.batch_id,
            "batchNumber": self.batch.batch_number if self.batch else None,
            "movementType": self.movement_type,
            "quantity": self.quantity,
            "unit": self.unit,
            "unitCost": self.unit_cost,
            "totalCost": round(abs(self.quantity) * self.unit_cost, 2),
            "referenceId": self.reference_id,
            "referenceType": self.reference_type,
            "notes": self.notes,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }


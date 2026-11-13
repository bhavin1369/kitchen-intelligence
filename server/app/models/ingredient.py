from datetime import datetime, date
from app.extensions import db

class Ingredient(db.Model):
    __tablename__ = "ingredients"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    kitchen_id = db.Column(db.Integer, db.ForeignKey("kitchens.id", ondelete="SET NULL"), nullable=True)
    sku = db.Column(db.String(32), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False, index=True)
    category = db.Column(db.String(64), nullable=False, index=True) # Dairy, Produce, Poultry & Meat, Spices, Grains & Staples, Oils & Ghee
    unit = db.Column(db.String(16), nullable=False) # kg, g, l, ml, pcs
    current_stock = db.Column(db.Float, default=0.0, nullable=False)
    par_level = db.Column(db.Float, default=0.0, nullable=False)
    reorder_point = db.Column(db.Float, default=0.0, nullable=False)
    unit_cost = db.Column(db.Float, default=0.0, nullable=False)
    shelf_life_days = db.Column(db.Integer, default=7, nullable=False)
    preferred_supplier = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    batches = db.relationship("InventoryBatch", backref="ingredient", cascade="all, delete-orphan", lazy="dynamic")
    movements = db.relationship("StockMovement", backref="ingredient", cascade="all, delete-orphan", lazy="dynamic")
    recipe_usages = db.relationship("Recipe", backref="ingredient", cascade="all, delete-orphan", lazy="dynamic")

    @property
    def usable_stock(self):
        """Returns stock available in non-expired, active batches only"""
        today = date.today()
        active_batches = self.batches.filter_by(status="active").filter(
            db.column("expiry_date") >= today
        ).all()
        return sum(b.remaining_quantity for b in active_batches)

    def to_dict(self, include_batches=False):
        today = date.today()
        # Calculate active non-expired stock
        batches_list = self.batches.filter_by(status="active").all()
        usable_qty = sum(b.remaining_quantity for b in batches_list if b.expiry_date >= today)
        total_value = round(self.current_stock * self.unit_cost, 2)

        data = {
            "id": self.id,
            "kitchenId": self.kitchen_id,
            "sku": self.sku,
            "name": self.name,
            "category": self.category,
            "unit": self.unit,
            "currentStock": round(self.current_stock, 2),
            "usableStock": round(usable_qty, 2),
            "parLevel": self.par_level,
            "reorderPoint": self.reorder_point,
            "unitCost": self.unit_cost,
            "totalValue": total_value,
            "shelfLifeDays": self.shelf_life_days,
            "preferredSupplier": self.preferred_supplier or "Local Market",
            "isLowStock": self.current_stock <= self.reorder_point,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }

        if include_batches:
            data["batches"] = [b.to_dict() for b in batches_list]

        return data

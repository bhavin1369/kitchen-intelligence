from datetime import datetime, timezone
from app.extensions import db

class Sale(db.Model):
    __tablename__ = "sales"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    kitchen_id = db.Column(db.Integer, db.ForeignKey("kitchens.id", ondelete="SET NULL"), nullable=True)
    order_number = db.Column(db.String(64), unique=True, nullable=False, index=True)
    channel = db.Column(db.String(32), default="Dine-in", nullable=False) # Dine-in, Takeaway, Online
    table_number = db.Column(db.String(32), nullable=True)
    customer_name = db.Column(db.String(120), nullable=True)
    payment_method = db.Column(db.String(32), default="UPI", nullable=False) # UPI, Cash, Card
    status = db.Column(db.String(32), default="completed", nullable=False) # completed, in-kitchen, cancelled
    subtotal = db.Column(db.Float, default=0.0, nullable=False)
    tax = db.Column(db.Float, default=0.0, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    order_timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    items = db.relationship("SaleItem", backref="sale", cascade="all, delete-orphan", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "kitchenId": self.kitchen_id,
            "orderNumber": self.order_number,
            "channel": self.channel,
            "tableNumber": self.table_number,
            "customerName": self.customer_name or "Walk-in Guest",
            "paymentMethod": self.payment_method,
            "status": self.status,
            "time": self.order_timestamp.strftime("%H:%M") if self.order_timestamp else "",
            "date": self.order_timestamp.strftime("%Y-%m-%d") if self.order_timestamp else "",
            "subtotal": self.subtotal,
            "tax": self.tax,
            "totalAmount": self.total_amount,
            "notes": self.notes or "",
            "items": [it.to_dict() for it in self.items],
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }


class SaleItem(db.Model):
    __tablename__ = "sales_items"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sale_id = db.Column(db.Integer, db.ForeignKey("sales.id", ondelete="CASCADE"), nullable=False, index=True)
    menu_item_id = db.Column(db.Integer, db.ForeignKey("menu_items.id", ondelete="RESTRICT"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)

    menu_item = db.relationship("MenuItem", lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "saleId": self.sale_id,
            "menuItemId": self.menu_item_id,
            "name": self.menu_item.name if self.menu_item else "Unknown Dish",
            "quantity": self.quantity,
            "unitPrice": self.unit_price,
            "subtotal": self.subtotal
        }

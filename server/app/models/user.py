from datetime import datetime
from app.extensions import db

class Kitchen(db.Model):
    __tablename__ = "kitchens"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(120), nullable=False)
    location = db.Column(db.String(255), nullable=True)
    currency = db.Column(db.String(10), default="INR")
    tax_rate = db.Column(db.Float, default=5.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    users = db.relationship("User", backref="kitchen", lazy="dynamic")
    menu_items = db.relationship("MenuItem", backref="kitchen", lazy="dynamic")
    ingredients = db.relationship("Ingredient", backref="kitchen", lazy="dynamic")
    sales = db.relationship("Sale", backref="kitchen", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "currency": self.currency,
            "taxRate": self.tax_rate,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    kitchen_id = db.Column(db.Integer, db.ForeignKey("kitchens.id", ondelete="SET NULL"), nullable=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(120), nullable=True)
    role = db.Column(db.String(32), default="staff", nullable=False)  # admin, chef, manager, staff
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "kitchenId": self.kitchen_id,
            "username": self.username,
            "email": self.email,
            "fullName": self.full_name or self.username,
            "role": self.role,
            "isActive": self.is_active,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }


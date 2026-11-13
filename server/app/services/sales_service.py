import csv
import io
from datetime import datetime
from app.extensions import db
from app.models import Sale, SaleItem, MenuItem, Ingredient, Recipe
from app.services.inventory_service import consume_ingredient_fefo

def generate_order_number() -> str:
    count = Sale.query.count()
    return f"ORD-{1040 + count + 1}"

def process_new_sale(data: dict, user_id: int = None) -> Sale:
    """
    Creates a new sale and executes closed-loop recipe explosion
    to decrement raw ingredients from active FEFO inventory batches.
    Runs inside a strict atomic database transaction.
    """
    items_data = data.get("items", [])
    if not items_data:
        raise ValueError("Sale must contain at least one menu item.")

    channel = data.get("channel", "Dine-in")
    table_number = data.get("tableNumber") or data.get("table_number")
    customer_name = data.get("customerName") or data.get("customer_name") or "Walk-in Guest"
    payment_method = data.get("paymentMethod") or data.get("payment_method") or "UPI"
    order_num = data.get("orderNumber") or data.get("order_number") or generate_order_number()

    # Create sale record
    sale = Sale(
        order_number=order_num,
        channel=channel,
        table_number=table_number,
        customer_name=customer_name,
        payment_method=payment_method,
        status="completed",
        subtotal=0.0,
        tax=0.0,
        total_amount=0.0,
        order_timestamp=datetime.utcnow(),
        created_by=user_id
    )
    db.session.add(sale)
    db.session.flush()

    subtotal = 0.0

    # Process line items and explode recipe ingredients
    for item in items_data:
        menu_item_id = item.get("menuItemId") or item.get("menu_item_id")
        qty = int(item.get("quantity", 1))
        if qty <= 0:
            raise ValueError(f"Quantity for item must be positive (got {qty}).")

        menu_item = db.session.get(MenuItem, menu_item_id)
        if not menu_item:
            raise ValueError(f"Menu item with ID {menu_item_id} not found.")

        item_subtotal = round(menu_item.price * qty, 2)
        subtotal += item_subtotal

        sale_item = SaleItem(
            sale_id=sale.id,
            menu_item_id=menu_item.id,
            quantity=qty,
            unit_price=menu_item.price,
            subtotal=item_subtotal
        )
        db.session.add(sale_item)

        # Explode Recipe Bill of Materials and deduct ingredients via FEFO
        recipes = Recipe.query.filter_by(menu_item_id=menu_item.id).all()
        for recipe in recipes:
            ingredient = recipe.ingredient
            if not ingredient:
                continue

            loss_factor = 1.0 + ((recipe.prep_loss_percentage or 0.0) / 100.0)
            needed_qty = round(recipe.quantity * qty * loss_factor, 4)

            # Deduct from oldest active batches
            consume_ingredient_fefo(
                ingredient=ingredient,
                required_qty=needed_qty,
                required_unit=recipe.unit,
                reference_id=sale.order_number,
                reference_type="sales_order",
                user_id=user_id,
                notes=f"Order {sale.order_number}: {qty}x {menu_item.name}"
            )

    tax = round(subtotal * 0.05, 2) # 5% GST
    sale.subtotal = round(subtotal, 2)
    sale.tax = tax
    sale.total_amount = round(subtotal + tax, 2)

    return sale


def parse_and_import_sales_csv(csv_content: str, user_id: int = None) -> dict:
    """
    Parses a CSV file with historical or bulk sales and executes the imports.
    Supported headers: order_number, channel, table_number, customer_name, item_name, quantity, payment_method, date
    """
    reader = csv.DictReader(io.StringIO(csv_content.strip()))
    orders_grouped = {}

    for row in reader:
        ord_num = row.get("order_number") or row.get("Order Number") or generate_order_number()
        item_name = row.get("item_name") or row.get("Dish Name")
        qty = int(row.get("quantity") or row.get("Qty") or 1)
        channel = row.get("channel") or row.get("Channel") or "Dine-in"
        table = row.get("table_number") or row.get("Table") or ""
        cust = row.get("customer_name") or row.get("Customer") or "Guest"
        pay = row.get("payment_method") or row.get("Payment") or "UPI"

        if ord_num not in orders_grouped:
            orders_grouped[ord_num] = {
                "orderNumber": ord_num,
                "channel": channel,
                "tableNumber": table,
                "customerName": cust,
                "paymentMethod": pay,
                "items": []
            }

        # Resolve menu item by name
        menu_item = MenuItem.query.filter(MenuItem.name.ilike(item_name.strip())).first()
        if menu_item:
            orders_grouped[ord_num]["items"].append({
                "menuItemId": menu_item.id,
                "quantity": qty
            })

    created_sales = []
    for ord_num, ord_data in orders_grouped.items():
        if ord_data["items"]:
            # Check if order number already exists
            existing = Sale.query.filter_by(order_number=ord_num).first()
            if not existing:
                sale = process_new_sale(ord_data, user_id=user_id)
                created_sales.append(sale.order_number)

    return {
        "ordersImported": len(created_sales),
        "orderNumbers": created_sales
    }

import csv
import io
from datetime import datetime, timezone, date, timedelta
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
    # Support single item shortcut (e.g. menuItemId & quantity at root)
    if not items_data and (data.get("menuItemId") or data.get("menu_item_id")):
        items_data = [{
            "menuItemId": data.get("menuItemId") or data.get("menu_item_id"),
            "quantity": int(data.get("quantity", 1))
        }]

    if not items_data:
        raise ValueError("Sale must contain at least one menu item.")

    channel = data.get("channel", "Dine-in")
    table_number = data.get("tableNumber") or data.get("table_number") or ""
    customer_name = data.get("customerName") or data.get("customer_name") or "Walk-in Guest"
    payment_method = data.get("paymentMethod") or data.get("payment_method") or "UPI"
    order_num = data.get("orderNumber") or data.get("order_number") or generate_order_number()
    notes = data.get("notes", "")

    # Date handling (user can choose sales date)
    date_str = data.get("salesDate") or data.get("sales_date") or data.get("orderDate") or data.get("date")
    if date_str:
        try:
            if len(date_str) == 10:
                now_t = datetime.now(timezone.utc).time()
                d_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
                order_dt = datetime.combine(d_obj, now_t)
            else:
                order_dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except Exception:
            order_dt = datetime.now(timezone.utc)
    else:
        order_dt = datetime.now(timezone.utc)

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
        notes=notes,
        order_timestamp=order_dt,
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

    tax = round(subtotal * 0.05, 2) # 5% GST standard
    sale.subtotal = round(subtotal, 2)
    sale.tax = tax
    sale.total_amount = round(subtotal + tax, 2)

    return sale


def parse_and_import_sales_csv(csv_content: str, user_id: int = None) -> dict:
    """
    Parses a CSV file with historical or bulk sales and executes the imports.
    Validates required columns:
    - Required: date (or sales_date), item_name (or dish_name), quantity
    - Optional: channel, table_number, customer_name, payment_method, order_number
    """
    reader = csv.DictReader(io.StringIO(csv_content.strip()))
    if not reader.fieldnames:
        raise ValueError("CSV file is empty or missing headers.")

    # Validate header fields
    headers_lower = {h.lower().strip().replace(" ", "_"): h for h in reader.fieldnames}
    date_col = headers_lower.get("date") or headers_lower.get("sales_date") or headers_lower.get("order_date")
    item_col = headers_lower.get("item_name") or headers_lower.get("dish_name") or headers_lower.get("menu_item")
    qty_col = headers_lower.get("quantity") or headers_lower.get("qty")

    if not item_col or not qty_col:
        raise ValueError(
            f"CSV is missing required columns. Required: 'item_name', 'quantity', 'date'. "
            f"Found headers: {list(reader.fieldnames)}"
        )

    orders_grouped = {}
    row_errors = []

    for row_idx, row in enumerate(reader, start=2):
        item_name = (row.get(item_col) or "").strip()
        qty_str = (row.get(qty_col) or "").strip()
        date_str = (row.get(date_col) or date.today().isoformat()).strip() if date_col else date.today().isoformat()

        if not item_name:
            row_errors.append(f"Row {row_idx}: Missing dish name.")
            continue

        try:
            qty = int(qty_str)
            if qty <= 0:
                row_errors.append(f"Row {row_idx}: Quantity must be positive integer.")
                continue
        except ValueError:
            row_errors.append(f"Row {row_idx}: Invalid quantity '{qty_str}'.")
            continue

        # Validate menu item exists
        menu_item = MenuItem.query.filter(MenuItem.name.ilike(item_name)).first()
        if not menu_item:
            row_errors.append(f"Row {row_idx}: Menu item '{item_name}' does not exist in catalog.")
            continue

        ord_num_col = headers_lower.get("order_number") or headers_lower.get("order_id")
        ord_num = (row.get(ord_num_col) or "").strip() if ord_num_col else ""
        if not ord_num:
            ord_num = f"CSV-{date_str}-{row_idx}"

        channel_col = headers_lower.get("channel")
        channel = (row.get(channel_col) or "Dine-in").strip() if channel_col else "Dine-in"

        table_col = headers_lower.get("table_number") or headers_lower.get("table")
        table = (row.get(table_col) or "").strip() if table_col else ""

        cust_col = headers_lower.get("customer_name") or headers_lower.get("customer")
        cust = (row.get(cust_col) or "Walk-in Guest").strip() if cust_col else "Walk-in Guest"

        pay_col = headers_lower.get("payment_method") or headers_lower.get("payment")
        pay = (row.get(pay_col) or "UPI").strip() if pay_col else "UPI"

        if ord_num not in orders_grouped:
            orders_grouped[ord_num] = {
                "orderNumber": ord_num,
                "salesDate": date_str,
                "channel": channel,
                "tableNumber": table,
                "customerName": cust,
                "paymentMethod": pay,
                "notes": "[IMPORTED VIA CSV]",
                "items": []
            }

        orders_grouped[ord_num]["items"].append({
            "menuItemId": menu_item.id,
            "quantity": qty
        })

    if row_errors and not orders_grouped:
        raise ValueError("Validation failed:\n" + "\n".join(row_errors[:10]))

    created_sales = []
    for ord_num, ord_data in orders_grouped.items():
        existing = Sale.query.filter_by(order_number=ord_num).first()
        if not existing:
            try:
                sale = process_new_sale(ord_data, user_id=user_id)
                created_sales.append(sale.order_number)
            except Exception as e:
                row_errors.append(f"Order {ord_num}: {str(e)}")

    return {
        "ordersImported": len(created_sales),
        "orderNumbers": created_sales,
        "warnings": row_errors
    }

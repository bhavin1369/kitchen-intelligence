"""
Sample seed data script for Kitchen Intelligence System.
Populates realistic Indian Canteen sample data for:
- Gujarati Thali
- Paneer Butter Masala
- Vegetable Pulao
- Sandwich
- Dosa
- Idli
- Tea
- Coffee
Historical sales records are generated across daily, weekly, and monthly periods
and explicitly marked with metadata '[SYNTHETIC GENERATED CANTEEN DATA]'.
"""
import random
from datetime import datetime, date, timedelta, timezone
from werkzeug.security import generate_password_hash
from app import create_app
from app.extensions import db
from app.models import (
    Kitchen, User, MenuItem, Ingredient, Recipe,
    Sale, SaleItem, InventoryBatch, StockMovement,
    Purchase, PurchaseItem, WasteRecord, Forecast
)

def seed_database(app=None):
    if app is None:
        app = create_app()
    with app.app_context():
        print("[*] Starting database seeding with Indian Canteen data...")

        # 1. Kitchen
        kitchen = Kitchen.query.first()
        if not kitchen:
            kitchen = Kitchen(
                name="SpiceCraft Indian Canteen & Dining",
                location="Jubilee Hills, Hyderabad, Telangana",
                currency="INR",
                tax_rate=5.0
            )
            db.session.add(kitchen)
            db.session.flush()

        # 2. Staff Users
        if User.query.count() == 0:
            users_data = [
                ("chef_vikram", "chef.vikram@spicecraft.com", "chef123", "Vikram Sharma", "chef"),
                ("admin_aditya", "admin@spicecraft.com", "admin123", "Aditya Verma", "admin"),
                ("manager_ananya", "ananya.iyer@spicecraft.com", "mgr123", "Ananya Iyer", "manager"),
                ("clerk_rahul", "rahul.mehta@spicecraft.com", "clerk123", "Rahul Mehta", "staff"),
                ("cashier_priya", "priya.rao@spicecraft.com", "cashier123", "Priya Rao", "staff"),
            ]
            for u, e, p, fn, r in users_data:
                user = User(
                    kitchen_id=kitchen.id,
                    username=u,
                    email=e,
                    password_hash=generate_password_hash(p),
                    full_name=fn,
                    role=r,
                    is_active=True
                )
                db.session.add(user)
            db.session.flush()

        # 3. Ingredients for Indian Canteen
        ingredients_map = {}
        if Ingredient.query.count() == 0:
            canteen_raw_ingredients = [
                # Grains & Staples
                ("ING-ATT-01", "Whole Wheat Flour (Atta)", "Grains & Staples", "kg", 45.0, 50.0, 15.0, 42.0, 90, "Metro Cash & Carry"),
                ("ING-RIC-01", "Basmati Rice (Aged)", "Grains & Staples", "kg", 60.0, 60.0, 20.0, 95.0, 180, "Everest Agro Foods"),
                ("ING-TOR-01", "Toor Dal (Pigeon Pea)", "Grains & Staples", "kg", 30.0, 35.0, 10.0, 135.0, 180, "Metro Cash & Carry"),
                ("ING-BAT-01", "Dosa & Idli Fermented Batter", "Grains & Staples", "kg", 25.0, 30.0, 8.0, 55.0, 3, "Sri Balaji Foods"),
                ("ING-BRD-01", "Sandwich Bread (Jumbo Slices)", "Grains & Staples", "pcs", 80.0, 100.0, 30.0, 3.5, 4, "Modern Bakery"),
                ("ING-SUG-01", "Refined Sugar", "Grains & Staples", "kg", 35.0, 40.0, 10.0, 44.0, 180, "Metro Cash & Carry"),
                # Dairy
                ("ING-PAN-01", "Paneer (Fresh Cottage Cheese)", "Dairy", "kg", 20.0, 25.0, 8.0, 320.0, 4, "Amul Dairy Distributors"),
                ("ING-MLK-01", "Whole Milk", "Dairy", "l", 45.0, 50.0, 15.0, 60.0, 3, "Amul Dairy Distributors"),
                ("ING-BUT-01", "Butter (Table Butter)", "Dairy", "kg", 18.0, 20.0, 6.0, 480.0, 30, "Amul Dairy Distributors"),
                ("ING-CRM-01", "Fresh Cooking Cream", "Dairy", "l", 10.0, 12.0, 4.0, 210.0, 5, "Amul Dairy Distributors"),
                ("ING-GHE-01", "Pure Desi Ghee", "Oils & Ghee", "kg", 16.0, 20.0, 5.0, 650.0, 90, "Amul Dairy Distributors"),
                # Produce
                ("ING-POT-01", "Potatoes (Aloo)", "Produce", "kg", 55.0, 60.0, 20.0, 28.0, 21, "GreenFields Fresh Produce"),
                ("ING-TOM-01", "Tomatoes (Ripe)", "Produce", "kg", 30.0, 35.0, 12.0, 38.0, 6, "GreenFields Fresh Produce"),
                ("ING-ONI-01", "Onions (Red)", "Produce", "kg", 45.0, 50.0, 15.0, 32.0, 14, "GreenFields Fresh Produce"),
                ("ING-VEG-01", "Mixed Peas & Carrots", "Produce", "kg", 20.0, 25.0, 8.0, 65.0, 7, "GreenFields Fresh Produce"),
                ("ING-COC-01", "Fresh Grated Coconut", "Produce", "kg", 10.0, 12.0, 4.0, 120.0, 4, "GreenFields Fresh Produce"),
                ("ING-CHT-01", "Green Mint & Coriander Chutney", "Produce", "kg", 8.0, 10.0, 3.0, 80.0, 4, "GreenFields Fresh Produce"),
                # Beverages & Spices
                ("ING-TEA-01", "Assam CTC Tea Leaves", "Beverages", "kg", 12.0, 15.0, 4.0, 320.0, 180, "Everest Spice Mart"),
                ("ING-COF-01", "South Indian Filter Coffee Powder", "Beverages", "kg", 8.0, 10.0, 3.0, 540.0, 180, "Narasu Coffee Co"),
                ("ING-CSH-01", "Cashew Nuts (Split)", "Spices", "kg", 8.0, 10.0, 3.0, 780.0, 120, "Everest Spice Mart"),
                ("ING-OIL-01", "Refined Sunflower Cooking Oil", "Oils & Ghee", "l", 35.0, 40.0, 12.0, 135.0, 120, "Metro Cash & Carry"),
                ("ING-SPC-01", "Garam Masala & Curry Spices Blend", "Spices", "kg", 6.0, 8.0, 2.0, 480.0, 180, "Everest Spice Mart")
            ]
            for sku, name, cat, unit, cur_stk, par, reorder, cost, shelf, supp in canteen_raw_ingredients:
                ing = Ingredient(
                    kitchen_id=kitchen.id,
                    sku=sku,
                    name=name,
                    category=cat,
                    unit=unit,
                    current_stock=cur_stk,
                    par_level=par,
                    reorder_point=reorder,
                    unit_cost=cost,
                    shelf_life_days=shelf,
                    preferred_supplier=supp
                )
                db.session.add(ing)
            db.session.flush()

        for i in Ingredient.query.all():
            ingredients_map[i.name] = i

        # 4. Inventory Batches (FEFO Tracking)
        today = date.today()
        if InventoryBatch.query.count() == 0:
            # Seed batches for each ingredient
            for ing in ingredients_map.values():
                # Add fresh batch
                b_fresh = InventoryBatch(
                    ingredient_id=ing.id,
                    batch_number=f"{ing.sku[:7]}-B1",
                    initial_quantity=ing.current_stock,
                    remaining_quantity=ing.current_stock,
                    unit=ing.unit,
                    unit_cost=ing.unit_cost,
                    received_date=today - timedelta(days=1),
                    expiry_date=today + timedelta(days=max(3, ing.shelf_life_days)),
                    supplier_name=ing.preferred_supplier,
                    status="active"
                )
                db.session.add(b_fresh)

            # Add near-expiry batches specifically for Paneer, Milk, and Tomatoes to showcase FEFO alerts
            paneer_ing = ingredients_map.get("Paneer (Fresh Cottage Cheese)")
            if paneer_ing:
                b_near = InventoryBatch(
                    ingredient_id=paneer_ing.id,
                    batch_number="PAN-CRIT-01",
                    initial_quantity=8.0,
                    remaining_quantity=4.0,
                    unit=paneer_ing.unit,
                    unit_cost=paneer_ing.unit_cost,
                    received_date=today - timedelta(days=3),
                    expiry_date=today + timedelta(days=1),
                    supplier_name=paneer_ing.preferred_supplier,
                    status="active"
                )
                db.session.add(b_near)

            milk_ing = ingredients_map.get("Whole Milk")
            if milk_ing:
                b_milk = InventoryBatch(
                    ingredient_id=milk_ing.id,
                    batch_number="MLK-CRIT-01",
                    initial_quantity=10.0,
                    remaining_quantity=5.0,
                    unit=milk_ing.unit,
                    unit_cost=milk_ing.unit_cost,
                    received_date=today - timedelta(days=2),
                    expiry_date=today + timedelta(days=1),
                    supplier_name=milk_ing.preferred_supplier,
                    status="active"
                )
                db.session.add(b_milk)

            db.session.flush()

        # 5. Canteen Menu Items (8 requested dishes)
        menu_items_map = {}
        if MenuItem.query.count() == 0:
            canteen_menu = [
                ("Gujarati Thali", "Thali", 180.0, 58.0, True, 15, "Traditional Gujarati meal with 4 Phulka rotlis, Gujarati dal, Sukhi Bhaji, Basmati rice, and sweet pickle."),
                ("Paneer Butter Masala", "Mains", 190.0, 68.0, True, 18, "Soft cottage cheese cubes cooked in rich makhani tomato, butter, and cashew gravy."),
                ("Vegetable Pulao", "Mains", 130.0, 42.0, True, 15, "Fragrant basmati rice gently cooked with green peas, diced carrots, potatoes, and desi ghee."),
                ("Sandwich", "Snacks", 70.0, 24.0, True, 8, "Classic Mumbai grilled sandwich layered with spiced potatoes, onions, tomatoes, butter, and spicy mint chutney."),
                ("Dosa", "South Indian", 80.0, 26.0, True, 10, "Crispy golden fermented crepe stuffed with savory spiced potato masala, served with sambar and fresh coconut chutney."),
                ("Idli", "South Indian", 50.0, 16.0, True, 5, "Two pillowy soft steamed rice-lentil cakes accompanied by piping hot toor dal sambar and coconut chutney."),
                ("Tea", "Beverages", 20.0, 6.0, True, 5, "Aromatic Indian cutting chai brewed with full-cream milk, crushed ginger, cardamom, and Assam CTC leaves."),
                ("Coffee", "Beverages", 30.0, 9.0, True, 5, "Traditional South Indian frothy filter coffee decoction whipped with hot steamed milk.")
            ]
            for name, cat, price, cost, is_veg, prep_time, desc in canteen_menu:
                margin = round(((price - cost) / price) * 100, 1)
                m = MenuItem(
                    kitchen_id=kitchen.id,
                    name=name,
                    category=cat,
                    price=price,
                    cost_price=cost,
                    margin_percent=margin,
                    is_available=True,
                    is_veg=is_veg,
                    prep_time_minutes=prep_time,
                    description=desc
                )
                db.session.add(m)
            db.session.flush()

        for m in MenuItem.query.all():
            menu_items_map[m.name] = m

        # 6. Recipe BOM Formulas
        if Recipe.query.count() == 0:
            canteen_recipes = [
                # 1. Gujarati Thali
                ("Gujarati Thali", "Whole Wheat Flour (Atta)", 0.12, "kg", 3.0),
                ("Gujarati Thali", "Basmati Rice (Aged)", 0.10, "kg", 2.0),
                ("Gujarati Thali", "Toor Dal (Pigeon Pea)", 0.06, "kg", 2.0),
                ("Gujarati Thali", "Potatoes (Aloo)", 0.10, "kg", 5.0),
                ("Gujarati Thali", "Pure Desi Ghee", 0.015, "kg", 0.0),
                ("Gujarati Thali", "Refined Sunflower Cooking Oil", 0.015, "l", 0.0),
                ("Gujarati Thali", "Refined Sugar", 0.015, "kg", 0.0),
                ("Gujarati Thali", "Garam Masala & Curry Spices Blend", 0.01, "kg", 0.0),

                # 2. Paneer Butter Masala
                ("Paneer Butter Masala", "Paneer (Fresh Cottage Cheese)", 0.16, "kg", 2.0),
                ("Paneer Butter Masala", "Tomatoes (Ripe)", 0.18, "kg", 4.0),
                ("Paneer Butter Masala", "Butter (Table Butter)", 0.03, "kg", 0.0),
                ("Paneer Butter Masala", "Fresh Cooking Cream", 0.025, "l", 0.0),
                ("Paneer Butter Masala", "Cashew Nuts (Split)", 0.015, "kg", 0.0),
                ("Paneer Butter Masala", "Garam Masala & Curry Spices Blend", 0.01, "kg", 0.0),

                # 3. Vegetable Pulao
                ("Vegetable Pulao", "Basmati Rice (Aged)", 0.16, "kg", 2.0),
                ("Vegetable Pulao", "Mixed Peas & Carrots", 0.06, "kg", 5.0),
                ("Vegetable Pulao", "Potatoes (Aloo)", 0.05, "kg", 5.0),
                ("Vegetable Pulao", "Onions (Red)", 0.04, "kg", 5.0),
                ("Vegetable Pulao", "Pure Desi Ghee", 0.015, "kg", 0.0),
                ("Vegetable Pulao", "Garam Masala & Curry Spices Blend", 0.008, "kg", 0.0),

                # 4. Sandwich
                ("Sandwich", "Sandwich Bread (Jumbo Slices)", 2.0, "pcs", 0.0),
                ("Sandwich", "Butter (Table Butter)", 0.015, "kg", 0.0),
                ("Sandwich", "Potatoes (Aloo)", 0.05, "kg", 5.0),
                ("Sandwich", "Tomatoes (Ripe)", 0.03, "kg", 5.0),
                ("Sandwich", "Onions (Red)", 0.025, "kg", 5.0),
                ("Sandwich", "Green Mint & Coriander Chutney", 0.015, "kg", 0.0),

                # 5. Dosa
                ("Dosa", "Dosa & Idli Fermented Batter", 0.18, "kg", 2.0),
                ("Dosa", "Potatoes (Aloo)", 0.10, "kg", 5.0),
                ("Dosa", "Onions (Red)", 0.03, "kg", 5.0),
                ("Dosa", "Refined Sunflower Cooking Oil", 0.015, "l", 0.0),
                ("Dosa", "Fresh Grated Coconut", 0.03, "kg", 2.0),
                ("Dosa", "Toor Dal (Pigeon Pea)", 0.025, "kg", 0.0),

                # 6. Idli
                ("Idli", "Dosa & Idli Fermented Batter", 0.16, "kg", 0.0),
                ("Idli", "Toor Dal (Pigeon Pea)", 0.03, "kg", 0.0),
                ("Idli", "Fresh Grated Coconut", 0.03, "kg", 2.0),

                # 7. Tea
                ("Tea", "Whole Milk", 0.10, "l", 0.0),
                ("Tea", "Assam CTC Tea Leaves", 0.008, "kg", 0.0),
                ("Tea", "Refined Sugar", 0.012, "kg", 0.0),

                # 8. Coffee
                ("Coffee", "Whole Milk", 0.12, "l", 0.0),
                ("Coffee", "South Indian Filter Coffee Powder", 0.012, "kg", 0.0),
                ("Coffee", "Refined Sugar", 0.012, "kg", 0.0)
            ]
            for dish_name, ing_name, q, u, loss in canteen_recipes:
                m_item = menu_items_map.get(dish_name)
                ing_item = ingredients_map.get(ing_name)
                if m_item and ing_item:
                    recipe = Recipe(
                        menu_item_id=m_item.id,
                        ingredient_id=ing_item.id,
                        quantity=q,
                        unit=u,
                        prep_loss_percentage=loss
                    )
                    db.session.add(recipe)
            db.session.flush()

        # Recalculate cost & margin for all menu items
        for m in MenuItem.query.all():
            m.calculate_cost_and_margin()
        db.session.commit()

        # 7. Historical Sales Records (Synthetic Canteen Data)
        if Sale.query.count() == 0:
            channels = ["Dine-in", "Takeaway", "Dine-in", "Takeaway", "Online"]
            payments = ["UPI", "Cash", "UPI", "Card", "UPI"]
            sample_customers = ["Ramesh Patel", "Bhavin Shah", "Pooja Mehta", "Kiran Desai", "Aarav Joshi", "Walk-in Guest"]

            # Seed realistic canteen orders across past 30 days
            order_seq = 1001
            for days_ago in range(30, -1, -1):
                order_date = today - timedelta(days=days_ago)
                # Weekdays higher canteen volume, weekend slightly lower
                daily_volume = random.randint(12, 22) if order_date.weekday() < 5 else random.randint(6, 14)

                for _ in range(daily_volume):
                    hour = random.choice([8, 9, 10, 12, 13, 14, 16, 17, 19, 20])
                    minute = random.randint(0, 59)
                    order_dt = datetime(order_date.year, order_date.month, order_date.day, hour, minute, 0, tzinfo=timezone.utc)

                    # Select 1 to 3 items
                    num_items = random.choices([1, 2, 3], weights=[0.5, 0.35, 0.15])[0]
                    chosen_dishes = random.sample(list(menu_items_map.values()), k=num_items)

                    subtotal = 0.0
                    order_items_to_add = []
                    for dish in chosen_dishes:
                        qty = random.choices([1, 2, 3], weights=[0.75, 0.2, 0.05])[0]
                        line_cost = round(dish.price * qty, 2)
                        subtotal += line_cost
                        order_items_to_add.append((dish.id, qty, dish.price, line_cost))

                    tax = round(subtotal * 0.05, 2)
                    tot = round(subtotal + tax, 2)

                    sale = Sale(
                        kitchen_id=kitchen.id,
                        order_number=f"ORD-{order_seq}",
                        channel=random.choice(channels),
                        table_number=f"Table {random.randint(1, 12)}" if random.random() > 0.3 else "",
                        customer_name=random.choice(sample_customers),
                        payment_method=random.choice(payments),
                        status="completed",
                        subtotal=subtotal,
                        tax=tax,
                        total_amount=tot,
                        notes="[SYNTHETIC GENERATED CANTEEN DATA]",
                        order_timestamp=order_dt
                    )
                    db.session.add(sale)
                    db.session.flush()

                    for m_id, q, u_p, s_t in order_items_to_add:
                        si = SaleItem(
                            sale_id=sale.id,
                            menu_item_id=m_id,
                            quantity=q,
                            unit_price=u_p,
                            subtotal=s_t
                        )
                        db.session.add(si)

                    order_seq += 1

            db.session.flush()

        # 8. Food Waste Records (Synthetic Canteen Waste)
        if WasteRecord.query.count() == 0:
            canteen_waste_seed = [
                ("WST-01", "Tomatoes (Ripe)", 3.0, "kg", 114.0, "Spoilage", "Soft spots from delivery crate [SYNTHETIC GENERATED]"),
                ("WST-02", "Paneer (Fresh Cottage Cheese)", 1.5, "kg", 480.0, "Prep Trimming Loss", "Corner trims during block portioning [SYNTHETIC GENERATED]"),
                ("WST-03", "Whole Milk", 2.5, "l", 150.0, "Spoilage", "Over-simmered milk batch [SYNTHETIC GENERATED]"),
                ("WST-04", "Sandwich Bread (Jumbo Slices)", 6.0, "pcs", 21.0, "Overproduction", "End crusts not suitable for sandwiches [SYNTHETIC GENERATED]"),
                ("WST-05", "Dosa & Idli Fermented Batter", 2.0, "kg", 110.0, "Overproduction", "Over-fermented end-of-day excess [SYNTHETIC GENERATED]"),
                ("WST-06", "Potatoes (Aloo)", 2.5, "kg", 70.0, "Prep Trimming Loss", "Peel and blemish trimming [SYNTHETIC GENERATED]")
            ]
            for w_num, ing_name, q, u, loss, r, n in canteen_waste_seed:
                ing = ingredients_map.get(ing_name)
                if ing:
                    w = WasteRecord(
                        kitchen_id=kitchen.id,
                        log_number=w_num,
                        ingredient_id=ing.id,
                        quantity=q,
                        unit=u,
                        financial_loss=loss,
                        reason=r,
                        logged_by="Chef Vikram",
                        notes=n,
                        logged_at=datetime.now(timezone.utc) - timedelta(hours=4)
                    )
                    db.session.add(w)
            db.session.flush()

        # 9. Purchases & Purchase Items
        if Purchase.query.count() == 0:
            po1 = Purchase(
                kitchen_id=kitchen.id,
                po_number="PO-101",
                supplier_name="Amul Dairy Distributors",
                contact="Rajesh Gupta (+91 98765 43210)",
                lead_time="12 hours",
                order_date=today,
                delivery_due_date=today + timedelta(days=1),
                total_estimated_cost=6700.0,
                status="draft",
                notes="Weekly dairy requirements for Paneer, Butter, and Milk [SYNTHETIC GENERATED]"
            )
            db.session.add(po1)
            db.session.flush()

            po1_items = [
                (ingredients_map.get("Paneer (Fresh Cottage Cheese)"), 25.0, 20.0, 15.0, 15.0, "kg", 320.0, 4800.0),
                (ingredients_map.get("Whole Milk"), 40.0, 25.0, 25.0, 25.0, "l", 60.0, 1500.0),
                (ingredients_map.get("Butter (Table Butter)"), 15.0, 10.0, 5.0, 5.0, "kg", 480.0, 400.0)
            ]
            for ing, f_dem, c_stk, rec_q, app_q, u, cost, sub in po1_items:
                if ing:
                    pi = PurchaseItem(
                        purchase_id=po1.id,
                        ingredient_id=ing.id,
                        forecasted_demand=f_dem,
                        current_stock=c_stk,
                        recommended_quantity=rec_q,
                        approved_quantity=app_q,
                        unit=u,
                        unit_cost=cost,
                        subtotal=sub
                    )
                    db.session.add(pi)

            po2 = Purchase(
                kitchen_id=kitchen.id,
                po_number="PO-102",
                supplier_name="GreenFields Fresh Produce",
                contact="Suresh Patel (+91 98480 12345)",
                lead_time="8 hours",
                order_date=today,
                delivery_due_date=today + timedelta(days=1),
                total_estimated_cost=2280.0,
                status="approved",
                notes="Fresh delivery for Tomatoes, Potatoes and Onions [SYNTHETIC GENERATED]"
            )
            db.session.add(po2)
            db.session.flush()

            po2_items = [
                (ingredients_map.get("Potatoes (Aloo)"), 40.0, 25.0, 25.0, 25.0, "kg", 28.0, 700.0),
                (ingredients_map.get("Tomatoes (Ripe)"), 25.0, 15.0, 20.0, 20.0, "kg", 38.0, 760.0),
                (ingredients_map.get("Onions (Red)"), 35.0, 20.0, 25.0, 25.0, "kg", 32.0, 800.0)
            ]
            for ing, f_dem, c_stk, rec_q, app_q, u, cost, sub in po2_items:
                if ing:
                    pi = PurchaseItem(
                        purchase_id=po2.id,
                        ingredient_id=ing.id,
                        forecasted_demand=f_dem,
                        current_stock=c_stk,
                        recommended_quantity=rec_q,
                        approved_quantity=app_q,
                        unit=u,
                        unit_cost=cost,
                        subtotal=sub
                    )
                    db.session.add(pi)

        # 10. AI Forecasts for Indian Canteen Dishes
        if Forecast.query.count() == 0:
            for dish in menu_items_map.values():
                base_canteen_demand = 45 if "Thali" in dish.name else 35 if "Dosa" in dish.name or "Idli" in dish.name else 60 if "Tea" in dish.name else 25
                for offset in range(-7, 15):
                    f_date = today + timedelta(days=offset)
                    multiplier = 1.25 if f_date.weekday() in (4, 5) else 1.0
                    pred = round(base_canteen_demand * multiplier, 1)
                    fc = Forecast(
                        kitchen_id=kitchen.id,
                        menu_item_id=dish.id,
                        forecast_date=f_date,
                        predicted_quantity=float(pred),
                        actual_quantity=float(pred + random.randint(-2, 4)) if offset <= 0 else None,
                        confidence_lower=float(max(10, pred - 6)),
                        confidence_upper=float(pred + 8),
                        baseline_quantity=float(base_canteen_demand),
                        factors_json='{"canteen_peak": "lunch", "synthetic": true}'
                    )
                    db.session.add(fc)

        db.session.commit()
        print(f"[+] Database successfully seeded with 8 Indian Canteen dishes, BOM recipes, and {Sale.query.count()} historical synthetic sales records!")

if __name__ == "__main__":
    seed_database()

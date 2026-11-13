"""
Sample seed data script for Kitchen Intelligence System.
Populates realistic seed data across all 12 tables.
"""
from datetime import datetime, date, timedelta
from werkzeug.security import generate_password_hash
from app import create_app
from app.extensions import db
from app.models import (
    Kitchen, User, MenuItem, Ingredient, Recipe,
    Sale, SaleItem, InventoryBatch, StockMovement,
    Purchase, PurchaseItem, WasteRecord, Forecast
)

def seed_database():
    app = create_app()
    with app.app_context():
        print("[*] Starting database seeding...")

        # 1. Kitchen
        kitchen = Kitchen.query.first()
        if not kitchen:
            kitchen = Kitchen(
                name="SpiceCraft Kitchen & Dining",
                location="Jubilee Hills, Hyderabad, Telangana",
                currency="INR",
                tax_rate=5.0
            )
            db.session.add(kitchen)
            db.session.flush()

        # 2. Users
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

        # 3. Ingredients Master (26 items)
        ingredients_map = {}
        if Ingredient.query.count() == 0:
            raw_ingredients = [
                ("ING-CHK-01", "Chicken (Boneless)", "Poultry & Meat", "kg", 8.0, 20.0, 10.0, 240.0, 4, "Royal Poultry Suppliers"),
                ("ING-PAN-01", "Paneer (Fresh Cottage Cheese)", "Dairy", "kg", 14.5, 20.0, 8.0, 320.0, 4, "Amul Dairy Distributors"),
                ("ING-RIC-01", "Basmati Rice (Aged)", "Grains & Staples", "kg", 45.0, 50.0, 15.0, 110.0, 90, "Everest Agro Foods"),
                ("ING-TOM-01", "Tomatoes (Ripe)", "Produce", "kg", 18.0, 25.0, 10.0, 40.0, 6, "GreenFields Fresh Produce"),
                ("ING-ONI-01", "Onions (Red)", "Produce", "kg", 32.0, 40.0, 15.0, 35.0, 14, "GreenFields Fresh Produce"),
                ("ING-GHE-01", "Pure Desi Ghee", "Oils & Ghee", "kg", 12.0, 15.0, 5.0, 650.0, 60, "Amul Dairy Distributors"),
                ("ING-MLK-01", "Whole Milk", "Dairy", "l", 16.0, 30.0, 10.0, 62.0, 3, "Amul Dairy Distributors"),
                ("ING-CRM-01", "Fresh Cooking Cream", "Dairy", "l", 8.5, 12.0, 4.0, 210.0, 5, "Amul Dairy Distributors"),
                ("ING-BUT-01", "Butter (Unsalted)", "Dairy", "kg", 9.0, 15.0, 5.0, 480.0, 30, "Amul Dairy Distributors"),
                ("ING-MAI-01", "All-Purpose Flour (Maida)", "Grains & Staples", "kg", 28.0, 35.0, 10.0, 45.0, 60, "Metro Cash & Carry"),
                ("ING-CSH-01", "Cashew Nuts (Split)", "Spices", "kg", 6.5, 10.0, 3.0, 780.0, 90, "Everest Spice Mart"),
                ("ING-GG-01", "Ginger-Garlic Paste", "Produce", "kg", 7.0, 10.0, 3.0, 120.0, 10, "GreenFields Fresh Produce"),
                ("ING-COR-01", "Fresh Coriander Leaves", "Produce", "kg", 2.2, 5.0, 2.0, 60.0, 3, "GreenFields Fresh Produce"),
                ("ING-MNT-01", "Fresh Mint Leaves", "Produce", "kg", 1.8, 4.0, 1.5, 70.0, 3, "GreenFields Fresh Produce"),
                ("ING-GM-01", "Garam Masala Blend", "Spices", "kg", 4.0, 6.0, 2.0, 520.0, 180, "Everest Spice Mart"),
                ("ING-BIR-01", "Biryani Spices Blend", "Spices", "kg", 3.5, 5.0, 1.5, 580.0, 180, "Everest Spice Mart"),
                ("ING-URD-01", "Black Urad Dal", "Grains & Staples", "kg", 15.0, 20.0, 6.0, 140.0, 90, "Metro Cash & Carry"),
                ("ING-RAJ-01", "Kashmiri Rajma", "Grains & Staples", "kg", 8.0, 12.0, 4.0, 160.0, 90, "Metro Cash & Carry"),
                ("ING-KHW-01", "Mawa / Khoya", "Dairy", "kg", 5.0, 8.0, 3.0, 360.0, 5, "Amul Dairy Distributors"),
                ("ING-SUG-01", "Refined Sugar", "Grains & Staples", "kg", 25.0, 30.0, 10.0, 44.0, 180, "Metro Cash & Carry"),
                ("ING-SAF-01", "Kashmiri Saffron", "Spices", "g", 40.0, 50.0, 15.0, 280.0, 365, "Royal Spices & Dry Fruits"),
                ("ING-YOG-01", "Thick Curd / Dahi", "Dairy", "kg", 12.0, 18.0, 6.0, 75.0, 5, "Amul Dairy Distributors"),
                ("ING-OIL-01", "Refined Mustard Oil", "Oils & Ghee", "l", 20.0, 25.0, 8.0, 150.0, 90, "Metro Cash & Carry"),
                ("ING-CUM-01", "Cumin Seeds (Jeera)", "Spices", "kg", 4.5, 6.0, 2.0, 380.0, 180, "Everest Spice Mart"),
                ("ING-TEA-01", "Assam CTC Tea Leaves", "Grains & Staples", "kg", 6.0, 10.0, 3.0, 320.0, 180, "Metro Cash & Carry"),
                ("ING-CD-01", "Green Cardamom", "Spices", "kg", 1.5, 3.0, 1.0, 2400.0, 365, "Royal Spices & Dry Fruits")
            ]
            for sku, name, cat, unit, cur_stk, par, reorder, cost, shelf, supp in raw_ingredients:
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

        # 4. Inventory Batches with FEFO Expiry
        today = date.today()
        if InventoryBatch.query.count() == 0:
            batches_seed = [
                # Critical batches (expiring in 1-2 days)
                (ingredients_map.get("Paneer (Fresh Cottage Cheese)"), "PAN-01", 10.0, 4.5, 320.0, today - timedelta(days=3), today + timedelta(days=1), "critical"),
                (ingredients_map.get("Whole Milk"), "MLK-01", 15.0, 5.0, 62.0, today - timedelta(days=2), today + timedelta(days=1), "critical"),
                (ingredients_map.get("Tomatoes (Ripe)"), "TOM-01", 20.0, 6.0, 40.0, today - timedelta(days=5), today + timedelta(days=1), "critical"),
                # Warning batches (expiring in 3 days)
                (ingredients_map.get("Chicken (Boneless)"), "CHK-01", 20.0, 8.0, 240.0, today - timedelta(days=2), today + timedelta(days=2), "warning"),
                (ingredients_map.get("Fresh Cooking Cream"), "CRM-01", 10.0, 3.5, 210.0, today - timedelta(days=3), today + timedelta(days=2), "warning"),
                # Fresh batches (longer shelf life)
                (ingredients_map.get("Basmati Rice (Aged)"), "RIC-01", 50.0, 45.0, 110.0, today - timedelta(days=10), today + timedelta(days=80), "fresh"),
                (ingredients_map.get("Pure Desi Ghee"), "GHE-01", 15.0, 12.0, 650.0, today - timedelta(days=15), today + timedelta(days=45), "fresh"),
                (ingredients_map.get("Onions (Red)"), "ONI-01", 40.0, 32.0, 35.0, today - timedelta(days=4), today + timedelta(days=10), "fresh"),
                (ingredients_map.get("Butter (Unsalted)"), "BUT-01", 12.0, 9.0, 480.0, today - timedelta(days=5), today + timedelta(days=25), "fresh"),
                (ingredients_map.get("All-Purpose Flour (Maida)"), "MAI-01", 30.0, 28.0, 45.0, today - timedelta(days=8), today + timedelta(days=52), "fresh"),
                (ingredients_map.get("Black Urad Dal"), "URD-01", 20.0, 15.0, 140.0, today - timedelta(days=12), today + timedelta(days=78), "fresh"),
                (ingredients_map.get("Paneer (Fresh Cottage Cheese)"), "PAN-02", 10.0, 10.0, 320.0, today, today + timedelta(days=4), "fresh"),
                (ingredients_map.get("Whole Milk"), "MLK-02", 15.0, 11.0, 62.0, today, today + timedelta(days=3), "fresh"),
            ]
            for ing, b_num, init_q, rem_q, cost, rec_d, exp_d, status in batches_seed:
                if ing:
                    batch = InventoryBatch(
                        ingredient_id=ing.id,
                        batch_number=b_num,
                        initial_quantity=init_q,
                        remaining_quantity=rem_q,
                        unit=ing.unit,
                        unit_cost=cost,
                        received_date=rec_d,
                        expiry_date=exp_d,
                        supplier_name=ing.preferred_supplier,
                        status="active"
                    )
                    db.session.add(batch)
            db.session.flush()

            # Ensure every raw ingredient has at least one active batch for FEFO recipe explosions
            for ing in ingredients_map.values():
                has_batch = InventoryBatch.query.filter_by(ingredient_id=ing.id, status="active").first()
                if not has_batch and ing.current_stock > 0:
                    batch = InventoryBatch(
                        ingredient_id=ing.id,
                        batch_number=f"{ing.name[:3].upper()}-01",
                        initial_quantity=ing.current_stock,
                        remaining_quantity=ing.current_stock,
                        unit=ing.unit,
                        unit_cost=ing.unit_cost,
                        received_date=today - timedelta(days=1),
                        expiry_date=today + timedelta(days=max(3, ing.shelf_life_days)),
                        supplier_name=ing.preferred_supplier,
                        status="active"
                    )
                    db.session.add(batch)
            db.session.flush()

        # 5. Menu Items (12 dishes)
        menu_items_map = {}
        if MenuItem.query.count() == 0:
            menu_data = [
                ("Hyderabadi Chicken Dum Biryani", "Biryani", 380.0, 128.0, False, 25, "Layered fragrant basmati rice with marinated chicken, saffron, ghee and fried onions."),
                ("Paneer Butter Masala", "Mains", 320.0, 104.0, True, 20, "Cottage cheese cubes simmered in a velvety tomato, butter, and cashew nut gravy."),
                ("Butter Chicken (Murgh Makhani)", "Mains", 420.0, 142.0, False, 25, "Charcoal grilled chicken cooked in a rich, buttery tomato sauce perfumed with fenugreek."),
                ("Garlic Butter Naan", "Breads", 65.0, 18.0, True, 8, "Traditional tandoor-baked leavened flatbread brushed with garlic butter and fresh coriander."),
                ("Dal Makhani", "Mains", 280.0, 78.0, True, 20, "Slow-cooked black lentils and kidney beans simmered overnight with butter and fresh cream."),
                ("Tandoori Chicken (Half)", "Starters", 340.0, 118.0, False, 22, "Spring chicken marinated in spiced yogurt and mustard oil, roasted to smoky perfection."),
                ("Paneer Tikka Platter", "Starters", 290.0, 92.0, True, 18, "Marinated cottage cheese and bell peppers chargrilled with tandoori spices and mint chutney."),
                ("Steamed Jeera Basmati Rice", "Mains", 160.0, 42.0, True, 12, "Fluffy long-grain basmati rice tempered with royal cumin seeds and clarified ghee."),
                ("Gulab Jamun (2 pcs)", "Desserts", 110.0, 32.0, True, 5, "Fried milk dough dumplings soaked in warm rosewater and green cardamom sugar syrup."),
                ("Mango Lassi (Chilled)", "Beverages", 120.0, 36.0, True, 5, "Thick chilled yogurt beverage blended with sweet Alphonso mango pulp and cardamom."),
                ("Special Masala Chai", "Beverages", 50.0, 12.0, True, 5, "Brewed Assam CTC tea simmered with fresh milk, crushed ginger, and green cardamom."),
                ("Burani Garlic Raita", "Mains", 90.0, 24.0, True, 5, "Spiced whisked curd infused with golden fried garlic slices and roasted cumin powder.")
            ]
            for name, cat, price, cost, is_veg, prep_time, desc in menu_data:
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

        # 6. Recipes (BOM Links)
        if Recipe.query.count() == 0:
            bom_links = [
                # Hyderabadi Biryani
                ("Hyderabadi Chicken Dum Biryani", "Chicken (Boneless)", 0.25, "kg", 5.0),
                ("Hyderabadi Chicken Dum Biryani", "Basmati Rice (Aged)", 0.20, "kg", 2.0),
                ("Hyderabadi Chicken Dum Biryani", "Onions (Red)", 0.12, "kg", 8.0),
                ("Hyderabadi Chicken Dum Biryani", "Pure Desi Ghee", 0.03, "kg", 0.0),
                ("Hyderabadi Chicken Dum Biryani", "Ginger-Garlic Paste", 0.02, "kg", 0.0),
                ("Hyderabadi Chicken Dum Biryani", "Biryani Spices Blend", 0.015, "kg", 0.0),
                ("Hyderabadi Chicken Dum Biryani", "Kashmiri Saffron", 0.1, "g", 0.0),
                # Paneer Butter Masala
                ("Paneer Butter Masala", "Paneer (Fresh Cottage Cheese)", 0.18, "kg", 3.0),
                ("Paneer Butter Masala", "Tomatoes (Ripe)", 0.20, "kg", 5.0),
                ("Paneer Butter Masala", "Butter (Unsalted)", 0.04, "kg", 0.0),
                ("Paneer Butter Masala", "Fresh Cooking Cream", 0.03, "l", 0.0),
                ("Paneer Butter Masala", "Cashew Nuts (Split)", 0.02, "kg", 0.0),
                ("Paneer Butter Masala", "Garam Masala Blend", 0.01, "kg", 0.0),
                # Butter Chicken
                ("Butter Chicken (Murgh Makhani)", "Chicken (Boneless)", 0.22, "kg", 5.0),
                ("Butter Chicken (Murgh Makhani)", "Tomatoes (Ripe)", 0.22, "kg", 5.0),
                ("Butter Chicken (Murgh Makhani)", "Butter (Unsalted)", 0.05, "kg", 0.0),
                ("Butter Chicken (Murgh Makhani)", "Fresh Cooking Cream", 0.04, "l", 0.0),
                ("Butter Chicken (Murgh Makhani)", "Cashew Nuts (Split)", 0.02, "kg", 0.0),
                # Garlic Naan
                ("Garlic Butter Naan", "All-Purpose Flour (Maida)", 0.12, "kg", 3.0),
                ("Garlic Butter Naan", "Butter (Unsalted)", 0.015, "kg", 0.0),
                ("Garlic Butter Naan", "Whole Milk", 0.03, "l", 0.0),
                # Dal Makhani
                ("Dal Makhani", "Black Urad Dal", 0.10, "kg", 2.0),
                ("Dal Makhani", "Kashmiri Rajma", 0.02, "kg", 2.0),
                ("Dal Makhani", "Butter (Unsalted)", 0.04, "kg", 0.0),
                ("Dal Makhani", "Fresh Cooking Cream", 0.03, "l", 0.0),
                ("Dal Makhani", "Tomatoes (Ripe)", 0.08, "kg", 5.0),
                # Gulab Jamun
                ("Gulab Jamun (2 pcs)", "Mawa / Khoya", 0.06, "kg", 3.0),
                ("Gulab Jamun (2 pcs)", "Refined Sugar", 0.08, "kg", 0.0),
                ("Gulab Jamun (2 pcs)", "Green Cardamom", 0.002, "kg", 0.0),
            ]
            for dish_name, ing_name, q, u, loss in bom_links:
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

        # 7. Sales Orders
        if Sale.query.count() == 0:
            sales_data = [
                ("ORD-1041", "Dine-in", "Table 4", "Amit Sharma", "UPI", 1320.0, 66.0, 1386.0, [("Hyderabadi Chicken Dum Biryani", 2), ("Garlic Butter Naan", 4), ("Mango Lassi (Chilled)", 2)]),
                ("ORD-1042", "Dine-in", "Table 2", "Kavita Reddy", "Card", 700.0, 35.0, 735.0, [("Paneer Butter Masala", 1), ("Garlic Butter Naan", 2), ("Gulab Jamun (2 pcs)", 2)]),
                ("ORD-1043", "Takeaway", "", "Rohan Deshmukh", "UPI", 940.0, 47.0, 987.0, [("Butter Chicken (Murgh Makhani)", 1), ("Hyderabadi Chicken Dum Biryani", 1), ("Garlic Butter Naan", 2)]),
                ("ORD-1044", "Online", "", "Swiggy Order #882", "UPI", 420.0, 21.0, 441.0, [("Butter Chicken (Murgh Makhani)", 1)]),
                ("ORD-1045", "Dine-in", "Table 7", "Naveen Kumar", "Cash", 1120.0, 56.0, 1176.0, [("Tandoori Chicken (Half)", 2), ("Garlic Butter Naan", 4), ("Burani Garlic Raita", 2)]),
            ]
            for ord_num, ch, tbl, cust, pay, sub, tax, tot, items in sales_data:
                s = Sale(
                    kitchen_id=kitchen.id,
                    order_number=ord_num,
                    channel=ch,
                    table_number=tbl,
                    customer_name=cust,
                    payment_method=pay,
                    status="completed",
                    subtotal=sub,
                    tax=tax,
                    total_amount=tot,
                    order_timestamp=datetime.utcnow() - timedelta(minutes=15)
                )
                db.session.add(s)
                db.session.flush()

                for d_name, q in items:
                    m = menu_items_map.get(d_name)
                    if m:
                        si = SaleItem(
                            sale_id=s.id,
                            menu_item_id=m.id,
                            quantity=q,
                            unit_price=m.price,
                            subtotal=round(m.price * q, 2)
                        )
                        db.session.add(si)
            db.session.flush()

        # 8. Food Waste Records
        if WasteRecord.query.count() == 0:
            waste_seed = [
                ("WST-01", "Tomatoes (Ripe)", 3.5, "kg", 140.0, "Spoilage", "Soft spots from bottom crate moisture"),
                ("WST-02", "Paneer (Fresh Cottage Cheese)", 1.2, "kg", 384.0, "Prep Trimming Loss", "Irregular edges trimmed during starter skewering"),
                ("WST-03", "Chicken (Boneless)", 2.0, "kg", 480.0, "Storage Glitch", "Chiller temperature fluctuation on shelf 2"),
                ("WST-04", "Onions (Red)", 4.0, "kg", 140.0, "Prep Trimming Loss", "Outer skin and root peeling trim"),
                ("WST-05", "Whole Milk", 3.0, "l", 186.0, "Spoilage", "Soured due to delayed cold-room loading"),
                ("WST-06", "All-Purpose Flour (Maida)", 1.5, "kg", 67.5, "Overproduction", "Unused dough portion past proofing window"),
            ]
            for w_num, ing_name, q, u, loss, r, n in waste_seed:
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
                        logged_at=datetime.utcnow() - timedelta(hours=3)
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
                total_estimated_cost=6350.0,
                status="draft",
                notes="Weekend stock buffer for Paneer, Butter and Milk."
            )
            db.session.add(po1)
            db.session.flush()

            po1_items = [
                (ingredients_map.get("Paneer (Fresh Cottage Cheese)"), 22.0, 14.5, 15.0, 15.0, "kg", 320.0, 4800.0),
                (ingredients_map.get("Whole Milk"), 35.0, 16.0, 25.0, 25.0, "l", 62.0, 1550.0)
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
                total_estimated_cost=2250.0,
                status="approved",
                notes="Fresh delivery for Tomatoes, Onions and Coriander."
            )
            db.session.add(po2)
            db.session.flush()

            po2_items = [
                (ingredients_map.get("Tomatoes (Ripe)"), 30.0, 18.0, 20.0, 20.0, "kg", 40.0, 800.0),
                (ingredients_map.get("Onions (Red)"), 50.0, 32.0, 25.0, 25.0, "kg", 35.0, 875.0),
                (ingredients_map.get("Fresh Coriander Leaves"), 8.0, 2.2, 5.0, 5.0, "kg", 60.0, 300.0)
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

        # 10. AI Forecasts (Past 7 days + Next 14 days)
        if Forecast.query.count() == 0:
            first_menu_item = MenuItem.query.first()
            if first_menu_item:
                for offset in range(-7, 15):
                    f_date = today + timedelta(days=offset)
                    base_qty = 130 + (25 if f_date.weekday() in (4, 5, 6) else 0)
                    fc = Forecast(
                        kitchen_id=kitchen.id,
                        menu_item_id=first_menu_item.id,
                        forecast_date=f_date,
                        predicted_quantity=float(base_qty),
                        actual_quantity=float(base_qty + 4) if offset <= 0 else None,
                        confidence_lower=float(base_qty - 10),
                        confidence_upper=float(base_qty + 12),
                        baseline_quantity=float(base_qty - 5),
                        factors_json='{"holiday_multiplier": 1.0, "weekend": true}' if f_date.weekday() in (4, 5, 6) else '{"holiday_multiplier": 1.0}'
                    )
                    db.session.add(fc)

        # 11. Stock Movement Seed Log
        if StockMovement.query.count() == 0:
            for ing in Ingredient.query.limit(5).all():
                m = StockMovement(
                    ingredient_id=ing.id,
                    movement_type="purchase",
                    quantity=ing.current_stock,
                    unit=ing.unit,
                    unit_cost=ing.unit_cost,
                    reference_id=f"INITIAL-{ing.sku}",
                    reference_type="initial_inventory",
                    notes="Initial system inventory setup",
                    created_at=datetime.utcnow() - timedelta(days=1)
                )
                db.session.add(m)

        db.session.commit()
        print("[+] Database successfully seeded with production-grade sample data across all 12 modules!")

if __name__ == "__main__":
    seed_database()

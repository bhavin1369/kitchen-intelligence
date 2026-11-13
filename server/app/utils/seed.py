import datetime
import random
from werkzeug.security import generate_password_hash
from app.utils.db import get_db, init_db
from app.utils.indian_calendar import INDIAN_CALENDAR_EVENTS

def seed_database():
    print("Initializing SQLite schema...")
    init_db()

    with get_db() as conn:
        cursor = conn.cursor()

        # Check if already seeded
        cursor.execute("SELECT COUNT(*) FROM users;")
        if cursor.fetchone()[0] > 0:
            print("Database already contains data. Skipping re-seed.")
            return

        print("Seeding Users...")
        users = [
            ("admin", "admin@kitchen.ai", generate_password_hash("admin123"), "admin"),
            ("chef_vikram", "vikram@kitchen.ai", generate_password_hash("chef123"), "chef"),
            ("manager_priya", "priya@kitchen.ai", generate_password_hash("manager123"), "manager"),
            ("staff_rahul", "rahul@kitchen.ai", generate_password_hash("staff123"), "staff"),
        ]
        cursor.executemany(
            "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?);",
            users
        )

        print("Seeding System Settings...")
        settings = [
            ("restaurant_name", "SpiceCraft Kitchen & Dining", "Trading restaurant name"),
            ("currency_symbol", "₹", "Currency symbol"),
            ("currency_code", "INR", "ISO currency code"),
            ("expiry_warning_days", "5", "Days threshold to flag batch as warning"),
            ("expiry_critical_days", "2", "Days threshold to flag batch as critical urgent"),
            ("par_level_buffer_ratio", "1.15", "Safety buffer multiplier applied to par levels"),
            ("default_tax_rate", "5.0", "GST percentage applied to food sales"),
        ]
        cursor.executemany(
            "INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?);",
            settings
        )

        print("Seeding Categories...")
        categories = [
            # Menu Categories
            ("Starters", "menu", "Appetizers and quick snacks"),
            ("Main Course", "menu", "Curries, gravies and specialty mains"),
            ("Rice & Biryani", "menu", "Flavored rice, pulao, and signature biryanis"),
            ("Breads", "menu", "Naans, rotis, parathas"),
            ("Desserts", "menu", "Traditional sweets and puddings"),
            ("Beverages", "menu", "Lassi, chaas, coolers and hot drinks"),
            # Ingredient Categories
            ("Dairy", "ingredient", "Milk, butter, paneer, curd, cream"),
            ("Vegetables & Produce", "ingredient", "Fresh vegetables, herbs, onions, tomatoes"),
            ("Poultry & Meat", "ingredient", "Chicken, mutton, seafood"),
            ("Grains & Flours", "ingredient", "Basmati rice, atta, maida, lentils"),
            ("Oils & Ghee", "ingredient", "Cooking oil, desi ghee, mustard oil"),
            ("Spices & Condiments", "ingredient", "Garam masala, saffron, whole spices, pastes"),
        ]
        cursor.executemany(
            "INSERT INTO categories (name, type, description) VALUES (?, ?, ?);",
            categories
        )

        # Retrieve category IDs
        cursor.execute("SELECT id, name FROM categories;")
        cat_map = {row["name"]: row["id"] for row in cursor.fetchall()}

        print("Seeding Suppliers...")
        suppliers = [
            ("Amul Dairy Cooperative", "Anand Kumar", "supply@amul.coop", "+91 98201 12345", 1),
            ("GreenFields Agro Produce", "Sunil Verma", "orders@greenfields.in", "+91 98111 67890", 1),
            ("Royal Poultry & Meats", "Mohammed Tariq", "sales@royalmeats.com", "+91 98450 11223", 2),
            ("Bharat Grain & Flour Mills", "Rajesh Gupta", "contact@bharatgrains.in", "+91 98300 44556", 3),
            ("Everest Spices Wholesale", "Kishore Shah", "wholesale@everest.in", "+91 98222 77889", 2),
        ]
        cursor.executemany(
            "INSERT INTO suppliers (name, contact_person, email, phone, lead_time_days) VALUES (?, ?, ?, ?, ?);",
            suppliers
        )
        cursor.execute("SELECT id, name FROM suppliers;")
        sup_map = {row["name"]: row["id"] for row in cursor.fetchall()}

        print("Seeding Ingredients...")
        # (name, cat, sup, unit, current_stock, par_level, cost_per_unit, shelf_life_days)
        ingredients = [
            ("Paneer (Cottage Cheese)", "Dairy", "Amul Dairy Cooperative", "kg", 18.5, 12.0, 340.0, 5),
            ("Fresh Milk", "Dairy", "Amul Dairy Cooperative", "l", 25.0, 15.0, 62.0, 3),
            ("Heavy Cream", "Dairy", "Amul Dairy Cooperative", "l", 8.0, 5.0, 240.0, 7),
            ("Desi Ghee", "Dairy", "Amul Dairy Cooperative", "kg", 15.0, 6.0, 650.0, 60),
            ("Curd / Yogurt", "Dairy", "Amul Dairy Cooperative", "kg", 14.0, 10.0, 70.0, 4),
            ("Butter (Unsalted)", "Dairy", "Amul Dairy Cooperative", "kg", 9.5, 5.0, 480.0, 21),
            ("Chicken (Boneless)", "Poultry & Meat", "Royal Poultry & Meats", "kg", 32.0, 20.0, 260.0, 3),
            ("Chicken (Bone-in)", "Poultry & Meat", "Royal Poultry & Meats", "kg", 25.0, 15.0, 190.0, 3),
            ("Basmati Biryani Rice", "Grains & Flours", "Bharat Grain & Flour Mills", "kg", 85.0, 40.0, 115.0, 180),
            ("Wheat Atta", "Grains & Flours", "Bharat Grain & Flour Mills", "kg", 60.0, 30.0, 42.0, 90),
            ("Maida Flour", "Grains & Flours", "Bharat Grain & Flour Mills", "kg", 40.0, 20.0, 38.0, 90),
            ("Toor Dal", "Grains & Flours", "Bharat Grain & Flour Mills", "kg", 30.0, 15.0, 145.0, 120),
            ("Red Onions", "Vegetables & Produce", "GreenFields Agro Produce", "kg", 45.0, 30.0, 35.0, 14),
            ("Tomatoes", "Vegetables & Produce", "GreenFields Agro Produce", "kg", 32.0, 20.0, 40.0, 7),
            ("Potatoes", "Vegetables & Produce", "GreenFields Agro Produce", "kg", 50.0, 25.0, 28.0, 20),
            ("Ginger-Garlic Paste", "Vegetables & Produce", "GreenFields Agro Produce", "kg", 12.0, 8.0, 160.0, 14),
            ("Green Chilies", "Vegetables & Produce", "GreenFields Agro Produce", "kg", 4.5, 3.0, 75.0, 8),
            ("Fresh Coriander & Mint", "Vegetables & Produce", "GreenFields Agro Produce", "kg", 3.0, 2.0, 90.0, 3),
            ("Refined Sunflower Oil", "Oils & Ghee", "Bharat Grain & Flour Mills", "l", 45.0, 25.0, 135.0, 120),
            ("Garam Masala Powder", "Spices & Condiments", "Everest Spices Wholesale", "kg", 6.0, 3.0, 520.0, 180),
            ("Red Chili Powder", "Spices & Condiments", "Everest Spices Wholesale", "kg", 8.0, 4.0, 310.0, 180),
            ("Kashmiri Saffron", "Spices & Condiments", "Everest Spices Wholesale", "g", 50.0, 20.0, 280.0, 365),
            ("Cashews (Kaju)", "Spices & Condiments", "Everest Spices Wholesale", "kg", 7.5, 4.0, 820.0, 90),
            ("Cardamom & Cloves", "Spices & Condiments", "Everest Spices Wholesale", "kg", 3.0, 1.5, 1450.0, 180),
            ("Gulab Jamun Mix / Khoya", "Dairy", "Amul Dairy Cooperative", "kg", 10.0, 5.0, 360.0, 10),
            ("Sugar", "Grains & Flours", "Bharat Grain & Flour Mills", "kg", 40.0, 20.0, 45.0, 180),
        ]

        ing_id_map = {}
        for name, cat_name, sup_name, unit, curr_stock, par, cost, shelf in ingredients:
            cursor.execute(
                """INSERT INTO ingredients 
                   (category_id, default_supplier_id, name, unit, current_stock, par_level, cost_per_unit, shelf_life_days)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?);""",
                (cat_map[cat_name], sup_map[sup_name], name, unit, curr_stock, par, cost, shelf)
            )
            ing_id_map[name] = cursor.lastrowid

        print("Seeding Inventory Batches (FEFO)...")
        today = datetime.date.today()
        # Seed both healthy batches and near-expiry batches to trigger alerts
        batches = [
            # Expiring TOMORROW (Critical Alert)
            ("Paneer (Cottage Cheese)", "BATCH-PAN-01", 10.0, 4.5, today - datetime.timedelta(days=4), today + datetime.timedelta(days=1)),
            # Expiring in 2 days (Critical Alert)
            ("Fresh Milk", "BATCH-MLK-01", 15.0, 5.0, today - datetime.timedelta(days=2), today + datetime.timedelta(days=1)),
            ("Chicken (Boneless)", "BATCH-CHK-01", 20.0, 7.0, today - datetime.timedelta(days=2), today + datetime.timedelta(days=1)),
            # Expiring in 4 days (Warning Alert)
            ("Curd / Yogurt", "BATCH-CRD-01", 15.0, 8.0, today - datetime.timedelta(days=1), today + datetime.timedelta(days=3)),
            ("Tomatoes", "BATCH-TOM-01", 25.0, 12.0, today - datetime.timedelta(days=3), today + datetime.timedelta(days=4)),
            ("Fresh Coriander & Mint", "BATCH-COR-01", 4.0, 1.5, today - datetime.timedelta(days=1), today + datetime.timedelta(days=2)),
            # Fresh Batches (Healthy)
            ("Paneer (Cottage Cheese)", "BATCH-PAN-02", 15.0, 14.0, today, today + datetime.timedelta(days=5)),
            ("Chicken (Boneless)", "BATCH-CHK-02", 25.0, 25.0, today, today + datetime.timedelta(days=3)),
            ("Basmati Biryani Rice", "BATCH-RCE-01", 100.0, 85.0, today - datetime.timedelta(days=15), today + datetime.timedelta(days=165)),
            ("Red Onions", "BATCH-ONI-01", 50.0, 45.0, today - datetime.timedelta(days=2), today + datetime.timedelta(days=12)),
            ("Desi Ghee", "BATCH-GHE-01", 20.0, 15.0, today - datetime.timedelta(days=5), today + datetime.timedelta(days=55)),
            ("Butter (Unsalted)", "BATCH-BTR-01", 10.0, 9.5, today - datetime.timedelta(days=2), today + datetime.timedelta(days=19)),
            ("Heavy Cream", "BATCH-CRM-01", 10.0, 8.0, today - datetime.timedelta(days=1), today + datetime.timedelta(days=6)),
        ]
        for ing_name, b_no, init_q, rem_q, rec_d, exp_d in batches:
            ing_id = ing_id_map[ing_name]
            cursor.execute("SELECT cost_per_unit FROM ingredients WHERE id = ?;", (ing_id,))
            cost = cursor.fetchone()[0]
            cursor.execute(
                """INSERT INTO inventory_batches 
                   (ingredient_id, batch_number, initial_quantity, remaining_quantity, purchase_cost_per_unit, received_date, expiry_date, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'active');""",
                (ing_id, b_no, init_q, rem_q, cost, rec_d.isoformat(), exp_d.isoformat())
            )

        print("Seeding Menu Items & Recipes (Bill of Materials)...")
        menu_catalog = [
            ("Paneer Butter Masala", "Main Course", 290.0, "Rich creamy curry with cottage cheese cubes in buttery gravy", [
                ("Paneer (Cottage Cheese)", 0.200, "kg", 0.0),
                ("Butter (Unsalted)", 0.030, "kg", 0.0),
                ("Heavy Cream", 0.040, "l", 0.0),
                ("Tomatoes", 0.150, "kg", 0.10),
                ("Red Onions", 0.080, "kg", 0.15),
                ("Ginger-Garlic Paste", 0.015, "kg", 0.0),
                ("Cashews (Kaju)", 0.020, "kg", 0.0),
                ("Garam Masala Powder", 0.005, "kg", 0.0),
            ]),
            ("Hyderabadi Chicken Dum Biryani", "Rice & Biryani", 340.0, "Aromatic basmati rice layered with spiced marinated chicken and saffron", [
                ("Chicken (Bone-in)", 0.350, "kg", 0.05),
                ("Basmati Biryani Rice", 0.220, "kg", 0.0),
                ("Desi Ghee", 0.030, "kg", 0.0),
                ("Curd / Yogurt", 0.080, "kg", 0.0),
                ("Red Onions", 0.120, "kg", 0.15),
                ("Ginger-Garlic Paste", 0.025, "kg", 0.0),
                ("Kashmiri Saffron", 0.2, "g", 0.0),
                ("Cardamom & Cloves", 0.005, "kg", 0.0),
                ("Fresh Coriander & Mint", 0.020, "kg", 0.10),
            ]),
            ("Butter Chicken (Murgh Makhani)", "Main Course", 360.0, "Tender roasted chicken chunks in velvet tomato and cashew gravy", [
                ("Chicken (Boneless)", 0.250, "kg", 0.0),
                ("Butter (Unsalted)", 0.040, "kg", 0.0),
                ("Heavy Cream", 0.050, "l", 0.0),
                ("Tomatoes", 0.180, "kg", 0.10),
                ("Ginger-Garlic Paste", 0.020, "kg", 0.0),
                ("Cashews (Kaju)", 0.025, "kg", 0.0),
                ("Red Chili Powder", 0.008, "kg", 0.0),
            ]),
            ("Dal Makhani", "Main Course", 240.0, "Slow-cooked black lentils finished with cream and white butter", [
                ("Toor Dal", 0.120, "kg", 0.0),
                ("Butter (Unsalted)", 0.035, "kg", 0.0),
                ("Heavy Cream", 0.040, "l", 0.0),
                ("Tomatoes", 0.100, "kg", 0.10),
                ("Ginger-Garlic Paste", 0.015, "kg", 0.0),
            ]),
            ("Vegetable Biryani", "Rice & Biryani", 260.0, "Fragrant rice tossed with mixed vegetables and caramelized onions", [
                ("Basmati Biryani Rice", 0.200, "kg", 0.0),
                ("Potatoes", 0.080, "kg", 0.10),
                ("Red Onions", 0.080, "kg", 0.15),
                ("Curd / Yogurt", 0.050, "kg", 0.0),
                ("Desi Ghee", 0.020, "kg", 0.0),
                ("Garam Masala Powder", 0.005, "kg", 0.0),
            ]),
            ("Butter Naan", "Breads", 55.0, "Tandoor baked leavened flatbread brushed with butter", [
                ("Maida Flour", 0.120, "kg", 0.0),
                ("Fresh Milk", 0.030, "l", 0.0),
                ("Butter (Unsalted)", 0.015, "kg", 0.0),
            ]),
            ("Tandoori Roti", "Breads", 35.0, "Whole wheat bread baked crisp in tandoor", [
                ("Wheat Atta", 0.090, "kg", 0.0),
                ("Desi Ghee", 0.005, "kg", 0.0),
            ]),
            ("Paneer Tikka (6 Pcs)", "Starters", 270.0, "Spiced yogurt marinated paneer cubes chargrilled on skewers", [
                ("Paneer (Cottage Cheese)", 0.220, "kg", 0.0),
                ("Curd / Yogurt", 0.070, "kg", 0.0),
                ("Ginger-Garlic Paste", 0.015, "kg", 0.0),
                ("Red Chili Powder", 0.008, "kg", 0.0),
                ("Refined Sunflower Oil", 0.015, "l", 0.0),
            ]),
            ("Chicken Tikka (6 Pcs)", "Starters", 310.0, "Juicy boneless chicken marinated in tandoori spices and roasted", [
                ("Chicken (Boneless)", 0.240, "kg", 0.0),
                ("Curd / Yogurt", 0.080, "kg", 0.0),
                ("Ginger-Garlic Paste", 0.020, "kg", 0.0),
                ("Red Chili Powder", 0.010, "kg", 0.0),
                ("Refined Sunflower Oil", 0.020, "l", 0.0),
            ]),
            ("Gulab Jamun (2 Pcs)", "Desserts", 90.0, "Golden fried milk dough balls soaked in rose-cardamom sugar syrup", [
                ("Gulab Jamun Mix / Khoya", 0.080, "kg", 0.0),
                ("Sugar", 0.100, "kg", 0.0),
                ("Desi Ghee", 0.020, "kg", 0.0),
                ("Cardamom & Cloves", 0.002, "kg", 0.0),
            ]),
            ("Masala Chaas", "Beverages", 50.0, "Spiced churned buttermilk tempered with cumin and fresh coriander", [
                ("Curd / Yogurt", 0.150, "kg", 0.0),
                ("Green Chilies", 0.005, "kg", 0.05),
                ("Fresh Coriander & Mint", 0.010, "kg", 0.10),
            ]),
            ("Sweet Punjabi Lassi", "Beverages", 80.0, "Thick creamy yogurt beverage whipped with cardamom and sugar", [
                ("Curd / Yogurt", 0.220, "kg", 0.0),
                ("Sugar", 0.035, "kg", 0.0),
                ("Fresh Milk", 0.050, "l", 0.0),
                ("Heavy Cream", 0.015, "l", 0.0),
            ]),
        ]

        menu_id_map = {}
        for item_name, cat_name, price, desc, recipe_list in menu_catalog:
            # Calculate cost price from recipe
            cost_price = 0.0
            for ing_name, qty, unit, loss_pct in recipe_list:
                ing_id = ing_id_map[ing_name]
                cursor.execute("SELECT cost_per_unit FROM ingredients WHERE id = ?;", (ing_id,))
                cpu = cursor.fetchone()[0]
                gross_qty = qty / (1.0 - loss_pct) if loss_pct < 1.0 else qty
                cost_price += gross_qty * cpu

            cursor.execute(
                """INSERT INTO menu_items (category_id, name, selling_price, cost_price, is_available, description)
                   VALUES (?, ?, ?, ?, 1, ?);""",
                (cat_map[cat_name], item_name, price, round(cost_price, 2), desc)
            )
            item_id = cursor.lastrowid
            menu_id_map[item_name] = item_id

            # Insert Recipe rows
            for ing_name, qty, unit, loss_pct in recipe_list:
                ing_id = ing_id_map[ing_name]
                cursor.execute(
                    """INSERT INTO recipes (menu_item_id, ingredient_id, quantity, unit, prep_loss_percentage)
                       VALUES (?, ?, ?, ?, ?);""",
                    (item_id, ing_id, qty, unit, loss_pct)
                )

        print("Seeding Calendar Events...")
        for ev in INDIAN_CALENDAR_EVENTS:
            cursor.execute(
                """INSERT INTO calendar_events (event_date, event_name, event_type, expected_demand_impact)
                   VALUES (?, ?, ?, ?);""",
                (ev["event_date"], ev["event_name"], ev["event_type"], ev["expected_demand_impact"])
            )

        print("Seeding 90 Days of Historical Sales Orders...")
        start_date = today - datetime.timedelta(days=90)
        menu_items_list = list(menu_id_map.items())

        # Baseline demand weight per item
        base_weights = {
            "Paneer Butter Masala": 28,
            "Hyderabadi Chicken Dum Biryani": 42,
            "Butter Chicken (Murgh Makhani)": 35,
            "Dal Makhani": 22,
            "Vegetable Biryani": 18,
            "Butter Naan": 80,
            "Tandoori Roti": 65,
            "Paneer Tikka (6 Pcs)": 24,
            "Chicken Tikka (6 Pcs)": 30,
            "Gulab Jamun (2 Pcs)": 32,
            "Masala Chaas": 25,
            "Sweet Punjabi Lassi": 28,
        }

        order_counter = 1000
        for day_offset in range(91):
            curr_date = start_date + datetime.timedelta(days=day_offset)
            weekday = curr_date.weekday() # 0 = Monday, 6 = Sunday
            is_weekend = weekday in (4, 5, 6) # Fri, Sat, Sun

            # Check if holiday exists
            cursor.execute("SELECT expected_demand_impact FROM calendar_events WHERE event_date = ?;", (curr_date.isoformat(),))
            holiday_row = cursor.fetchone()
            event_multiplier = holiday_row[0] if holiday_row else 1.0

            weekend_multiplier = 1.35 if is_weekend else 0.95
            total_multiplier = weekend_multiplier * event_multiplier

            # Generate ~30 to 50 orders for this day
            num_orders = int(random.gauss(38 * total_multiplier, 4))
            num_orders = max(15, num_orders)

            for order_idx in range(num_orders):
                order_counter += 1
                hour = random.choice([12, 13, 14, 19, 20, 21, 22])
                minute = random.randint(0, 59)
                order_time = datetime.datetime.combine(curr_date, datetime.time(hour, minute))
                payment = random.choice(["upi", "upi", "card", "cash"])

                cursor.execute(
                    """INSERT INTO sales_orders (order_number, order_timestamp, total_amount, payment_method, status)
                       VALUES (?, ?, 0.0, ?, 'completed');""",
                    (f"ORD-{order_counter}", order_time.strftime("%Y-%m-%d %H:%M:%S"), payment)
                )
                order_id = cursor.lastrowid

                # Pick 1 to 4 items for this order
                num_items = random.randint(1, 4)
                order_total = 0.0
                sampled_items = random.sample(menu_items_list, num_items)

                for item_name, item_id in sampled_items:
                    cursor.execute("SELECT selling_price FROM menu_items WHERE id = ?;", (item_id,))
                    s_price = cursor.fetchone()[0]
                    qty = random.randint(1, 3)
                    subtotal = round(qty * s_price, 2)
                    order_total += subtotal

                    cursor.execute(
                        """INSERT INTO sales_order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
                           VALUES (?, ?, ?, ?, ?);""",
                        (order_id, item_id, qty, s_price, subtotal)
                    )

                cursor.execute(
                    "UPDATE sales_orders SET total_amount = ? WHERE id = ?;",
                    (round(order_total, 2), order_id)
                )

        print("Seeding Sample Waste Logs...")
        waste_samples = [
            (today - datetime.timedelta(days=1), "raw_ingredient", "Tomatoes", None, 3.5, "kg", 140.0, "expired", "Softening in crate"),
            (today - datetime.timedelta(days=2), "prepared_item", None, "Dal Makhani", 2.0, "portions", 180.0, "over_prep", "Unsold dinner batch"),
            (today - datetime.timedelta(days=4), "raw_ingredient", "Fresh Milk", None, 4.0, "l", 248.0, "expired", "Sour after power cut"),
            (today - datetime.timedelta(days=6), "raw_ingredient", "Red Onions", None, 5.0, "kg", 175.0, "quality_rejection", "Rotten core"),
            (today - datetime.timedelta(days=8), "prepared_item", None, "Butter Naan", 6.0, "portions", 120.0, "burnt_damaged", "Tandoor flareup"),
        ]
        for w_date, i_type, ing_name, m_name, qty, unit, cost, reason, notes in waste_samples:
            i_id = ing_id_map.get(ing_name) if ing_name else None
            m_id = menu_id_map.get(m_name) if m_name else None
            cursor.execute(
                """INSERT INTO waste_logs (log_date, item_type, ingredient_id, menu_item_id, quantity, unit, financial_loss, reason, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);""",
                (w_date.isoformat(), i_type, i_id, m_id, qty, unit, cost, reason, notes)
            )

        print("Seeding Initial Draft Purchase Orders...")
        cursor.execute(
            """INSERT INTO purchase_orders (po_number, supplier_id, order_date, delivery_due_date, total_estimated_cost, status)
               VALUES ('PO-2026-001', ?, ?, ?, 6800.0, 'draft');""",
            (sup_map["Amul Dairy Cooperative"], today.isoformat(), (today + datetime.timedelta(days=1)).isoformat())
        )
        po_id = cursor.lastrowid
        cursor.execute(
            """INSERT INTO purchase_order_items (purchase_order_id, ingredient_id, recommended_quantity, approved_quantity, unit_cost, subtotal)
               VALUES (?, ?, 15.0, 15.0, 340.0, 5100.0);""",
            (po_id, ing_id_map["Paneer (Cottage Cheese)"])
        )
        cursor.execute(
            """INSERT INTO purchase_order_items (purchase_order_id, ingredient_id, recommended_quantity, approved_quantity, unit_cost, subtotal)
               VALUES (?, ?, 25.0, 25.0, 68.0, 1700.0);""",
            (po_id, ing_id_map["Fresh Milk"])
        )

        print("Seeding completed successfully!")

if __name__ == "__main__":
    seed_database()


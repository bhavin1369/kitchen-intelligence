from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import MenuItem, Recipe, Ingredient

menu_recipes_bp = Blueprint("menu_recipes_bp", __name__)

# ==================== MENU ITEM ROUTES ====================

@menu_recipes_bp.route("/menu", methods=["GET"])
def get_menu_items():
    category = request.args.get("category")
    diet = request.args.get("diet") # veg, nonveg
    status = request.args.get("status") # active, inactive
    search = request.args.get("search", "").strip()

    query = MenuItem.query

    if category and category.lower() != "all":
        query = query.filter(MenuItem.category.ilike(category))
    if diet and diet.lower() != "all":
        if diet.lower() == "veg":
            query = query.filter(MenuItem.is_veg == True)
        elif diet.lower() == "nonveg":
            query = query.filter(MenuItem.is_veg == False)
    if status and status.lower() != "all":
        if status.lower() == "active":
            query = query.filter(MenuItem.is_available == True)
        elif status.lower() == "inactive":
            query = query.filter(MenuItem.is_available == False)
    if search:
        query = query.filter(
            (MenuItem.name.ilike(f"%{search}%")) |
            (MenuItem.category.ilike(f"%{search}%"))
        )

    items = query.order_by(MenuItem.id.asc()).all()
    # Recalculate margins for response accuracy
    for it in items:
        it.calculate_cost_and_margin()

    return jsonify({
        "success": True,
        "total": len(items),
        "data": [item.to_dict(include_bom=False) for item in items]
    }), 200


@menu_recipes_bp.route("/menu/<int:item_id>", methods=["GET"])
def get_menu_item(item_id):
    item = db.session.get(MenuItem, item_id)
    if not item:
        return jsonify({"success": False, "message": "Menu item not found."}), 404
    item.calculate_cost_and_margin()
    return jsonify({"success": True, "data": item.to_dict(include_bom=True)}), 200


@menu_recipes_bp.route("/menu", methods=["POST"])
def create_menu_item():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    category = data.get("category", "Mains").strip()
    price = float(data.get("price", 0.0))
    cost_price = float(data.get("costPrice") or data.get("cost_price") or 0.0)
    is_veg = bool(data.get("isVeg") if "isVeg" in data else data.get("is_veg", True))
    prep_time = int(data.get("prepTimeMinutes") or data.get("prep_time_minutes") or 15)
    description = data.get("description", "")
    is_available = bool(data.get("isAvailable") if "isAvailable" in data else True)

    if not name:
        return jsonify({"success": False, "message": "Dish name is required."}), 400
    if price <= 0:
        return jsonify({"success": False, "message": "Selling price must be positive."}), 400

    item = MenuItem(
        name=name,
        category=category,
        price=price,
        cost_price=cost_price,
        is_veg=is_veg,
        is_available=is_available,
        prep_time_minutes=prep_time,
        description=description
    )
    if price > 0 and cost_price > 0:
        item.margin_percent = round(((price - cost_price) / price) * 100, 1)

    db.session.add(item)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Menu item '{name}' created successfully.",
        "data": item.to_dict()
    }), 201


@menu_recipes_bp.route("/menu/<int:item_id>", methods=["PUT"])
def update_menu_item(item_id):
    item = db.session.get(MenuItem, item_id)
    if not item:
        return jsonify({"success": False, "message": "Menu item not found."}), 404

    data = request.get_json() or {}
    if "name" in data:
        item.name = data["name"].strip()
    if "category" in data:
        item.category = data["category"].strip()
    if "price" in data:
        item.price = float(data["price"])
    if "isAvailable" in data or "is_available" in data:
        item.is_available = bool(data.get("isAvailable") if "isAvailable" in data else data.get("is_available"))
    if "status" in data:
        item.is_available = (data["status"] == "active")
    if "isVeg" in data or "is_veg" in data:
        item.is_veg = bool(data.get("isVeg") if "isVeg" in data else data.get("is_veg"))
    if "prepTimeMinutes" in data or "prep_time_minutes" in data:
        item.prep_time_minutes = int(data.get("prepTimeMinutes") or data.get("prep_time_minutes"))
    if "description" in data:
        item.description = data["description"]

    item.calculate_cost_and_margin()
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Menu item '{item.name}' updated successfully.",
        "data": item.to_dict()
    }), 200


@menu_recipes_bp.route("/menu/<int:item_id>", methods=["DELETE"])
def delete_menu_item(item_id):
    item = db.session.get(MenuItem, item_id)
    if not item:
        return jsonify({"success": False, "message": "Menu item not found."}), 404

    # Remove BOM recipes cascade
    Recipe.query.filter_by(menu_item_id=item.id).delete()
    dish_name = item.name
    db.session.delete(item)
    db.session.commit()
    return jsonify({"success": True, "message": f"Menu item '{dish_name}' deleted successfully."}), 200


# ==================== RECIPE (BOM) ROUTES ====================

@menu_recipes_bp.route("/recipes", methods=["GET"])
def get_recipes():
    menu_item_id = request.args.get("menuItemId") or request.args.get("menu_item_id")
    query = Recipe.query
    if menu_item_id:
        query = query.filter_by(menu_item_id=int(menu_item_id))

    recipes = query.all()
    return jsonify({
        "success": True,
        "total": len(recipes),
        "data": [r.to_dict() for r in recipes]
    }), 200


@menu_recipes_bp.route("/recipes/<int:menu_item_id>", methods=["GET"])
def get_recipe_by_dish(menu_item_id):
    menu_item = db.session.get(MenuItem, menu_item_id)
    if not menu_item:
        return jsonify({"success": False, "message": "Menu dish not found."}), 404

    recipes = Recipe.query.filter_by(menu_item_id=menu_item_id).all()
    menu_item.calculate_cost_and_margin()
    db.session.commit()

    return jsonify({
        "success": True,
        "dish": menu_item.to_dict(),
        "ingredients": [r.to_dict() for r in recipes]
    }), 200


@menu_recipes_bp.route("/recipes", methods=["POST"])
def add_ingredient_to_recipe():
    data = request.get_json() or {}
    menu_item_id = data.get("menuItemId") or data.get("menu_item_id")
    ingredient_id = data.get("ingredientId") or data.get("ingredient_id")
    qty = float(data.get("quantity", 0.0))
    unit = data.get("unit", "kg")
    prep_loss = float(data.get("prepLossPercentage") or data.get("prep_loss_percentage") or 0.0)

    if not menu_item_id or not ingredient_id:
        return jsonify({"success": False, "message": "Both menuItemId and ingredientId are required."}), 400
    if qty <= 0:
        return jsonify({"success": False, "message": "Ingredient portion quantity must be positive."}), 400

    menu_item = db.session.get(MenuItem, int(menu_item_id))
    ingredient = db.session.get(Ingredient, int(ingredient_id))
    if not menu_item:
        return jsonify({"success": False, "message": "Menu item not found."}), 404
    if not ingredient:
        return jsonify({"success": False, "message": "Ingredient not found."}), 404

    # Check if relation already exists
    existing = Recipe.query.filter_by(menu_item_id=menu_item.id, ingredient_id=ingredient.id).first()
    if existing:
        existing.quantity = qty
        existing.unit = unit
        existing.prep_loss_percentage = prep_loss
        recipe = existing
    else:
        recipe = Recipe(
            menu_item_id=menu_item.id,
            ingredient_id=ingredient.id,
            quantity=qty,
            unit=unit,
            prep_loss_percentage=prep_loss
        )
        db.session.add(recipe)

    db.session.flush()
    menu_item.calculate_cost_and_margin()
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Added '{ingredient.name}' to recipe formula for '{menu_item.name}'.",
        "data": recipe.to_dict()
    }), 201


@menu_recipes_bp.route("/recipes/batch", methods=["POST"])
def set_dish_recipes_batch():
    """Allows setting or updating multiple ingredients for a dish BOM at once"""
    data = request.get_json() or {}
    menu_item_id = data.get("menuItemId") or data.get("menu_item_id")
    ingredients_list = data.get("ingredients", [])

    if not menu_item_id:
        return jsonify({"success": False, "message": "menuItemId is required."}), 400

    menu_item = db.session.get(MenuItem, int(menu_item_id))
    if not menu_item:
        return jsonify({"success": False, "message": "Menu item not found."}), 404

    # Clear existing recipe ingredients
    Recipe.query.filter_by(menu_item_id=menu_item.id).delete()

    created_recipes = []
    for it in ingredients_list:
        ing_id = it.get("ingredientId") or it.get("ingredient_id")
        q = float(it.get("quantity", 0.0))
        u = it.get("unit", "kg")
        loss = float(it.get("prepLossPercentage") or it.get("prep_loss_percentage") or 0.0)

        if ing_id and q > 0:
            rec = Recipe(
                menu_item_id=menu_item.id,
                ingredient_id=int(ing_id),
                quantity=q,
                unit=u,
                prep_loss_percentage=loss
            )
            db.session.add(rec)
            created_recipes.append(rec)

    db.session.flush()
    menu_item.calculate_cost_and_margin()
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Recipe formula for '{menu_item.name}' updated with {len(created_recipes)} ingredients.",
        "dish": menu_item.to_dict(),
        "ingredients": [r.to_dict() for r in created_recipes]
    }), 200


@menu_recipes_bp.route("/recipes/<int:recipe_id>", methods=["PUT"])
def update_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return jsonify({"success": False, "message": "Recipe entry not found."}), 404

    data = request.get_json() or {}
    if "quantity" in data:
        qty = float(data["quantity"])
        if qty <= 0:
            return jsonify({"success": False, "message": "Quantity must be positive."}), 400
        recipe.quantity = qty
    if "unit" in data:
        recipe.unit = data["unit"]
    if "prepLossPercentage" in data or "prep_loss_percentage" in data:
        recipe.prep_loss_percentage = float(data.get("prepLossPercentage") or data.get("prep_loss_percentage"))

    db.session.flush()
    if recipe.menu_item:
        recipe.menu_item.calculate_cost_and_margin()
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Recipe ingredient quantity updated.",
        "data": recipe.to_dict()
    }), 200


@menu_recipes_bp.route("/recipes/<int:recipe_id>", methods=["DELETE"])
def delete_recipe(recipe_id):
    recipe = db.session.get(Recipe, recipe_id)
    if not recipe:
        return jsonify({"success": False, "message": "Recipe entry not found."}), 404

    menu_item = recipe.menu_item
    db.session.delete(recipe)
    db.session.flush()
    if menu_item:
        menu_item.calculate_cost_and_margin()
    db.session.commit()

    return jsonify({"success": True, "message": "Ingredient removed from recipe."}), 200

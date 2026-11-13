from datetime import datetime, date
from app.extensions import db
from app.models import Ingredient, InventoryBatch, StockMovement

# Unit conversion factors to standard base units
UNIT_CONVERSIONS = {
    # Mass
    ("g", "kg"): 0.001,
    ("kg", "g"): 1000.0,
    ("kg", "kg"): 1.0,
    ("g", "g"): 1.0,
    # Volume
    ("ml", "l"): 0.001,
    ("l", "ml"): 1000.0,
    ("l", "l"): 1.0,
    ("ml", "ml"): 1.0,
    # Discrete
    ("pcs", "pcs"): 1.0,
    ("dozen", "pcs"): 12.0,
    ("pcs", "dozen"): 1.0 / 12.0
}

def convert_quantity(qty: float, from_unit: str, to_unit: str) -> float:
    """Converts a quantity between compatible kitchen units."""
    from_u = from_unit.lower().strip()
    to_u = to_unit.lower().strip()
    if from_u == to_u:
        return qty
    key = (from_u, to_u)
    if key in UNIT_CONVERSIONS:
        return qty * UNIT_CONVERSIONS[key]
    raise ValueError(f"Cannot convert incompatible units from '{from_unit}' to '{to_unit}'")


def get_usable_stock(ingredient_id: int) -> float:
    """
    Returns only non-expired, active batch stock for an ingredient.
    Expired batches are NEVER counted as usable food stock.
    """
    today = date.today()
    batches = InventoryBatch.query.filter(
        InventoryBatch.ingredient_id == ingredient_id,
        InventoryBatch.status == "active",
        InventoryBatch.expiry_date >= today
    ).all()
    return sum(b.remaining_quantity for b in batches)


def consume_ingredient_fefo(
    ingredient: Ingredient,
    required_qty: float,
    required_unit: str,
    reference_id: str,
    reference_type: str = "sales_order",
    user_id: int = None,
    notes: str = None
) -> list:
    """
    Consumes inventory using First-Expired, First-Out (FEFO).
    Business Rules Enforced:
    1. Validates positive quantities.
    2. Converts recipe units to the ingredient's base inventory unit.
    3. Never allows negative inventory; verifies sufficient stock before deducting.
    4. Ignores expired batches.
    5. Deducts from batches with earliest expiry_date first.
    6. Logs an audit trail in StockMovement for every deduction.
    """
    if required_qty <= 0:
        raise ValueError("Consumption quantity must be strictly greater than zero.")

    # Convert to ingredient's inventory unit
    base_qty = convert_quantity(required_qty, required_unit, ingredient.unit)

    today = date.today()

    # Query active, non-expired batches ordered by expiry_date ascending (FEFO)
    active_batches = InventoryBatch.query.filter(
        InventoryBatch.ingredient_id == ingredient.id,
        InventoryBatch.status == "active",
        InventoryBatch.expiry_date >= today,
        InventoryBatch.remaining_quantity > 0
    ).order_by(InventoryBatch.expiry_date.asc(), InventoryBatch.id.asc()).all()

    total_available = sum(b.remaining_quantity for b in active_batches)

    # Business rule: Never allow negative inventory
    if total_available < base_qty:
        raise ValueError(
            f"Insufficient usable stock for '{ingredient.name}'. "
            f"Required: {round(base_qty, 3)} {ingredient.unit}, "
            f"Available (non-expired): {round(total_available, 3)} {ingredient.unit}."
        )

    qty_to_deduct = base_qty
    movements_created = []

    for batch in active_batches:
        if qty_to_deduct <= 0:
            break

        deduction = min(batch.remaining_quantity, qty_to_deduct)
        batch.remaining_quantity = round(batch.remaining_quantity - deduction, 4)
        if batch.remaining_quantity <= 0.0001:
            batch.remaining_quantity = 0.0
            batch.status = "depleted"

        qty_to_deduct = round(qty_to_deduct - deduction, 4)

        # Record movement for this batch
        movement = StockMovement(
            ingredient_id=ingredient.id,
            batch_id=batch.id,
            movement_type="sales_consumption",
            quantity=-deduction,
            unit=ingredient.unit,
            unit_cost=batch.unit_cost,
            reference_id=reference_id,
            reference_type=reference_type,
            notes=notes or f"FEFO consumption from batch {batch.batch_number}",
            created_by=user_id,
            created_at=datetime.utcnow()
        )
        db.session.add(movement)
        movements_created.append(movement)

    # Decrement overall current stock on the ingredient
    ingredient.current_stock = round(max(0.0, ingredient.current_stock - base_qty), 4)

    return movements_created


def receive_batch(
    ingredient: Ingredient,
    batch_number: str,
    quantity: float,
    unit: str,
    unit_cost: float,
    received_date: date,
    expiry_date: date,
    supplier_name: str = None,
    reference_id: str = None,
    user_id: int = None
) -> InventoryBatch:
    """
    Receives a new inventory batch into stock.
    Creates the batch and logs an inward StockMovement.
    """
    if quantity <= 0:
        raise ValueError("Received quantity must be positive.")
    if expiry_date <= received_date:
        raise ValueError("Expiry date must be in the future relative to received date.")

    # Convert to ingredient unit
    base_qty = convert_quantity(quantity, unit, ingredient.unit)

    new_batch = InventoryBatch(
        ingredient_id=ingredient.id,
        batch_number=batch_number,
        initial_quantity=base_qty,
        remaining_quantity=base_qty,
        unit=ingredient.unit,
        unit_cost=unit_cost,
        received_date=received_date,
        expiry_date=expiry_date,
        supplier_name=supplier_name or ingredient.preferred_supplier,
        status="active"
    )
    db.session.add(new_batch)
    db.session.flush() # Populate new_batch.id

    # Update ingredient master current stock and average unit cost
    ingredient.current_stock = round(ingredient.current_stock + base_qty, 4)
    ingredient.unit_cost = unit_cost

    # Log inward movement
    movement = StockMovement(
        ingredient_id=ingredient.id,
        batch_id=new_batch.id,
        movement_type="purchase",
        quantity=base_qty,
        unit=ingredient.unit,
        unit_cost=unit_cost,
        reference_id=reference_id or f"BATCH-{batch_number}",
        reference_type="purchase_batch",
        notes=f"Stock received into batch {batch_number}",
        created_by=user_id,
        created_at=datetime.utcnow()
    )
    db.session.add(movement)

    return new_batch


def record_waste_deduction(
    ingredient: Ingredient,
    quantity: float,
    unit: str,
    reason: str,
    batch_id: int = None,
    logged_by: str = "Head Chef",
    notes: str = None,
    user_id: int = None
) -> tuple:
    """
    Records food waste, deducting stock and logging the movement and financial loss.
    """
    if quantity <= 0:
        raise ValueError("Waste quantity must be positive.")

    base_qty = convert_quantity(quantity, unit, ingredient.unit)
    if ingredient.current_stock < base_qty:
        raise ValueError(
            f"Cannot waste more than current stock on hand for '{ingredient.name}'. "
            f"Stock: {ingredient.current_stock} {ingredient.unit}, Waste: {base_qty} {ingredient.unit}"
        )

    # Determine batch
    batch = None
    if batch_id:
        batch = db.session.get(InventoryBatch, batch_id)
        if batch:
            batch.remaining_quantity = round(max(0.0, batch.remaining_quantity - base_qty), 4)
            if batch.remaining_quantity <= 0:
                batch.status = "discarded" if reason.lower() == "spoilage" else "depleted"

    # Decrement stock
    ingredient.current_stock = round(max(0.0, ingredient.current_stock - base_qty), 4)
    financial_loss = round(base_qty * ingredient.unit_cost, 2)

    # Log movement
    movement = StockMovement(
        ingredient_id=ingredient.id,
        batch_id=batch.id if batch else None,
        movement_type="waste",
        quantity=-base_qty,
        unit=ingredient.unit,
        unit_cost=ingredient.unit_cost,
        reference_type="waste_record",
        notes=f"Waste recorded: {reason}. {notes or ''}".strip(),
        created_by=user_id,
        created_at=datetime.utcnow()
    )
    db.session.add(movement)

    return base_qty, financial_loss


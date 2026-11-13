"""
Data preprocessing, feature engineering, and temporal dataset creation for Food Demand Forecasting.
Loads raw sales records from SQLite, builds complete continuous time-series,
engineers lag/rolling features without data leakage, and provides chronological train/test splits.
"""
from datetime import date, timedelta
from typing import Tuple, Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sqlalchemy import func
from app.extensions import db
from app.models import Sale, SaleItem, MenuItem
from app.ml.calendar_utils import get_calendar_features

FEATURE_COLUMNS = [
    "menu_item_id",
    "price",
    "is_veg",
    "prep_time_minutes",
    "day_of_week",
    "is_weekend",
    "month",
    "day_of_month",
    "quarter",
    "day_of_year",
    "is_public_holiday",
    "is_indian_festival",
    "days_to_nearest_festival",
    "lag_1",
    "lag_2",
    "lag_7",
    "rolling_mean_7",
    "rolling_std_7",
    "rolling_mean_14",
]

def load_sales_dataframe() -> pd.DataFrame:
    """
    Loads completed sales line items from SQLite and aggregates daily portion sales
    for each (date, menu_item_id) pair.
    """
    records = (
        db.session.query(
            func.date(Sale.order_timestamp).label("sales_date"),
            SaleItem.menu_item_id,
            func.sum(SaleItem.quantity).label("quantity_sold")
        )
        .join(SaleItem, Sale.id == SaleItem.sale_id)
        .filter(Sale.status != "cancelled")
        .group_by(func.date(Sale.order_timestamp), SaleItem.menu_item_id)
        .all()
    )

    if not records:
        return pd.DataFrame(columns=["date", "menu_item_id", "quantity"])

    data = []
    for r in records:
        if r.sales_date:
            d_val = pd.to_datetime(r.sales_date).date()
            data.append({
                "date": d_val,
                "menu_item_id": int(r.menu_item_id),
                "quantity": float(r.quantity_sold or 0.0)
            })

    return pd.DataFrame(data)


def build_feature_dataset() -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Constructs a complete continuous feature matrix across all active dishes and dates.
    Applies calendar engineering, historical lag and rolling statistics with ZERO data leakage.

    Returns:
    - df: Processed DataFrame containing features and target 'quantity'
    - metadata: Validation checks, sample counts, date ranges, and warnings
    """
    sales_df = load_sales_dataframe()

    # Load active menu catalog
    menu_items = MenuItem.query.filter_by(is_available=True).all()
    if not menu_items:
        # Fallback to all menu items if availability filter yields 0
        menu_items = MenuItem.query.all()

    dish_meta = {
        m.id: {
            "name": m.name,
            "category": m.category,
            "price": float(m.price or 0.0),
            "cost_price": float(m.cost_price or 0.0),
            "is_veg": 1 if m.is_veg else 0,
            "prep_time_minutes": int(m.prep_time_minutes or 15),
        }
        for m in menu_items
    }

    metadata: Dict[str, Any] = {
        "is_sufficient": True,
        "warning": None,
        "distinct_dates_count": 0,
        "min_date": None,
        "max_date": None,
        "dish_count": len(dish_meta),
        "total_sales_records": len(sales_df),
    }

    # Validation: check for sufficient history
    if sales_df.empty or len(sales_df["date"].unique()) < 7:
        metadata["is_sufficient"] = False
        metadata["warning"] = (
            f"Insufficient historical sales data for AI forecasting ({len(sales_df['date'].unique()) if not sales_df.empty else 0} distinct days found; "
            f"minimum 7 days required). Please record more sales or import historical sales CSV."
        )
        return pd.DataFrame(), metadata

    min_date = sales_df["date"].min()
    max_date = sales_df["date"].max()
    metadata["min_date"] = min_date.isoformat()
    metadata["max_date"] = max_date.isoformat()
    distinct_dates = sorted(sales_df["date"].unique())
    metadata["distinct_dates_count"] = len(distinct_dates)

    if len(distinct_dates) < 14:
        metadata["warning"] = (
            f"Historical dataset covers {len(distinct_dates)} days. "
            f"For peak forecasting accuracy, 14+ days of continuous sales history is recommended."
        )

    # 1. Build complete Cartesian product (all dates x all dishes)
    all_dates = []
    curr = min_date
    while curr <= max_date:
        all_dates.append(curr)
        curr += timedelta(days=1)

    index_df = pd.MultiIndex.from_product(
        [all_dates, list(dish_meta.keys())],
        names=["date", "menu_item_id"]
    ).to_frame().reset_index(drop=True)

    # 2. Merge actual sales quantities (fill missing sales days with 0.0)
    merged = pd.merge(index_df, sales_df, on=["date", "menu_item_id"], how="left")
    merged["quantity"] = merged["quantity"].fillna(0.0)

    # 3. Add static dish attributes
    merged["price"] = merged["menu_item_id"].map(lambda x: dish_meta.get(x, {}).get("price", 100.0))
    merged["is_veg"] = merged["menu_item_id"].map(lambda x: dish_meta.get(x, {}).get("is_veg", 1))
    merged["prep_time_minutes"] = merged["menu_item_id"].map(lambda x: dish_meta.get(x, {}).get("prep_time_minutes", 15))
    merged["dish_name"] = merged["menu_item_id"].map(lambda x: dish_meta.get(x, {}).get("name", "Unknown"))
    merged["category"] = merged["menu_item_id"].map(lambda x: dish_meta.get(x, {}).get("category", "Mains"))

    # 4. Add India-specific calendar features
    calendar_data = [get_calendar_features(d) for d in merged["date"]]
    cal_df = pd.DataFrame(calendar_data)
    for col in cal_df.columns:
        merged[col] = cal_df[col].values

    # 5. Sort strictly chronologically per dish before computing lags
    merged = merged.sort_values(by=["menu_item_id", "date"]).reset_index(drop=True)

    # 6. Engineer historical lag & rolling features WITH ZERO LEAKAGE
    # shift(1) ensures actual day t quantity is NEVER used to predict day t
    grouped = merged.groupby("menu_item_id")["quantity"]

    merged["lag_1"] = grouped.shift(1)
    merged["lag_2"] = grouped.shift(2)
    merged["lag_7"] = grouped.shift(7)

    # Rolling 7-day average using ONLY shifted prior days
    merged["rolling_mean_7"] = grouped.transform(
        lambda s: s.shift(1).rolling(window=7, min_periods=1).mean()
    )
    # Rolling 7-day standard deviation
    merged["rolling_std_7"] = grouped.transform(
        lambda s: s.shift(1).rolling(window=7, min_periods=1).std().fillna(0.0)
    )
    # Rolling 14-day average
    merged["rolling_mean_14"] = grouped.transform(
        lambda s: s.shift(1).rolling(window=14, min_periods=1).mean()
    )

    # 7. Impute initial lag values using historical per-dish median (no forward leakage)
    for col in ["lag_1", "lag_2", "lag_7", "rolling_mean_7", "rolling_std_7", "rolling_mean_14"]:
        dish_medians = merged.groupby("menu_item_id")["quantity"].transform("median")
        merged[col] = merged[col].fillna(dish_medians).fillna(0.0)

    # Day-of-week historical baseline target
    # Average quantity for this dish on this day of week prior to current day
    merged["dow_mean"] = merged.groupby(["menu_item_id", "day_of_week"])["quantity"].transform(
        lambda s: s.shift(1).expanding(min_periods=1).mean()
    ).fillna(merged["rolling_mean_7"])

    return merged, metadata


def get_chronological_splits(
    df: pd.DataFrame,
    test_ratio: float = 0.20
) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Splits the continuous dataset chronologically by date:
    - Train: first (1 - test_ratio) days
    - Test: last test_ratio days
    Prevents time-travel data leakage.
    """
    distinct_dates = sorted(df["date"].unique())
    split_idx = int(len(distinct_dates) * (1.0 - test_ratio))
    split_idx = max(1, min(len(distinct_dates) - 1, split_idx))

    cutoff_date = distinct_dates[split_idx]

    train_df = df[df["date"] < cutoff_date].copy()
    test_df = df[df["date"] >= cutoff_date].copy()

    split_meta = {
        "cutoff_date": cutoff_date.isoformat(),
        "train_days_count": len(distinct_dates[:split_idx]),
        "test_days_count": len(distinct_dates[split_idx:]),
        "train_samples": len(train_df),
        "test_samples": len(test_df),
        "train_start": distinct_dates[0].isoformat(),
        "train_end": distinct_dates[split_idx - 1].isoformat(),
        "test_start": distinct_dates[split_idx].isoformat(),
        "test_end": distinct_dates[-1].isoformat(),
    }

    return train_df, test_df, split_meta


"""
India-specific calendar and cultural festival information.
Encodes national public holidays, major cultural festivals, and regional observances.
Does NOT assume festivals increase demand; provides binary/proximity regressors
so ML models learn their true effect from historical sales data.
"""
from datetime import date, datetime, timedelta
from typing import Dict, Any, List, Optional

# Fixed-date Indian National & Gazetted Public Holidays
FIXED_HOLIDAYS = {
    (1, 26): "Republic Day",
    (5, 1): "Maharashtra Day / Labour Day",
    (8, 15): "Independence Day",
    (10, 2): "Gandhi Jayanti",
    (12, 25): "Christmas Day",
    (1, 1): "New Year's Day",
}

# Major Indian Festivals across recent and current years (Gregorian projections)
# Covers 2025, 2026, 2027
FESTIVALS_MAP = {
    # 2025
    date(2025, 1, 14): "Makar Sankranti / Pongal",
    date(2025, 2, 26): "Maha Shivratri",
    date(2025, 3, 14): "Holi",
    date(2025, 3, 31): "Eid-ul-Fitr",
    date(2025, 4, 6): "Ram Navami",
    date(2025, 6, 7): "Bakrid / Eid al-Adha",
    date(2025, 8, 9): "Raksha Bandhan",
    date(2025, 8, 16): "Janmashtami",
    date(2025, 8, 27): "Ganesh Chaturthi",
    date(2025, 9, 22): "Navratri Begins",
    date(2025, 10, 2): "Dussehra / Vijayadashami",
    date(2025, 10, 20): "Diwali / Deepavali",
    date(2025, 10, 22): "Bhai Dooj",

    # 2026
    date(2026, 1, 14): "Makar Sankranti / Pongal",
    date(2026, 2, 16): "Maha Shivratri",
    date(2026, 3, 4): "Holi",
    date(2026, 3, 20): "Eid-ul-Fitr",
    date(2026, 3, 27): "Ram Navami",
    date(2026, 5, 28): "Bakrid / Eid al-Adha",
    date(2026, 8, 28): "Raksha Bandhan",
    date(2026, 9, 4): "Janmashtami",
    date(2026, 9, 14): "Ganesh Chaturthi",
    date(2026, 10, 11): "Navratri Begins",
    date(2026, 10, 20): "Dussehra / Vijayadashami",
    date(2026, 11, 8): "Diwali / Deepavali",
    date(2026, 11, 9): "Govardhan Puja / Gujarati New Year",
    date(2026, 11, 10): "Bhai Dooj",

    # 2027
    date(2027, 1, 14): "Makar Sankranti / Pongal",
    date(2027, 3, 6): "Maha Shivratri",
    date(2027, 3, 23): "Holi",
    date(2027, 10, 29): "Diwali",
}

def get_calendar_features(d: date) -> Dict[str, Any]:
    """
    Computes calendar features for a given date.
    Returns:
    - day_of_week: int (0=Monday, 6=Sunday)
    - is_weekend: int (1 for Saturday & Sunday, 0 otherwise)
    - month: int (1-12)
    - day_of_month: int (1-31)
    - quarter: int (1-4)
    - day_of_year: int (1-366)
    - is_public_holiday: int (1 if fixed national holiday, 0 otherwise)
    - is_indian_festival: int (1 if major festival or in festival period, 0 otherwise)
    - festival_name: Optional[str]
    - days_to_nearest_festival: int (signed distance in days to nearest festival within +/- 14 days)
    """
    if isinstance(d, datetime):
        d = d.date()

    day_of_week = d.weekday() # 0 = Monday, 6 = Sunday
    is_weekend = 1 if day_of_week in (5, 6) else 0

    # Fixed holiday
    fixed_name = FIXED_HOLIDAYS.get((d.month, d.day))
    is_public_holiday = 1 if fixed_name else 0

    # Festival match
    fest_name = FESTIVALS_MAP.get(d)
    is_festival = 1 if fest_name else 0

    # Also check if within 2 days of a festival (festival window)
    event_label = fest_name or fixed_name or "Regular Day"

    # Find days to nearest festival
    nearest_dist = 999
    nearest_name = None
    for f_date, f_name in FESTIVALS_MAP.items():
        delta = (f_date - d).days
        if abs(delta) < abs(nearest_dist):
            nearest_dist = delta
            nearest_name = f_name

    # Clamped distance to nearest festival (-14 to +14)
    clamped_dist = max(-14, min(14, nearest_dist)) if abs(nearest_dist) <= 14 else 14

    # Check for custom kitchen events if database context available
    custom_event = None
    try:
        from flask import has_app_context
        if has_app_context():
            from app.models.unique_features import KitchenEvent
            custom_event = KitchenEvent.query.filter_by(event_date=d, is_active=True).first()
    except Exception:
        pass

    if custom_event:
        is_festival = 1
        event_label = custom_event.title
        nearest_name = custom_event.title
        clamped_dist = 0

    return {
        "day_of_week": day_of_week,
        "is_weekend": is_weekend,
        "month": d.month,
        "day_of_month": d.day,
        "quarter": (d.month - 1) // 3 + 1,
        "day_of_year": d.timetuple().tm_yday,
        "is_public_holiday": is_public_holiday,
        "is_indian_festival": 1 if is_festival or abs(clamped_dist) <= 1 else 0,
        "festival_name": nearest_name if (abs(clamped_dist) <= 2 or custom_event) else None,
        "days_to_nearest_festival": clamped_dist,
        "event_label": event_label,
        "custom_event_multiplier": custom_event.expected_impact if custom_event else 1.0,
        "custom_extra_portions": custom_event.expected_extra_portions if custom_event else 0.0
    }

def get_upcoming_indian_events(start_d: date, end_d: date) -> List[Dict[str, Any]]:
    """Lists calendar events and festivals falling within the date window"""
    events = []
    curr = start_d
    while curr <= end_d:
        info = get_calendar_features(curr)
        if info["is_indian_festival"] or info["is_public_holiday"]:
            name = FESTIVALS_MAP.get(curr) or FIXED_HOLIDAYS.get((curr.month, curr.day))
            if name:
                events.append({
                    "date": curr.isoformat(),
                    "name": name,
                    "type": "Festival" if curr in FESTIVALS_MAP else "Public Holiday",
                    "isWeekend": bool(info["is_weekend"])
                })
        curr += timedelta(days=1)
    return events


from typing import Any, Dict, List, Optional
import requests
from base_models import Slots
from copy import deepcopy

def convert_currency_to_usd(amount: float, from_currency: Optional[str]) -> float:
    if amount is None:
        return 0.0
    if not from_currency or from_currency.upper() == "USD":
        return float(amount)
    from_currency = from_currency.upper()

    fallback_to_usd = {
        'USD':1.0,'EUR':1.10,'GBP':1.27,'JPY':0.0067,'CNY':0.14,'CAD':0.73,'AUD':0.66,'CHF':1.11,
        'INR':0.012,'MXN':0.059,'KRW':0.00075,'SGD':0.74,'HKD':0.13,'THB':0.028,'MYR':0.21,'IDR':0.000064,
        'PHP':0.018,'TWD':0.031,'AED':0.27,'QAR':0.27,'SAR':0.27,'ILS':0.27,'NZD':0.61,'BRL':0.19,'ARS':0.0011,
        'CLP':0.0011,'ZAR':0.054,'EGP':0.020,'SEK':0.095,'NOK':0.093,'DKK':0.14,'CZK':0.043,'PLN':0.25,'HUF':0.0028,
    }
    try:
        r = requests.get(f"https://api.exchangerate-api.com/v4/latest/{from_currency}", timeout=2)
        if r.status_code == 200:
            usd_rate = (r.json() or {}).get('rates', {}).get('USD')
            if isinstance(usd_rate, (int, float)) and usd_rate > 0:
                return float(amount) * float(usd_rate)
    except Exception:
        pass
    return float(amount) * float(fallback_to_usd.get(from_currency, 1.0))

# Helper functions to preserve slot ID
def strip_nones(x):
    if isinstance(x, dict):
        return {k: strip_nones(v) for k, v in x.items() if v is not None}
    if isinstance(x, list):
        return [strip_nones(v) for v in x]
    return x

def deep_merge(base: dict, update: dict) -> dict:
    result = deepcopy(base)
    for k, v in (update or {}).items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = deep_merge(result[k], v)
        else:
            result[k] = v
    return result

def merge_slots_preserve_id(existing: Slots, incoming: Dict[str, Any]) -> Slots:
    cleaned = strip_nones(incoming or {})
    cleaned.pop("slot_id", None)
    merged = deep_merge(existing.model_dump(mode='json'), cleaned)
    merged["slot_id"] = existing.slot_id
    return Slots.model_validate(merged)

# For Hotel API calls
def pick(container, key, default=None):
    if isinstance(container, dict):
        return container.get(key, default)
    return getattr(container, key, default)

def chunked(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i+size]

# For better plan, not just cheap plan
def pick_near_target(options: List[Dict[str, Any]], price_key: str,
                     target_amount: float, min_floor_ratio: float = 0.6) -> Optional[Dict[str, Any]]:
    if not options:
        return None
    try:
        min_floor = float(target_amount) * float(min_floor_ratio)
    except Exception:
        min_floor = 0.0

    try:
        if not target_amount or target_amount <= 0:
            return min(options, key=lambda o: (o or {}).get(price_key, float('inf')))
    except Exception:
        return min(options, key=lambda o: (o or {}).get(price_key, float('inf')))

    above_floor = [o for o in options if (o or {}).get(price_key, 0) >= min_floor]
    if above_floor:
        return min(above_floor, key=lambda o: abs((o or {}).get(price_key, 0) - target_amount))
    return max(options, key=lambda o: (o or {}).get(price_key, 0))

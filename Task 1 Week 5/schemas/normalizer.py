import json
import os
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from schemas.raw_record import RawRecord
from schemas.normalized_record import NormalizedRecord

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'output')
BOOKS_FILE = os.path.join(OUTPUT_DIR, "books.json")
ERRORS_FILE = os.path.join(OUTPUT_DIR, "errors.json")


def parse_price_gbp(price_text: str) -> float:
    if not price_text:
        return 0.0
    clean = price_text.replace('£', '').strip()
    try:
        return float(clean)
    except ValueError:
        return 0.0


def normalize_record(raw: dict) -> Tuple[Optional[NormalizedRecord], Optional[dict]]:
    try:
        price_gbp = parse_price_gbp(raw.get('price_text', ''))
        fetched_at = raw.get('fetched_at', datetime.now(timezone.utc).isoformat())
        if fetched_at:
            datetime.fromisoformat(fetched_at)

        normalized = NormalizedRecord(
            title=raw['title'],
            product_url=raw['product_url'],
            price_gbp=price_gbp,
            price_text=raw['price_text'],
            availability_text=raw['availability_text'],
            rating_text=raw['rating_text'],
            description=raw.get('description'),
            source_page=raw['source_page'],
            fetched_at=fetched_at,
        )
        return normalized, None
    except Exception as e:
        error = {'original': raw, 'error': str(e)}
        return None, error


def output_books_json(records: List[NormalizedRecord]) -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    data = [record.__dict__ for record in records]
    with open(BOOKS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def output_errors_json(errors: List[dict]) -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(ERRORS_FILE, 'w', encoding='utf-8') as f:
        json.dump(errors, f, indent=2, ensure_ascii=False)


def check_idempotency() -> bool:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    if not os.path.exists(BOOKS_FILE):
        return False
    with open(BOOKS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if len(data) != 60:
        return False
    required = {'title', 'product_url', 'price_gbp', 'price_text',
                'availability_text', 'rating_text', 'source_page', 'fetched_at'}
    for record in data:
        if not required.issubset(record.keys()):
            return False
    urls = [r.get('product_url', '') for r in data]
    if len(urls) != len(set(urls)):
        return False
    return True
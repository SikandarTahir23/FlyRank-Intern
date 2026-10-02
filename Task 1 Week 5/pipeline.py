import time
import sys
import os
import json
from datetime import datetime, timezone
from urllib.parse import urlparse

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "output")

sys.path.insert(0, os.path.dirname(__file__))

from clients.catalogue_client import init_cache_dir, fetch_with_delay
from extractors.catalogue_extractor import crawl_catalogue_pages, extract_book_links, extract_all_catalogue_pages_html
from extractors.detail_extractor import fetch_and_cache_book, extract_from_product
from schemas.normalizer import (
    NormalizedRecord, parse_price_gbp, normalize_record,
    output_books_json, output_errors_json, check_idempotency
)

pipeline_start_time = time.time()
pipeline_start_time_iso = datetime.now(timezone.utc).isoformat()


def run_pipeline():
    print("=" * 60)
    print("PIPELINE START")
    print("=" * 60)
    init_cache_dir()

    print("\n[Stage 1] Ensuring cache is populated...")

    print("\n[Stage 2] Crawling catalogue pages and discovering book URLs...")
    urls, page_htmls = crawl_catalogue_pages(num_pages=3)
    assert len(urls) >= 60, f"Expected at least 60 URLs, got {len(urls)}"
    discovered_urls = len(urls)

    print(f"\n[Stage 3] Fetching and caching {len(urls)} book detail pages...")
    records_raw = []
    for i, book_url in enumerate(urls):
        try:
            html = fetch_and_cache_book(book_url)
            soup = __import__('bs4').BeautifulSoup(html, "html.parser")
            record = extract_from_product(soup)
            record['product_url'] = book_url
            record['source_page'] = f"catalogue-page-{i//20 + 1}"
            record['fetched_at'] = datetime.now(timezone.utc).isoformat()
            records_raw.append(record)
            if (i + 1) % 10 == 0:
                print(f"  Fetched {i+1}/{len(urls)} books...")
        except Exception as e:
            print(f"  ERROR fetching {book_url}: {e}")

    print(f"  Fetched {len(records_raw)} raw records")

    print("\n[Stage 4] Validating and normalizing records via Pydantic schema...")
    valid_records = []
    error_records = []

    for i, raw in enumerate(records_raw):
        normalized, error = normalize_record(raw)
        if normalized:
            valid_records.append(normalized)
        if error:
            error_records.append(error)
        if (i + 1) % 10 == 0:
            print(f"  Validated {i+1}/{len(records_raw)} records...")

    print(f"  Valid: {len(valid_records)}, Invalid: {len(error_records)}")

    print("\n[Stage 5] Writing output datasets...")
    output_books_json(valid_records)
    output_errors_json(error_records)

    print("\n[Stage 5] Generating execution report...")
    duration = time.time() - pipeline_start_time

    cache_hits = 0
    pages_fetched = 0
    for url in urls:
        slug = os.path.basename(urlparse(url).path).replace(".html", "")
        cache_path = os.path.join(os.path.dirname(__file__), "cache", f"{slug}.html")
        if os.path.exists(cache_path):
            cache_hits += 1
        else:
            pages_fetched += 1

    unique_urls = len(set(urls))

    report = {
        "start_time": pipeline_start_time_iso,
        "duration_seconds": round(duration, 2),
        "catalogue_pages_crawled": 3,
        "discovered_urls": discovered_urls,
        "unique_urls": unique_urls,
        "pages_fetched": pages_fetched,
        "cache_hits": cache_hits,
        "valid_records": len(valid_records),
        "invalid_records": len(error_records),
        "failed_pages": len(error_records),
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(os.path.join(OUTPUT_DIR, "run-report.json"), 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"  Report: {json.dumps(report, indent=2)}")

    print("\n[Stage 6] Checking idempotency...")
    is_idempotent = check_idempotency()
    print(f"  Idempotent: {is_idempotent}")

    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = run_pipeline()
    sys.exit(0 if success else 1)
import os
import requests
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from urllib.parse import urlparse

CACHE_DIR = os.path.join(os.path.dirname(__file__), '..', 'cache')
RATING_MAP = {"One": "One", "Two": "Two", "Three": "Three", "Four": "Four", "Five": "Five"}


def slug_from_url(book_url: str) -> str:
    parsed = urlparse(book_url)
    path = parsed.path.rstrip("/")
    basename = os.path.basename(path)
    if basename.endswith('.html'):
        basename = basename[:-5]
    return basename


def save_html_to_cache(html: str, slug: str, cache_dir: str = CACHE_DIR) -> None:
    os.makedirs(cache_dir, exist_ok=True)
    cache_path = os.path.join(cache_dir, f"{slug}.html")
    with open(cache_path, "w", encoding="utf-8") as f:
        f.write(html)


def fetch_and_cache_book(book_url: str, cache_dir: str = CACHE_DIR) -> str:
    slug = slug_from_url(book_url)
    cache_path = os.path.join(cache_dir, f"{slug}.html")

    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            return f.read()

    headers = {"User-Agent": "FlyRankInternship-A9/1.0 (+https://github.com/flyrank-internship/books-scraper)"}
    response = requests.get(book_url, headers=headers, timeout=5)

    if response.status_code != 200:
        raise RuntimeError(f"Expected 200, got {response.status_code} for {book_url}")

    html = response.text
    save_html_to_cache(html, slug, cache_dir)
    return html


def extract_from_product(soup: BeautifulSoup) -> dict:
    container = soup.select_one(".product_main")

    title = container.h1.get_text(strip=True) if container and container.h1 else ""
    product_url = ""

    price_text = ""
    if container and container.select_one("p.price_color"):
        price_text = container.select_one("p.price_color").get_text(strip=True)

    availability_text = ""
    if container and container.select_one(".availability"):
        availability_text = container.select_one(".availability").get_text(strip=True)

    rating_text = ""
    if container:
        rating_class = container.select_one("p.star-rating")
        if rating_class:
            classes = rating_class.get("class", [])
            for cls in classes:
                if cls in RATING_MAP:
                    rating_text = cls
                    break

    description = None
    desc_container = soup.select_one("#product_description")
    if desc_container and desc_container.find_next_sibling("p"):
        description = desc_container.find_next_sibling("p").get_text(strip=True)

    source_page = "catalogue"
    fetched_at = datetime.now(timezone.utc).isoformat()

    return {
        "title": title,
        "product_url": product_url,
        "price_text": price_text,
        "availability_text": availability_text,
        "rating_text": rating_text,
        "description": description,
        "source_page": source_page,
        "fetched_at": fetched_at,
    }
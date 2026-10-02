import os
import time
import requests
from datetime import datetime, timezone

# Cache directory is set by the pipeline based on CWD or explicit path
# Default: cache/ relative to the project root (current working directory)
CACHE_DIR = os.path.abspath(os.path.join(os.getcwd(), "cache"))
BASE_URL = "https://books.toscrape.com/catalogue/page-{}.html"
USER_AGENT = "FlyRankInternship-A9/1.0 (+https://github.com/flyrank-internship/books-scraper)"


def init_cache_dir(custom_cache_dir: str = None) -> None:
    """Initialize the cache directory. Call once at pipeline startup."""
    if custom_cache_dir:
        global CACHE_DIR
        CACHE_DIR = os.path.abspath(custom_cache_dir)
    os.makedirs(CACHE_DIR, exist_ok=True)


def fetch_catalogue_page(page_num: int, use_cache: bool = True) -> str:
    """Fetch a catalogue page, using cache if available and valid."""
    cache_path = os.path.join(CACHE_DIR, f"catalogue-page-{page_num}.html")

    if use_cache and os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            content = f.read()
        return content, True  # cache hit

    url = BASE_URL.format(page_num)
    headers = {"User-Agent": USER_AGENT}

    try:
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code != 200:
            raise RuntimeError(f"Expected 200, got {response.status_code}")

        content = response.text

        with open(cache_path, "w", encoding="utf-8") as f:
            f.write(content)

        return content, False  # live fetch

    except requests.Timeout:
        raise RuntimeError(f"Request timed out after 5s for {url}")
    except requests.RequestException as e:
        raise RuntimeError(f"Request failed for {url}: {e}")


def fetch_with_delay(page_num: int, use_cache: bool = True) -> str:
    """Fetch a catalogue page with polite rate-limiting."""
    content, cache_hit = fetch_catalogue_page(page_num, use_cache=use_cache)

    if not cache_hit:
        time.sleep(0.5)  # 500ms delay after live fetch

    return content
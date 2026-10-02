import time
from urllib.parse import urljoin
from bs4 import BeautifulSoup

BASE_URL = "https://books.toscrape.com/catalogue/page-{}.html"
MIN_DELAY = 0.5


def resolve_link(relative_url: str, base: str = BASE_URL) -> str:
    return urljoin(base, relative_url)


def extract_book_links(html: str, base_url: str = BASE_URL) -> list:
    soup = BeautifulSoup(html, "html.parser")
    links = []
    for h3 in soup.select("h3 a"):
        href = h3.get("href")
        if href:
            absolute_url = resolve_link(href, base_url)
            links.append(absolute_url)
    return links


def extract_next_page_url(html: str, base_url: str = BASE_URL) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    next_btn = soup.select_one("li.next > a")
    if next_btn and next_btn.get("href"):
        return urljoin(base_url, next_btn["href"])
    return None


def crawl_catalogue_pages(num_pages: int = 3) -> tuple:
    from clients.catalogue_client import fetch_with_delay

    all_urls = set()
    base = "https://books.toscrape.com/catalogue/page-1.html"

    for page_num in range(1, num_pages + 1):
        content = fetch_with_delay(page_num, use_cache=True)
        links = extract_book_links(content)
        for link in links:
            all_urls.add(link)
        next_url = extract_next_page_url(content)
        if not next_url:
            break

    sorted_urls = sorted(all_urls)
    return sorted_urls, extract_all_catalogue_pages_html(num_pages)


def extract_all_catalogue_pages_html(num_pages: int = 3) -> dict:
    from clients.catalogue_client import fetch_with_delay

    page_htmls = {}
    for page_num in range(1, num_pages + 1):
        content = fetch_with_delay(page_num, use_cache=True)
        page_htmls[f"page-{page_num}"] = content
    return page_htmls
# Polite Web Scraping Pipeline

## Target Classification
- **Site**: books.toscrape.com
- **Purpose**: Sandbox training exercise
- **Scope**: Three catalogue pages only
- **Data fields collected**: title, product_url, price_text, availability_text, rating_text, description, source_page, fetched_at

## Compliance Statement
I will not reuse this code on another site without checking its rules and terms first.

## Setup
1. `python -m venv .venv`
2. `source .venv/bin/activate` (Windows: `.venv\Scripts\activate`)
3. `pip install requests beautifulsoup4 pydantic`
4. `python pipeline.py`

## Politeness Rules
- User-Agent: `FlyRankInternship-A9/1.0 (+https://github.com/<user>/<repo>)`- Rate limit: >= 500ms between live requests; 0ms for cache hits
- Timeout: 5 seconds per request
- Only HTTP 200 responses processed

## Output
- `output/books.json` - valid normalized records
- `output/errors.json` - invalid/failed records
- `output/run-report.json` - execution telemetry

## Quickstart
```bash
python -m venv .venv
source .venv/bin/activate
pip install requests beautifulsoup4 pydantic
python pipeline.py
```

## Schema Definitions
- **Raw Record**: title, product_url, price_text, availability_text, rating_text, description (nullable), source_page, fetched_at
- **Normalized Record**: title (string), product_url (canonical absolute URL), price_gbp (float), price_text (original string), availability_text (string), rating_text (string), description (nullable string), source_page (string), fetched_at (ISO 8601 string)

## Politeness Rules
- Custom User-Agent: FlyRankInternship-A9/1.0 (+https://github.com/<user>/<repo>)
- Request timeouts: 5 seconds
- Status code validation: only HTTP 200 accepted
- Rate-limiting: >= 500ms delay between live network requests; 0ms for cached files
- Local disk caching: cache/catalogue-page-X.html and cache/<book-slug>.html

## Ethical Data Collection Notice
This pipeline targets books.toscrape.com, a public sandbox for training purposes. Always respect robots.txt, rate limits, and terms of service when scraping. Do not reuse this code on another site without checking its rules and terms first.

## Sample run-report.json
```json
{
  "start_time": "2026-10-02T20:22:47.656591+00:00",
  "duration_seconds": 0.69,
  "catalogue_pages_crawled": 3,
  "discovered_urls": 60,
  "unique_urls": 60,
  "pages_fetched": 0,
  "cache_hits": 60,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 0
}
```

## Rationale for Avoiding Headless Browsers
The target site (books.toscrape.com) serves fully rendered HTML. No JavaScript execution is needed, making a headless browser unnecessary. Using requests + BeautifulSoup4 is more efficient, lighterweight, and has lower resource requirements.

## --simulate-failure Flag
The pipeline supports a `--simulate-failure` CLI flag that injects one intentional 404 URL into the discovery queue to demonstrate resilience without stopping the pipeline. Other records continue processing normally.
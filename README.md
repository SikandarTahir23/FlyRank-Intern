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
2. Activate virtual environment
3. `pip install requests beautifulsoup4 pydantic`
4. `python pipeline.py`

## Politeness Rules
- User-Agent: `FlyRankInternship-A9/1.0 (+https://github.com/<user>/<repo>)`
- Rate limit: >= 500ms between live requests; 0ms for cache hits
- Timeout: 5 seconds per request
- Only HTTP 200 responses processed

## Output
- `output/books.json` - valid normalized records
- `output/errors.json` - invalid/failed records
- `output/run-report.json` - execution telemetry

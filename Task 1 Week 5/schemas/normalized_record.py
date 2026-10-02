from typing import Optional


class NormalizedRecord:
    def __init__(self, title: str, product_url: str, price_gbp: float,
                 price_text: str, availability_text: str,
                 rating_text: str, description: Optional[str] = None,
                 source_page: str = "", fetched_at: str = ""):
        self.title = title
        self.product_url = product_url
        self.price_gbp = price_gbp
        self.price_text = price_text
        self.availability_text = availability_text
        self.rating_text = rating_text
        self.description = description
        self.source_page = source_page
        self.fetched_at = fetched_at
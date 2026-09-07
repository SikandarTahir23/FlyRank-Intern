VISION_PROMPT = """
Analyze this image and return ONLY valid JSON matching this exact schema:
{
  "subject": "specific animal name (e.g., 'red fox', 'gray wolf')",
  "category": "broad category (e.g., 'fox', 'wolf', 'dog', 'bear', 'deer')",
  "attributes": ["visual trait 1", "visual trait 2", ...],
  "caption": "One-sentence natural language description",
  "confidence": 0.0-1.0
}

Rules:
- subject MUST be specific (e.g., "red fox" not just "fox")
- category MUST be one of: fox, wolf, dog, bear, deer
- attributes: 3-10 distinct visual traits
- confidence: your certainty in subject identification
- NO extra fields, NO markdown, NO commentary
"""

POST_EMBEDDING_TEMPLATE = """
Blog post about {target_subject} ({target_category}):
Title: {title}
Content: {content}
"""
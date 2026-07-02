from rapidfuzz import fuzz


def is_match(name1: str, name2: str, threshold: int = 95) -> bool:
    score = fuzz.ratio(name1.lower(), name2.lower())
    return score >= threshold


def slugify(text: str) -> str:
    return text.lower().replace(" ", "-").replace("/", "-")

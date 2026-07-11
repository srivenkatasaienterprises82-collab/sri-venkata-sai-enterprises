import os
import requests
from datetime import datetime

PROJECT_ID = os.getenv("SANITY_PROJECT_ID")
DATASET = os.getenv("SANITY_DATASET")
TOKEN = os.getenv("SANITY_TOKEN")

BASE_URL = f"https://{PROJECT_ID}.api.sanity.io/v2024-01-01"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}


def fetch_all_products():
    query = '*[_type == "product"]{_id, name, brand->{name}, amazonUrl, flipkartUrl, price, amazonPrice, flipkartPrice}'
    url = f"{BASE_URL}/data/query/{DATASET}?query={requests.utils.quote(query)}"
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        return res.json().get("result", [])
    print("Error fetching products:", res.text)
    return []


def create_product(product_data: dict) -> dict:
    url = f"{BASE_URL}/data/mutate/{DATASET}"
    mutations = {
        "mutations": [
            {
                "create": {
                    "_type": "product",
                    "name": product_data["title"],
                    "brand": {"_ref": product_data.get("brandRef", ""), "_type": "reference"},
                    "slug": {"_type": "slug", "current": product_data["slug"]},
                    "price": product_data.get("price"),
                    "amazonUrl": product_data.get("amazonUrl"),
                    "flipkartUrl": product_data.get("flipkartUrl"),
                    "amazonPrice": product_data.get("amazonPrice"),
                    "flipkartPrice": product_data.get("flipkartPrice"),
                    "description": product_data.get("description"),
                    "enabled": False,
                    "lastUpdated": datetime.now().isoformat(),
                }
            }
        ]
    }
    res = requests.post(url, headers=HEADERS, json=mutations)
    print(f"Created {product_data['title']}: {res.status_code}")
    return res.json()


def update_price(product_id: str, amazon_price, flipkart_price, display_price) -> dict:
    url = f"{BASE_URL}/data/mutate/{DATASET}"
    mutations = {
        "mutations": [
            {
                "patch": {
                    "id": product_id,
                    "set": {
                        "amazonPrice": amazon_price,
                        "flipkartPrice": flipkart_price,
                        "price": display_price,
                        "lastUpdated": datetime.now().isoformat(),
                    },
                }
            }
        ]
    }
    res = requests.post(url, headers=HEADERS, json=mutations)
    return res.json()

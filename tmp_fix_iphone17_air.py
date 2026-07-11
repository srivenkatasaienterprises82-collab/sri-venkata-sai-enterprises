import requests, os, json
PROJECT_ID = os.getenv("NEXT_PUBLIC_SANITY_PROJECT_ID") or os.getenv("SANITY_PROJECT_ID") or "homvjne9"
DATASET = "production"
TOKEN = os.environ["SANITY_TOKEN"]
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}
product_id = "product-iphone-17-air"
url = f"https://{PROJECT_ID}.api.sanity.io/v2024-01-01/data/mutate/{DATASET}"
payload = json.dumps({
  "mutations": [
    {
      "patch": {
        "id": product_id,
        "set": {
          "price": 99900,
          "amazonPrice": None,
          "flipkartPrice": None,
          "lastUpdated": __import__("datetime").datetime.now().isoformat()
        }
      }
    }
  ]
})
r = requests.post(url, headers=HEADERS, data=payload)
print("status", r.status_code)
print(r.text[:300])

import requests, os
PROJECT_ID = os.getenv("NEXT_PUBLIC_SANITY_PROJECT_ID") or os.getenv("SANITY_PROJECT_ID") or "homvjne9"
DATASET = "production"
TOKEN = os.environ["SANITY_TOKEN"]
HEADERS = {"Authorization": f"Bearer {TOKEN}"}
name = "iPhone 17 Air"
q = f'*[_type == "product" && name == "{name}"][0]{{_id,name,price}}'
url = f"https://{PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/{DATASET}?query=" + requests.utils.quote(q)
r = requests.get(url, headers=HEADERS)
print("status", r.status_code)
print(r.json().get("result"))

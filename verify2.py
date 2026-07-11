import requests, json, os
from dotenv import load_dotenv
load_dotenv("C:/Users/ramak/Downloads/sri-venkata-sai-enterprises-main/sri-venkata-sai-enterprises-main/.env.local")
token = os.getenv("SANITY_TOKEN") or os.getenv("SANITY_API_READ_TOKEN") or "skB1QV0Fc0WB5752sNh4DE03AZ85FDo5kZcR6JH4gDJ5GPSU6DG4Y46JTB1xuqD6rH1TSLeHMRZJl4Ly6TA4eAoxoyCA0JnptpyYbhh1IFa3ZLPXzk3pFDKG7zteCQSn2VQ8v2uWDTfZhuEoEUe4ZZdVEIpRMDFeIeJJL7hCbeqNDoNpIEBb"
q = '*[_id in ["product-iphone-17","product-iphone-17-pro","product-iphone-17-pro-max","product-iphone-17-air","product-moto-edge-60-pro","product-moto-edge-70-pro","product-samsung-s25-fe","product-samsung-s25-ultra","product-samsung-s26-plus","product-iqoo-15","product-iqoo-15r","product-iqoo-neo-10","product-oneplus-13"]]{_id, name, coverImage, images, price, amazonPrice, flipkartPrice, amazonUrl, flipkartUrl}'
url = f"https://homvjne9.api.sanity.io/v2024-01-01/data/query/production?query={requests.utils.quote(q)}"
r = requests.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=15)
print("status:", r.status_code)
print(json.dumps(r.json().get("result", []), indent=2, ensure_ascii=False))

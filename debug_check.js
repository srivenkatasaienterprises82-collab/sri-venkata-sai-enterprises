import requests

token = "skB1QV0Fc0WB5752sNh4DE03AZ85FDo5kZcR6JH4gDJ5GPSU6DG4Y46JTB1xuqD6rH1TSLeHMRZJl4Ly6TA4eAoxoyCA0JnptpyYbhh1IFa3ZLPXzk3pFDKG7zteCQSn2VQ8v2uWDTfZhuEoEUe4ZZdVEIpRMDFeIeJJL7hCbeqNDoNpIEBb"
# 1. Confirm current coverImage value (the broken image URL)
q1 = '*[_id=="product-iphone-17"]{coverImage, images}'
r1 = requests.get(f'https://homvjne9.api.sanity.io/v2024-01-01/data/query/production?query={requests.utils.quote(q1)}', headers={"Authorization": f"Bearer {token}"})
print("CURRENT DOC:", r1.json()["result"][0])

# 2. Confirm the seed's actual stored value (what the seed writes for coverImage)
print("\nSeed code writes: coverImage: product.image")
import sys
sys.path.insert(0, "C:/Users/ramak/Downloads/sri-venkata-sai-enterprises-main/sri-venkata-sai-enterprises-main/src/lib/data")
import products
p17 = [p for p in products.products if p.id == "iphone-17"][0]
print("Static products.ts image path:", p17.image)

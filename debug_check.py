import requests, json, sys, importlib.util, os
base = "C:/Users/ramak/Downloads/sri-venkata-sai-enterprises-main/sri-venkata-sai-enterprises-main"
spec = importlib.util.spec_from_file_location("image", os.path.join(base, "src/sanity/lib/image.ts"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

token = "skB1QV0Fc0WB5752sNh4DE03AZ85FDo5kZcR6JH4gDJ5GPSU6DG4Y46JTB1xuqD6rH1TSLeHMRZJl4Ly6TA4eAoxoyCA0JnptpyYbhh1IFa3ZLPXzk3pFDKG7zteCQSn2VQ8v2uWDTfZhuEoEUe4ZZdVEIpRMDFeIeJJL7hCbeqNDoNpIEBb"
q = '*[_id=="product-iphone-17"]{coverImage, images}'
r = requests.get(f'https://homvjne9.api.sanity.io/v2024-01-01/data/query/production?query={requests.utils.quote(q)}', headers={"Authorization": f"Bearer {token}"})
doc = r.json()["result"][0]
cover = doc.get("coverImage"); images = doc.get("images")
print("coverImage type:", type(cover).__name__)
print("coverImage raw:", json.dumps(cover, ensure_ascii=False)[:300])
print("images[0] type:", type(images[0]).__name__ if images else "none")
print("images[0] raw:", json.dumps(images[0] if images else None, ensure_ascii=False)[:300])
print("resolveImage(cover):", m.resolveImage(cover))
print("resolveImage(images[0]):", m.resolveImage(images[0]) if images else "n/a")

import products as prods
p17 = [p for p in prods.products if p.id == "iphone-17"][0]
print("static products.ts image:", p17.image)

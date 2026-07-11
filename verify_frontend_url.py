import requests, json, os
from dotenv import load_dotenv
load_dotenv("C:/Users/ramak/Downloads/sri-venkata-sai-enterprises-main/sri-venkata-sai-enterprises-main/.env.local")
token = os.getenv("SANITY_TOKEN") or os.getenv("SANITY_API_READ_TOKEN") or "skB1QV0Fc0WB5752sNh4DE03AZ85FDo5kZcR6JH4gDJ5GPSU6DG4Y46JTB1xuqD6rH1TSLeHMRZJl4Ly6TA4eAoxoyCA0JnptpyYbhh1IFa3ZLPXzk3pFDKG7zteCQSn2VQ8v2uWDTfZhuEoEUe4ZZdVEIpRMDFeIeJJL7hCbeqNDoNpIEBb"
# 1) Fetch one product doc (raw Sanity image objects)
q = '*[_id=="product-iphone-17"][0]{_id, coverImage, images}'
r = requests.get(f"https://homvjne9.api.sanity.io/v2024-01-01/data/query/production?query={requests.utils.quote(q)}", headers={"Authorization": f"Bearer {token}"}, timeout=15)
doc = r.json()["result"]
print("SANITY DOC:", json.dumps(doc, indent=2, ensure_ascii=False)[:800])

# 2) Replicate what resolveImage does, using client config from the project
import sys, importlib.util
base = "C:/Users/ramak/Downloads/sri-venkata-sai-enterprises-main/sri-venkata-sai-enterprises-main"
for mod, path in [("image", "src/sanity/lib/image.ts"), ("client", "src/sanity/client.ts")]:
    spec = importlib.util.spec_from_file_location(mod, f"{base}/{path}")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    sys.modules[f"sanity.{mod}"] = m
from sanity.image import resolveImage

cover = doc[0]["coverImage"]
imgs = doc[0]["images"] or []
print("\nresolveImage(coverImage):", resolveImage(cover))
print("resolveImage(images[0]):", resolveImage(imgs[0]) if imgs else None)

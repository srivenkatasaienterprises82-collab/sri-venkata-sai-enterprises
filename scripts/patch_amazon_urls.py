import urllib.request, json, os, urllib.parse

t = os.environ["T"]
pidv = os.environ["PID"]
ds = os.environ["DS"]

def q(s):
    url = f"https://{pidv}.api.sanity.io/v2021-06-07/data/query/{ds}?query=" + urllib.parse.quote(s)
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {t}"})
    return json.load(urllib.request.urlopen(req))["result"]

def mutate(doc_id, amazon_url):
    body = {"mutations": [{"patch": {"id": doc_id, "set": {"amazonUrl": amazon_url}}}]}
    url = f"https://{pidv}.api.sanity.io/v2021-06-07/data/mutate/{ds}?returnIds=true"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={"Authorization": f"Bearer {t}", "Content-Type": "application/json"}, method="POST")
    return json.load(urllib.request.urlopen(req))

url_map = {
    "iqoo-15": "https://www.amazon.in/dp/B0FYGGJZV4",
    "iqoo-neo-10": "https://www.amazon.in/dp/B0GXZ1VC4J",
    "iqoo-z10-lite": "https://www.amazon.in/dp/B0H1JG89ZB",
    "iqoo-z10r": "https://www.amazon.in/dp/B0FHB5982P",
    "iqoo-z11x": "https://www.amazon.in/dp/B0GP78FV52",
    "oneplus-13": "https://www.amazon.in/dp/B0DPS7FB4J",
    "oneplus-nord-6": "https://www.amazon.in/dp/B0GRB3S1FL",
    "oneplus-nord-ce6": "https://www.amazon.in/dp/B0GWLHVJRH",
    "oneplus-nord-ce6-lite": "https://www.amazon.in/dp/B0GVYGLNH7",
    "pixel-10a": "https://www.amazon.in/dp/B0GP8SY9MB",
    "redmi-15c": "https://www.amazon.in/dp/B0G2B2QVLL",
    "redmi-15a": "https://www.amazon.in/dp/B0GVJZF2YS",
    "redmi-a4": "https://www.amazon.in/dp/B0DLW1L5PR",
    "redmi-a5": "https://www.amazon.in/dp/B0F3P2ZL2X",
    "infinix-gt-30": "https://www.amazon.in/dp/B0FP2PDV44",
    "infinix-gt-30-pro": "https://www.amazon.in/dp/B0FD7446KW",
    "infinix-smart-10": "https://www.amazon.in/dp/B0FN7KF2BF",
    "infinix-smart-20": "https://www.amazon.in/dp/B0H67J7P9J",
}

for slug, url in url_map.items():
    res = q(f'*[_type=="product" && slug.current=="{slug}"][0]{{_id, name}}')
    if not res:
        print("NOT FOUND:", slug)
        continue
    out = mutate(res["_id"], url)
    print("PATCHED", slug, res["name"], "->", out.get("results"))

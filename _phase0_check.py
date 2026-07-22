import sys, os
sys.path.insert(0, 'automation')

# Load .env.local
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env.local')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

# Fallback: NEXT_PUBLIC_SANITY_PROJECT_ID -> SANITY_PROJECT_ID
if not os.environ.get('SANITY_PROJECT_ID'):
    nxt = os.environ.get('NEXT_PUBLIC_SANITY_PROJECT_ID')
    if nxt:
        os.environ['SANITY_PROJECT_ID'] = nxt

if not os.environ.get('SANITY_DATASET'):
    os.environ['SANITY_DATASET'] = 'production'

token = os.environ.get('SANITY_TOKEN', '')
project = os.environ.get('SANITY_PROJECT_ID', 'NOT SET')
dataset = os.environ.get('SANITY_DATASET', 'NOT SET')
print(f"SANITY_PROJECT_ID={project}")
print(f"SANITY_DATASET={dataset}")
print(f"SANITY_TOKEN prefix={token[:12]}...")

if not token or project == 'NOT SET':
    print("ERROR: Missing SANITY_TOKEN or SANITY_PROJECT_ID")
    sys.exit(1)

from sanity_api import fetch_all_products
products = fetch_all_products()
fk = [p for p in products if p.get('flipkartUrl')]
az_only = [p for p in products if p.get('amazonUrl') and not p.get('flipkartUrl')]
neither = [p for p in products if not p.get('amazonUrl') and not p.get('flipkartUrl')]
print(f'\nTotal products: {len(products)}')
print(f'flipkartUrl present: {len(fk)}')
print(f'amazonUrl only (no flipkart): {len(az_only)}')
print(f'no URL at all: {len(neither)}')
for p in az_only:
    brand = p.get("brandSlug") or (p.get("brand") or {}).get("slug")
    print(f'  {p["_id"]} | {p.get("name")} | brand={brand}')

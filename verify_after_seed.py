import requests, json
token = "skB1QV0Fc0WB5752sNh4DE03AZ85FDo5kZcR6JH4gDJ5GPSU6DG4Y46JTB1xuqD6rH1TSLeHMRZJl4Ly6TA4eAoxoyCA0JnptpyYbhh1IFa3ZLPXzk3pFDKG7zteCQSn2VQ8v2uWDTfZhuEoEUe4ZZdVEIpRMDFeIeJJL7hCbeqNDoNpIEBb"
q = '*[_id in ["product-iphone-17","product-iphone-17-pro","product-iphone-17-pro-max","product-iphone-17-air","product-moto-edge-60-pro","product-moto-edge-70-pro","product-samsung-s25-fe"]]{_id, coverImage, images}'
r = requests.get(f'https://homvjne9.api.sanity.io/v2024-01-01/data/query/production?query={requests.utils.quote(q)}', headers={"Authorization": f"Bearer {token}"})
print(json.dumps(r.json().get("result", []), indent=2, ensure_ascii=False))

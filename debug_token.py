import sys, os
from dotenv import load_dotenv
load_dotenv("C:/Users/ramak/Downloads/sri-venkata-sai-enterprises-main/sri-venkata-sai-enterprises-main/.env.local")
sys.path.insert(0, "C:/Users/ramak/Downloads/sri-venkata-sai-enterprises-main/sri-venkata-sai-enterprises-main")
import automation.sanity_api as s
print("PROJECT_ID:", s.PROJECT_ID)
print("TOKEN prefix:", (s.TOKEN or "")[:12])
print("TOKEN set:", bool(s.TOKEN))

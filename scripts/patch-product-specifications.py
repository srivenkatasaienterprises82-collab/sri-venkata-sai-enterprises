#!/usr/bin/env python3
"""
Patch product specifications in Sanity for ALL brands.

Reads .env.local for SANITY credentials, fetches all products from Sanity,
matches by slug/name, and patches the `specifications` field with the
new data from the product-specs table.

Usage:
    cd sri-venkata-sai-enterprises-main
    python scripts/patch-product-specifications.py
    python scripts/patch-product-specifications.py --dry-run
"""

import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

PROJECT_ID = os.getenv("NEXT_PUBLIC_SANITY_PROJECT_ID") or os.getenv("SANITY_PROJECT_ID")
DATASET = os.getenv("SANITY_DATASET") or "production"
TOKEN = os.getenv("SANITY_TOKEN")

if not PROJECT_ID or not TOKEN:
    print("ERROR: Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_TOKEN in .env.local")
    sys.exit(1)

BASE_URL = "https://%s.api.sanity.io/v2024-01-01" % PROJECT_ID
HEADERS = {"Authorization": "Bearer %s" % TOKEN, "Content-Type": "application/json"}

DRY_RUN = "--dry-run" in sys.argv

# =====================================================================
# NEW SPECS organized by slug
# =====================================================================

NEW_SPECS = {

    # ----- VIVO -----
    "vivo-v70-elite": [
        {"label": "Display", "value": '6.78" AMOLED, 120Hz'},
        {"label": "Processor", "value": "Dimensity 9400e"},
        {"label": "Camera", "value": "50MP OIS + 50MP Ultra-wide + 50MP Telephoto"},
        {"label": "Selfie Camera", "value": "50MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "90W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "vivo-v70": [
        {"label": "Display", "value": '6.78" AMOLED, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 7 Gen 4"},
        {"label": "Camera", "value": "50MP OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "50MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "90W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "vivo-v70-fe": [
        {"label": "Display", "value": '6.67" AMOLED, 120Hz'},
        {"label": "Processor", "value": "Dimensity 9300+"},
        {"label": "Camera", "value": "50MP OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "50MP"},
        {"label": "Battery", "value": "6500mAh"},
        {"label": "Charging", "value": "90W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "vivo-t4-lite": [
        {"label": "Display", "value": '6.74" HD+ LCD, 90Hz'},
        {"label": "Processor", "value": "Dimensity 6300"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "5MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "15W"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "vivo-t4x": [
        {"label": "Display", "value": '6.72" FHD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Dimensity 7300"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Battery", "value": "6500mAh"},
        {"label": "Charging", "value": "44W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "vivo-t4r": [
        {"label": "Display", "value": '6.77" AMOLED, 120Hz'},
        {"label": "Processor", "value": "Dimensity 7400"},
        {"label": "Camera", "value": "50MP OIS + 2MP"},
        {"label": "Battery", "value": "5700mAh"},
        {"label": "Charging", "value": "44W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "vivo-t4": [
        {"label": "Display", "value": '6.77" AMOLED, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 7s Gen 3"},
        {"label": "Camera", "value": "50MP OIS"},
        {"label": "Battery", "value": "7300mAh"},
        {"label": "Charging", "value": "90W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "vivo-t4-pro": [
        {"label": "Display", "value": '6.77" AMOLED, 120Hz'},
        {"label": "Processor", "value": "Dimensity 9300+"},
        {"label": "Camera", "value": "50MP OIS + 8MP"},
        {"label": "Battery", "value": "5500mAh"},
        {"label": "Charging", "value": "90W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "vivo-t4-ultra": [
        {"label": "Display", "value": '6.78" AMOLED, 120Hz'},
        {"label": "Processor", "value": "Dimensity 9300+"},
        {"label": "Camera", "value": "50MP OIS + 50MP Periscope + 8MP"},
        {"label": "Battery", "value": "5500mAh"},
        {"label": "Charging", "value": "90W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "vivo-t5x": [
        {"label": "Display", "value": '6.72" FHD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 6 Gen 4"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Battery", "value": "6500mAh"},
        {"label": "Charging", "value": "44W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "vivo-t5-pro": [
        {"label": "Display", "value": '6.77" AMOLED, 120Hz'},
        {"label": "Processor", "value": "Dimensity 9300+"},
        {"label": "Camera", "value": "50MP OIS + 8MP"},
        {"label": "Battery", "value": "5500mAh"},
        {"label": "Charging", "value": "90W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "vivo-y05": [
        {"label": "Display", "value": '6.56" HD+ LCD, 90Hz'},
        {"label": "Processor", "value": "Helio G85"},
        {"label": "Camera", "value": "13MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "Charging", "value": "15W"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "vivo-y11": [
        {"label": "Display", "value": '6.56" HD+ LCD'},
        {"label": "Processor", "value": "Helio G85"},
        {"label": "Camera", "value": "13MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "vivo-y31": [
        {"label": "Display", "value": '6.68" HD+ LCD'},
        {"label": "Processor", "value": "Snapdragon 680"},
        {"label": "Camera", "value": "50MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "44W"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "vivo-y51-pro": [
        {"label": "Display", "value": '6.67" AMOLED'},
        {"label": "Processor", "value": "Snapdragon 6 Gen 1"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "44W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],

    # ----- iQOO -----
    "iqoo-neo-10": [
        {"label": "Display", "value": '6.78" 1.5K AMOLED, 144Hz'},
        {"label": "Processor", "value": "Snapdragon 8s Gen 4"},
        {"label": "Camera", "value": "50MP OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "7000mAh"},
        {"label": "Charging", "value": "120W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "iqoo-15": [
        {"label": "Display", "value": '6.82" 2K LTPO AMOLED, 144Hz'},
        {"label": "Processor", "value": "Snapdragon 8 Elite"},
        {"label": "Camera", "value": "50MP OIS + 50MP Ultra-wide + 64MP Periscope"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "7000mAh"},
        {"label": "Charging", "value": "120W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "iqoo-15r": [
        {"label": "Display", "value": '6.78" 1.5K AMOLED, 144Hz'},
        {"label": "Processor", "value": "Snapdragon 8s Gen 4"},
        {"label": "Camera", "value": "50MP OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "7000mAh"},
        {"label": "Charging", "value": "90W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "iqoo-z10-lite": [
        {"label": "Display", "value": '6.74" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 6300"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "44W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "iqoo-z10r": [
        {"label": "Display", "value": '6.77" FHD+ AMOLED, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 7400"},
        {"label": "Camera", "value": "50MP Sony OIS + 2MP Camera"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "5700mAh"},
        {"label": "Charging", "value": "44W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],
    "iqoo-z11x": [
        {"label": "Display", "value": '6.72" FHD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 6 Gen 4"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6500mAh"},
        {"label": "Charging", "value": "44W FlashCharge"},
        {"label": "OS", "value": "Android, Funtouch OS"},
    ],

    # ----- SAMSUNG -----
    "samsung-s26-plus": [
        {"label": "Display", "value": '6.7" QHD+ Dynamic AMOLED 2X, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 8 Elite / Exynos 2600"},
        {"label": "Camera", "value": "50MP + 12MP Ultra-wide + 10MP Telephoto (3x)"},
        {"label": "Selfie Camera", "value": "12MP"},
        {"label": "Battery", "value": "4900mAh"},
        {"label": "Charging", "value": "45W Fast Charging"},
        {"label": "OS", "value": "Android 16 (One UI 8)"},
    ],
    "samsung-s25-ultra": [
        {"label": "Display", "value": '6.9" QHD+ Dynamic AMOLED 2X, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 8 Elite for Galaxy"},
        {"label": "Camera", "value": "200MP OIS + 50MP Ultra-wide + 50MP Periscope (5x) + 10MP Telephoto (3x)"},
        {"label": "Selfie Camera", "value": "12MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "Charging", "value": "45W Fast Charging"},
        {"label": "OS", "value": "Android, One UI 8"},
    ],
    "samsung-s25-fe": [
        {"label": "Display", "value": '6.7" FHD+ Dynamic AMOLED 2X, 120Hz'},
        {"label": "Processor", "value": "Exynos 2400"},
        {"label": "Camera", "value": "50MP OIS + 12MP Ultra-wide + 8MP Telephoto"},
        {"label": "Selfie Camera", "value": "12MP"},
        {"label": "Battery", "value": "4700mAh"},
        {"label": "Charging", "value": "45W Fast Charging"},
        {"label": "OS", "value": "Android, Galaxy AI"},
    ],
    "samsung-tab-s10-lite": [
        {"label": "Display", "value": '10.9" WUXGA LCD, 90Hz'},
        {"label": "Processor", "value": "Exynos 1380"},
        {"label": "Camera", "value": "13MP Rear + 8MP Front"},
        {"label": "Battery", "value": "8000mAh"},
        {"label": "Charging", "value": "45W Fast Charging"},
        {"label": "OS", "value": "Android 15 (One UI)"},
    ],
    "samsung-m56": [
        {"label": "Display", "value": '6.74" FHD+ Super AMOLED+, 120Hz'},
        {"label": "Processor", "value": "Exynos 1480"},
        {"label": "Camera", "value": "50MP OIS + 8MP Ultra-wide + 2MP Macro"},
        {"label": "Selfie Camera", "value": "12MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "Charging", "value": "45W Fast Charging"},
        {"label": "OS", "value": "Android, One UI 7"},
    ],
    "samsung-m36": [
        {"label": "Display", "value": '6.7" FHD+ Super AMOLED, 120Hz'},
        {"label": "Processor", "value": "Exynos 1380"},
        {"label": "Camera", "value": "50MP OIS + 8MP Ultra-wide + 2MP Macro"},
        {"label": "Selfie Camera", "value": "13MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "25W Fast Charging"},
        {"label": "OS", "value": "Android, One UI 7"},
    ],
    "samsung-m06": [
        {"label": "Display", "value": '6.7" HD+ PLS LCD, 90Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 6300"},
        {"label": "Camera", "value": "50MP + 2MP Dual Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "Charging", "value": "25W Fast Charging"},
        {"label": "OS", "value": "Android, One UI Core 7"},
    ],
    "samsung-f70e": [
        {"label": "Display", "value": '6.7" FHD+ Super AMOLED, 120Hz'},
        {"label": "Processor", "value": "Exynos 1380"},
        {"label": "Camera", "value": "50MP OIS Camera"},
        {"label": "Selfie Camera", "value": "13MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "25W Fast Charging"},
        {"label": "OS", "value": "Android, One UI"},
    ],
    "samsung-f36": [
        {"label": "Display", "value": '6.7" FHD+ Super AMOLED, 120Hz'},
        {"label": "Processor", "value": "Exynos 1380"},
        {"label": "Camera", "value": "50MP OIS + 8MP Ultra-wide + 2MP Macro"},
        {"label": "Selfie Camera", "value": "13MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "25W Fast Charging"},
        {"label": "OS", "value": "Android, One UI 7"},
    ],
    "samsung-f06": [
        {"label": "Display", "value": '6.7" HD+ PLS LCD, 90Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 6300"},
        {"label": "Camera", "value": "50MP + 2MP Dual Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "Charging", "value": "25W Fast Charging"},
        {"label": "OS", "value": "Android, One UI Core 7"},
    ],
    "samsung-f07": [
        {"label": "Display", "value": '6.7" HD+ PLS LCD, 90Hz'},
        {"label": "Processor", "value": "MediaTek Helio G85"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "Charging", "value": "25W Fast Charging"},
        {"label": "OS", "value": "Android, One UI"},
    ],
    "samsung-a06": [
        {"label": "Display", "value": '6.7" HD+ PLS LCD, 90Hz'},
        {"label": "Processor", "value": "MediaTek Helio G85"},
        {"label": "Camera", "value": "50MP + 2MP Dual Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "Charging", "value": "25W Fast Charging"},
        {"label": "OS", "value": "Android 15 (One UI Core)"},
    ],

    # ----- OPPO -----
    "oppo-reno-15-pro-mini": [
        {"label": "Display", "value": '6.55" AMOLED, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 9400"},
        {"label": "Camera", "value": "50MP OIS + 50MP Ultra-wide + 50MP Telephoto"},
        {"label": "Selfie Camera", "value": "50MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "Android, ColorOS"},
    ],
    "oppo-reno-15": [
        {"label": "Display", "value": '6.78" AMOLED, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 8s Gen 4"},
        {"label": "Camera", "value": "50MP OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "50MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "Android, ColorOS"},
    ],
    "oppo-reno-15c": [
        {"label": "Display", "value": '6.67" AMOLED, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 8350"},
        {"label": "Camera", "value": "50MP OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "5600mAh"},
        {"label": "Charging", "value": "67W SUPERVOOC"},
        {"label": "OS", "value": "Android, ColorOS"},
    ],
    "oppo-k14": [
        {"label": "Display", "value": '6.67" FHD+ AMOLED, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 7 Gen 3"},
        {"label": "Camera", "value": "50MP OIS Camera"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "7000mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "Android, ColorOS"},
    ],
    "oppo-k14x": [
        {"label": "Display", "value": '6.67" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 6300"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "45W SUPERVOOC"},
        {"label": "OS", "value": "Android, ColorOS"},
    ],
    "oppo-k13": [
        {"label": "Display", "value": '6.67" FHD+ AMOLED, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 6 Gen 4"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "7000mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "Android, ColorOS"},
    ],
    "oppo-k13x": [
        {"label": "Display", "value": '6.67" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 6300"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "45W SUPERVOOC"},
        {"label": "OS", "value": "Android, ColorOS"},
    ],
    "oppo-f33-pro": [
        {"label": "Display", "value": '6.78" AMOLED, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 8s Gen 4"},
        {"label": "Camera", "value": "50MP OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "Android, ColorOS"},
    ],
    "oppo-f33": [
        {"label": "Display", "value": '6.67" AMOLED, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 7 Gen 3"},
        {"label": "Camera", "value": "50MP OIS Camera"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "5800mAh"},
        {"label": "Charging", "value": "67W SUPERVOOC"},
        {"label": "OS", "value": "Android, ColorOS"},
    ],
    "oppo-f31-pro-plus": [
        {"label": "Display", "value": '6.78" AMOLED, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 8350"},
        {"label": "Camera", "value": "50MP OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "5800mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "Android, ColorOS"},
    ],
    "oppo-a6x": [
        {"label": "Display", "value": '6.67" HD+ LCD, 90Hz'},
        {"label": "Processor", "value": "Snapdragon 4 Gen 2"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5100mAh"},
        {"label": "Charging", "value": "45W SUPERVOOC"},
        {"label": "OS", "value": "Android, ColorOS"},
    ],

    # ----- REDMI -----
    "redmi-a7-pro": [
        {"label": "Display", "value": '6.9" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Unisoc T8300"},
        {"label": "Camera", "value": "32MP Rear Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6300mAh"},
        {"label": "Charging", "value": "15W"},
        {"label": "OS", "value": "HyperOS 3 (Android 16)"},
    ],
    "redmi-a5": [
        {"label": "Display", "value": '6.88" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Unisoc T7250"},
        {"label": "Camera", "value": "32MP AI Rear Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5200mAh"},
        {"label": "Charging", "value": "15W"},
        {"label": "OS", "value": "Android 15 (Go Edition)"},
    ],
    "redmi-a4": [
        {"label": "Display", "value": '6.88" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 4s Gen 2 5G"},
        {"label": "Camera", "value": "50MP AI Rear Camera"},
        {"label": "Selfie Camera", "value": "5MP"},
        {"label": "Battery", "value": "5160mAh"},
        {"label": "Charging", "value": "18W Fast Charging"},
        {"label": "OS", "value": "HyperOS"},
    ],
    "redmi-15c": [
        {"label": "Display", "value": '6.9" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Unisoc T8300"},
        {"label": "Camera", "value": "32MP Rear Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6300mAh"},
        {"label": "Charging", "value": "15W"},
        {"label": "OS", "value": "HyperOS 3"},
    ],
    "redmi-15a": [
        {"label": "Display", "value": '6.9" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Unisoc T8300"},
        {"label": "Camera", "value": "32MP Rear Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6300mAh"},
        {"label": "Charging", "value": "15W"},
        {"label": "OS", "value": "HyperOS 3"},
    ],

    # ----- INFINIX -----
    "infinix-gt-30-pro": [
        {"label": "Display", "value": '6.78" 1.5K AMOLED, 144Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 8350 Ultimate"},
        {"label": "Camera", "value": "108MP OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "13MP"},
        {"label": "Battery", "value": "5500mAh"},
        {"label": "Charging", "value": "45W Fast + 30W Wireless"},
        {"label": "OS", "value": "XOS 15 (Android 15)"},
    ],
    "infinix-gt-30": [
        {"label": "Display", "value": '6.78" FHD+ AMOLED, 144Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 7300 Ultimate"},
        {"label": "Camera", "value": "108MP AI Dual Camera"},
        {"label": "Selfie Camera", "value": "13MP"},
        {"label": "Battery", "value": "5500mAh"},
        {"label": "Charging", "value": "45W Fast Charging"},
        {"label": "OS", "value": "XOS 15 (Android 15)"},
    ],
    "infinix-note-edge": [
        {"label": "Display", "value": '6.78" FHD+ AMOLED, 120Hz Curved'},
        {"label": "Processor", "value": "MediaTek Helio G100 Ultimate"},
        {"label": "Camera", "value": "108MP Camera"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "5200mAh"},
        {"label": "Charging", "value": "45W Fast Charging"},
        {"label": "OS", "value": "XOS 14.5"},
    ],
    "infinix-smart-20": [
        {"label": "Display", "value": '6.67" HD+, 120Hz'},
        {"label": "Processor", "value": "Unisoc T7250"},
        {"label": "Camera", "value": "13MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "Charging", "value": "18W Fast Charging"},
        {"label": "OS", "value": "Android 15 Go Edition"},
    ],
    "infinix-smart-10": [
        {"label": "Display", "value": '6.67" HD+, 120Hz'},
        {"label": "Processor", "value": "Unisoc T7250"},
        {"label": "Camera", "value": "8MP Rear Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "Charging", "value": "15W"},
        {"label": "OS", "value": "Android 15 Go Edition"},
    ],

    # ----- MOTOROLA -----
    "moto-edge-60": [
        {"label": "Display", "value": '6.67" 1.5K pOLED, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 7400"},
        {"label": "Camera", "value": "50MP Sony LYT-700C OIS + 50MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "50MP"},
        {"label": "Battery", "value": "5500mAh"},
        {"label": "Charging", "value": "68W TurboPower"},
        {"label": "OS", "value": "Android 15"},
    ],
    "moto-edge-60-pro": [
        {"label": "Display", "value": '6.67" 1.5K pOLED, 144Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 8350 Extreme"},
        {"label": "Camera", "value": "50MP Sony LYT-700C OIS + 50MP Ultra-wide + 10MP Telephoto (3x)"},
        {"label": "Selfie Camera", "value": "50MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "90W TurboPower + 15W Wireless"},
        {"label": "OS", "value": "Android 15"},
    ],
    "moto-edge-70-pro": [
        {"label": "Display", "value": '6.7" 1.5K pOLED, 144Hz'},
        {"label": "Processor", "value": "Snapdragon 8s Gen 4"},
        {"label": "Camera", "value": "50MP OIS + 50MP Ultra-wide + 10MP Telephoto"},
        {"label": "Selfie Camera", "value": "50MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "90W TurboPower"},
        {"label": "OS", "value": "Android 15"},
    ],
    "moto-70-fusion": [
        {"label": "Display", "value": '6.67" 1.5K pOLED, 144Hz'},
        {"label": "Processor", "value": "Snapdragon 7s Gen 3"},
        {"label": "Camera", "value": "50MP Sony LYT-700C OIS + 13MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "5500mAh"},
        {"label": "Charging", "value": "68W TurboPower"},
        {"label": "OS", "value": "Android 15"},
    ],
    "moto-60-fusion": [
        {"label": "Display", "value": '6.67" 1.5K pOLED, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 7400"},
        {"label": "Camera", "value": "50MP Sony LYT-700C OIS + 13MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "5500mAh"},
        {"label": "Charging", "value": "68W TurboPower"},
        {"label": "OS", "value": "Android 15"},
    ],
    "moto-g96": [
        {"label": "Display", "value": '6.67" FHD+ pOLED, 144Hz'},
        {"label": "Processor", "value": "Snapdragon 7s Gen 2"},
        {"label": "Camera", "value": "50MP Sony OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "5500mAh"},
        {"label": "Charging", "value": "33W TurboPower"},
        {"label": "OS", "value": "Android, Stock"},
    ],
    "moto-g67-power": [
        {"label": "Display", "value": '6.72" FHD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 6 Gen 4"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "33W TurboPower"},
        {"label": "OS", "value": "Android, Stock"},
    ],
    "moto-g57-power": [
        {"label": "Display", "value": '6.72" FHD+ LCD, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 7300"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "33W TurboPower"},
        {"label": "OS", "value": "Android, Stock"},
    ],
    "moto-g37-power": [
        {"label": "Display", "value": '6.67" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Unisoc T7250"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "18W Fast Charging"},
        {"label": "OS", "value": "Android, Stock"},
    ],
    "moto-g37": [
        {"label": "Display", "value": '6.67" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Unisoc T7250"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "Charging", "value": "18W Fast Charging"},
        {"label": "OS", "value": "Android, Stock"},
    ],
    "moto-g06-power": [
        {"label": "Display", "value": '6.67" HD+ LCD, 90Hz'},
        {"label": "Processor", "value": "Unisoc T606"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5200mAh"},
        {"label": "Charging", "value": "18W Fast Charging"},
        {"label": "OS", "value": "Android, Stock"},
    ],

    # ----- POCO -----
    "poco-m7-plus": [
        {"label": "Display", "value": '6.79" FHD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 6 Gen 4"},
        {"label": "Camera", "value": "50MP AI Dual Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "33W Fast Charging"},
        {"label": "OS", "value": "HyperOS 2 (Android 15)"},
    ],
    "poco-m7": [
        {"label": "Display", "value": '6.88" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 4 Gen 2"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5160mAh"},
        {"label": "Charging", "value": "18W Fast Charging"},
        {"label": "OS", "value": "HyperOS"},
    ],
    "poco-c85x": [
        {"label": "Display", "value": '6.88" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Unisoc T7250"},
        {"label": "Camera", "value": "32MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5200mAh"},
        {"label": "Charging", "value": "15W Fast Charging"},
        {"label": "OS", "value": "Android 15 (Go Edition)"},
    ],
    "poco-c85": [
        {"label": "Display", "value": '6.88" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "MediaTek Helio G81 Ultra"},
        {"label": "Camera", "value": "50MP AI Dual Camera"},
        {"label": "Selfie Camera", "value": "13MP"},
        {"label": "Battery", "value": "5160mAh"},
        {"label": "Charging", "value": "18W Fast Charging"},
        {"label": "OS", "value": "HyperOS"},
    ],
    "poco-c71": [
        {"label": "Display", "value": '6.88" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Unisoc T7250"},
        {"label": "Camera", "value": "32MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5200mAh"},
        {"label": "Charging", "value": "15W"},
        {"label": "OS", "value": "Android 15 (Go Edition)"},
    ],

    # ----- REALME -----
    "realme-16-pro-plus": [
        {"label": "Display", "value": '6.83" 1.5K AMOLED, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 7 Gen 4"},
        {"label": "Camera", "value": "50MP Sony OIS + 50MP Periscope + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "7000mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI 7 (Android 16)"},
    ],
    "realme-16-pro": [
        {"label": "Display", "value": '6.77" FHD+ AMOLED, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 7 Gen 4"},
        {"label": "Camera", "value": "50MP Sony OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "6500mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI 7"},
    ],
    "realme-16": [
        {"label": "Display", "value": '6.72" FHD+ AMOLED, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 7300+"},
        {"label": "Camera", "value": "50MP OIS + 2MP Camera"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "67W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI 7"},
    ],
    "realme-16t": [
        {"label": "Display", "value": '6.67" FHD+ AMOLED, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 7400"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "45W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI"},
    ],
    "realme-15t": [
        {"label": "Display", "value": '6.67" FHD+ AMOLED, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 6 Gen 4"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "45W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI"},
    ],
    "realme-15x": [
        {"label": "Display", "value": '6.72" FHD+ LCD, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 7300"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "45W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI"},
    ],
    "realme-15": [
        {"label": "Display", "value": '6.8" AMOLED, 144Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 7300+"},
        {"label": "Camera", "value": "50MP Sony OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "7000mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI"},
    ],
    "realme-c83": [
        {"label": "Display", "value": '6.74" HD+ LCD, 90Hz'},
        {"label": "Processor", "value": "Unisoc T7250"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "18W Fast Charging"},
        {"label": "OS", "value": "Realme UI"},
    ],
    "realme-c71": [
        {"label": "Display", "value": '6.67" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Unisoc T7250"},
        {"label": "Camera", "value": "32MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6300mAh"},
        {"label": "Charging", "value": "15W"},
        {"label": "OS", "value": "Realme UI"},
    ],
    "realme-p4x": [
        {"label": "Display", "value": '6.72" FHD+ LCD, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 7300"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "45W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI"},
    ],
    "realme-p4": [
        {"label": "Display", "value": '6.67" AMOLED, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 7s Gen 3"},
        {"label": "Camera", "value": "50MP Sony OIS + 2MP"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI"},
    ],
    "realme-p4-lite": [
        {"label": "Display", "value": '6.67" FHD+ LCD, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 6300"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "45W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI"},
    ],
    "realme-p4-power": [
        {"label": "Display", "value": '6.72" FHD+ LCD, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 6 Gen 4"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "7000mAh"},
        {"label": "Charging", "value": "45W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI"},
    ],
    "realme-p3x": [
        {"label": "Display", "value": '6.72" FHD+ LCD, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 6400"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "45W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI"},
    ],
    "realme-pad-2-lite": [
        {"label": "Display", "value": '10.95" 2K LCD, 90Hz'},
        {"label": "Processor", "value": "MediaTek Helio G99"},
        {"label": "Camera", "value": "8MP Rear + 5MP Front"},
        {"label": "Audio", "value": "Quad Speakers"},
        {"label": "Battery", "value": "8300mAh"},
        {"label": "Charging", "value": "33W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI"},
    ],

    # ----- NARZO -----
    "realme-narzo-100-lite": [
        {"label": "Display", "value": '6.72" FHD+ LCD, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 6300"},
        {"label": "Camera", "value": "50MP AI Dual Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "45W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI 6 (Android 15)"},
    ],
    "realme-narzo-80-lite": [
        {"label": "Display", "value": '6.67" HD+ LCD, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 6300 5G"},
        {"label": "Camera", "value": "32MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "15W Fast Charging"},
        {"label": "OS", "value": "Realme UI 6 (Android 15)"},
    ],
    "realme-narzo-90x": [
        {"label": "Display", "value": '6.72" FHD+ LCD, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 7400"},
        {"label": "Camera", "value": "50MP AI Dual Camera"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "45W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI"},
    ],
    "realme-narzo-90": [
        {"label": "Display", "value": '6.67" AMOLED, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 7300+"},
        {"label": "Camera", "value": "50MP Sony OIS + 2MP Camera"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "67W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI"},
    ],
    "realme-narzo-n53": [
        {"label": "Display", "value": '6.74" HD+, 90Hz'},
        {"label": "Processor", "value": "Unisoc T612"},
        {"label": "Camera", "value": "50MP AI Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "Charging", "value": "33W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI T Edition"},
    ],
    "realme-narzo-power": [
        {"label": "Display", "value": '6.8" AMOLED, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 7300+"},
        {"label": "Camera", "value": "50MP Sony OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "7000mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "Realme UI"},
    ],

    # ----- ONE PLUS -----
    "oneplus-13": [
        {"label": "Display", "value": '6.82" QHD+ LTPO AMOLED, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 8 Elite"},
        {"label": "Camera", "value": "50MP Sony LYT-808 OIS + 50MP Periscope (3x) + 50MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "32MP"},
        {"label": "Battery", "value": "6000mAh"},
        {"label": "Charging", "value": "100W SUPERVOOC + 50W AIRVOOC Wireless"},
        {"label": "OS", "value": "OxygenOS 15 (Android 15)"},
    ],
    "oneplus-nord-6": [
        {"label": "Display", "value": '6.83" 1.5K AMOLED, 144Hz'},
        {"label": "Processor", "value": "Snapdragon 8s Gen 3"},
        {"label": "Camera", "value": "50MP Sony LYT-700 OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "50MP"},
        {"label": "Battery", "value": "6800mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "OxygenOS 15 (Android 15)"},
    ],
    "oneplus-nord-5": [
        {"label": "Display", "value": '6.83" 1.5K AMOLED, 144Hz'},
        {"label": "Processor", "value": "Snapdragon 8s Gen 3"},
        {"label": "Camera", "value": "50MP Sony LYT-700 OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "50MP"},
        {"label": "Battery", "value": "6800mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "OxygenOS 15 (Android 15)"},
    ],
    "oneplus-nord-ce6": [
        {"label": "Display", "value": '6.77" FHD+ AMOLED, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 8350"},
        {"label": "Camera", "value": "50MP Sony LYT-600 OIS + 8MP Ultra-wide"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "7100mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "OxygenOS 15 (Android 15)"},
    ],
    "oneplus-nord-ce6-lite": [
        {"label": "Display", "value": '6.67" FHD+ AMOLED, 120Hz'},
        {"label": "Processor", "value": "Snapdragon 6 Gen 4"},
        {"label": "Camera", "value": "50MP Sony LYT-600 Camera"},
        {"label": "Selfie Camera", "value": "16MP"},
        {"label": "Battery", "value": "7100mAh"},
        {"label": "Charging", "value": "80W SUPERVOOC"},
        {"label": "OS", "value": "OxygenOS 15 (Android 15)"},
    ],
    "oneplus-pad-go-2": [
        {"label": "Display", "value": '11.6" 2.8K LCD, 144Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 8350"},
        {"label": "Audio", "value": "Quad Speakers with Dolby Atmos"},
        {"label": "Camera", "value": "8MP Rear + 8MP Front"},
        {"label": "Battery", "value": "9510mAh"},
        {"label": "Charging", "value": "67W SUPERVOOC"},
        {"label": "OS", "value": "OxygenOS Pad"},
    ],
    "oneplus-z3": [
        {"label": "Driver", "value": "12.4mm Dynamic"},
        {"label": "Noise Cancellation", "value": "Active (up to 49dB)"},
        {"label": "Bluetooth", "value": "5.4"},
        {"label": "Water Resistance", "value": "IP55"},
        {"label": "Battery Life", "value": "Up to 38 Hours (with Case)"},
        {"label": "Connectivity", "value": "Dual Device Connection"},
    ],
    "oneplus-z2-anc": [
        {"label": "Driver", "value": "11mm Dynamic"},
        {"label": "Noise Cancellation", "value": "Active (up to 40dB)"},
        {"label": "Bluetooth", "value": "5.2"},
        {"label": "Audio", "value": "Dolby Atmos Support"},
        {"label": "Water Resistance", "value": "IP55"},
        {"label": "Battery Life", "value": "Up to 38 Hours (with Case)"},
    ],

    # ----- APPLE -----
    "iphone-17": [
        {"label": "Display", "value": '6.3" Super Retina XDR OLED'},
        {"label": "Processor", "value": "Apple A19"},
        {"label": "Camera", "value": "48MP Fusion + 12MP Ultra-Wide"},
        {"label": "Selfie Camera", "value": "24MP"},
        {"label": "Security", "value": "Face ID, MagSafe"},
        {"label": "Connectivity", "value": "USB-C"},
        {"label": "OS", "value": "iOS 26, Apple Intelligence"},
    ],
    "iphone-17-pro": [
        {"label": "Display", "value": '6.3" Super Retina XDR ProMotion OLED (120Hz)'},
        {"label": "Processor", "value": "Apple A19 Pro"},
        {"label": "Camera", "value": "48MP Fusion + 48MP Ultra-Wide + 48MP Telephoto"},
        {"label": "Selfie Camera", "value": "24MP"},
        {"label": "Security", "value": "LiDAR Scanner, Face ID, MagSafe"},
        {"label": "Connectivity", "value": "USB-C, Titanium Design"},
        {"label": "OS", "value": "iOS 26, Apple Intelligence"},
    ],
    "iphone-17-pro-max": [
        {"label": "Display", "value": '6.9" Super Retina XDR ProMotion OLED (120Hz)'},
        {"label": "Processor", "value": "Apple A19 Pro"},
        {"label": "Camera", "value": "48MP Fusion + 48MP Ultra-Wide + 48MP Telephoto"},
        {"label": "Selfie Camera", "value": "24MP"},
        {"label": "Security", "value": "LiDAR Scanner, Face ID, MagSafe"},
        {"label": "Connectivity", "value": "USB-C, Titanium Design"},
        {"label": "Battery", "value": "Largest Battery in an iPhone"},
        {"label": "OS", "value": "iOS 26, Apple Intelligence"},
    ],
    "iphone-17-air": [
        {"label": "Display", "value": '6.6" Super Retina XDR OLED'},
        {"label": "Processor", "value": "Apple A19"},
        {"label": "Camera", "value": "48MP Fusion Camera"},
        {"label": "Selfie Camera", "value": "24MP"},
        {"label": "Design", "value": "Ultra-Thin Titanium"},
        {"label": "Connectivity", "value": "MagSafe, USB-C"},
        {"label": "OS", "value": "iOS 26, Apple Intelligence"},
    ],
    "airpods-4": [
        {"label": "Chip", "value": "Apple H2"},
        {"label": "Audio", "value": "Personalized Spatial Audio with Dynamic Head Tracking"},
        {"label": "Connectivity", "value": "Bluetooth 5.3"},
        {"label": "Water Resistance", "value": "IP54"},
        {"label": "Battery Life", "value": "Up to 30 Hours (with Charging Case)"},
        {"label": "Charging", "value": "USB-C Charging Case"},
        {"label": "Features", "value": "Find My Support"},
    ],

    # ----- AI+ -----
    "ai-plus-phone": [
        {"label": "Display", "value": '6.74" HD+ IPS LCD, 90Hz'},
        {"label": "Processor", "value": "Unisoc T615"},
        {"label": "Camera", "value": "50MP AI Rear Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "Charging", "value": "18W Fast Charging"},
        {"label": "OS", "value": "Android 15"},
    ],
    "ai-plus-nova-2-5g": [
        {"label": "Display", "value": '6.67" HD+ IPS LCD, 120Hz'},
        {"label": "Processor", "value": "Unisoc T8200 5G"},
        {"label": "Camera", "value": "50MP AI Rear Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "Charging", "value": "18W Fast Charging"},
        {"label": "OS", "value": "Android 15"},
    ],
    "ai-plus-tab": [
        {"label": "Display", "value": '10.95" 2K IPS LCD'},
        {"label": "Processor", "value": "Unisoc T616"},
        {"label": "Camera", "value": "8MP Rear + 5MP Front"},
        {"label": "Audio", "value": "Quad Speakers"},
        {"label": "Battery", "value": "8000mAh"},
        {"label": "Charging", "value": "18W Fast Charging"},
        {"label": "OS", "value": "Android 15"},
    ],
    "ai-plus-plus2-5g": [
        {"label": "Display", "value": '6.67" FHD+ IPS LCD, 120Hz'},
        {"label": "Processor", "value": "MediaTek Dimensity 6300 5G"},
        {"label": "Camera", "value": "50MP AI Rear Camera"},
        {"label": "Selfie Camera", "value": "8MP"},
        {"label": "Battery", "value": "5000mAh"},
        {"label": "Charging", "value": "33W Fast Charging"},
        {"label": "OS", "value": "Android 15"},
    ],
}


def query_sanity(groq_query):
    url = "%s/data/query/%s?query=%s" % (BASE_URL, DATASET, requests.utils.quote(groq_query))
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        return res.json().get("result", []) or []
    print("  ERROR fetching: HTTP %d: %s" % (res.status_code, res.text[:200]))
    return []


def patch_specs(product_id, product_name, specs, slug):
    if not specs:
        print("  SKIP %s (%s) - no specs defined" % (product_name, slug))
        return True

    if DRY_RUN:
        print("  [DRY-RUN] WOULD UPDATE: %s (%s) - %d specs" % (product_name, slug, len(specs)))
        return True

    mutations = {"mutations": [{"patch": {"id": product_id, "set": {"specifications": specs}}}]}
    url = "%s/data/mutate/%s" % (BASE_URL, DATASET)
    res = requests.post(url, headers=HEADERS, json=mutations)
    if res.status_code in (200, 201):
        print("  [OK] Updated: %s (%s)" % (product_name, slug))
        return True
    else:
        print("  [FAIL] %s (%s) - HTTP %d: %s" % (product_name, slug, res.status_code, res.text[:150]))
        return False


def main():
    import time
    print("Fetching all products from Sanity (%s/%s)..." % (PROJECT_ID, DATASET))
    if DRY_RUN:
        print("  DRY-RUN MODE: no mutations will be made")
    print()

    products = query_sanity('*[_type == "product"]{_id, name, "slug": slug.current}')

    if not products:
        print("No products found in Sanity!")
        sys.exit(1)

    print("Found %d products in Sanity\n" % len(products))

    # Build slug -> product lookup
    slug_map = {}
    for p in products:
        slug = p.get("slug", "")
        if slug:
            slug_map[slug] = p

    matched = 0
    skipped = []
    failures = []

    for slug, specs in sorted(NEW_SPECS.items()):
        product = slug_map.get(slug)
        if not product:
            skipped.append(slug)
            continue

        matched += 1
        ok = patch_specs(product["_id"], product.get("name", ""), specs, slug)
        if not ok:
            failures.append(slug)
        time.sleep(0.25)

    print("\n%s" % ("=" * 60))
    print("RESULTS")
    print("  Updated: %d" % matched)
    print("  Skipped (no match): %d" % len(skipped))
    print("  Failed: %d" % len(failures))

    if skipped:
        print("\n  Skipped slugs:")
        for s in skipped:
            print("    - %s" % s)

    if failures:
        print("\n  Failed slugs:")
        for s in failures:
            print("    - %s" % s)

    if DRY_RUN:
        print("\n[DRY-RUN] No mutations were made. Run without --dry-run to apply.")
    print()


if __name__ == "__main__":
    main()

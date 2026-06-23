#!/bin/bash
set -e

SRC1="C:/Users/ramak/Downloads/sri venkateshwara mobile shop-20260620T083741Z-3-001/sri venkateshwara mobile shop"
SRC2="C:/Users/ramak/Downloads/List 2-20260620T083708Z-3-001/List 2"
DST="C:/Projects_resume/sri venakata sai enterprises/website/public/images/products"

copy_all() {
  local dir="$1"
  local dst_dir="$2"
  mkdir -p "$dst_dir"
  local count=1
  for f in $(find "$dir" -maxdepth 1 -type f 2>/dev/null | sort); do
    local ext="${f##*.}"
    cp "$f" "$dst_dir/${count}.${ext,,}"
    count=$((count + 1))
  done
  echo "  $dst_dir: $(find "$dst_dir" -type f | wc -l) files"
}

mkdir -p "$DST"
echo "=== Copying product photos ==="

# AirPod
mkdir -p "$DST/airpods-4"
copy_all "$SRC1/AirPod/AirPods4" "$DST/airpods-4"

# Google
mkdir -p "$DST/pixel-10a"
cp "$SRC1/GOOGLE/pixel 10a.jpg" "$DST/pixel-10a/1.jpg" 2>/dev/null
echo "  $DST/pixel-10a"
mkdir -p "$DST/pixel-10"
cp "$SRC1/GOOGLE/pixel 10.jpg" "$DST/pixel-10/1.jpg" 2>/dev/null
echo "  $DST/pixel-10"

# CMF
copy_all "$SRC1/CMF by Nothing/3a lite" "$DST/cmf-3a-lite"
copy_all "$SRC1/CMF by Nothing/4a" "$DST/cmf-4a"

# iQOO
copy_all "$SRC1/IQOO/Neo 10" "$DST/iqoo-neo-10"
copy_all "$SRC1/IQOO/15" "$DST/iqoo-15"
copy_all "$SRC1/IQOO/15R" "$DST/iqoo-15r"
copy_all "$SRC1/IQOO/Z10 Lite" "$DST/iqoo-z10-lite"
copy_all "$SRC1/IQOO/Z10R" "$DST/iqoo-z10r"
copy_all "$SRC1/IQOO/Z11X" "$DST/iqoo-z11x"

# Samsung
copy_all "$SRC1/SAMSUNG/S25 Ultra" "$DST/samsung-s25-ultra"
copy_all "$SRC1/SAMSUNG/S25 FE" "$DST/samsung-s25-fe"
copy_all "$SRC1/SAMSUNG/S26 Plus" "$DST/samsung-s26-plus"
copy_all "$SRC1/SAMSUNG/M06" "$DST/samsung-m06"
copy_all "$SRC1/SAMSUNG/M36" "$DST/samsung-m36"
copy_all "$SRC1/SAMSUNG/M56" "$DST/samsung-m56"
copy_all "$SRC1/SAMSUNG/F06" "$DST/samsung-f06"
copy_all "$SRC1/SAMSUNG/F07" "$DST/samsung-f07"
copy_all "$SRC1/SAMSUNG/F36" "$DST/samsung-f36"
copy_all "$SRC1/SAMSUNG/F70e" "$DST/samsung-f70e"
copy_all "$SRC1/SAMSUNG/A06" "$DST/samsung-a06"
copy_all "$SRC1/SAMSUNG/Tab S10 Lite" "$DST/samsung-tab-s10-lite"

# MOTO
copy_all "$SRC1/MOTO/G06 power" "$DST/moto-g06-power"
copy_all "$SRC1/MOTO/g37" "$DST/moto-g37"
copy_all "$SRC1/MOTO/G37 power" "$DST/moto-g37-power"
copy_all "$SRC1/MOTO/G57 power" "$DST/moto-g57-power"
copy_all "$SRC1/MOTO/G67 power" "$DST/moto-g67-power"
copy_all "$SRC1/MOTO/G96" "$DST/moto-g96"
copy_all "$SRC1/MOTO/60 Fusion" "$DST/moto-60-fusion"
copy_all "$SRC1/MOTO/7o fusion" "$DST/moto-70-fusion"
copy_all "$SRC1/MOTO/Edge 60" "$DST/moto-edge-60"

# OnePlus
copy_all "$SRC1/ONE PLUS/oneplus 13" "$DST/oneplus-13"
copy_all "$SRC1/ONE PLUS/Nord 5" "$DST/oneplus-nord-5"
copy_all "$SRC1/ONE PLUS/Nord 6" "$DST/oneplus-nord-6"
copy_all "$SRC1/ONE PLUS/Nord CE6" "$DST/oneplus-nord-ce6"
copy_all "$SRC1/ONE PLUS/Nord ce6 lite" "$DST/oneplus-nord-ce6-lite"
copy_all "$SRC1/ONE PLUS/Tab  pad Go 2" "$DST/oneplus-pad-go-2"
copy_all "$SRC1/ONE PLUS/Buds/Oneplus Z2 ANC" "$DST/oneplus-z2-anc"
copy_all "$SRC1/ONE PLUS/Buds/Oneplus Z3" "$DST/oneplus-z3"

# OPPO
copy_all "$SRC1/OPPO/K13" "$DST/oppo-k13"
copy_all "$SRC1/OPPO/K14" "$DST/oppo-k14"
copy_all "$SRC1/OPPO/K14X" "$DST/oppo-k14x"
copy_all "$SRC1/OPPO/Reno 15" "$DST/oppo-reno-15"
copy_all "$SRC1/OPPO/Reno 15 pro mini" "$DST/oppo-reno-15-pro-mini"
copy_all "$SRC1/OPPO/Reno 15c" "$DST/oppo-reno-15c"
copy_all "$SRC1/OPPO/F31 pro plus" "$DST/oppo-f31-pro-plus"
copy_all "$SRC1/OPPO/F33" "$DST/oppo-f33"
copy_all "$SRC1/OPPO/F33 pro" "$DST/oppo-f33-pro"
copy_all "$SRC1/OPPO/A6X" "$DST/oppo-a6x"

# VIVO
copy_all "$SRC1/VIVO/V70" "$DST/vivo-v70"
copy_all "$SRC1/VIVO/V70 Elite" "$DST/vivo-v70-elite"
copy_all "$SRC1/VIVO/V70 Fe" "$DST/vivo-v70-fe"
copy_all "$SRC1/VIVO/T4 lite" "$DST/vivo-t4-lite"
copy_all "$SRC1/VIVO/T4X" "$DST/vivo-t4x"
copy_all "$SRC1/VIVO/T4R" "$DST/vivo-t4r"
copy_all "$SRC1/VIVO/T4" "$DST/vivo-t4"
copy_all "$SRC1/VIVO/T4 pro" "$DST/vivo-t4-pro"
copy_all "$SRC1/VIVO/T4 Ultra" "$DST/vivo-t4-ultra"
copy_all "$SRC1/VIVO/T5X" "$DST/vivo-t5x"
copy_all "$SRC1/VIVO/T5 pro" "$DST/vivo-t5-pro"
copy_all "$SRC1/VIVO/Y05" "$DST/vivo-y05"
copy_all "$SRC1/VIVO/Y11" "$DST/vivo-y11"
copy_all "$SRC1/VIVO/Y31" "$DST/vivo-y31"
copy_all "$SRC1/VIVO/Y51 pro" "$DST/vivo-y51-pro"

# Realme
copy_all "$SRC1/REALME/16T" "$DST/realme-16t"
copy_all "$SRC1/REALME/16" "$DST/realme-16"
copy_all "$SRC1/REALME/16 Pro" "$DST/realme-16-pro"
copy_all "$SRC1/REALME/16 pro plus" "$DST/realme-16-pro-plus"
copy_all "$SRC1/REALME/15T" "$DST/realme-15t"
copy_all "$SRC1/REALME/15" "$DST/realme-15"
copy_all "$SRC1/REALME/15X" "$DST/realme-15x"
copy_all "$SRC1/REALME/C71" "$DST/realme-c71"
copy_all "$SRC1/REALME/C83" "$DST/realme-c83"
copy_all "$SRC1/REALME/P3X" "$DST/realme-p3x"
copy_all "$SRC1/REALME/P4" "$DST/realme-p4"
copy_all "$SRC1/REALME/P4 Lite" "$DST/realme-p4-lite"
copy_all "$SRC1/REALME/P4X" "$DST/realme-p4x"
copy_all "$SRC1/REALME/P4 power" "$DST/realme-p4-power"
copy_all "$SRC1/REALME/Pad 2 Elite" "$DST/realme-pad-2-lite"

# Infinix
copy_all "$SRC1/INFINIX/Smart 10" "$DST/infinix-smart-10"
copy_all "$SRC1/INFINIX/Smart 20" "$DST/infinix-smart-20"
copy_all "$SRC1/INFINIX/Note Edge" "$DST/infinix-note-edge"
copy_all "$SRC1/INFINIX/GT 30" "$DST/infinix-gt-30"
copy_all "$SRC1/INFINIX/GT 30 pro" "$DST/infinix-gt-30-pro"
copy_all "$SRC1/INFINIX/Gaming kit" "$DST/infinix-gaming-kit"

# Folder 2 brands

# AI+
copy_all "$SRC2/AI+/Ai +" "$DST/ai-plus"
copy_all "$SRC2/AI+/Nova 2" "$DST/ai-nova-2"
copy_all "$SRC2/AI+/Tab" "$DST/ai-tab"

# Coolpad
copy_all "$SRC2/Coolpad/Cool 30i" "$DST/coolpad-30i"

# HMD
copy_all "$SRC2/HMD/Vibe 2" "$DST/hmd-vibe-2"

# Itel
copy_all "$SRC2/Itel/A1000C" "$DST/itel-a100c"

# Jio
copy_all "$SRC2/Jio/V4" "$DST/jio-v4"
copy_all "$SRC2/Jio/V3" "$DST/jio-v3"
copy_all "$SRC2/Jio/K1" "$DST/jio-k1"
copy_all "$SRC2/Jio/J1" "$DST/jio-j1"
copy_all "$SRC2/Jio/Prime 2" "$DST/jio-prime-2"

# Lava
copy_all "$SRC2/Lava/bold N2" "$DST/lava-bold-n2"

# Narzo
copy_all "$SRC2/Narzo/N53" "$DST/narzo-n53"
copy_all "$SRC2/Narzo/80 Elite" "$DST/narzo-80-lite"
copy_all "$SRC2/Narzo/100 Elite" "$DST/narzo-100-lite"
copy_all "$SRC2/Narzo/90" "$DST/narzo-90"
copy_all "$SRC2/Narzo/90X" "$DST/narzo-90x"
copy_all "$SRC2/Narzo/power" "$DST/narzo-power"

# Peace
copy_all "$SRC2/Peace/17 pro" "$DST/peace-17-pro"
copy_all "$SRC2/Peace/17 pro max" "$DST/peace-17-maxx"

# Poco
copy_all "$SRC2/Poco/C71" "$DST/poco-c71"
copy_all "$SRC2/Poco/C85" "$DST/poco-c85"
copy_all "$SRC2/Poco/C85X" "$DST/poco-c85x"
copy_all "$SRC2/Poco/M7" "$DST/poco-m7"
copy_all "$SRC2/Poco/M7 plus" "$DST/poco-m7-plus"

# Redmi
copy_all "$SRC2/Redmi/A5" "$DST/redmi-a5"
copy_all "$SRC2/Redmi/A4" "$DST/redmi-a4"
copy_all "$SRC2/Redmi/A7 pro" "$DST/redmi-a7-pro"
copy_all "$SRC2/Redmi/15C" "$DST/redmi-15c"
copy_all "$SRC2/Redmi/15A" "$DST/redmi-15a"

# Snexian
copy_all "$SRC2/Snexian/Bold T150" "$DST/snexian-t150"
copy_all "$SRC2/Snexian/Bold T170" "$DST/snexian-t170"
copy_all "$SRC2/Snexian/Bold T240" "$DST/snexian-t240"
copy_all "$SRC2/Snexian/Bold t660" "$DST/snexian-t660"
copy_all "$SRC2/Snexian/Bold t670" "$DST/snexian-t670"
copy_all "$SRC2/Snexian/T450 ultra" "$DST/snexian-t450"

echo "=== DONE ==="

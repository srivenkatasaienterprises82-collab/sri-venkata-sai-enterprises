import sys
with open('automation/launch_checker.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i in range(37, 116):
        prefix = lines[i][:8].encode('utf-8').hex()
        print(f"{i+1:3d} +{prefix}+ {repr(lines[i][:120])}")

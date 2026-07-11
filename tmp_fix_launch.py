path = 'automation/launch_checker.py'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = 51
end = 108
for i in range(start, end):
    line = lines[i]
    if line.strip():
        lines[i] = '    ' + line

# also replace arrows/checkmark on lines 104-108 and summary 108
for i in range(103, 109):
    lines[i] = lines[i].replace('↑', 'UP').replace('↓', 'DOWN').replace('₹', 'Rs.').replace('→', '->').replace('✓', '').replace('←', '<-')
lines[107] = 'print(f"Checked {checked} phones. Updated {updated_count}. Matched {matched}. No URL: {skipped_no_url}. Scrape failed: {skipped_no_price}.")\n'

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('fixed')

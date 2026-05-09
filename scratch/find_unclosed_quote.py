
import re

with open('python/api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

count = 0
for i, line in enumerate(lines):
    quotes = line.count('"""')
    if quotes > 0:
        count += quotes
        print(f"Line {i+1}: found {quotes} (Total so far: {count})")
        if count % 2 != 0:
            print(f"  ^^^ ODD count at line {i+1}")

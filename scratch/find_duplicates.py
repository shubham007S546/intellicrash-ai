
with open('python/api.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if '@app.post("/api/predict"' in line:
            print(f"Line {i+1}: {line.strip()}")
        if '@app.post("/api/sos"' in line:
            print(f"Line {i+1}: {line.strip()}")
        if 'def predict(' in line:
            print(f"Line {i+1}: {line.strip()}")

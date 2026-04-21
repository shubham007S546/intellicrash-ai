# IntelliCrash Debug TODO
=======================

## Status: 🚀 Backend ML CRITICAL (Phase 1)

### ✅ Phase 1: Backend ML Fix (IN PROGRESS)
- [x] Create TODO.md ✅
- [ ] **Test model_loader.py directly**
  ```bash
  cd python
  python model_loader.py
  ```
- [ ] **Fix model loading errors** (permissions/path/pickle version)
- [ ] **Start FastAPI server**
  ```bash
  cd python
  ../myenv/Scripts/activate
  uvicorn api:app --host 0.0.0.0 --port 8000 --reload
  ```
- [ ] **Verify /api/health** → `{"rf_model": true}`
  ```bash
  curl http://127.0.0.1:8000/api/health
  ```
- [ ] **Test prediction endpoint**
  ```bash
  curl -X POST http://127.0.0.1:8000/api/predict \\
    -H "Content-Type: application/json" \\
    -d '{"weather":"0","roadType":"1","timeOfDay":"1","speed":60}'
  ```

### ⏳ Phase 2: Frontend Navigation (10+ variants → 1 clean file)
- [ ] Consolidate Navigation.jsx variants
- [ ] Clean up experimental CSS/JSX files
- [ ] Test routing + API integration

### ⏳ Phase 3: Full Stack Test
- [ ] Run `start.bat` (all services)
- [ ] Browser test: Navigation → Map → Risk → SOS
- [ ] Mobile responsive + GPS mock

### 🔍 Quick Diagnostics Needed
```
1. Backend server running? → curl http://127.0.0.1:8000/api/health
2. ML models loading?     → Check logs for "✅ RF loaded"
3. Frontend dev server?   → npm run dev in frontend/
```

### ✅ Phase 1 Progress
- [x] TODO.md created
- [ ] Model loader test `(cd python && python model_loader.py)`
- [ ] Backend startup `python -m uvicorn python.api:app --host 0.0.0.0 --port 8000`
- [ ] Health check `curl http://127.0.0.1:8000/api/health`

**Run Backend Now** 👇
```
python -m uvicorn python.api:app --host 0.0.0.0 --port 8000 --reload
```

Then test: `curl http://127.0.0.1:8000/api/health`**



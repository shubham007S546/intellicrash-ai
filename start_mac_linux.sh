#!/bin/bash
set -e
echo ""
echo " ============================================"
echo "   IntelliCrash - AI Safe Navigation v2.0"
echo " ============================================"
echo ""

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${CYAN}[1/2] Starting FastAPI Backend (port 8000)...${NC}"
cd "$SCRIPT_DIR/python"
python3 -m pip install -r requirements.txt -q
python3 api.py &
BACKEND=$!
echo "Backend PID: $BACKEND"
sleep 4

echo -e "${CYAN}[2/2] Starting React Frontend (port 5173)...${NC}"
cd "$SCRIPT_DIR/frontend"
npm install
npm run dev &
FRONTEND=$!
echo "Frontend PID: $FRONTEND"

echo ""
echo -e "${GREEN} ============================================${NC}"
echo -e "${GREEN}  App  : http://localhost:5173${NC}"
echo -e "${GREEN}  API  : http://localhost:8000${NC}"
echo -e "${GREEN}  Docs : http://localhost:8000/docs${NC}"
echo -e "${GREEN} ============================================${NC}"
echo ""
echo " Press Ctrl+C to stop all services"

trap "echo 'Stopping...'; kill $BACKEND $FRONTEND 2>/dev/null; exit 0" INT TERM
wait

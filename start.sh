#!/bin/bash
echo ""
echo " ===================================="
echo "  IntelliCrash — Starting All Services"
echo " ===================================="
echo ""

# Start backend
echo "[1/2] Starting FastAPI Backend (port 8000)..."
cd python && python api.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend
sleep 3

# Start frontend
echo "[2/2] Starting React Frontend (port 5173)..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo " ===================================="
echo "  App:  http://localhost:5173"
echo "  API:  http://localhost:8000"
echo " ===================================="
echo ""
echo "Press Ctrl+C to stop all services"

# Wait and cleanup
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait

#!/usr/bin/env bash
# MediKiosk Unified Development Runner (Bash)
# Boots FastAPI on port 5000 and Vite React on port 3000

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}/backend"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"

echo -e "\033[1;36m==================================================\033[0m"
echo -e "\033[1;32m   MediKiosk Full-Stack Development Workspace\033[0m"
echo -e "\033[1;33m   Backend:  http://localhost:5000 (FastAPI)\033[0m"
echo -e "\033[1;33m   Frontend: http://localhost:3000 (Vite React)\033[0m"
echo -e "\033[1;36m==================================================\033[0m"

cleanup() {
    echo -e "\n\033[1;33mStopping MediKiosk processes...\033[0m"
    if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
        kill -SIGTERM "${BACKEND_PID}" 2>/dev/null || true
        echo "✓ Backend stopped."
    fi
    if [ -n "${FRONTEND_PID}" ] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
        kill -SIGTERM "${FRONTEND_PID}" 2>/dev/null || true
        echo "✓ Frontend stopped."
    fi
    echo -e "\033[1;32mAll MediKiosk dev servers terminated cleanly.\033[0m"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo -e "\033[1;36m[1/2] Launching FastAPI Backend on port 5000...\033[0m"
(cd "${BACKEND_DIR}" && python -m uvicorn main:app --host 0.0.0.0 --port 5000 --reload) &
BACKEND_PID=$!

echo -e "\033[1;35m[2/2] Launching Vite Frontend on port 3000...\033[0m"
(cd "${FRONTEND_DIR}" && npm run dev) &
FRONTEND_PID=$!

echo -e "\n\033[1;32mBoth servers are live! Press Ctrl+C in this console to terminate both services.\033[0m\n"

wait "${BACKEND_PID}" "${FRONTEND_PID}"

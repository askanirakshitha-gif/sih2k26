# MediKiosk Unified Development Runner (PowerShell)
# Boots FastAPI on port 5000 and Vite React on port 3000

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   MediKiosk Full-Stack Development Workspace" -ForegroundColor Green
Write-Host "   Backend:  http://localhost:5000 (FastAPI)" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:3000 (Vite React)" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Cyan

$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend"

Write-Host "[1/2] Launching FastAPI Backend on port 5000..." -ForegroundColor Cyan
$BackendProc = Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000", "--reload" -WorkingDirectory $BackendDir -PassThru

Write-Host "[2/2] Launching Vite Frontend on port 3000..." -ForegroundColor Magenta
$FrontendProc = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $FrontendDir -PassThru

Write-Host ""
Write-Host "Both servers are live! Press Ctrl+C in this console to terminate both services." -ForegroundColor Green
Write-Host ""

try {
    while ($true) {
        if ($BackendProc.HasExited) {
            Write-Host "[ALERT] Backend process exited unexpectedly." -ForegroundColor Red
            break
        }
        if ($FrontendProc.HasExited) {
            Write-Host "[ALERT] Frontend process exited unexpectedly." -ForegroundColor Red
            break
        }
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host "`nStopping MediKiosk processes..." -ForegroundColor Yellow
    if ($BackendProc -and !$BackendProc.HasExited) {
        Stop-Process -Id $BackendProc.Id -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Backend stopped." -ForegroundColor DarkGray
    }
    if ($FrontendProc -and !$FrontendProc.HasExited) {
        # Kill process tree on Windows for npm child node processes
        taskkill /PID $FrontendProc.Id /T /F 2>$null | Out-Null
        Write-Host "✓ Frontend stopped." -ForegroundColor DarkGray
    }
    Write-Host "All MediKiosk dev servers terminated cleanly." -ForegroundColor Green
}

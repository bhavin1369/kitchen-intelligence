<#
.SYNOPSIS
  Start Kitchen Intelligence Flask Backend
#>
Write-Host "Starting AI Kitchen Intelligence Flask API on http://localhost:5000..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\server"
.\venv\Scripts\python.exe run.py


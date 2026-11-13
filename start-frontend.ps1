<#
.SYNOPSIS
  Start Kitchen Intelligence React Vite Frontend
#>
Write-Host "Starting AI Kitchen Intelligence Frontend on http://localhost:5173..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\client"
npm run dev


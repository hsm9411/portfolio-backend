# Backend Cleanup Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Portfolio Backend - File Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$files = @(
    "AI_MEMORY.md",
    "PROGRESS.md",
    "CHECKLIST.md",
    "CLAUDE.md",
    "DEPLOY_GUIDE.md",
    "QUICKSTART.md",
    "START_HERE.md",
    "URGENT_FIX.md",
    "FINAL_FIX.md",
    "FILE_CLEANUP_GUIDE.md",
    "PORT_443_MIGRATION.md",
    "SUPABASE_JWT_SETUP.md",
    "DEPLOYMENT.md",
    "cleanup.bat"
)

Write-Host "Deleting files..." -ForegroundColor Yellow
foreach ($file in $files) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  ✓ Deleted: $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Not found: $file" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Deleting docs directory..." -ForegroundColor Yellow
if (Test-Path "docs") {
    Remove-Item "docs" -Recurse -Force
    Write-Host "  ✓ Deleted: docs/" -ForegroundColor Green
} else {
    Write-Host "  ✗ Not found: docs/" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  git add ." -ForegroundColor White
Write-Host "  git commit -m `"chore: cleanup outdated documentation`"" -ForegroundColor White
Write-Host "  git push origin develop" -ForegroundColor White
Write-Host ""

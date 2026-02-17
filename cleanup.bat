@echo off
echo ========================================
echo Portfolio Backend - File Cleanup Script
echo ========================================
echo.

echo Deleting outdated documentation files...

del /F /Q AI_MEMORY.md 2>nul
del /F /Q PROGRESS.md 2>nul
del /F /Q CHECKLIST.md 2>nul
del /F /Q CLAUDE.md 2>nul
del /F /Q DEPLOY_GUIDE.md 2>nul
del /F /Q QUICKSTART.md 2>nul
del /F /Q START_HERE.md 2>nul
del /F /Q URGENT_FIX.md 2>nul
del /F /Q FINAL_FIX.md 2>nul
del /F /Q FILE_CLEANUP_GUIDE.md 2>nul
del /F /Q PORT_443_MIGRATION.md 2>nul
del /F /Q SUPABASE_JWT_SETUP.md 2>nul
del /F /Q DEPLOYMENT.md 2>nul

echo.
echo Deleting docs directory...
rmdir /S /Q docs 2>nul

echo.
echo ========================================
echo Cleanup completed!
echo ========================================
echo.
echo Remaining documents:
echo - README.md (main documentation)
echo - DATABASE_SETUP.md (required for deployment)
echo - DEPLOYMENT_CHECKLIST.md (deployment guide)
echo - .env.example (environment template)
echo.
pause

@echo off
echo ======================================================================
echo Starting Teacher Help Platform (Knowledge Tracing System)
echo ======================================================================
echo.
echo This will start the Flask backend on port 5001
echo The frontend will be served by the main Express server at:
echo http://localhost:5000/hprproj/index.html
echo.
echo ======================================================================
echo.

cd /d "%~dp0"
python backend.py

pause

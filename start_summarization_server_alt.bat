@echo off
echo Starting Alternative Text Summarization Server on port 5000...
echo.
echo This version uses newer Flask and Werkzeug versions.
echo.
echo Make sure you have installed the required dependencies:
echo pip install -r requirements_alt.txt
echo.
echo Note: This server will run on port 5000 to avoid conflicts with Node.js on port 3000
echo.
python summarization_server_alt.py
pause

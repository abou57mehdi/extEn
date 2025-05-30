@echo off
echo Installing dependencies for the Text Summarization Server...
echo.
echo Choose an installation option:
echo 1. Install original dependencies (Flask 2.0.1 with specific Werkzeug version)
echo 2. Install alternative dependencies (Flask 2.2.3 with newer Werkzeug)
echo.
set /p option="Enter option (1 or 2): "

if "%option%"=="1" (
    echo.
    echo Installing original dependencies...
    pip install -r requirements.txt
    echo.
    echo Dependencies installed. Use start_summarization_server.bat to start the server.
) else if "%option%"=="2" (
    echo.
    echo Installing alternative dependencies...
    pip install -r requirements_alt.txt
    echo.
    echo Dependencies installed. Use start_summarization_server_alt.bat to start the server.
) else (
    echo.
    echo Invalid option. Please run the script again and choose 1 or 2.
)

pause

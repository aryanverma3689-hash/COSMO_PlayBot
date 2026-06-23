@echo off
echo Starting NexGen AI Premium Chatbot...

:: Check if the virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Virtual environment not found! 
    echo Please run the following commands in your terminal first:
    echo python -m venv venv
    echo .\venv\Scripts\activate
    echo pip install -r requirements.txt
    pause
    exit /b
)

:: Activate and run
call .\venv\Scripts\activate.bat
uvicorn main:app --reload
pause

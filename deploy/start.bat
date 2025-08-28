@echo off
REM Startup script for Shadowverse application on Windows

REM Install dependencies
npm install

REM Start the server
node server.js

REM Keep the window open
pause
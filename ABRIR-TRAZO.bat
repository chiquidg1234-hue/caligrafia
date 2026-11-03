@echo off
cd /d "%~dp0outputs\trazo-android\web"
start "" http://127.0.0.1:8767/#docs
python -m http.server 8767 --bind 127.0.0.1 || py -m http.server 8767 --bind 127.0.0.1
pause

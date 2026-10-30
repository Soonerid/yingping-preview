@echo off
cd /d "%~dp0"
python -X utf8 -B start_preview.py --bind 0.0.0.0
if errorlevel 1 pause

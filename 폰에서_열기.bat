@echo off
chcp 65001 >nul
cd /d "%~dp0"
for /f "delims=" %%i in ('python -c "import socket;s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM);s.connect(('8.8.8.8',80));print(s.getsockname()[0]);s.close()"') do set IP=%%i
echo ============================================
echo    ETS 토익 단어장  -  폰에서 열기
echo ============================================
echo.
echo  1) 폰과 이 PC가 '같은 와이파이'인지 확인
echo  2) 폰 브라우저 주소창에 아래 주소 입력:
echo.
echo         http://%IP%:5522
echo.
echo  3) 공부 끝나면 이 검은 창을 닫으면 서버가 꺼집니다.
echo ============================================
echo.
python -m http.server 5522

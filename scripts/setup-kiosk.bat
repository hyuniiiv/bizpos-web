@echo off
:: ============================================================
:: BIZPOS 키오스크 단말기 초기 셋업 스크립트
:: 관리자 권한으로 실행 필요
:: ============================================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [오류] 관리자 권한으로 실행하세요.
    echo 이 파일을 마우스 우클릭 후 "관리자 권한으로 실행" 선택
    pause
    exit /b 1
)

echo ============================================================
echo  BIZPOS 키오스크 초기 셋업
echo ============================================================
echo.

:: 1. SmartScreen 비활성화 (미서명 앱 및 자동 업데이트 차단 방지)
echo [1/4] Windows Defender SmartScreen 비활성화...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\System" /v EnableSmartScreen /t REG_DWORD /d 0 /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer" /v SmartScreenEnabled /t REG_SZ /d "Off" /f >nul
echo       완료

:: 2. 자동 잠금 화면 비활성화 (키오스크 환경)
echo [2/4] 자동 잠금 화면 비활성화...
reg add "HKCU\Control Panel\Desktop" /v ScreenSaveActive /t REG_SZ /d "0" /f >nul
reg add "HKCU\Control Panel\Desktop" /v ScreenSaverIsSecure /t REG_SZ /d "0" /f >nul
powercfg /change standby-timeout-ac 0 >nul
powercfg /change monitor-timeout-ac 0 >nul
echo       완료

:: 3. Windows 업데이트 재시작 알림 억제 (BIZPOS 자체 업데이트 사용)
echo [3/4] Windows 업데이트 재시작 알림 억제...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v NoAutoRebootWithLoggedOnUsers /t REG_DWORD /d 1 /f >nul
echo       완료

:: 4. 시작프로그램 등록 (BIZPOS 설치 후 실행)
echo [4/4] 시작프로그램 등록 확인...
if exist "%ProgramFiles%\BIZPOS\BIZPOS.exe" (
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v BIZPOS /t REG_SZ /d "\"%ProgramFiles%\BIZPOS\BIZPOS.exe\"" /f >nul
    echo       BIZPOS 시작프로그램 등록 완료
) else (
    echo       [주의] BIZPOS가 아직 설치되지 않았습니다. 설치 후 다시 실행하거나 수동으로 등록하세요.
)

echo.
echo ============================================================
echo  셋업 완료! 재시작 후 BIZPOS를 설치하세요.
echo ============================================================
echo.
pause

@echo off
rem ============================================
rem  BGE - Lanceur local (double-clic)
rem  Demarre le serveur + le client et ouvre le navigateur.
rem ============================================
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo [ERREUR] Node.js introuvable. Installez Node.js 20+ puis relancez.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [BGE] Premiere utilisation : installation des dependances...
    call npm install
    if errorlevel 1 (
        echo [ERREUR] npm install a echoue.
        pause
        exit /b 1
    )
)

echo [BGE] Demarrage du serveur (port 2567)...
start "BGE Server" /min cmd /c "cd /d "%~dp0server" && npm run dev"

echo [BGE] Demarrage du client (port 5173)...
start "BGE Client" /min cmd /c "cd /d "%~dp0client" && npm run dev"

echo [BGE] Ouverture du navigateur dans 4 secondes...
timeout /t 4 /nobreak >nul
start "" http://localhost:5173

echo.
echo [BGE] Jeu lance ! Fermez les fenetres "BGE Server" et "BGE Client" pour arreter.
timeout /t 4 >nul
exit /b 0

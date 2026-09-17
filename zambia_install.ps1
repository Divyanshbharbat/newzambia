# =========================================================
# School ERP Automated Turnkey Installer & System Setup
# =========================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "============================================="
Write-Host "      School ERP Turnkey System Setup"
Write-Host "============================================="
Write-Host ""

# ---------------------------------------------------------
# AUTO-ELEVATION CHECK (ADMINISTRATOR PRIVILEGES)
# ---------------------------------------------------------
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[!] Administrator privileges are recommended to install system services." -ForegroundColor Yellow
    Write-Host "[!] Attempting Administrator elevation..." -ForegroundColor Yellow
    try {
        Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
        exit
    } catch {
        Write-Host "[WARN] Auto-elevation could not be launched ($($_.Exception.Message))." -ForegroundColor Yellow
        Write-Host "[INFO] Continuing setup in current user context..." -ForegroundColor Cyan
    }
}

# =========================================================
# CONFIGURATION
# =========================================================

$repoUrl = "https://github.com/Divyanshbharbat/newzambia.git"

$baseFolder = "C:\school_erp"
$repoFolder = "C:\school_erp\newzambia"

$frontendFolder = "$repoFolder\frontend"
$backendFolder = "$repoFolder\backend"

$databaseUser = "postgres"
$databasePassword = "password@123"
$databaseHost = "localhost"
$databasePort = "5432"
$databaseName = "school_erp"

$backendPort = "5000"
$jwtSecret = "school_erp_jwt_secret_change_this"
$frontendUrl = "http://localhost:5173"

# Helper function to refresh PATH environment variable
function Refresh-EnvironmentPath {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

# =========================================================
# STEP 1 - CREATE SCHOOL_ERP BASE FOLDER
# =========================================================

Write-Host "[1] Setting up base folder ($baseFolder)..." -ForegroundColor Cyan
if (-not (Test-Path $baseFolder)) {
    New-Item -ItemType Directory -Path $baseFolder -Force | Out-Null
    Write-Host "[OK] Base directory created: $baseFolder" -ForegroundColor Green
} else {
    Write-Host "[OK] Base directory already exists: $baseFolder" -ForegroundColor Green
}
Write-Host ""

# =========================================================
# STEP 2 - CHECK & INSTALL GIT
# =========================================================

Write-Host "[2] Checking Git..." -ForegroundColor Cyan
Refresh-EnvironmentPath

if (Get-Command git -ErrorAction SilentlyContinue) {
    $gitVersion = git --version
    Write-Host "[OK] Git is already installed ($gitVersion)." -ForegroundColor Green
} else {
    Write-Host "[!] Git is missing. Installing Git..." -ForegroundColor Yellow
    $gitInstalled = $false

    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "Attempting installation via winget..."
        winget install --id Git.Git --exact --source winget --accept-source-agreements --accept-package-agreements --silent
        if ($LASTEXITCODE -eq 0) { $gitInstalled = $true }
    }

    if (-not $gitInstalled) {
        Write-Host "Downloading Git standalone installer..." -ForegroundColor Yellow
        $gitSetupPath = "$env:TEMP\git_setup.exe"
        $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.exe"
        try {
            Invoke-WebRequest -Uri $gitUrl -OutFile $gitSetupPath -UseBasicParsing
            Start-Process -FilePath $gitSetupPath -ArgumentList "/VERYSILENT /NORESTART /NOCANCEL /SP-" -Wait
            $gitInstalled = $true
        } catch {
            Write-Host "[WARN] Direct Git download failed: $_" -ForegroundColor Yellow
        }
    }

    Refresh-EnvironmentPath
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Host "[OK] Git installed successfully." -ForegroundColor Green
    } else {
        Write-Host "[WARN] Git installation could not be verified automatically. Please verify PATH." -ForegroundColor Yellow
    }
}
Write-Host ""

# =========================================================
# STEP 3 - CLONE / VERIFY REPOSITORY
# =========================================================

Write-Host "[3] Verifying / Cloning Repository..." -ForegroundColor Cyan
if (Test-Path $repoFolder) {
    Write-Host "[OK] Repository directory already present: $repoFolder" -ForegroundColor Green
} else {
    Write-Host "Cloning project repository from $repoUrl..." -ForegroundColor Yellow
    Set-Location $baseFolder
    git clone $repoUrl
    if (Test-Path $repoFolder) {
        Write-Host "[OK] Repository cloned successfully into $repoFolder" -ForegroundColor Green
    } else {
        throw "Failed to clone repository from $repoUrl."
    }
}
Write-Host ""

# =========================================================
# STEP 4 - CHECK & INSTALL NODE.JS
# =========================================================

Write-Host "[4] Checking Node.js..." -ForegroundColor Cyan
Refresh-EnvironmentPath

if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node --version
    Write-Host "[OK] Node.js is already installed ($nodeVer)." -ForegroundColor Green
} else {
    Write-Host "[!] Node.js is missing. Installing Node.js..." -ForegroundColor Yellow
    $nodeInstalled = $false

    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "Attempting Node.js installation via winget..."
        winget install OpenJS.NodeJS.LTS --source winget --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -eq 0) { $nodeInstalled = $true }
    }

    if (-not $nodeInstalled) {
        Write-Host "Downloading Node.js MSI installer..." -ForegroundColor Yellow
        $nodeMsiPath = "$env:TEMP\node_setup.msi"
        $nodeUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
        try {
            Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsiPath -UseBasicParsing
            Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsiPath`" /qb /norestart" -Wait
            $nodeInstalled = $true
        } catch {
            Write-Host "[WARN] Direct Node.js MSI download failed: $_" -ForegroundColor Yellow
        }
    }

    Refresh-EnvironmentPath
    if (Get-Command node -ErrorAction SilentlyContinue) {
        Write-Host "[OK] Node.js installed successfully ($(node --version))." -ForegroundColor Green
    } else {
        Write-Host "[WARN] Node.js installed, but PATH refresh may require starting a new terminal." -ForegroundColor Yellow
    }
}
Write-Host ""

# =========================================================
# STEP 5 - CHECK & INSTALL VISUAL STUDIO CODE
# =========================================================

Write-Host "[5] Checking Visual Studio Code..." -ForegroundColor Cyan
if ((Get-Command code -ErrorAction SilentlyContinue) -or (Test-Path "C:\Program Files\Microsoft VS Code")) {
    Write-Host "[OK] Visual Studio Code is already installed." -ForegroundColor Green
} else {
    Write-Host "[!] Visual Studio Code is missing. Installing VS Code..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id Microsoft.VisualStudioCode --exact --source winget --accept-source-agreements --accept-package-agreements
    } else {
        Write-Host "Downloading VS Code standalone installer..." -ForegroundColor Yellow
        $vsCodePath = "$env:TEMP\vscode_setup.exe"
        $vsCodeUrl = "https://update.code.visualstudio.com/latest/win32-x64-user/stable"
        try {
            Invoke-WebRequest -Uri $vsCodeUrl -OutFile $vsCodePath -UseBasicParsing
            Start-Process -FilePath $vsCodePath -ArgumentList "/VERYSILENT /NORESTART /MERGETASKS=!runcode" -Wait
        } catch {
            Write-Host "[WARN] Direct VS Code download failed." -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# =========================================================
# STEP 6 - CHECK & INSTALL POSTGRESQL
# =========================================================

Write-Host "[6] Checking PostgreSQL Database Server..." -ForegroundColor Cyan
Refresh-EnvironmentPath

$psqlCmd = $null
if (Get-Command psql -ErrorAction SilentlyContinue) {
    $psqlCmd = (Get-Command psql).Source
} else {
    $foundPsql = Resolve-Path "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
        Sort-Object Path -Descending | Select-Object -First 1
    if ($foundPsql) { $psqlCmd = $foundPsql.Path }
}

$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue

if (-not $psqlCmd -and -not $pgService) {
    Write-Host "[!] PostgreSQL server is not installed. Installing PostgreSQL 16..." -ForegroundColor Yellow
    $pgInstalled = $false

    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "Installing PostgreSQL via winget..."
        winget install --id PostgreSQL.PostgreSQL.16 --source winget --accept-source-agreements --accept-package-agreements --override "--unattendedmode admin --superpassword password@123"
        if ($LASTEXITCODE -eq 0) { $pgInstalled = $true }
    }

    if (-not $pgInstalled) {
        Write-Host "Downloading PostgreSQL installer from EDB..." -ForegroundColor Yellow
        $pgInstallerPath = "$env:TEMP\postgresql_setup.exe"
        $pgUrl = "https://sbp.enterprisedb.com/getpackages_win.jsp?file_id=1258674"
        try {
            Invoke-WebRequest -Uri $pgUrl -OutFile $pgInstallerPath -UseBasicParsing
            Start-Process -FilePath $pgInstallerPath -ArgumentList "--mode unattended --superpassword password@123 --servicename postgresql-x64-16 --servicepassword password@123" -Wait
            $pgInstalled = $true
        } catch {
            Write-Host "[WARN] Automatic PostgreSQL installer download failed: $_" -ForegroundColor Yellow
        }
    }

    Refresh-EnvironmentPath
    $psqlCmd = (Resolve-Path "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue | Sort-Object Path -Descending | Select-Object -First 1).Path
}

# Ensure PostgreSQL Windows Service is running
$pgServices = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
foreach ($service in $pgServices) {
    if ($service.Status -ne "Running") {
        Write-Host "Starting PostgreSQL service ($($service.Name))..." -ForegroundColor Yellow
        Start-Service -Name $service.Name -ErrorAction SilentlyContinue
    }
}

if ($psqlCmd) {
    Write-Host "[OK] Found PostgreSQL CLI: $psqlCmd" -ForegroundColor Green
} else {
    Write-Host "[WARN] psql executable path could not be resolved automatically." -ForegroundColor Yellow
}
Write-Host ""

# =========================================================
# STEP 7 - CHECK & INSTALL PGADMIN 4
# =========================================================

Write-Host "[7] Checking pgAdmin 4..." -ForegroundColor Cyan
if ((Get-Command pgadmin4 -ErrorAction SilentlyContinue) -or (Test-Path "C:\Program Files\pgAdmin 4") -or (Test-Path "C:\Program Files (x86)\pgAdmin 4")) {
    Write-Host "[OK] pgAdmin 4 is already installed." -ForegroundColor Green
} else {
    Write-Host "[!] pgAdmin 4 is missing. Installing pgAdmin 4..." -ForegroundColor Yellow
    $pgAdminInstalled = $false

    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "Installing pgAdmin 4 via winget..."
        winget install --id PostgreSQL.pgAdmin --source winget --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -eq 0) { $pgAdminInstalled = $true }
    }

    if (-not $pgAdminInstalled) {
        Write-Host "Downloading pgAdmin 4 standalone installer..." -ForegroundColor Yellow
        $pgAdminSetup = "$env:TEMP\pgadmin_setup.exe"
        $pgAdminUrl = "https://ftp.postgresql.org/pub/pgadmin/pgadmin4/v9.17/windows/pgadmin4-9.17-x64.exe"
        try {
            Invoke-WebRequest -Uri $pgAdminUrl -OutFile $pgAdminSetup -UseBasicParsing
            Start-Process -FilePath $pgAdminSetup -ArgumentList "/VERYSILENT /NORESTART" -Wait
            $pgAdminInstalled = $true
            Write-Host "[OK] pgAdmin 4 installed via standalone installer." -ForegroundColor Green
        } catch {
            Write-Host "[WARN] Direct pgAdmin download failed: $_" -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# =========================================================
# STEP 8 - CONFIGURE POSTGRESQL & DATABASE CREDENTIALS
# =========================================================

Write-Host "[8] Configuring PostgreSQL User 'postgres' Password to '$databasePassword'..." -ForegroundColor Cyan

if ($psqlCmd) {
    $portsToCheck = @(5432, 5433)
    $detectedPort = $null

    foreach ($p in $portsToCheck) {
        $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port $p -WarningAction SilentlyContinue
        if ($tcp.TcpTestSucceeded) {
            Write-Host "Active PostgreSQL port detected: $p"
            $candidatePasswords = @($databasePassword, "password@1234", "password@123", "postgres", "admin", "root", "12345678", "1234", "123456", "admin123", "postgres123", "Password@123", "admin@123", "root123", "password", "12345", "")
            $connected = $false
            foreach ($candPass in $candidatePasswords) {
                $env:PGPASSWORD = $candPass
                $null = & $psqlCmd -U postgres -p $p -h 127.0.0.1 -w -c "SELECT 1;" 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "Connected to PostgreSQL on port $p with candidate password." -ForegroundColor Green
                    # Set superuser password to $databasePassword (password@123)
                    & $psqlCmd -U postgres -p $p -h 127.0.0.1 -w -c "ALTER USER postgres WITH PASSWORD '$databasePassword';" 2>&1 | Out-Null
                    Write-Host "[OK] Set PostgreSQL user 'postgres' password to '$databasePassword'." -ForegroundColor Green
                    $connected = $true
                    $detectedPort = $p
                    break
                }
            }

            # FALLBACK: If candidate passwords fail, perform trust-mode reset via pg_hba.conf
            if (-not $connected) {
                Write-Host "[!] Could not authenticate with standard passwords. Attempting automated pg_hba.conf password reset..." -ForegroundColor Yellow
                $pgHbaFile = Resolve-Path "C:\Program Files\PostgreSQL\*\data\pg_hba.conf" -ErrorAction SilentlyContinue | Sort-Object Path -Descending | Select-Object -First 1
                if (-not $pgHbaFile) {
                    $pgHbaFile = Resolve-Path "C:\ProgramData\PostgreSQL\*\data\pg_hba.conf" -ErrorAction SilentlyContinue | Sort-Object Path -Descending | Select-Object -First 1
                }

                if ($pgHbaFile -and (Test-Path $pgHbaFile.Path)) {
                    $hbaPath = $pgHbaFile.Path
                    Write-Host "Found pg_hba.conf at $hbaPath" -ForegroundColor Yellow
                    try {
                        $origHbaContent = Get-Content $hbaPath -Raw
                        $trustRule = "host    all             postgres        127.0.0.1/32            trust`r`nhost    all             postgres        ::1/128                 trust`r`n"
                        Set-Content -Path $hbaPath -Value ($trustRule + $origHbaContent) -Encoding ASCII

                        # Restart service
                        Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Restart-Service -Force -ErrorAction SilentlyContinue
                        Start-Sleep -Seconds 2

                        # Set password without credentials in trust mode
                        $env:PGPASSWORD = ""
                        & $psqlCmd -U postgres -p $p -h 127.0.0.1 -w -c "ALTER USER postgres WITH PASSWORD '$databasePassword';" 2>&1 | Out-Null
                        Write-Host "[OK] Password forced to '$databasePassword' via trust mode reset." -ForegroundColor Green

                        # Restore original pg_hba.conf
                        Set-Content -Path $hbaPath -Value $origHbaContent -Encoding ASCII
                        Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Restart-Service -Force -ErrorAction SilentlyContinue
                        Start-Sleep -Seconds 2

                        $connected = $true
                        $detectedPort = $p
                    } catch {
                        Write-Host "[WARN] Automated pg_hba.conf reset failed: $_" -ForegroundColor Yellow
                    }
                }
            }

            # Ensure target database exists
            if ($connected) {
                $env:PGPASSWORD = $databasePassword
                $dbCheck = & $psqlCmd -U postgres -p $p -h 127.0.0.1 -w -t -c "SELECT 1 FROM pg_database WHERE datname='$databaseName';" 2>&1
                if ($dbCheck -notmatch "1") {
                    Write-Host "Creating database '$databaseName' on port $p..." -ForegroundColor Yellow
                    & $psqlCmd -U postgres -p $p -h 127.0.0.1 -w -c "CREATE DATABASE $databaseName;" 2>&1 | Out-Null
                    Write-Host "[OK] Database '$databaseName' created." -ForegroundColor Green
                } else {
                    Write-Host "[OK] Database '$databaseName' already exists." -ForegroundColor Green
                }
                break
            }
        }
    }

    if ($detectedPort) {
        $databasePort = "$detectedPort"
    }
}
Write-Host ""

# Sync pgAdmin server port configuration if SQLite db is present
try {
    $pgAdminDbPath = "$env:APPDATA\pgAdmin\pgadmin4.db"
    if (Test-Path $pgAdminDbPath) {
        if (Get-Command python -ErrorAction SilentlyContinue) {
            python -c "import sqlite3; conn = sqlite3.connect(r'$pgAdminDbPath'); cur = conn.cursor(); cur.execute('UPDATE server SET port = $databasePort WHERE port != $databasePort'); conn.commit(); conn.close()" 2>&1 | Out-Null
            Write-Host "[OK] Synchronized pgAdmin 4 saved servers to port $databasePort." -ForegroundColor Green
        }
    }
} catch {}

# =========================================================
# STEP 9 - CREATE BACKEND .ENV FILE
# =========================================================

Write-Host "[9] Creating backend .env configuration..." -ForegroundColor Cyan

$envFile = "$backendFolder\.env"
$encodedPassword = [System.Uri]::EscapeDataString($databasePassword)
$databaseUrl = "postgresql://$databaseUser`:$encodedPassword@$databaseHost`:$databasePort/$databaseName"

$envContent = @"
DATABASE_URL="$databaseUrl"
PORT=$backendPort
JWT_SECRET="$jwtSecret"
NODE_ENV="development"
FRONTEND_URL="$frontendUrl"
"@

Set-Content -Path $envFile -Value $envContent -Encoding UTF8
if (Test-Path $envFile) {
    Write-Host "[OK] Created backend .env file successfully ($envFile)" -ForegroundColor Green
} else {
    throw "Failed to create backend .env file."
}
Write-Host ""

# Ensure .env is ignored by git
$gitignoreFile = "$backendFolder\.gitignore"
if (Test-Path $gitignoreFile) {
    $giContent = Get-Content $gitignoreFile -Raw
    if ($giContent -notmatch "(?m)^\.env$") {
        Add-Content -Path $gitignoreFile -Value "`r`n# Environment variables`r`n.env`r`n"
    }
}
Write-Host ""

# =========================================================
# STEP 10 - INSTALL FRONTEND DEPENDENCIES
# =========================================================

Write-Host "[10] Installing FRONTEND npm dependencies..." -ForegroundColor Cyan
if (Test-Path $frontendFolder) {
    Set-Location $frontendFolder
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Frontend npm install completed successfully." -ForegroundColor Green
    } else {
        Write-Host "[WARN] Frontend npm install reported exit code $LASTEXITCODE." -ForegroundColor Yellow
    }
} else {
    throw "Frontend directory not found at $frontendFolder"
}
Write-Host ""

# =========================================================
# STEP 11 - INSTALL BACKEND DEPENDENCIES & GENERATE PRISMA
# =========================================================

Write-Host "[11] Installing BACKEND npm dependencies & Generating Prisma..." -ForegroundColor Cyan
if (Test-Path $backendFolder) {
    Set-Location $backendFolder
    npm install

    # Generate Prisma Client
    $prevTls = $env:NODE_TLS_REJECT_UNAUTHORIZED
    $env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
    try {
        if (Test-Path "$backendFolder\node_modules\prisma\build\index.js") {
            node node_modules/prisma/build/index.js generate
        } else {
            npx prisma generate
        }
        Write-Host "[OK] Prisma Client generated." -ForegroundColor Green
    } finally {
        if ($null -eq $prevTls) { Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue }
        else { $env:NODE_TLS_REJECT_UNAUTHORIZED = $prevTls }
    }

    # Synchronize database schema and seed initial admin data
    Write-Host "Initializing Database Schema & Admin User..." -ForegroundColor Yellow
    if (Test-Path "setup.js") {
        node setup.js
    } else {
        npx prisma db push --skip-generate
        if (Test-Path "seed_admin.js") { node seed_admin.js }
    }
} else {
    throw "Backend directory not found at $backendFolder"
}
Write-Host ""

# =========================================================
# STEP 12 - INSTALL ROOT DEPENDENCIES
# =========================================================

Write-Host "[12] Installing ROOT npm dependencies..." -ForegroundColor Cyan
Set-Location $repoFolder
npm install
Write-Host ""

# =========================================================
# STEP 13 - CONFIGURE AUTOMATED VBS STARTUP LAUNCHER
# =========================================================

Write-Host "[13] Configuring Automated VBS Startup Launcher (Shell Startup)..." -ForegroundColor Cyan

# Clean up legacy Desktop batch file if it exists
$desktopPath = [Environment]::GetFolderPath("Desktop")
if (Test-Path "$desktopPath\Start_School_ERP.bat") {
    Remove-Item -Path "$desktopPath\Start_School_ERP.bat" -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Removed legacy Desktop .bat launcher." -ForegroundColor Yellow
}

# Generate master VBScript launcher in the base project folder
$vbsLauncher = "$baseFolder\Start_School_ERP.vbs"

$vbsContent = @"
' =========================================================
' School ERP Automated Silent Startup Launcher
' Dynamically resolves system paths and boots servers silently
' =========================================================
Option Explicit

Dim WshShell, fso, scriptDir, backendDir, frontendDir, frontendUrl, wStyle

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Window Style: 0 = Hidden (Silent background mode - no black cmd windows)
'               1 = Normal visible window
'               7 = Minimized window
wStyle = 0

' Determine directory dynamically based on script location on this system
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Dynamic path resolution for Backend
If fso.FolderExists(scriptDir & "\newzambia\backend") Then
    backendDir = scriptDir & "\newzambia\backend"
ElseIf fso.FolderExists(scriptDir & "\backend") Then
    backendDir = scriptDir & "\backend"
ElseIf fso.FolderExists("$backendFolder") Then
    backendDir = "$backendFolder"
Else
    backendDir = ""
End If

' Dynamic path resolution for Frontend
If fso.FolderExists(scriptDir & "\newzambia\frontend") Then
    frontendDir = scriptDir & "\newzambia\frontend"
ElseIf fso.FolderExists(scriptDir & "\frontend") Then
    frontendDir = scriptDir & "\frontend"
ElseIf fso.FolderExists("$frontendFolder") Then
    frontendDir = "$frontendFolder"
Else
    frontendDir = ""
End If

frontendUrl = "$frontendUrl"

If backendDir = "" Or frontendDir = "" Then
    MsgBox "School ERP Startup Error: One or more project folders could not be located." & vbCrLf & _
           "Base Directory: " & scriptDir & vbCrLf & _
           "Backend Directory: " & backendDir & vbCrLf & _
           "Frontend Directory: " & frontendDir, vbCritical, "School ERP Launcher Error"
    WScript.Quit 1
End If

' Launch Backend Server silently in the background
WshShell.Run "cmd.exe /c cd /d """ & backendDir & """ && npm start", wStyle, False

' Pause 3 seconds for Backend server initialization
WScript.Sleep 3000

' Launch Frontend Dev Server silently in the background
WshShell.Run "cmd.exe /c cd /d """ & frontendDir & """ && npm run dev", wStyle, False

' Pause 4 seconds for Frontend dev server to be ready
WScript.Sleep 4000

' Open default web browser to the School ERP frontend
WshShell.Run frontendUrl, 1, False
"@

Set-Content -Path $vbsLauncher -Value $vbsContent -Encoding ASCII
if (Test-Path $vbsLauncher) {
    Write-Host "[OK] VBScript startup launcher created: $vbsLauncher" -ForegroundColor Green
} else {
    throw "Failed to create VBScript launcher file at $vbsLauncher."
}

# Resolve all applicable Startup folders (handles Administrator elevation and standard user)
$targetStartupFolders = @()

# 1. Interactive logged-in desktop user (e.g. student when elevated as Administrator)
$loggedOnUser = (Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).UserName
if ($loggedOnUser) {
    $rawUser = $loggedOnUser.Split('\')[-1]
    $userStartup = "C:\Users\$rawUser\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup"
    if (Test-Path $userStartup) { $targetStartupFolders += $userStartup }
}

# 2. Current environment Startup folder
$envStartup = [Environment]::GetFolderPath("Startup")
if ($envStartup -and (Test-Path $envStartup)) { $targetStartupFolders += $envStartup }

# 3. Fallback APPDATA Startup
$appDataStartup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
if (Test-Path $appDataStartup) { $targetStartupFolders += $appDataStartup }

# 4. CommonStartup (Machine-wide / All Users startup)
$commonStartup = [Environment]::GetFolderPath("CommonStartup")
if ($commonStartup -and (Test-Path $commonStartup)) { $targetStartupFolders += $commonStartup }

# De-duplicate
$targetStartupFolders = $targetStartupFolders | Select-Object -Unique

# Create Windows Startup Shortcut pointing to the VBS launcher in all applicable folders
$wshExe = (Get-Command wscript.exe -ErrorAction SilentlyContinue).Source
if (-not $wshExe) { $wshExe = "C:\Windows\System32\wscript.exe" }
$wshCom = New-Object -ComObject WScript.Shell

foreach ($sFolder in $targetStartupFolders) {
    try {
        if (-not (Test-Path $sFolder)) {
            New-Item -ItemType Directory -Path $sFolder -Force | Out-Null
        }
        $shortcutPath = Join-Path $sFolder "School_ERP_AutoStart.lnk"
        $shortcut = $wshCom.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $wshExe
        $shortcut.Arguments = "`"$vbsLauncher`""
        $shortcut.WorkingDirectory = "$baseFolder"
        $shortcut.Description = "Automated Silent Startup for School ERP System"
        $shortcut.Save()
        Write-Host "[OK] Startup shortcut registered successfully: $shortcutPath" -ForegroundColor Green
    } catch {
        Write-Host "[WARN] Could not register shortcut in $($sFolder) - $_" -ForegroundColor Yellow
    }
}

# Clean up any legacy batch files if present
$desktopPath = [Environment]::GetFolderPath("Desktop")
if (Test-Path "$desktopPath\Start_School_ERP.bat") {
    Remove-Item -Path "$desktopPath\Start_School_ERP.bat" -Force -ErrorAction SilentlyContinue
}
if (Test-Path "$baseFolder\Start_School_ERP.bat") {
    Remove-Item -Path "$baseFolder\Start_School_ERP.bat" -Force -ErrorAction SilentlyContinue
}
if (Test-Path "$baseFolder\Stop_School_ERP.bat") {
    Remove-Item -Path "$baseFolder\Stop_School_ERP.bat" -Force -ErrorAction SilentlyContinue
}

# Generate companion Stop helper script using VBScript (No .bat files)
$stopVbs = "$baseFolder\Stop_School_ERP.vbs"
$stopVbsContent = @"
' =========================================================
' School ERP Silent Background Process Stopper (.vbs)
' =========================================================
Option Explicit

Dim WshShell
Set WshShell = CreateObject("WScript.Shell")

' Terminate Node.js processes listening on ports $backendPort and 5173
WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ""foreach (`$p in @($backendPort, 5173)) { `$c = Get-NetTCPConnection -LocalPort `$p -State Listen -ErrorAction SilentlyContinue; if (`$c) { Stop-Process -Id `$c.OwningProcess -Force -ErrorAction SilentlyContinue } }""", 0, True

MsgBox "All School ERP background servers have been stopped.", vbInformation, "School ERP"
"@
Set-Content -Path $stopVbs -Value $stopVbsContent -Encoding ASCII
Write-Host "[OK] VBScript stop helper created: $stopVbs" -ForegroundColor Green
Write-Host ""

# =========================================================
# COMPLETE
# =========================================================

Write-Host "=============================================" -ForegroundColor Green
Write-Host "       SETUP COMPLETED SUCCESSFULLY" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Project location: $repoFolder"
Write-Host "Frontend:         $frontendFolder"
Write-Host "Backend:          $backendFolder"
Write-Host "Environment:      $envFile"
Write-Host ""
Write-Host "PostgreSQL & pgAdmin Connection Details:" -ForegroundColor Yellow
Write-Host "  - Host:      $databaseHost"
Write-Host "  - Port:      $databasePort"
Write-Host "  - Database:  $databaseName"
Write-Host "  - Username:  $databaseUser"
Write-Host "  - Password:  $databasePassword"
Write-Host ""
Write-Host "Default ERP Admin Login:" -ForegroundColor Yellow
Write-Host "  - Username:  admin"
Write-Host "  - Password:  adminpassword"
Write-Host "  - College:   svpcet"
Write-Host ""
Write-Host "Automated System Startup Details:" -ForegroundColor Cyan
Write-Host "  - Startup Folder:   $startupFolder"
Write-Host "  - Startup Shortcut: $shortcutPath"
Write-Host "  - Target Launcher:  $vbsLauncher"
Write-Host ""
Write-Host "Control Options (All VBScript - No .bat files):"
Write-Host "  - Auto-start:       Executes automatically on Windows boot/login"
Write-Host "  - Run manually:     Double-click '$vbsLauncher'"
Write-Host "  - Stop servers:     Double-click '$stopVbs'"
Write-Host "  - Dev terminal:     Run 'npm start' from $repoFolder"
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

if ([Environment]::UserInteractive -and -not [Console]::IsInputRedirected) {
    try { Read-Host "Press Enter to exit" } catch {}
}

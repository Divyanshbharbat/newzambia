# =========================================================
# School ERP - Complete Windows Setup + Run Script
# =========================================================

$ErrorActionPreference = "Stop"

# =========================================================
# CONFIGURATION
# =========================================================

$repoUrl = "https://github.com/Divyanshbharbat/newzambia.git"

$baseFolder = "C:\school_erp"
$repoFolder = "C:\school_erp\newzambia"

$frontendFolder = "$repoFolder\frontend"
$backendFolder = "$repoFolder\backend"

$requiredNodeVersion = "v25.9.0"

# =========================================================
# DATABASE CONFIGURATION
# =========================================================

$databaseUser = "postgres"
$databasePassword = "password@123"

$databaseHost = "localhost"
$databasePort = "5432"
$databaseName = "school_erp"

# @ -> %40 for DATABASE_URL
$databasePasswordEncoded = "password%40123"

$backendPort = "5000"

$jwtSecret = "school_erp_jwt_secret_change_this"

$frontendUrl = "http://localhost:5173"

# =========================================================
# START
# =========================================================

Write-Host ""
Write-Host "============================================="
Write-Host "       SCHOOL ERP COMPLETE SETUP"
Write-Host "============================================="
Write-Host ""

# =========================================================
# STEP 0 - ADMINISTRATOR
# =========================================================

Write-Host "[0] Checking Administrator privileges..."
Write-Host ""

$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()

$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)

$isAdmin = $principal.IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (!$isAdmin) {

    Write-Host ""
    Write-Host "ERROR: This script must be run as Administrator."
    Write-Host ""
    Write-Host "Right-click PowerShell -> Run as Administrator"
    Write-Host ""

    Read-Host "Press Enter to exit"

    exit 1
}

Write-Host "[OK] Administrator privileges detected."
Write-Host ""

# =========================================================
# HELPER - REFRESH PATH
# =========================================================

function Refresh-Path {

    $machinePath = [System.Environment]::GetEnvironmentVariable(
        "Path",
        "Machine"
    )

    $userPath = [System.Environment]::GetEnvironmentVariable(
        "Path",
        "User"
    )

    $env:Path = "$machinePath;$userPath"
}

# =========================================================
# HELPER - REPAIR WINGET
# =========================================================

function Repair-Winget {

    Write-Host ""
    Write-Host "Checking Windows Package Manager..."
    Write-Host ""

    $winget = Get-Command winget -ErrorAction SilentlyContinue

    if (!$winget) {

        Write-Host "ERROR: winget is not available."
        Write-Host ""
        Write-Host "Install/update App Installer from Microsoft Store."
        Write-Host ""

        throw "winget is unavailable."
    }

    Write-Host "Resetting WinGet sources..."

    winget source reset --force

    if ($LASTEXITCODE -ne 0) {

        Write-Host ""
        Write-Host "WARNING: WinGet source reset returned an error."
        Write-Host "Trying source update..."
    }

    Write-Host ""
    Write-Host "Updating WinGet sources..."

    winget source update

    if ($LASTEXITCODE -ne 0) {

        throw "WinGet source update failed."
    }

    Write-Host ""
    Write-Host "[OK] WinGet sources ready."
    Write-Host ""
}

# =========================================================
# HELPER - INSTALL WINGET PACKAGE
# =========================================================

function Install-WingetPackage {

    param(
        [Parameter(Mandatory=$true)]
        [string]$PackageId
    )

    Write-Host ""
    Write-Host "Installing package: $PackageId"
    Write-Host ""

    winget install `
        --id $PackageId `
        --exact `
        --source winget `
        --accept-source-agreements `
        --accept-package-agreements `
        --silent

    if ($LASTEXITCODE -ne 0) {

        throw "Installation failed for package: $PackageId"
    }

    Refresh-Path

    Write-Host ""
    Write-Host "[OK] Installed: $PackageId"
    Write-Host ""
}

# =========================================================
# HELPER - POSTGRES SERVICES
# =========================================================

function Get-PostgresServices {

    return @(
        Get-CimInstance Win32_Service |
        Where-Object {

            $_.Name -like "postgresql*" -or
            $_.DisplayName -like "*PostgreSQL*"
        }
    )
}

# =========================================================
# HELPER - GET DATA DIRECTORY
# =========================================================

function Get-PostgresDataDirectory {

    param(
        [Parameter(Mandatory=$true)]
        $Service
    )

    $pathName = $Service.PathName

    if (!$pathName) {

        return $null
    }

    if ($pathName -match '-D\s+"([^"]+)"') {

        return $matches[1]
    }

    if ($pathName -match '-D\s+([^\s]+)') {

        return $matches[1]
    }

    return $null
}

# =========================================================
# HELPER - GET BIN DIRECTORY
# =========================================================

function Get-PostgresBinFromService {

    param(
        [Parameter(Mandatory=$true)]
        $Service
    )

    $pathName = $Service.PathName

    if (!$pathName) {

        return $null
    }

    if ($pathName -match '"([^"]*\\bin\\pg_ctl\.exe)"') {

        $pgCtl = $matches[1]

        return Split-Path $pgCtl -Parent
    }

    if ($pathName -match '([A-Za-z]:\\[^"]*\\bin)\\pg_ctl\.exe') {

        return $matches[1]
    }

    return $null
}

# =========================================================
# HELPER - FIND POSTGRES INSTANCE USING 5432
# =========================================================

function Get-PostgresInstanceOnPort {

    param(
        [int]$Port
    )

    $connection = Get-NetTCPConnection `
        -LocalPort $Port `
        -State Listen `
        -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if (!$connection) {

        return $null
    }

    $processId = $connection.OwningProcess

    Write-Host "Port $Port is being used by PID $processId"

    $service = Get-CimInstance Win32_Service |
        Where-Object {

            $_.ProcessId -eq $processId -and
            (
                $_.Name -like "postgresql*" -or
                $_.DisplayName -like "*PostgreSQL*"
            )

        } |
        Select-Object -First 1

    if (!$service) {

        return $null
    }

    $bin = Get-PostgresBinFromService -Service $service

    $data = Get-PostgresDataDirectory -Service $service

    return [PSCustomObject]@{

        Service = $service

        Bin = $bin

        Data = $data

        PID = $processId
    }
}

# =========================================================
# HELPER - FIND POSTGRES BIN
# =========================================================

function Find-AnyPostgresBin {

    $possiblePaths = @(

        "C:\Program Files\PostgreSQL\18\bin"
        "C:\Program Files\PostgreSQL\17\bin"
        "C:\Program Files\PostgreSQL\16\bin"
        "C:\Program Files\PostgreSQL\15\bin"
        "C:\Program Files\PostgreSQL\14\bin"
        "C:\Program Files\PostgreSQL\13\bin"
        "C:\Program Files\PostgreSQL\12\bin"
        "C:\Program Files\PostgreSQL\11\bin"

    )

    foreach ($path in $possiblePaths) {

        if (Test-Path "$path\psql.exe") {

            return $path
        }
    }

    $psql = Get-Command psql -ErrorAction SilentlyContinue

    if ($psql) {

        return Split-Path $psql.Source -Parent
    }

    return $null
}

# =========================================================
# STEP 1 - WINGET
# =========================================================

Write-Host "[1] Preparing WinGet..."
Write-Host ""

Repair-Winget

# =========================================================
# STEP 2 - GIT
# =========================================================

Write-Host "[2] Checking Git..."
Write-Host ""

if (Get-Command git -ErrorAction SilentlyContinue) {

    Write-Host "Git already installed:"
    git --version

}
else {

    Write-Host "Git is not installed."

    Install-WingetPackage `
        -PackageId "Git.Git"
}

Refresh-Path

if (!(Get-Command git -ErrorAction SilentlyContinue)) {

    throw "Git is still unavailable after installation."
}

Write-Host ""
Write-Host "[OK] Git available."
Write-Host ""

# =========================================================
# STEP 3 - BASE FOLDER
# =========================================================

Write-Host "[3] Creating School ERP folder..."
Write-Host ""

if (!(Test-Path $baseFolder)) {

    New-Item `
        -ItemType Directory `
        -Path $baseFolder `
        -Force |
        Out-Null

    Write-Host "Created:"
    Write-Host $baseFolder

}
else {

    Write-Host "Folder already exists:"
    Write-Host $baseFolder
}

Write-Host ""

# =========================================================
# STEP 4 - CLONE REPOSITORY
# =========================================================

Write-Host "[4] Checking repository..."
Write-Host ""

Set-Location $baseFolder

if (Test-Path "$repoFolder\.git") {

    Write-Host "Repository already exists."
    Write-Host $repoFolder

    Write-Host ""
    Write-Host "Updating repository..."

    Set-Location $repoFolder

    git pull

    if ($LASTEXITCODE -ne 0) {

        Write-Host "WARNING: git pull failed."
        Write-Host "Continuing with existing repository."
    }

}
elseif (Test-Path $repoFolder) {

    Write-Host "Folder exists but is not a Git repository."
    Write-Host "Skipping clone."

}
else {

    Write-Host "Cloning repository..."

    Set-Location $baseFolder

    git clone $repoUrl

    if ($LASTEXITCODE -ne 0) {

        throw "Git clone failed."
    }

    Write-Host "[OK] Repository cloned."
}

Write-Host ""

# =========================================================
# STEP 5 - VERIFY REPOSITORY
# =========================================================

Write-Host "[5] Verifying repository..."
Write-Host ""

if (!(Test-Path $repoFolder)) {

    throw "Repository not found: $repoFolder"
}

if (!(Test-Path $frontendFolder)) {

    throw "Frontend folder not found: $frontendFolder"
}

if (!(Test-Path $backendFolder)) {

    throw "Backend folder not found: $backendFolder"
}

Write-Host "[OK] Repository:"
Write-Host $repoFolder

Write-Host ""
Write-Host "[OK] Frontend:"
Write-Host $frontendFolder

Write-Host ""
Write-Host "[OK] Backend:"
Write-Host $backendFolder

Write-Host ""

# =========================================================
# STEP 6 - NODE.JS
# =========================================================

Write-Host "[6] Checking Node.js..."
Write-Host ""

Refresh-Path

$node = Get-Command node -ErrorAction SilentlyContinue

if ($node) {

    $currentNodeVersion = node --version

    Write-Host "Installed Node.js:"
    Write-Host $currentNodeVersion

    Write-Host ""
    Write-Host "Required:"
    Write-Host $requiredNodeVersion

}
else {

    Write-Host "Node.js is not installed."

    Install-WingetPackage `
        -PackageId "OpenJS.NodeJS"
}

Refresh-Path

if (!(Get-Command node -ErrorAction SilentlyContinue)) {

    throw "Node.js is unavailable."
}

Write-Host ""
Write-Host "[OK] Node.js available."
Write-Host ""

# =========================================================
# STEP 7 - VS CODE
# =========================================================

Write-Host "[7] Checking Visual Studio Code..."
Write-Host ""

if (Get-Command code -ErrorAction SilentlyContinue) {

    Write-Host "[OK] VS Code already installed."

}
else {

    Write-Host "VS Code not found."

    try {

        Install-WingetPackage `
            -PackageId "Microsoft.VisualStudioCode"

    }
    catch {

        Write-Host ""
        Write-Host "WARNING: VS Code installation failed."
        Write-Host "Continuing setup."
        Write-Host ""
    }
}

# =========================================================
# STEP 8 - POSTGRESQL
# =========================================================

Write-Host ""
Write-Host "[8] Checking PostgreSQL..."
Write-Host ""

$postgresServices = Get-PostgresServices

$postgresBin = Find-AnyPostgresBin

if ($postgresServices.Count -gt 0) {

    Write-Host "PostgreSQL services found:"

    foreach ($service in $postgresServices) {

        Write-Host " - $($service.Name) [$($service.State)]"
    }
}

if (!$postgresBin) {

    Write-Host ""
    Write-Host "PostgreSQL is not installed."
    Write-Host "Installing PostgreSQL..."

    Install-WingetPackage `
        -PackageId "PostgreSQL.PostgreSQL"

    Start-Sleep -Seconds 10

    $postgresServices = Get-PostgresServices

    $postgresBin = Find-AnyPostgresBin

    if (!$postgresBin) {

        throw "PostgreSQL installed but psql.exe was not found."
    }
}

Write-Host ""
Write-Host "[OK] PostgreSQL installation detected."
Write-Host ""

# =========================================================
# STEP 9 - FIND INSTANCE ON 5432
# =========================================================

Write-Host "[9] Detecting PostgreSQL server on port 5432..."
Write-Host ""

$pgInstance = Get-PostgresInstanceOnPort -Port 5432

if (!$pgInstance) {

    Write-Host "No PostgreSQL instance currently listening on 5432."
    Write-Host ""

    $postgresServices = Get-PostgresServices

    foreach ($service in $postgresServices) {

        $dataDir = Get-PostgresDataDirectory -Service $service

        if (!$dataDir) {

            continue
        }

        $configFile = Join-Path $dataDir "postgresql.conf"

        if (!(Test-Path $configFile)) {

            continue
        }

        $config = Get-Content `
            $configFile `
            -Raw `
            -ErrorAction SilentlyContinue

        if ($config -match '(?m)^\s*port\s*=\s*5432') {

            Write-Host "Found PostgreSQL service configured for 5432:"
            Write-Host $service.Name

            if ($service.State -ne "Running") {

                Start-Service $service.Name

                Start-Sleep -Seconds 5
            }

            break
        }
    }

    Start-Sleep -Seconds 5

    $pgInstance = Get-PostgresInstanceOnPort -Port 5432
}

if (!$pgInstance) {

    Write-Host ""
    Write-Host "Could not find PostgreSQL on port 5432."
    Write-Host ""

    Get-Service postgresql* |
        Format-Table Name, Status

    Write-Host ""

    Get-NetTCPConnection `
        -LocalPort 5432 `
        -State Listen `
        -ErrorAction SilentlyContinue

    throw "PostgreSQL instance on port 5432 was not found."
}

Write-Host ""
Write-Host "PostgreSQL instance:"
Write-Host "Service : $($pgInstance.Service.Name)"
Write-Host "PID     : $($pgInstance.PID)"
Write-Host "Bin     : $($pgInstance.Bin)"
Write-Host "Data    : $($pgInstance.Data)"
Write-Host ""

# =========================================================
# STEP 10 - ENSURE POSTGRES RUNNING
# =========================================================

$pgService = Get-Service $pgInstance.Service.Name

if ($pgService.Status -ne "Running") {

    Write-Host "Starting PostgreSQL..."

    Start-Service $pgService.Name

    Start-Sleep -Seconds 5
}

$pgInstance = Get-PostgresInstanceOnPort -Port 5432

if (!$pgInstance) {

    throw "PostgreSQL is not listening on port 5432."
}

$postgresBin = $pgInstance.Bin

if (!$postgresBin) {

    throw "Could not determine PostgreSQL bin directory."
}

$psqlPath = Join-Path $postgresBin "psql.exe"

if (!(Test-Path $psqlPath)) {

    throw "psql.exe not found: $psqlPath"
}

$dataDirectory = $pgInstance.Data

if (!$dataDirectory) {

    throw "Could not determine PostgreSQL data directory."
}

$pgHbaFile = Join-Path $dataDirectory "pg_hba.conf"

if (!(Test-Path $pgHbaFile)) {

    throw "pg_hba.conf not found: $pgHbaFile"
}

Write-Host "[OK] PostgreSQL ready."
Write-Host ""

# =========================================================
# STEP 11 - RESET POSTGRES PASSWORD
# =========================================================

Write-Host "============================================="
Write-Host " STEP 11 - PostgreSQL Password"
Write-Host "============================================="
Write-Host ""

Write-Host "Target:"
Write-Host "User     : postgres"
Write-Host "Password : $databasePassword"
Write-Host ""

Write-Host "The current password is NOT required."
Write-Host ""

$backupName = "pg_hba.conf.school_erp_backup_{0}.bak" -f `
    (Get-Date -Format "yyyyMMdd_HHmmss")

$backupFile = Join-Path $dataDirectory $backupName

Copy-Item `
    -Path $pgHbaFile `
    -Destination $backupFile `
    -Force

Write-Host "Backup:"
Write-Host $backupFile
Write-Host ""

$temporaryAccessAdded = $false

try {

    $originalHba = Get-Content `
        -Path $pgHbaFile `
        -Raw

    $temporaryRules = @"
# SCHOOL ERP TEMPORARY PASSWORD RESET
# Automatically removed by installer.
host    all    postgres    127.0.0.1/32    trust
host    all    postgres    ::1/128         trust

"@

    $newHba = $temporaryRules + $originalHba

    # Write without a BOM
    [System.IO.File]::WriteAllText(
        $pgHbaFile,
        $newHba,
        [System.Text.UTF8Encoding]::new($false)
    )

    $temporaryAccessAdded = $true

    Write-Host "Temporary authentication enabled."
    Write-Host "Restarting PostgreSQL..."

    Restart-Service `
        -Name $pgInstance.Service.Name `
        -Force

    Start-Sleep -Seconds 6

    $serviceAfterRestart = Get-Service $pgInstance.Service.Name

    if ($serviceAfterRestart.Status -ne "Running") {

        throw "PostgreSQL failed to restart."
    }

    Write-Host ""
    Write-Host "Setting postgres password..."

    Remove-Item `
        Env:PGPASSWORD `
        -ErrorAction SilentlyContinue

    & $psqlPath `
        -U $databaseUser `
        -h $databaseHost `
        -p $databasePort `
        -d "postgres" `
        -v "ON_ERROR_STOP=1" `
        -c "ALTER USER postgres WITH PASSWORD 'password@123';"

    if ($LASTEXITCODE -ne 0) {

        throw "PostgreSQL password change failed."
    }

    Write-Host ""
    Write-Host "[OK] PostgreSQL password changed."
    Write-Host ""

}
finally {

    if ($temporaryAccessAdded) {

        Write-Host "Restoring original pg_hba.conf..."

        Copy-Item `
            -Path $backupFile `
            -Destination $pgHbaFile `
            -Force

        Write-Host "[OK] Original pg_hba.conf restored."

        Write-Host "Restarting PostgreSQL..."

        Restart-Service `
            -Name $pgInstance.Service.Name `
            -Force

        Start-Sleep -Seconds 6

        Remove-Item `
            Env:PGPASSWORD `
            -ErrorAction SilentlyContinue
    }
}

# =========================================================
# STEP 12 - VERIFY PASSWORD
# =========================================================

Write-Host ""
Write-Host "[12] Verifying PostgreSQL password..."
Write-Host ""

$env:PGPASSWORD = $databasePassword

& $psqlPath `
    -U $databaseUser `
    -h $databaseHost `
    -p $databasePort `
    -d "postgres" `
    -v "ON_ERROR_STOP=1" `
    -c "SELECT current_user, version();"

if ($LASTEXITCODE -ne 0) {

    Remove-Item `
        Env:PGPASSWORD `
        -ErrorAction SilentlyContinue

    throw "PostgreSQL password verification failed."
}

Write-Host ""
Write-Host "[OK] Password verified."
Write-Host ""

# =========================================================
# STEP 13 - CREATE DATABASE
# =========================================================

Write-Host "[13] Creating/checking school_erp database..."
Write-Host ""

$env:PGPASSWORD = $databasePassword

$dbExists = & $psqlPath `
    -U $databaseUser `
    -h $databaseHost `
    -p $databasePort `
    -d "postgres" `
    -tAc "SELECT 1 FROM pg_database WHERE datname = 'school_erp';"

if ($LASTEXITCODE -ne 0) {

    Remove-Item `
        Env:PGPASSWORD `
        -ErrorAction SilentlyContinue

    throw "Could not check database."
}

if ($dbExists.Trim() -eq "1") {

    Write-Host "[OK] Database already exists."

}
else {

    Write-Host "Creating database..."

    & $psqlPath `
        -U $databaseUser `
        -h $databaseHost `
        -p $databasePort `
        -d "postgres" `
        -v "ON_ERROR_STOP=1" `
        -c "CREATE DATABASE school_erp;"

    if ($LASTEXITCODE -ne 0) {

        Remove-Item `
            Env:PGPASSWORD `
            -ErrorAction SilentlyContinue

        throw "Database creation failed."
    }

    Write-Host "[OK] Database created."
}

Remove-Item `
    Env:PGPASSWORD `
    -ErrorAction SilentlyContinue

Write-Host ""

# =========================================================
# STEP 14 - PGADMIN
# =========================================================

Write-Host "[14] Checking pgAdmin 4..."
Write-Host ""

$pgAdminInstalled = $false

if (Test-Path "C:\Program Files\pgAdmin 4") {

    $pgAdminInstalled = $true
}

if (Test-Path "C:\Program Files (x86)\pgAdmin 4") {

    $pgAdminInstalled = $true
}

if ($pgAdminInstalled) {

    Write-Host "[OK] pgAdmin 4 already installed."

}
else {

    Write-Host "pgAdmin 4 is not installed."
    Write-Host "Installing..."

    try {

        Install-WingetPackage `
            -PackageId "pgAdmin.pgAdmin4"

    }
    catch {

        Write-Host ""
        Write-Host "WARNING: pgAdmin installation failed."
        Write-Host "PostgreSQL setup will continue."
        Write-Host ""
    }
}

Write-Host ""

# =========================================================
# STEP 15 - CREATE .ENV
# =========================================================

Write-Host "[15] Creating backend .env..."
Write-Host ""

$envFile = Join-Path $backendFolder ".env"

$databaseUrl =
    "postgresql://$databaseUser`:$databasePasswordEncoded@$databaseHost`:$databasePort/$databaseName"

$envContent = @"
DATABASE_URL="$databaseUrl"
PORT=$backendPort
JWT_SECRET="$jwtSecret"
NODE_ENV="development"
FRONTEND_URL="$frontendUrl"
"@

Set-Content `
    -Path $envFile `
    -Value $envContent `
    -Encoding UTF8

if (!(Test-Path $envFile)) {

    throw "Could not create backend .env."
}

Write-Host "[OK] Backend .env created:"
Write-Host $envFile
Write-Host ""

# =========================================================
# STEP 16 - PROTECT .ENV
# =========================================================

Write-Host "[16] Protecting .env..."
Write-Host ""

$gitignoreFile = Join-Path $backendFolder ".gitignore"

if (Test-Path $gitignoreFile) {

    $gitignoreContent = Get-Content `
        $gitignoreFile `
        -Raw
}
else {

    $gitignoreContent = ""
}

if ($gitignoreContent -notmatch "(?m)^\.env$") {

    Add-Content `
        -Path $gitignoreFile `
        -Value "`r`n# Environment variables`r`n.env`r`n"

    Write-Host "[OK] .env added to .gitignore."

}
else {

    Write-Host "[OK] .env already protected."
}

Write-Host ""

# =========================================================
# STEP 17 - FRONTEND NPM INSTALL
# =========================================================

Write-Host "[17] Installing frontend dependencies..."
Write-Host ""

Set-Location $frontendFolder

npm install

if ($LASTEXITCODE -ne 0) {

    throw "Frontend npm install failed."
}

Write-Host ""
Write-Host "[OK] Frontend dependencies installed."
Write-Host ""

# =========================================================
# STEP 18 - BACKEND NPM INSTALL
# =========================================================

Write-Host "[18] Installing backend dependencies..."
Write-Host ""

Set-Location $backendFolder

npm install

if ($LASTEXITCODE -ne 0) {

    throw "Backend npm install failed."
}

Write-Host ""
Write-Host "[OK] Backend dependencies installed."
Write-Host ""

# =========================================================
# STEP 19 - PRISMA GENERATE
# =========================================================

Write-Host "[19] Generating Prisma Client..."
Write-Host ""

Set-Location $backendFolder

$previousTlsSetting =
    $env:NODE_TLS_REJECT_UNAUTHORIZED

$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"

try {

    if (Test-Path "$backendFolder\node_modules\prisma\build\index.js") {

        Write-Host "Using local Prisma..."

        node `
            node_modules/prisma/build/index.js `
            generate

    }
    else {

        Write-Host "Using npx Prisma..."

        npx prisma generate
    }

    if ($LASTEXITCODE -ne 0) {

        throw "Prisma generate failed."
    }

}
finally {

    if ($null -eq $previousTlsSetting) {

        Remove-Item `
            Env:NODE_TLS_REJECT_UNAUTHORIZED `
            -ErrorAction SilentlyContinue

    }
    else {

        $env:NODE_TLS_REJECT_UNAUTHORIZED =
            $previousTlsSetting
    }
}

Write-Host ""
Write-Host "[OK] Prisma Client generated."
Write-Host ""

# =========================================================
# STEP 20 - PRISMA DB PUSH
# =========================================================

Write-Host "[20] Synchronizing database with Prisma..."
Write-Host ""

Set-Location $backendFolder

if (Test-Path "$backendFolder\prisma\schema.prisma") {

    npx prisma db push

    if ($LASTEXITCODE -ne 0) {

        Write-Host ""
        Write-Host "WARNING: prisma db push failed."
        Write-Host "The database and .env are still configured."
        Write-Host ""

    }
    else {

        Write-Host ""
        Write-Host "[OK] Prisma database synchronized."
    }

}
else {

    Write-Host "No prisma/schema.prisma found."
    Write-Host "Skipping Prisma."
}

Write-Host ""

# =========================================================
# STEP 21 - FINAL DATABASE TEST
# =========================================================

Write-Host "[21] Testing final PostgreSQL connection..."
Write-Host ""

$env:PGPASSWORD = $databasePassword

& $psqlPath `
    -U $databaseUser `
    -h $databaseHost `
    -p $databasePort `
    -d $databaseName `
    -v "ON_ERROR_STOP=1" `
    -c "SELECT current_database(), current_user;"

if ($LASTEXITCODE -ne 0) {

    Remove-Item `
        Env:PGPASSWORD `
        -ErrorAction SilentlyContinue

    throw "Final PostgreSQL connection test FAILED."
}

Remove-Item `
    Env:PGPASSWORD `
    -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "[OK] PostgreSQL connection PASSED."
Write-Host ""

# =========================================================
# STEP 22 - START BACKEND
# =========================================================

Write-Host "============================================="
Write-Host " STEP 22 - STARTING BACKEND"
Write-Host "============================================="
Write-Host ""

Set-Location $backendFolder

Write-Host "Backend:"
Write-Host "http://localhost:5000"
Write-Host ""

Start-Process `
    powershell.exe `
    -ArgumentList @(
        "-NoExit"
        "-Command"
        "Set-Location '$backendFolder'; npm start"
    )

Write-Host "[OK] Backend process started."
Write-Host ""

Start-Sleep -Seconds 5

# =========================================================
# STEP 23 - START FRONTEND
# =========================================================

Write-Host "============================================="
Write-Host " STEP 23 - STARTING FRONTEND"
Write-Host "============================================="
Write-Host ""

Set-Location $frontendFolder

Write-Host "Frontend:"
Write-Host "http://localhost:5173"
Write-Host ""

Start-Process `
    powershell.exe `
    -ArgumentList @(
        "-NoExit"
        "-Command"
        "Set-Location '$frontendFolder'; npm run dev"
    )

Write-Host "[OK] Frontend process started."
Write-Host ""

# =========================================================
# FINAL
# =========================================================

Write-Host ""
Write-Host "============================================="
Write-Host "       SCHOOL ERP SETUP COMPLETED"
Write-Host "============================================="
Write-Host ""

Write-Host "PROJECT"
Write-Host "---------------------------------------------"
Write-Host $repoFolder
Write-Host ""

Write-Host "FRONTEND"
Write-Host "---------------------------------------------"
Write-Host "http://localhost:5173"
Write-Host ""

Write-Host "BACKEND"
Write-Host "---------------------------------------------"
Write-Host "http://localhost:5000"
Write-Host ""

Write-Host "DATABASE"
Write-Host "---------------------------------------------"
Write-Host "Host       : localhost"
Write-Host "Port       : 5432"
Write-Host "Username   : postgres"
Write-Host "Password   : password@123"
Write-Host "Database   : school_erp"
Write-Host ""

Write-Host "DATABASE URL"
Write-Host "---------------------------------------------"
Write-Host "postgresql://postgres:password%40123@localhost:5432/school_erp"
Write-Host ""

Write-Host "BACKEND ENV"
Write-Host "---------------------------------------------"
Write-Host $envFile
Write-Host ""

Write-Host "PGADMIN"
Write-Host "---------------------------------------------"
Write-Host "Use PostgreSQL credentials:"
Write-Host "Username : postgres"
Write-Host "Password : password@123"
Write-Host "Host     : localhost"
Write-Host "Port     : 5432"
Write-Host "Database : school_erp"
Write-Host ""

Write-Host "NOTE:"
Write-Host "The pgAdmin master password is separate."
Write-Host "This script does NOT set the pgAdmin master password."
Write-Host ""

Write-Host "============================================="
Write-Host " BACKEND + FRONTEND ARE STARTING"
Write-Host "============================================="
Write-Host ""

Set-Location $repoFolder

Read-Host "Press Enter to close this installer window"

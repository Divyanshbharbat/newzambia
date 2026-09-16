# =========================================================
# School ERP - Complete Windows Setup Script
# =========================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================="
Write-Host "           School ERP Setup"
Write-Host "============================================="
Write-Host ""

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

# Final PostgreSQL password
$databasePassword = "password@123"

$databaseHost = "localhost"
$databasePort = "5432"
$databaseName = "school_erp"

# @ must be URL encoded in DATABASE_URL
$databasePasswordEncoded = "password%40123"

$backendPort = "5000"

$jwtSecret = "school_erp_jwt_secret_change_this"

$frontendUrl = "http://localhost:5173"

# =========================================================
# CHECK ADMINISTRATOR
# =========================================================

Write-Host "[0] Checking Administrator privileges..."
Write-Host ""

$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()

$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)

$isAdmin = $principal.IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (!$isAdmin) {
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
# HELPER - FIND POSTGRESQL SERVICES
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
# HELPER - GET POSTGRESQL DATA DIRECTORY
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

    # Typical PostgreSQL Windows service:
    #
    # pg_ctl.exe runservice -N "postgresql-x64-17"
    # -D "C:\Program Files\PostgreSQL\17\data"

    if ($pathName -match '-D\s+"([^"]+)"') {

        return $matches[1]
    }

    if ($pathName -match '-D\s+([^\s]+)') {

        return $matches[1]
    }

    return $null
}

# =========================================================
# HELPER - GET POSTGRESQL BIN DIRECTORY
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

    # Find pg_ctl.exe location
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
# HELPER - FIND INSTANCE USING PORT 5432
# =========================================================

function Get-PostgresInstanceOnPort {

    param(
        [int]$Port
    )

    Write-Host "Checking which process is using TCP port $Port..."

    $connection = Get-NetTCPConnection `
        -LocalPort $Port `
        -State Listen `
        -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if (!$connection) {

        return $null
    }

    $processId = $connection.OwningProcess

    Write-Host "Port $Port is owned by PID: $processId"

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

        Write-Host "Could not map PID to PostgreSQL service."

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
# HELPER - FIND POSTGRESQL INSTALLATION
# =========================================================

function Find-AnyPostgresBin {

    $possiblePaths = @(
        "C:\Program Files\PostgreSQL\18\bin",
        "C:\Program Files\PostgreSQL\17\bin",
        "C:\Program Files\PostgreSQL\16\bin",
        "C:\Program Files\PostgreSQL\15\bin",
        "C:\Program Files\PostgreSQL\14\bin",
        "C:\Program Files\PostgreSQL\13\bin",
        "C:\Program Files\PostgreSQL\12\bin",
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
# HELPER - RUN PSQL
# =========================================================

function Invoke-PSQL {

    param(
        [Parameter(Mandatory=$true)]
        [string]$PsqlPath,

        [Parameter(Mandatory=$true)]
        [string]$Database,

        [Parameter(Mandatory=$true)]
        [string]$Sql
    )

    & $PsqlPath `
        -U $databaseUser `
        -h $databaseHost `
        -p $databasePort `
        -d $Database `
        -v "ON_ERROR_STOP=1" `
        -c $Sql

    return $LASTEXITCODE
}

# =========================================================
# STEP 1 - GIT
# =========================================================

Write-Host "[1] Checking Git..."
Write-Host ""

if (Get-Command git -ErrorAction SilentlyContinue) {

    Write-Host "Git is already installed:"
    git --version
}
else {

    Write-Host "Git is not installed."
    Write-Host "Installing Git..."

    if (!(Get-Command winget -ErrorAction SilentlyContinue)) {

        throw "Git is not installed and winget is unavailable."
    }

    winget install `
        --id Git.Git `
        --exact `
        --source winget `
        --accept-source-agreements `
        --accept-package-agreements

    if ($LASTEXITCODE -ne 0) {

        throw "Git installation failed."
    }

    Refresh-Path
}

Write-Host ""

# =========================================================
# STEP 2 - CREATE BASE FOLDER
# =========================================================

Write-Host "[2] Creating school_erp folder..."
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
# STEP 3 - CLONE REPOSITORY
# =========================================================

Write-Host "[3] Cloning NewZambia repository..."
Write-Host ""

Set-Location $baseFolder

if (Test-Path $repoFolder) {

    Write-Host "Repository already exists:"
    Write-Host $repoFolder
    Write-Host "Skipping clone."
}
else {

    git clone $repoUrl

    if ($LASTEXITCODE -ne 0) {

        throw "Git clone failed."
    }

    Write-Host "Git clone completed successfully."
}

Write-Host ""

# =========================================================
# STEP 4 - VERIFY REPOSITORY
# =========================================================

Write-Host "[4] Verifying repository..."
Write-Host ""

if (!(Test-Path $repoFolder)) {

    throw "Repository folder was not found."
}

Write-Host "Repository found:"
Write-Host $repoFolder

Write-Host ""

# =========================================================
# STEP 5 - NODE.JS
# =========================================================

Write-Host "[5] Checking Node.js..."
Write-Host ""

$node = Get-Command node -ErrorAction SilentlyContinue

if ($node) {

    $currentNodeVersion = node --version

    Write-Host "Installed Node.js:"
    Write-Host $currentNodeVersion

    Write-Host "Required Node.js:"
    Write-Host $requiredNodeVersion

    if ($currentNodeVersion -ne $requiredNodeVersion) {

        Write-Host ""
        Write-Host "WARNING:"
        Write-Host "Installed Node.js version differs from required version."
        Write-Host "The script will continue using the installed version."
    }
}
else {

    Write-Host "Node.js is not installed."
}

Write-Host ""

# =========================================================
# STEP 6 - INSTALL NODE IF MISSING
# =========================================================

if (!$node) {

    Write-Host "[6] Installing Node.js..."
    Write-Host ""

    if (!(Get-Command winget -ErrorAction SilentlyContinue)) {

        throw "winget is unavailable. Install Node.js manually."
    }

    winget install `
        --id OpenJS.NodeJS `
        --source winget `
        --accept-source-agreements `
        --accept-package-agreements

    if ($LASTEXITCODE -ne 0) {

        throw "Node.js installation failed."
    }

    Refresh-Path

    Write-Host "Node.js installation completed."
}
else {

    Write-Host "[6] Node.js installation skipped."
}

Write-Host ""

# =========================================================
# STEP 7 - VS CODE
# =========================================================

Write-Host "[7] Checking Visual Studio Code..."
Write-Host ""

if (Get-Command code -ErrorAction SilentlyContinue) {

    Write-Host "Visual Studio Code is already installed."
}
else {

    Write-Host "VS Code is not installed."

    if (Get-Command winget -ErrorAction SilentlyContinue) {

        winget install `
            --id Microsoft.VisualStudioCode `
            --exact `
            --source winget `
            --accept-source-agreements `
            --accept-package-agreements

        if ($LASTEXITCODE -eq 0) {

            Write-Host "VS Code installed successfully."
        }
        else {

            Write-Host "WARNING: VS Code installation failed."
        }
    }
    else {

        Write-Host "WARNING: winget unavailable."
    }
}

Write-Host ""

# =========================================================
# STEP 8 - POSTGRESQL
# =========================================================

Write-Host "[8] Checking PostgreSQL..."
Write-Host ""

$postgresServices = Get-PostgresServices

$postgresBin = Find-AnyPostgresBin

if ($postgresServices.Count -gt 0) {

    Write-Host "PostgreSQL services found:"

    foreach ($service in $postgresServices) {

        Write-Host " - $($service.Name)"
    }
}
else {

    Write-Host "No PostgreSQL Windows service found."
}

if (!$postgresBin) {

    Write-Host ""
    Write-Host "PostgreSQL is not installed."
    Write-Host "Installing PostgreSQL..."

    if (!(Get-Command winget -ErrorAction SilentlyContinue)) {

        throw "PostgreSQL is not installed and winget is unavailable."
    }

    winget install `
        --id PostgreSQL.PostgreSQL `
        --source winget `
        --accept-source-agreements `
        --accept-package-agreements

    if ($LASTEXITCODE -ne 0) {

        throw "PostgreSQL installation failed."
    }

    Refresh-Path

    Start-Sleep -Seconds 8

    $postgresServices = Get-PostgresServices

    $postgresBin = Find-AnyPostgresBin

    if (!$postgresBin) {

        throw "PostgreSQL installed but psql.exe could not be found."
    }
}

Write-Host ""
Write-Host "PostgreSQL installation detected."

# =========================================================
# STEP 9 - DETECT POSTGRESQL INSTANCE ON 5432
# =========================================================

Write-Host ""
Write-Host "[9] Detecting PostgreSQL instance using port 5432..."
Write-Host ""

$pgInstance = Get-PostgresInstanceOnPort -Port 5432

if ($pgInstance) {

    Write-Host ""
    Write-Host "PostgreSQL instance found."
    Write-Host "Service : $($pgInstance.Service.Name)"
    Write-Host "PID     : $($pgInstance.PID)"
    Write-Host "Bin     : $($pgInstance.Bin)"
    Write-Host "Data    : $($pgInstance.Data)"
}
else {

    Write-Host ""
    Write-Host "No PostgreSQL server is currently listening on port 5432."
    Write-Host ""

    if ($postgresServices.Count -eq 0) {

        throw "No PostgreSQL service is available."
    }

    Write-Host "Attempting to find a PostgreSQL service configured for port 5432..."

    foreach ($service in $postgresServices) {

        $dataDir = Get-PostgresDataDirectory -Service $service

        if (!$dataDir) {
            continue
        }

        $configFile = Join-Path $dataDir "postgresql.conf"

        if (!(Test-Path $configFile)) {
            continue
        }

        $config = Get-Content $configFile -Raw

        if (
            $config -match '(?m)^\s*port\s*=\s*5432'
        ) {

            Write-Host "Found service configured for port 5432:"
            Write-Host $service.Name

            if ($service.State -ne "Running") {

                Write-Host "Starting service..."

                Start-Service $service.Name

                Start-Sleep -Seconds 5
            }

            break
        }
    }

    Start-Sleep -Seconds 3

    $pgInstance = Get-PostgresInstanceOnPort -Port 5432
}

if (!$pgInstance) {

    throw @"
Could not find a PostgreSQL instance listening on port 5432.

Please check:

Get-Service postgresql*
Get-NetTCPConnection -LocalPort 5432 -State Listen
"@
}

# =========================================================
# ENSURE SERVICE IS RUNNING
# =========================================================

$pgService = Get-Service $pgInstance.Service.Name

if ($pgService.Status -ne "Running") {

    Write-Host ""
    Write-Host "Starting PostgreSQL service:"
    Write-Host $pgService.Name

    Start-Service $pgService.Name

    Start-Sleep -Seconds 5
}

# =========================================================
# UPDATE INSTANCE INFORMATION
# =========================================================

$pgInstance = Get-PostgresInstanceOnPort -Port 5432

if (!$pgInstance) {

    throw "PostgreSQL is not listening on port 5432 after service startup."
}

$postgresBin = $pgInstance.Bin

if (!$postgresBin) {

    throw "Could not determine PostgreSQL bin directory."
}

$psqlPath = Join-Path $postgresBin "psql.exe"

if (!(Test-Path $psqlPath)) {

    throw "psql.exe not found at $psqlPath"
}

$dataDirectory = $pgInstance.Data

if (!$dataDirectory) {

    throw "Could not determine PostgreSQL data directory."
}

$pgHbaFile = Join-Path $dataDirectory "pg_hba.conf"

if (!(Test-Path $pgHbaFile)) {

    throw "pg_hba.conf not found at $pgHbaFile"
}

Write-Host ""
Write-Host "Using PostgreSQL:"
Write-Host "Service : $($pgInstance.Service.Name)"
Write-Host "Version : $postgresBin"
Write-Host "Data    : $dataDirectory"
Write-Host ""

# =========================================================
# STEP 10 - RESET POSTGRES PASSWORD
# =========================================================

Write-Host "[10] Resetting PostgreSQL postgres password..."
Write-Host ""

Write-Host "Current password is NOT required."
Write-Host ""
Write-Host "The script will temporarily allow local PostgreSQL"
Write-Host "authentication, set the new password, and immediately"
Write-Host "restore the original pg_hba.conf."
Write-Host ""

# ---------------------------------------------------------
# Backup pg_hba.conf
# ---------------------------------------------------------

$backupName = "pg_hba.conf.school_erp_backup_{0}.bak" -f `
    (Get-Date -Format "yyyyMMdd_HHmmss")

$backupFile = Join-Path $dataDirectory $backupName

Copy-Item `
    -Path $pgHbaFile `
    -Destination $backupFile `
    -Force

Write-Host "Backup created:"
Write-Host $backupFile

$temporaryAccessAdded = $false

try {

    # -----------------------------------------------------
    # Read original pg_hba.conf
    # -----------------------------------------------------

    $originalHba = Get-Content `
        -Path $pgHbaFile `
        -Raw

    # -----------------------------------------------------
    # Temporary local trust rules
    # These are placed at the TOP so they take precedence.
    # -----------------------------------------------------

    $temporaryRules = @"
# SCHOOL ERP TEMPORARY PASSWORD RESET
# This section is automatically removed by the installer.
host    all    postgres    127.0.0.1/32    trust
host    all    postgres    ::1/128         trust

"@

    $newHba = $temporaryRules + $originalHba

    Set-Content `
        -Path $pgHbaFile `
        -Value $newHba `
        -Encoding UTF8

    $temporaryAccessAdded = $true

    Write-Host ""
    Write-Host "Temporary local authentication enabled."

    # -----------------------------------------------------
    # Restart PostgreSQL
    # -----------------------------------------------------

    Write-Host "Restarting PostgreSQL..."

    Restart-Service `
        -Name $pgInstance.Service.Name `
        -Force

    Start-Sleep -Seconds 5

    # -----------------------------------------------------
    # Verify server is back
    # -----------------------------------------------------

    $serviceAfterRestart = Get-Service $pgInstance.Service.Name

    if ($serviceAfterRestart.Status -ne "Running") {

        throw "PostgreSQL service failed to restart."
    }

    # -----------------------------------------------------
    # Set password
    # -----------------------------------------------------

    Write-Host ""
    Write-Host "Setting PostgreSQL password..."

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

        throw "Could not set PostgreSQL password."
    }

    Write-Host ""
    Write-Host "[OK] PostgreSQL password changed successfully."

}
finally {

    # -----------------------------------------------------
    # ALWAYS restore pg_hba.conf
    # -----------------------------------------------------

    if ($temporaryAccessAdded) {

        Write-Host ""
        Write-Host "Restoring original pg_hba.conf..."

        Copy-Item `
            -Path $backupFile `
            -Destination $pgHbaFile `
            -Force

        Write-Host "Original pg_hba.conf restored."

        Write-Host "Restarting PostgreSQL to apply authentication settings..."

        Restart-Service `
            -Name $pgInstance.Service.Name `
            -Force

        Start-Sleep -Seconds 5

        Remove-Item `
            Env:PGPASSWORD `
            -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "PostgreSQL password is now:"
Write-Host "password@123"
Write-Host ""

# =========================================================
# STEP 11 - VERIFY NEW PASSWORD
# =========================================================

Write-Host "[11] Verifying PostgreSQL password..."
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

    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

    throw "New PostgreSQL password verification failed."
}

Write-Host ""
Write-Host "[OK] PostgreSQL password verified."

# =========================================================
# STEP 12 - CREATE DATABASE
# =========================================================

Write-Host ""
Write-Host "[12] Checking school_erp database..."
Write-Host ""

$env:PGPASSWORD = $databasePassword

$dbExists = & $psqlPath `
    -U $databaseUser `
    -h $databaseHost `
    -p $databasePort `
    -d "postgres" `
    -tAc "SELECT 1 FROM pg_database WHERE datname = 'school_erp';"

if ($LASTEXITCODE -ne 0) {

    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

    throw "Could not check PostgreSQL databases."
}

if ($dbExists.Trim() -eq "1") {

    Write-Host "Database already exists:"
    Write-Host $databaseName
}
else {

    Write-Host "Database does not exist."
    Write-Host "Creating database..."

    & $psqlPath `
        -U $databaseUser `
        -h $databaseHost `
        -p $databasePort `
        -d "postgres" `
        -v "ON_ERROR_STOP=1" `
        -c "CREATE DATABASE school_erp;"

    if ($LASTEXITCODE -ne 0) {

        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

        throw "Database creation failed."
    }

    Write-Host "[OK] Database created."
}

Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""

# =========================================================
# STEP 13 - PGADMIN 4
# =========================================================

Write-Host "[13] Checking pgAdmin 4..."
Write-Host ""

$pgAdminInstalled = $false

if (Get-Command pgadmin4 -ErrorAction SilentlyContinue) {

    $pgAdminInstalled = $true
}

if (Test-Path "C:\Program Files\pgAdmin 4") {

    $pgAdminInstalled = $true
}

if (Test-Path "C:\Program Files (x86)\pgAdmin 4") {

    $pgAdminInstalled = $true
}

if ($pgAdminInstalled) {

    Write-Host "pgAdmin 4 is already installed."
}
else {

    Write-Host "pgAdmin 4 is not installed."

    if (Get-Command winget -ErrorAction SilentlyContinue) {

        Write-Host "Installing pgAdmin 4..."

        winget install `
            --id pgAdmin.pgAdmin4 `
            --exact `
            --source winget `
            --accept-source-agreements `
            --accept-package-agreements

        if ($LASTEXITCODE -eq 0) {

            Write-Host "[OK] pgAdmin 4 installed."
        }
        else {

            Write-Host "WARNING: pgAdmin installation failed."
            Write-Host "You can install pgAdmin manually."
        }
    }
    else {

        Write-Host "WARNING: winget unavailable."
    }
}

Write-Host ""

# =========================================================
# STEP 14 - VERIFY PROJECT FOLDERS
# =========================================================

Write-Host "[14] Verifying project folders..."
Write-Host ""

if (!(Test-Path $frontendFolder)) {

    throw "Frontend folder not found: $frontendFolder"
}

if (!(Test-Path $backendFolder)) {

    throw "Backend folder not found: $backendFolder"
}

Write-Host "[OK] Frontend:"
Write-Host $frontendFolder

Write-Host ""

Write-Host "[OK] Backend:"
Write-Host $backendFolder

Write-Host ""

# =========================================================
# STEP 15 - CREATE BACKEND .ENV
# =========================================================

Write-Host "[15] Creating backend .env..."
Write-Host ""

$envFile = Join-Path $backendFolder ".env"

$databaseUrl = `
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

Write-Host "[OK] .env created:"
Write-Host $envFile

Write-Host ""
Write-Host "DATABASE_URL:"
Write-Host 'postgresql://postgres:password%40123@localhost:5432/school_erp'

Write-Host ""

# =========================================================
# STEP 16 - PROTECT .ENV
# =========================================================

Write-Host "[16] Protecting .env from Git..."
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

    Write-Host "[OK] .env added to backend .gitignore."
}
else {

    Write-Host ".env is already protected."
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

# =========================================================
# STEP 18 - BACKEND NPM INSTALL
# =========================================================

Write-Host ""
Write-Host "[18] Installing backend dependencies..."
Write-Host ""

Set-Location $backendFolder

npm install

if ($LASTEXITCODE -ne 0) {

    throw "Backend npm install failed."
}

Write-Host ""
Write-Host "[OK] Backend dependencies installed."

# =========================================================
# STEP 19 - PRISMA GENERATE
# =========================================================

Write-Host ""
Write-Host "[19] Generating Prisma Client..."
Write-Host ""

Set-Location $backendFolder

$previousTlsSetting = $env:NODE_TLS_REJECT_UNAUTHORIZED

$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"

try {

    if (Test-Path "$backendFolder\node_modules\prisma\build\index.js") {

        Write-Host "Using local Prisma installation..."

        node `
            node_modules/prisma/build/index.js `
            generate
    }
    else {

        Write-Host "Using npx prisma generate..."

        npx prisma generate
    }

    if ($LASTEXITCODE -ne 0) {

        throw "Prisma Client generation failed."
    }

}
finally {

    if ($null -eq $previousTlsSetting) {

        Remove-Item `
            Env:NODE_TLS_REJECT_UNAUTHORIZED `
            -ErrorAction SilentlyContinue
    }
    else {

        $env:NODE_TLS_REJECT_UNAUTHORIZED = $previousTlsSetting
    }
}

Write-Host ""
Write-Host "[OK] Prisma Client generated."

# =========================================================
# STEP 20 - PRISMA DB PUSH
# =========================================================

Write-Host ""
Write-Host "[20] Synchronizing Prisma database..."
Write-Host ""

Set-Location $backendFolder

if (Test-Path "$backendFolder\prisma\schema.prisma") {

    Write-Host "Prisma schema found."
    Write-Host "Running prisma db push..."

    npx prisma db push

    if ($LASTEXITCODE -ne 0) {

        Write-Host ""
        Write-Host "WARNING:"
        Write-Host "Prisma db push failed."
        Write-Host "PostgreSQL and .env are still configured."
        Write-Host ""
    }
    else {

        Write-Host ""
        Write-Host "[OK] Prisma database synchronized."
    }
}
else {

    Write-Host "No prisma/schema.prisma found."
    Write-Host "Skipping Prisma database synchronization."
}

# =========================================================
# STEP 21 - VERIFY .ENV
# =========================================================

Write-Host ""
Write-Host "[21] Verifying .env..."
Write-Host ""

if (!(Test-Path $envFile)) {

    throw ".env verification failed."
}

$envCheck = Get-Content `
    $envFile `
    -Raw

if ($envCheck -match "DATABASE_URL=") {

    Write-Host "[OK] DATABASE_URL"
}
else {

    throw "DATABASE_URL missing."
}

if ($envCheck -match "PORT=") {

    Write-Host "[OK] PORT"
}
else {

    throw "PORT missing."
}

if ($envCheck -match "JWT_SECRET=") {

    Write-Host "[OK] JWT_SECRET"
}
else {

    throw "JWT_SECRET missing."
}

if ($envCheck -match "NODE_ENV=") {

    Write-Host "[OK] NODE_ENV"
}
else {

    throw "NODE_ENV missing."
}

if ($envCheck -match "FRONTEND_URL=") {

    Write-Host "[OK] FRONTEND_URL"
}
else {

    throw "FRONTEND_URL missing."
}

# =========================================================
# STEP 22 - FINAL DATABASE TEST
# =========================================================

Write-Host ""
Write-Host "[22] Testing final PostgreSQL connection..."
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
Write-Host "[OK] PostgreSQL connection test PASSED."

# =========================================================
# FINAL INFORMATION
# =========================================================

Write-Host ""
Write-Host "============================================="
Write-Host "       SETUP COMPLETED SUCCESSFULLY"
Write-Host "============================================="
Write-Host ""

Write-Host "Project:"
Write-Host $repoFolder

Write-Host ""

Write-Host "Frontend:"
Write-Host $frontendFolder

Write-Host ""

Write-Host "Backend:"
Write-Host $backendFolder

Write-Host ""

Write-Host "Environment:"
Write-Host $envFile

Write-Host ""

Write-Host "============================================="
Write-Host " DATABASE INFORMATION"
Write-Host "============================================="
Write-Host ""

Write-Host "Host       : localhost"
Write-Host "Port       : 5432"
Write-Host "Username   : postgres"
Write-Host "Password   : password@123"
Write-Host "Database   : school_erp"

Write-Host ""

Write-Host "DATABASE_URL:"
Write-Host 'postgresql://postgres:password%40123@localhost:5432/school_erp'

Write-Host ""

Write-Host "============================================="
Write-Host " COMPONENT STATUS"
Write-Host "============================================="
Write-Host ""

Write-Host "Git:                 Available"
Write-Host "Node.js:             Available"
Write-Host "VS Code:             Available / Installed"
Write-Host "PostgreSQL:          Configured"
Write-Host "pgAdmin:             Available / Installed"
Write-Host "PostgreSQL Password: password@123"
Write-Host "Database:            school_erp"
Write-Host "Frontend npm:        Installed"
Write-Host "Backend npm:         Installed"
Write-Host "Prisma Client:       Generated"
Write-Host ".env:                Created"

Write-Host ""

Write-Host "============================================="
Write-Host " IMPORTANT"
Write-Host "============================================="
Write-Host ""

Write-Host "PostgreSQL username : postgres"
Write-Host "PostgreSQL password : password@123"
Write-Host "Database            : school_erp"
Write-Host ""

Write-Host "pgAdmin master password is DIFFERENT."
Write-Host "The password above is the PostgreSQL database password."
Write-Host ""

Write-Host "You can now start your backend and frontend."
Write-Host ""

Set-Location $repoFolder

Read-Host "Press Enter to exit"

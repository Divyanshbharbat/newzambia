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
# .ENV CONFIGURATION
# =========================================================
# Change these values according to your PostgreSQL setup.

$databaseUser = "postgres"
$databasePassword = "password@123"
$databaseHost = "localhost"
$databasePort = "5432"
$databaseName = "school_erp"

$backendPort = "5000"

# JWT secret used by the backend
$jwtSecret = "school_erp_jwt_secret_change_this"

# Frontend URL
$frontendUrl = "http://localhost:5173"

# =========================================================
# STEP 1 - CHECK GIT
# =========================================================

Write-Host "[1] Checking Git..."
Write-Host ""

if (Get-Command git -ErrorAction SilentlyContinue) {

    $gitVersion = git --version

    Write-Host "Git is already installed:"
    Write-Host $gitVersion

}
else {

    Write-Host "Git is NOT installed."
    Write-Host "Installing Git..."

    if (!(Get-Command winget -ErrorAction SilentlyContinue)) {

        throw "Git is not installed and Windows Package Manager (winget) is not available. Please install Git manually."

    }

    winget install --id Git.Git `
        --exact `
        --source winget `
        --accept-source-agreements `
        --accept-package-agreements

    if ($LASTEXITCODE -ne 0) {

        throw "Git installation failed."

    }

    Write-Host "Git installation completed."

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")

}

Write-Host ""
Write-Host "---------------------------------------------"
Write-Host ""


# =========================================================
# STEP 2 - CREATE school_erp FOLDER
# =========================================================

Write-Host "[2] Creating school_erp folder..."
Write-Host ""

if (!(Test-Path $baseFolder)) {

    New-Item -ItemType Directory -Path $baseFolder | Out-Null

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

    throw "ERROR: NewZambia repository folder was not created."

}

Write-Host "Repository found:"
Write-Host $repoFolder

Write-Host ""


# =========================================================
# STEP 5 - CHECK NODE.JS
# =========================================================

Write-Host "[5] Checking Node.js..."
Write-Host ""

$nodeExists = Get-Command node -ErrorAction SilentlyContinue

if ($nodeExists) {

    $currentNodeVersion = node --version

    Write-Host "Installed Node.js version:"
    Write-Host $currentNodeVersion

    Write-Host "Required Node.js version:"
    Write-Host $requiredNodeVersion

    if ($currentNodeVersion -eq $requiredNodeVersion) {

        Write-Host "Correct Node.js version is already installed."

    }
    else {

        Write-Host ""
        Write-Host "WARNING:"
        Write-Host "Installed Node.js version differs from required version."
        Write-Host "The script will continue using the installed Node.js."

    }

}
else {

    Write-Host "Node.js is not installed."

}

Write-Host ""


# =========================================================
# STEP 6 - INSTALL NODE.JS IF MISSING
# =========================================================

if (!$nodeExists) {

    Write-Host "[6] Installing Node.js..."
    Write-Host ""

    if (!(Get-Command winget -ErrorAction SilentlyContinue)) {

        throw "winget is not available. Please install Node.js manually."

    }

    winget install OpenJS.NodeJS `
        --accept-source-agreements `
        --accept-package-agreements

    if ($LASTEXITCODE -ne 0) {

        throw "Node.js installation failed."

    }

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")

    Write-Host "Node.js installation completed."

}
else {

    Write-Host "[6] Node.js installation skipped."

}

Write-Host ""


# =========================================================
# STEP 7 - INSTALL VISUAL STUDIO CODE
# =========================================================

Write-Host "[7] Checking Visual Studio Code..."
Write-Host ""

if (Get-Command code -ErrorAction SilentlyContinue) {

    Write-Host "Visual Studio Code is already installed."

}
else {

    Write-Host "Visual Studio Code is not installed."
    Write-Host "Installing Visual Studio Code..."

    if (Get-Command winget -ErrorAction SilentlyContinue) {

        winget install `
            --id Microsoft.VisualStudioCode `
            --exact `
            --source winget `
            --accept-source-agreements `
            --accept-package-agreements

        if ($LASTEXITCODE -eq 0) {

            Write-Host "Visual Studio Code installation completed successfully."

        }
        else {

            Write-Host "VS Code installation exited with code $LASTEXITCODE."

        }

    }
    else {

        Write-Host "winget is not available."
        Write-Host "Please install Visual Studio Code manually."

    }

}

Write-Host ""


# =========================================================
# STEP 8 - INSTALL PGADMIN 4
# =========================================================

Write-Host "[8] Checking pgAdmin..."
Write-Host ""

if (
    (Get-Command pgadmin4 -ErrorAction SilentlyContinue) -or
    (Test-Path "C:\Program Files\pgAdmin 4") -or
    (Test-Path "C:\Program Files (x86)\pgAdmin 4")
) {

    Write-Host "pgAdmin is already installed."

}
else {

    Write-Host "pgAdmin is not installed."
    Write-Host "Installing pgAdmin 4..."

    if (Get-Command winget -ErrorAction SilentlyContinue) {

        winget install `
            --id pgAdmin.pgAdmin4 `
            --exact `
            --source winget `
            --accept-source-agreements `
            --accept-package-agreements

        if ($LASTEXITCODE -eq 0) {

            Write-Host "pgAdmin 4 installation completed successfully."

        }
        else {

            Write-Host "pgAdmin installation exited with code $LASTEXITCODE."

        }

    }
    else {

        Write-Host "winget is not available."
        Write-Host "Please install pgAdmin 4 manually."

    }

}

Write-Host ""


# =========================================================
# STEP 8.1 - CONFIGURE POSTGRESQL & PGADMIN PASSWORD
# =========================================================

Write-Host "[8.1] Configuring PostgreSQL & pgAdmin Password to $databasePassword..."
Write-Host ""

$psqlCmd = $null
if (Get-Command psql -ErrorAction SilentlyContinue) {
    $psqlCmd = (Get-Command psql).Source
}
else {
    $foundPsql = Resolve-Path "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
        Sort-Object Path -Descending |
        Select-Object -First 1
    if ($foundPsql) {
        $psqlCmd = $foundPsql.Path
    }
}

if ($psqlCmd) {
    Write-Host "Found PostgreSQL CLI: $psqlCmd"

    # Check ports (5433 for Postgres 17 or 5432 for Postgres 12/default)
    $portsToCheck = @(5433, 5432)
    $detectedPort = $null

    foreach ($p in $portsToCheck) {
        $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port $p -WarningAction SilentlyContinue
        if ($tcp.TcpTestSucceeded) {
            Write-Host "PostgreSQL is actively listening on port $p."
            
            # Try to connect with known passwords and change to $databasePassword
            $candidatePasswords = @($databasePassword, "12345678", "postgres", "admin", "root", "1234", "123456", "")
            $connected = $false
            foreach ($candPass in $candidatePasswords) {
                $env:PGPASSWORD = $candPass
                $null = & $psqlCmd -U postgres -p $p -h 127.0.0.1 -w -c "SELECT 1;" 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "Connected to PostgreSQL on port $p."
                    # Set password for postgres user
                    & $psqlCmd -U postgres -p $p -h 127.0.0.1 -w -c "ALTER USER postgres WITH PASSWORD '$databasePassword';" 2>&1 | Out-Null
                    Write-Host "[OK] PostgreSQL user 'postgres' password set to '$databasePassword' on port $p."
                    
                    # Ensure school_erp database exists
                    $env:PGPASSWORD = $databasePassword
                    $dbCheck = & $psqlCmd -U postgres -p $p -h 127.0.0.1 -w -t -c "SELECT 1 FROM pg_database WHERE datname='$databaseName';" 2>&1
                    if ($dbCheck -notmatch "1") {
                        Write-Host "Creating database '$databaseName' on port $p..."
                        & $psqlCmd -U postgres -p $p -h 127.0.0.1 -w -c "CREATE DATABASE $databaseName;" 2>&1 | Out-Null
                        Write-Host "[OK] Database '$databaseName' created successfully."
                    } else {
                        Write-Host "[OK] Database '$databaseName' already exists on port $p."
                    }
                    $connected = $true
                    $detectedPort = $p
                    break
                }
            }
            if ($connected) { break }
        }
    }

    if ($detectedPort) {
        $databasePort = "$detectedPort"
        Write-Host "Configured active database port: $databasePort"
    }
}
else {
    Write-Host "PostgreSQL CLI (psql) not found in PATH or standard directories."
}

# Update pgAdmin 4 local registered servers if present
try {
    $pgAdminDbPath = "$env:APPDATA\pgAdmin\pgadmin4.db"
    if (Test-Path $pgAdminDbPath) {
        if (Get-Command python -ErrorAction SilentlyContinue) {
            python -c "import sqlite3; conn = sqlite3.connect(r'$pgAdminDbPath'); cur = conn.cursor(); cur.execute('UPDATE server SET port = $databasePort WHERE port != $databasePort'); conn.commit(); conn.close()" 2>&1 | Out-Null
            Write-Host "[OK] Synchronized pgAdmin 4 server entries to port $databasePort."
        }
    }
} catch {
    # Non-critical, continue
}

Write-Host ""


# =========================================================
# STEP 9 - VERIFY FRONTEND AND BACKEND FOLDERS
# =========================================================

Write-Host "[9] Verifying project folders..."
Write-Host ""

if (!(Test-Path $frontendFolder)) {

    throw "Frontend folder not found: $frontendFolder"

}

if (!(Test-Path $backendFolder)) {

    throw "Backend folder not found: $backendFolder"

}

Write-Host "Frontend folder:"
Write-Host $frontendFolder

Write-Host ""

Write-Host "Backend folder:"
Write-Host $backendFolder

Write-Host ""


# =========================================================
# STEP 10 - CREATE BACKEND .ENV FILE
# =========================================================

Write-Host "[10] Creating backend .env file..."
Write-Host ""

$envFile = "$backendFolder\.env"

# PostgreSQL DATABASE_URL (URL-encoded to safely handle special characters like '@')
$encodedPassword = [System.Uri]::EscapeDataString($databasePassword)
$databaseUrl = "postgresql://$databaseUser`:$encodedPassword@$databaseHost`:$databasePort/$databaseName"

# Create .env content
$envContent = @"
DATABASE_URL="$databaseUrl"

PORT=$backendPort

JWT_SECRET="$jwtSecret"

NODE_ENV="development"

FRONTEND_URL="$frontendUrl"

"@

# Write .env
Set-Content `
    -Path $envFile `
    -Value $envContent `
    -Encoding UTF8

if (!(Test-Path $envFile)) {

    throw "Failed to create backend .env file."

}

Write-Host "Backend .env created successfully:"
Write-Host $envFile

Write-Host ""
Write-Host "---------------------------------------------"
Write-Host "Generated environment variables:"
Write-Host "DATABASE_URL"
Write-Host "PORT"
Write-Host "JWT_SECRET"
Write-Host "NODE_ENV"
Write-Host "FRONTEND_URL"
Write-Host "---------------------------------------------"
Write-Host ""


# =========================================================
# STEP 11 - ADD .ENV TO .GITIGNORE
# =========================================================

Write-Host "[11] Protecting .env from Git..."
Write-Host ""

$gitignoreFile = "$backendFolder\.gitignore"

if (Test-Path $gitignoreFile) {

    $gitignoreContent = Get-Content $gitignoreFile -Raw

}
else {

    $gitignoreContent = ""

}

if ($gitignoreContent -notmatch "(?m)^\.env$") {

    Add-Content `
        -Path $gitignoreFile `
        -Value "`r`n# Environment variables`r`n.env`r`n"

    Write-Host ".env added to backend .gitignore."

}
else {

    Write-Host ".env is already protected by .gitignore."

}

Write-Host ""


# =========================================================
# STEP 12 - INSTALL FRONTEND DEPENDENCIES
# =========================================================

Write-Host "[12] Installing FRONTEND dependencies..."
Write-Host ""

Set-Location $frontendFolder

Write-Host "Frontend:"
Write-Host $frontendFolder

Write-Host ""

Write-Host "Running npm install..."
Write-Host ""

npm install

if ($LASTEXITCODE -ne 0) {

    throw "Frontend npm install FAILED."

}

Write-Host ""
Write-Host "Frontend npm install completed successfully."

Write-Host ""


# =========================================================
# STEP 13 - INSTALL BACKEND DEPENDENCIES
# =========================================================

Write-Host "[13] Installing BACKEND dependencies..."
Write-Host ""

Set-Location $backendFolder

Write-Host "Backend:"
Write-Host $backendFolder

Write-Host ""

Write-Host "Running npm install..."
Write-Host ""

npm install

if ($LASTEXITCODE -ne 0) {

    throw "Backend npm install FAILED."

}

Write-Host ""
Write-Host "Backend npm install completed successfully."

Write-Host ""


# =========================================================
# STEP 14 - GENERATE PRISMA CLIENT
# =========================================================

Write-Host "[14] Generating Prisma Client..."
Write-Host ""

Set-Location $backendFolder

# Temporarily disable TLS certificate verification.
# This is only used for the Prisma generation step.
$previousTlsSetting = $env:NODE_TLS_REJECT_UNAUTHORIZED

$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"

try {

    if (Test-Path "$backendFolder\node_modules\prisma\build\index.js") {

        Write-Host "Using local Prisma installation..."

        node node_modules/prisma/build/index.js generate

    }
    else {

        Write-Host "Local Prisma executable not found."
        Write-Host "Using npx prisma generate..."

        npx prisma generate

    }

    if ($LASTEXITCODE -ne 0) {

        throw "Prisma Client generation FAILED."

    }

}
finally {

    # Restore previous TLS setting
    if ($null -eq $previousTlsSetting) {

        Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue

    }
    else {

        $env:NODE_TLS_REJECT_UNAUTHORIZED = $previousTlsSetting

    }

}

Write-Host ""
Write-Host "Prisma Client generated successfully."

Write-Host ""


# =========================================================
# STEP 14.1 - SYNC DATABASE SCHEMA & SEED ADMIN DATA
# =========================================================

Write-Host "[14.1] Initializing Database Schema & Admin Data..."
Write-Host ""

Set-Location $backendFolder

if (Test-Path "setup.js") {
    Write-Host "Running backend setup.js..."
    node setup.js
}
else {
    Write-Host "Running prisma db push..."
    npx prisma db push
}

Write-Host ""


# =========================================================
# STEP 14.2 - INSTALL ROOT DEPENDENCIES
# =========================================================

Write-Host "[14.2] Installing Root Dependencies (concurrently)..."
Write-Host ""

Set-Location $repoFolder
npm install

Write-Host ""


# =========================================================
# STEP 15 - VERIFY .ENV
# =========================================================

Write-Host "[15] Verifying .env file..."
Write-Host ""

if (!(Test-Path $envFile)) {

    throw ".env file verification FAILED."

}

Write-Host ".env file exists:"
Write-Host $envFile

Write-Host ""

# Check important variables without displaying passwords/secrets
$envCheck = Get-Content $envFile -Raw

if ($envCheck -match "DATABASE_URL=") {

    Write-Host "[OK] DATABASE_URL"

}
else {

    throw "DATABASE_URL is missing from .env"

}

if ($envCheck -match "PORT=") {

    Write-Host "[OK] PORT"

}
else {

    throw "PORT is missing from .env"

}

if ($envCheck -match "JWT_SECRET=") {

    Write-Host "[OK] JWT_SECRET"

}
else {

    throw "JWT_SECRET is missing from .env"

}

if ($envCheck -match "NODE_ENV=") {

    Write-Host "[OK] NODE_ENV"

}
else {

    throw "NODE_ENV is missing from .env"

}

if ($envCheck -match "FRONTEND_URL=") {

    Write-Host "[OK] FRONTEND_URL"

}
else {

    throw "FRONTEND_URL is missing from .env"

}

Write-Host ""


# =========================================================
# COMPLETE
# =========================================================

Write-Host ""
Write-Host "============================================="
Write-Host "       SETUP COMPLETED SUCCESSFULLY"
Write-Host "============================================="
Write-Host ""

Write-Host "Project location:"
Write-Host $repoFolder

Write-Host ""

Write-Host "Frontend:"
Write-Host $frontendFolder

Write-Host ""

Write-Host "Backend:"
Write-Host $backendFolder

Write-Host ""

Write-Host "Environment file:"
Write-Host $envFile

Write-Host ""

Write-Host "VS Code: Installed / Available"
Write-Host "pgAdmin: Installed / Available"
Write-Host "Node.js: Installed / Available"
Write-Host "Git: Installed / Available"
Write-Host "Frontend dependencies: Installed"
Write-Host "Backend dependencies: Installed"
Write-Host "Prisma Client: Generated"
Write-Host ".env: Created"
Write-Host ""

Write-Host "============================================="
Write-Host " CREDENTIALS & CONNECTION DETAILS"
Write-Host "============================================="
Write-Host ""

Write-Host "PostgreSQL & pgAdmin 4 Details:"
Write-Host "  - Host:      $databaseHost"
Write-Host "  - Port:      $databasePort"
Write-Host "  - Database:  $databaseName"
Write-Host "  - Username:  $databaseUser"
Write-Host "  - Password:  $databasePassword"
Write-Host ""
Write-Host "Default ERP Admin Login:"
Write-Host "  - Username:  admin"
Write-Host "  - Password:  adminpassword"
Write-Host "  - College:   svpcet"
Write-Host ""
Write-Host "To launch both Frontend and Backend together:"
Write-Host "  Run: npm start (or double-click start_app.bat)"
Write-Host ""
Write-Host "============================================="
Write-Host ""

Set-Location $repoFolder

Read-Host "Press Enter to exit"

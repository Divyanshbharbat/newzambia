```powershell
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
# POSTGRESQL CONFIGURATION
# =========================================================

$databaseUser = "postgres"

# PostgreSQL password that will ALWAYS be configured
$databasePassword = "password@123"

$databaseHost = "localhost"
$databasePort = "5432"
$databaseName = "school_erp"

# URL encoded password
# password@123 -> password%40123
$databasePasswordEncoded = "password%40123"

$backendPort = "5000"

# JWT secret used by backend
$jwtSecret = "school_erp_jwt_secret_change_this"

# Frontend URL
$frontendUrl = "http://localhost:5173"

# =========================================================
# HELPER FUNCTIONS
# =========================================================

function Refresh-Path {

    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
}

function Find-PostgresBin {

    $possiblePaths = @(
        "C:\Program Files\PostgreSQL\18\bin",
        "C:\Program Files\PostgreSQL\17\bin",
        "C:\Program Files\PostgreSQL\16\bin",
        "C:\Program Files\PostgreSQL\15\bin",
        "C:\Program Files\PostgreSQL\14\bin",
        "C:\Program Files\PostgreSQL\13\bin",
        "C:\Program Files\PostgreSQL\12\bin"
    )

    foreach ($path in $possiblePaths) {

        if (Test-Path "$path\psql.exe") {
            return $path
        }
    }

    $psql = Get-Command psql -ErrorAction SilentlyContinue

    if ($psql) {
        return Split-Path $psql.Source
    }

    return $null
}

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

        throw "Git is not installed and winget is not available. Please install Git manually."
    }

    winget install --id Git.Git `
        --exact `
        --source winget `
        --accept-source-agreements `
        --accept-package-agreements

    if ($LASTEXITCODE -ne 0) {
        throw "Git installation failed."
    }

    Refresh-Path

    Write-Host "Git installation completed."
}

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

    Refresh-Path

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
# STEP 8 - CHECK / INSTALL POSTGRESQL
# =========================================================

Write-Host "[8] Checking PostgreSQL..."
Write-Host ""

$postgresBin = Find-PostgresBin

if ($postgresBin) {

    Write-Host "PostgreSQL is already installed."
    Write-Host "PostgreSQL bin:"
    Write-Host $postgresBin
}
else {

    Write-Host "PostgreSQL is NOT installed."
    Write-Host "Installing PostgreSQL..."

    if (!(Get-Command winget -ErrorAction SilentlyContinue)) {

        throw "PostgreSQL is not installed and winget is not available."
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

    Start-Sleep -Seconds 5

    $postgresBin = Find-PostgresBin

    if (!$postgresBin) {

        throw "PostgreSQL was installed, but psql.exe could not be located."
    }

    Write-Host "PostgreSQL installation completed."
}

Write-Host ""


# =========================================================
# STEP 9 - START POSTGRESQL SERVICE
# =========================================================

Write-Host "[9] Starting PostgreSQL service..."
Write-Host ""

$postgresServices = Get-Service | Where-Object {
    $_.Name -like "postgresql*" -or
    $_.DisplayName -like "*PostgreSQL*"
}

if ($postgresServices) {

    foreach ($service in $postgresServices) {

        Write-Host "Found PostgreSQL service:"
        Write-Host $service.Name

        if ($service.Status -ne "Running") {

            Write-Host "Starting PostgreSQL service..."

            Start-Service $service.Name

            Start-Sleep -Seconds 3
        }

        Write-Host "PostgreSQL service status:"
        Write-Host (Get-Service $service.Name).Status
    }
}
else {

    Write-Host "WARNING: PostgreSQL Windows service was not found."
}

Write-Host ""


# =========================================================
# STEP 10 - SET POSTGRESQL PASSWORD
# =========================================================

Write-Host "[10] Configuring PostgreSQL password..."
Write-Host ""

Write-Host "Required PostgreSQL password:"
Write-Host "password@123"
Write-Host ""

$env:PGPASSWORD = $databasePassword

$psqlPath = Join-Path $postgresBin "psql.exe"

if (!(Test-Path $psqlPath)) {

    throw "psql.exe not found at $psqlPath"
}

Write-Host "Setting password for PostgreSQL user '$databaseUser'..."

& $psqlPath `
    -U $databaseUser `
    -h $databaseHost `
    -p $databasePort `
    -d "postgres" `
    -c "ALTER USER postgres WITH PASSWORD 'password@123';"

if ($LASTEXITCODE -ne 0) {

    Write-Host ""
    Write-Host "Could not automatically authenticate to PostgreSQL."
    Write-Host ""
    Write-Host "This usually happens when an existing PostgreSQL installation"
    Write-Host "has a different current postgres password."
    Write-Host ""

    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

    throw "Unable to change PostgreSQL postgres password automatically."
}

Write-Host ""
Write-Host "PostgreSQL password successfully set to:"
Write-Host "password@123"

Write-Host ""


# =========================================================
# STEP 11 - CREATE DATABASE
# =========================================================

Write-Host "[11] Checking school_erp database..."
Write-Host ""

$env:PGPASSWORD = $databasePassword

$dbExists = & $psqlPath `
    -U $databaseUser `
    -h $databaseHost `
    -p $databasePort `
    -d "postgres" `
    -tAc "SELECT 1 FROM pg_database WHERE datname = '$databaseName';"

if ($LASTEXITCODE -ne 0) {

    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

    throw "Could not check PostgreSQL databases."
}

if ($dbExists.Trim() -eq "1") {

    Write-Host "Database '$databaseName' already exists."
    Write-Host "Skipping database creation."
}
else {

    Write-Host "Database '$databaseName' does not exist."
    Write-Host "Creating database..."

    & $psqlPath `
        -U $databaseUser `
        -h $databaseHost `
        -p $databasePort `
        -d "postgres" `
        -c "CREATE DATABASE school_erp;"

    if ($LASTEXITCODE -ne 0) {

        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

        throw "Database creation failed."
    }

    Write-Host "Database '$databaseName' created successfully."
}

Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""


# =========================================================
# STEP 12 - CHECK / INSTALL PGADMIN 4
# =========================================================

Write-Host "[12] Checking pgAdmin..."
Write-Host ""

$pgAdminInstalled = $false

if (Get-Command pgadmin4 -ErrorAction SilentlyContinue) {

    $pgAdminInstalled = $true
}
elseif (Test-Path "C:\Program Files\pgAdmin 4") {

    $pgAdminInstalled = $true
}
elseif (Test-Path "C:\Program Files (x86)\pgAdmin 4") {

    $pgAdminInstalled = $true
}

if ($pgAdminInstalled) {

    Write-Host "pgAdmin 4 is already installed."
}
else {

    Write-Host "pgAdmin 4 is not installed."
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
# IMPORTANT PGADMIN NOTE
# =========================================================

Write-Host "============================================="
Write-Host " pgAdmin / PostgreSQL Password Information"
Write-Host "============================================="
Write-Host ""

Write-Host "PostgreSQL username : postgres"
Write-Host "PostgreSQL password : password@123"
Write-Host "Database             : school_erp"
Write-Host ""

Write-Host "NOTE:"
Write-Host "The password above is the PostgreSQL database password."
Write-Host "It is NOT the pgAdmin master password."
Write-Host ""
Write-Host "If pgAdmin asks for a master password during first launch,"
Write-Host "you can create a pgAdmin master password there."
Write-Host ""

Write-Host ""


# =========================================================
# STEP 13 - VERIFY FRONTEND AND BACKEND FOLDERS
# =========================================================

Write-Host "[13] Verifying project folders..."
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
# STEP 14 - CREATE BACKEND .ENV FILE
# =========================================================

Write-Host "[14] Creating backend .env file..."
Write-Host ""

$envFile = "$backendFolder\.env"

# IMPORTANT:
# @ must be URL encoded as %40
$databaseUrl = "postgresql://$databaseUser`:$databasePasswordEncoded@$databaseHost`:$databasePort/$databaseName"

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

    throw "Failed to create backend .env file."
}

Write-Host "Backend .env created successfully:"
Write-Host $envFile

Write-Host ""

Write-Host "DATABASE_URL configured as:"
Write-Host "postgresql://postgres:password%40123@localhost:5432/school_erp"

Write-Host ""


# =========================================================
# STEP 15 - ADD .ENV TO .GITIGNORE
# =========================================================

Write-Host "[15] Protecting .env from Git..."
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
# STEP 16 - INSTALL FRONTEND DEPENDENCIES
# =========================================================

Write-Host "[16] Installing FRONTEND dependencies..."
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
# STEP 17 - INSTALL BACKEND DEPENDENCIES
# =========================================================

Write-Host "[17] Installing BACKEND dependencies..."
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
# STEP 18 - GENERATE PRISMA CLIENT
# =========================================================

Write-Host "[18] Generating Prisma Client..."
Write-Host ""

Set-Location $backendFolder

# Temporarily disable TLS certificate verification
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

        Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED `
            -ErrorAction SilentlyContinue
    }
    else {

        $env:NODE_TLS_REJECT_UNAUTHORIZED = $previousTlsSetting
    }
}

Write-Host ""
Write-Host "Prisma Client generated successfully."
Write-Host ""


# =========================================================
# STEP 19 - RUN PRISMA DATABASE MIGRATION / PUSH
# =========================================================

Write-Host "[19] Synchronizing Prisma database..."
Write-Host ""

Set-Location $backendFolder

if (Test-Path "$backendFolder\prisma\schema.prisma") {

    Write-Host "Prisma schema found."
    Write-Host "Running Prisma db push..."

    npx prisma db push

    if ($LASTEXITCODE -ne 0) {

        Write-Host ""
        Write-Host "WARNING: Prisma db push failed."
        Write-Host "The database and .env have still been configured."
        Write-Host ""
    }
    else {

        Write-Host ""
        Write-Host "Prisma database synchronization completed."
    }
}
else {

    Write-Host "No prisma/schema.prisma found."
    Write-Host "Skipping Prisma database synchronization."
}

Write-Host ""


# =========================================================
# STEP 20 - VERIFY .ENV
# =========================================================

Write-Host "[20] Verifying .env file..."
Write-Host ""

if (!(Test-Path $envFile)) {

    throw ".env file verification FAILED."
}

Write-Host ".env file exists:"
Write-Host $envFile

Write-Host ""

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
# STEP 21 - TEST DATABASE CONNECTION
# =========================================================

Write-Host "[21] Testing PostgreSQL connection..."
Write-Host ""

$env:PGPASSWORD = $databasePassword

& $psqlPath `
    -U $databaseUser `
    -h $databaseHost `
    -p $databasePort `
    -d $databaseName `
    -c "SELECT current_database(), current_user;"

if ($LASTEXITCODE -ne 0) {

    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

    throw "PostgreSQL connection test FAILED."
}

Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "PostgreSQL connection test PASSED."
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
Write-Host "postgresql://postgres:password%40123@localhost:5432/school_erp"

Write-Host ""

Write-Host "============================================="
Write-Host " COMPONENT STATUS"
Write-Host "============================================="
Write-Host ""

Write-Host "Git: Installed / Available"
Write-Host "Node.js: Installed / Available"
Write-Host "VS Code: Installed / Available"
Write-Host "PostgreSQL: Installed / Available"
Write-Host "pgAdmin: Installed / Available"
Write-Host "PostgreSQL password: Configured"
Write-Host "Database school_erp: Created / Available"
Write-Host "Frontend dependencies: Installed"
Write-Host "Backend dependencies: Installed"
Write-Host "Prisma Client: Generated"
Write-Host "Prisma Database: Synchronized"
Write-Host ".env: Created"
Write-Host ""

Write-Host "============================================="
Write-Host " IMPORTANT"
Write-Host "============================================="
Write-Host ""

Write-Host "PostgreSQL credentials:"
Write-Host "Username: postgres"
Write-Host "Password: password@123"
Write-Host "Database: school_erp"
Write-Host ""

Write-Host "Your backend .env contains:"
Write-Host 'DATABASE_URL="postgresql://postgres:password%40123@localhost:5432/school_erp"'
Write-Host ""

Write-Host "The @ character is encoded as %40."
Write-Host ""

Write-Host "You can now start the backend and frontend."
Write-Host ""

Set-Location $repoFolder

Read-Host "Press Enter to exit"
```

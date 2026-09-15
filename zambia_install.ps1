$ErrorActionPreference = "Stop" 

Write-Host ""
Write-Host "=============================================" 
Write-Host " School ERP Setup" 
Write-Host "============================================="
Write-Host "" 

# ========================================================= 
# CONFIGURATION 
# ========================================================= 

$repoUrl = "https://github.com/Divyanshbharbat/newzambia.git" 
$baseFolder = "C:\school_erp" 
$repoFolder = "C:\school_erp\newzambia" 

$requiredNodeVersion = "v25.9.0" 

# ========================================================= 
# STEP 1 - CHECK GIT 
# ========================================================= 

Write-Host "[1] Checking Git..."
Write-Host ""

if (Get-Command git -ErrorAction SilentlyContinue) {
    $gitVersion = git --version
    Write-Host "Git is already installed: $gitVersion"
}
else {
    Write-Host "Git is NOT installed. Installing Git..."
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
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

Write-Host ""
Write-Host "---------------------------------------------"
Write-Host ""

# ========================================================= 
# STEP 2 - CREATE school_erp FOLDER 
# ========================================================= 

Write-Host "[2] Creating school_erp folder..." 
if (!(Test-Path $baseFolder)) { 
    New-Item -ItemType Directory -Path $baseFolder | Out-Null 
    Write-Host "Created: $baseFolder" 
} else { 
    Write-Host "Folder already exists: $baseFolder" 
} 

Write-Host "" 

# ========================================================= 
# STEP 3 - CLONE REPOSITORY 
# ========================================================= 

Write-Host "[3] Cloning NewZambia repository..." 
Write-Host "" 
Set-Location $baseFolder 

if (Test-Path $repoFolder) { 
    Write-Host "Repository already exists: $repoFolder" 
    Write-Host "Skipping clone." 
} else { 
    git clone $repoUrl 
    if ($LASTEXITCODE -ne 0) { 
        throw "Git clone failed." 
    } 
    Write-Host "Git clone completed successfully." 
} 
Write-Host "" 

# ========================================================= 
# STEP 4 - VERIFY CLONED FOLDER 
# ========================================================= 

Write-Host "[4] Verifying repository..." 
if (!(Test-Path $repoFolder)) { 
    throw "ERROR: NewZambia repository folder was not created." 
} 

Write-Host "Repository found: $repoFolder" 
Write-Host "" 

# ========================================================= 
# STEP 5 - CHECK NODE.JS 
# ========================================================= 

Write-Host "[5] Checking Node.js..." 
Write-Host "" 
$nodeExists = Get-Command node -ErrorAction SilentlyContinue 
if ($nodeExists) {
    $currentNodeVersion = node --version 
    Write-Host "Installed Node.js version: $currentNodeVersion" 
    Write-Host "Required Node.js version: $requiredNodeVersion" 
    
    if ($currentNodeVersion -eq $requiredNodeVersion) { 
        Write-Host "Correct Node.js version is already installed." 
    } else { 
        Write-Host "Node.js version differs (Installed: $currentNodeVersion, Target: $requiredNodeVersion)." 
    } 
} else { 
    Write-Host "Node.js is not installed." 
} 
Write-Host "" 

# ========================================================= 
# STEP 6 - INSTALL NODE.JS IF MISSING 
# ========================================================= 

if (!$nodeExists) { 
    Write-Host "[6] Installing Node.js..." 
    winget install OpenJS.NodeJS --accept-source-agreements --accept-package-agreements 
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User") 
} else { 
    Write-Host "[6] Node.js installation skipped." 
} 
Write-Host "" 

# ========================================================= 
# STEP 7 - INSTALL VS CODE 
# ========================================================= 

Write-Host "[7] Checking Visual Studio Code..." 
if (Get-Command code -ErrorAction SilentlyContinue) {
    Write-Host "Visual Studio Code is already installed."
} else {
    Write-Host "Installing Visual Studio Code..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id Microsoft.VisualStudioCode --exact --source winget --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Visual Studio Code installation completed successfully."
        } else {
            Write-Host "VS Code installation via winget exited with code $LASTEXITCODE."
        }
    } else {
        Write-Host "winget not available. Please install Visual Studio Code manually from https://code.visualstudio.com/"
    }
}
Write-Host "" 

# ========================================================= 
# STEP 8 - INSTALL PGADMIN 4 
# ========================================================= 

Write-Host "[8] Checking pgAdmin..." 
if ((Get-Command pgadmin4 -ErrorAction SilentlyContinue) -or (Test-Path "C:\Program Files\pgAdmin 4") -or (Test-Path "C:\Program Files (x86)\pgAdmin 4")) {
    Write-Host "pgAdmin is already installed."
} else {
    Write-Host "Installing pgAdmin 4..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id pgAdmin.pgAdmin4 --exact --source winget --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -eq 0) {
            Write-Host "pgAdmin 4 installation completed successfully."
        } else {
            Write-Host "pgAdmin 4 installation via winget exited with code $LASTEXITCODE."
        }
    } else {
        Write-Host "winget not available. Please install pgAdmin 4 manually from https://www.pgadmin.org/download/"
    }
}
Write-Host "" 

# ========================================================= 
# STEP 9 - FRONTEND DEPENDENCIES 
# ========================================================= 

Write-Host "[9] Installing FRONTEND dependencies..."
$frontendFolder = "$repoFolder\frontend" 

if (!(Test-Path $frontendFolder)) { 
    throw "Frontend folder not found: $frontendFolder" 
} 
Set-Location $frontendFolder 
Write-Host "Running npm install..." 
npm install 
if ($LASTEXITCODE -ne 0) { 
    throw "Frontend npm install FAILED." 
} 
Write-Host "Frontend npm install completed." 
Write-Host "" 

# ========================================================= 
# STEP 10 - BACKEND DEPENDENCIES 
# ========================================================= 

Write-Host "[10] Installing BACKEND dependencies..." 
$backendFolder = "$repoFolder\backend" 
if (!(Test-Path $backendFolder)) { 
    throw "Backend folder not found: $backendFolder" 
} 
Set-Location $backendFolder 
Write-Host "Running npm install..." 
npm install 

$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
if (Test-Path "$backendFolder\node_modules\prisma\build\index.js") {
    node node_modules/prisma/build/index.js generate
} else {
    npx prisma generate
}
$env:NODE_TLS_REJECT_UNAUTHORIZED="1"

if ($LASTEXITCODE -ne 0) { 
    throw "Backend npm install FAILED." 
} 
Write-Host "Backend npm install completed." 
Write-Host "" 

# ========================================================= 
# COMPLETE 
# ========================================================= 

Write-Host "=============================================" 
Write-Host " SETUP COMPLETED SUCCESSFULLY" 
Write-Host "=============================================" 
Write-Host "" 
Write-Host "Project location: $repoFolder" 
Write-Host "VS Code: Installed / Available" 
Write-Host "pgAdmin: Installed / Available" 
Write-Host "Frontend: $frontendFolder" 
Write-Host "Backend: $backendFolder" 
Write-Host "" 
Read-Host "Press Enter to exit"

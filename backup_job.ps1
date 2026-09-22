# =========================================================
# School ERP Automated Weekly Backup & 2-Month Retention Script
# =========================================================
$ErrorActionPreference = "Continue"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = "C:\school_erp" }

$backupsFolder = Join-Path $scriptDir "backups"
$backendBackupsFolder = Join-Path $scriptDir "backend\backups"

if (-not (Test-Path $backupsFolder)) {
    New-Item -ItemType Directory -Path $backupsFolder -Force | Out-Null
}
if (Test-Path (Split-Path -Parent $backendBackupsFolder)) {
    if (-not (Test-Path $backendBackupsFolder)) {
        New-Item -ItemType Directory -Path $backendBackupsFolder -Force | Out-Null
    }
}

$logFile = Join-Path $backupsFolder "backup_history.log"

function Write-BackupLog($msg) {
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $formattedMsg = "[$timestamp] $msg"
    Write-Host $formattedMsg
    Add-Content -Path $logFile -Value $formattedMsg -ErrorAction SilentlyContinue
}

Write-BackupLog "=========================================="
Write-BackupLog "Starting Automated Weekly Backup Job..."

# Find pg_dump executable dynamically across systems
$pgDumpExe = "pg_dump"
if (Get-Command pg_dump -ErrorAction SilentlyContinue) {
    $pgDumpExe = (Get-Command pg_dump).Source
} else {
    $pgCandidates = @(
        "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\13\bin\pg_dump.exe",
        "C:\Program Files (x86)\PostgreSQL\16\bin\pg_dump.exe"
    )
    foreach ($cand in $pgCandidates) {
        if (Test-Path $cand) {
            $pgDumpExe = $cand
            break
        }
    }
}

Write-BackupLog "Using pg_dump executable: $pgDumpExe"

$dbHost = "localhost"
$dbPort = "5432"
$dbUser = "postgres"
$dbName = "school_erp"
$env:PGPASSWORD = "password@123"

$timestampStr = (Get-Date).ToString("yyyy-MM-dd_HHmmss")
$backupFileName = "erp_backup_$timestampStr.sql"
$targetBackupPath = Join-Path $backupsFolder $backupFileName

# 1. Execute database backup
try {
    Write-BackupLog "Creating database dump -> $targetBackupPath"
    $process = Start-Process -FilePath $pgDumpExe -ArgumentList "-h $dbHost -p $dbPort -U $dbUser -d $dbName -f `"$targetBackupPath`"" -NoNewWindow -Wait -PassThru
    
    if ($process.ExitCode -eq 0 -and (Test-Path $targetBackupPath)) {
        Write-BackupLog "[SUCCESS] Backup file created successfully ($backupFileName)."
        if (Test-Path $backendBackupsFolder) {
            Copy-Item -Path $targetBackupPath -Destination (Join-Path $backendBackupsFolder $backupFileName) -Force -ErrorAction SilentlyContinue
        }
    } else {
        Write-BackupLog "[ERROR] Backup failed with exit code $($process.ExitCode)."
    }
} catch {
    Write-BackupLog "[ERROR] Exception during backup execution: $($_)"
}

# 2. Enforce 60-day (2-month) auto-deletion retention policy
Write-BackupLog "Checking for backups older than 60 days (2 months)..."
$cutoffDate = (Get-Date).AddDays(-60)

$foldersToCheck = @($backupsFolder, $backendBackupsFolder) | Select-Object -Unique
foreach ($folder in $foldersToCheck) {
    if (Test-Path $folder) {
        $oldFiles = Get-ChildItem -Path $folder -Filter "*.sql" | Where-Object { $_.LastWriteTime -lt $cutoffDate }
        foreach ($oldFile in $oldFiles) {
            try {
                Remove-Item -Path $oldFile.FullName -Force
                Write-BackupLog "[CLEANUP] Deleted backup older than 60 days: $($oldFile.Name) (Created: $($oldFile.LastWriteTime))"
            } catch {
                Write-BackupLog "[WARN] Failed to delete old backup $($oldFile.Name): $($_)"
            }
        }
    }
}

Write-BackupLog "Automated Weekly Backup Job Completed."
Write-BackupLog "=========================================="

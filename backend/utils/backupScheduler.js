const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');

// Determine backups directory (relative to backend folder for cross-platform portability)
const BACKUP_DIR = path.join(__dirname, '../backups');

/**
 * Ensures the backups directory exists.
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Locate pg_dump executable on any operating system (Windows, Linux, macOS).
 */
function findPgDump() {
  // 1. Try system PATH first
  try {
    const isWin = process.platform === 'win32';
    const testCmd = isWin ? 'where pg_dump' : 'which pg_dump';
    const result = execSync(testCmd, { stdio: 'pipe' }).toString().trim();
    if (result) {
      const firstLine = result.split(/\r?\n/)[0].trim();
      if (fs.existsSync(firstLine)) return `"${firstLine}"`;
      return 'pg_dump';
    }
  } catch (e) {
    // Not in PATH directly, proceed to search standard locations
  }

  // 2. Windows standard PostgreSQL installation paths
  if (process.platform === 'win32') {
    const programFiles = [
      process.env['ProgramFiles'],
      process.env['ProgramFiles(x86)'],
      'C:\\Program Files',
      'C:\\Program Files (x86)'
    ];

    for (const pf of programFiles) {
      if (!pf || !fs.existsSync(pf)) continue;
      const pgDir = path.join(pf, 'PostgreSQL');
      if (fs.existsSync(pgDir)) {
        try {
          const versions = fs.readdirSync(pgDir);
          // Sort versions descending (e.g. 17, 16, 15, 14...)
          versions.sort((a, b) => parseFloat(b) - parseFloat(a));
          for (const ver of versions) {
            const exePath = path.join(pgDir, ver, 'bin', 'pg_dump.exe');
            if (fs.existsSync(exePath)) {
              return `"${exePath}"`;
            }
          }
        } catch (err) {
          // ignore directory read errors
        }
      }
    }
  }

  // 3. Linux/macOS standard locations
  const nixPaths = [
    '/usr/bin/pg_dump',
    '/usr/local/bin/pg_dump',
    '/opt/homebrew/bin/pg_dump',
    '/usr/lib/postgresql/16/bin/pg_dump',
    '/usr/lib/postgresql/15/bin/pg_dump',
    '/usr/lib/postgresql/14/bin/pg_dump'
  ];

  for (const nPath of nixPaths) {
    if (fs.existsSync(nPath)) {
      return `"${nPath}"`;
    }
  }

  // Fallback to default command name
  return 'pg_dump';
}

/**
 * Parses connection parameters from DATABASE_URL or defaults.
 */
function getDbConfig() {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const urlRegex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
    const match = dbUrl.match(urlRegex);
    if (match) {
      const [_, user, password, host, port, dbname] = match;
      return { user, password: decodeURIComponent(password), host, port, dbname };
    }
  }
  return {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password@123',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '5432',
    dbname: process.env.DB_NAME || 'school_erp'
  };
}

/**
 * Creates a database backup file in the backups directory.
 * @returns {Promise<string>} Path to the created backup file.
 */
function performBackup() {
  return new Promise((resolve, reject) => {
    ensureBackupDir();
    const config = getDbConfig();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `erp_backup_${timestamp}.sql`;
    const backupFile = path.join(BACKUP_DIR, filename);

    const pgDumpCmd = findPgDump();
    const command = `${pgDumpCmd} -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.dbname} -f "${backupFile}"`;

    const env = { ...process.env, PGPASSWORD: config.password };

    console.log(`[BackupScheduler] Starting weekly backup -> ${filename}`);
    exec(command, { env }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[BackupScheduler] pg_dump failed: ${error.message}`);
        return reject(error);
      }
      console.log(`[BackupScheduler] Backup created successfully: ${backupFile}`);
      resolve(backupFile);
    });
  });
}

/**
 * Scans the backups directory and deletes files older than retentionDays (default: 60 days / 2 months).
 * @param {number} retentionDays 
 * @returns {Array<string>} List of deleted file names.
 */
function cleanOldBackups(retentionDays = 60) {
  ensureBackupDir();
  const deletedFiles = [];
  const now = Date.now();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(BACKUP_DIR);
    for (const file of files) {
      if (!file.endsWith('.sql')) continue;
      const filePath = path.join(BACKUP_DIR, file);
      try {
        const stats = fs.statSync(filePath);
        const ageMs = now - stats.mtimeMs;

        if (ageMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          deletedFiles.push(file);
          console.log(`[BackupScheduler] Deleted old backup (> ${retentionDays} days old): ${file}`);
        }
      } catch (err) {
        console.error(`[BackupScheduler] Error checking/deleting file ${file}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`[BackupScheduler] Error reading backup directory:`, err.message);
  }

  return deletedFiles;
}

/**
 * Runs backup creation and retention cleanup in sequence.
 */
async function runBackupAndCleanup() {
  try {
    const backupFile = await performBackup();
    const cleaned = cleanOldBackups(60);
    return { success: true, backupFile, cleanedFiles: cleaned };
  } catch (error) {
    console.error('[BackupScheduler] Automated backup job failed:', error.message);
    // Still perform retention cleanup even if backup failed
    const cleaned = cleanOldBackups(60);
    return { success: false, error: error.message, cleanedFiles: cleaned };
  }
}

/**
 * Checks if a backup is needed (if last backup is older than 7 days or no backup exists)
 * and schedules recurring weekly check.
 */
function initBackupScheduler() {
  ensureBackupDir();

  const checkIntervalMs = 12 * 60 * 60 * 1000; // Check every 12 hours
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  async function checkAndRunIfNeeded() {
    try {
      const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sql'));
      let newestMtime = 0;

      for (const file of files) {
        const stats = fs.statSync(path.join(BACKUP_DIR, file));
        if (stats.mtimeMs > newestMtime) {
          newestMtime = stats.mtimeMs;
        }
      }

      const now = Date.now();
      const timeSinceLastBackup = now - newestMtime;

      if (files.length === 0 || timeSinceLastBackup >= sevenDaysMs) {
        console.log('[BackupScheduler] Weekly backup trigger activated (Last backup > 7 days or none found).');
        await runBackupAndCleanup();
      } else {
        const daysLeft = ((sevenDaysMs - timeSinceLastBackup) / (1000 * 60 * 60 * 24)).toFixed(1);
        console.log(`[BackupScheduler] Next scheduled automatic backup in ~${daysLeft} days.`);
        // Run retention cleanup regardless to ensure 60-day rule is enforced
        cleanOldBackups(60);
      }
    } catch (err) {
      console.error('[BackupScheduler] Error during schedule check:', err.message);
    }
  }

  // Initial check on backend startup
  setTimeout(checkAndRunIfNeeded, 5000);

  // Periodic recurring check
  setInterval(checkAndRunIfNeeded, checkIntervalMs);
}

module.exports = {
  BACKUP_DIR,
  ensureBackupDir,
  findPgDump,
  performBackup,
  cleanOldBackups,
  runBackupAndCleanup,
  initBackupScheduler
};

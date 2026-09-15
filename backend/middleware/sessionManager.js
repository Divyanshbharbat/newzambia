const fs = require('fs');
const path = require('path');

const STORE_FILE = path.join(__dirname, '..', 'session_store.json');

let sessionData = null;

// Load persisted session at startup (if exists)
try {
    if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf8');
        const parsed = JSON.parse(raw || 'null');
        sessionData = parsed && parsed.year ? parsed.year : null;
    }
} catch (err) {
    console.error('Failed to load persisted session:', err);
}

const persist = (year) => {
    try {
        fs.writeFileSync(STORE_FILE, JSON.stringify({ year }), 'utf8');
    } catch (err) {
        console.error('Failed to persist session:', err);
    }
};

const setSession = (data) => {
    sessionData = data;
    persist(data);
};

const getSession = () => sessionData;

module.exports = { setSession, getSession };

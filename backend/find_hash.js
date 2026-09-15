const crypto = require('crypto');

const storedAdminHash = 'f9f7d34758ddf0119cf7c4e55ec3e1d8ce7f29da0b7762ae4192cdc646c1454c';
const candidates = [
    'SacredHeart',
    'sacredheart',
    'SacredHeart@123',
    'sacredheart@123',
    'SacredHeart123',
    'sacredheart123',
    'Sacred@123',
    'Heart@123',
    'admin',
    'admin123',
    'divyansh',
    'divyansh123',
    'divyansh@123'
];

candidates.forEach(p => {
    const h = crypto.createHash("sha256").update(p).digest("hex");
    if (h === storedAdminHash) {
        console.log(`MATCH FOUND: '${p}' matches the stored admin hash!`);
    } else {
        // console.log(`'${p}' -> ${h}`);
    }
});

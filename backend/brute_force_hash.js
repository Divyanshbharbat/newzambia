const crypto = require('crypto');

const storedAdminHash = 'f9f7d34758ddf0119cf7c4e55ec3e1d8ce7f29da0b7762ae4192cdc646c1454c';
const baseWords = ['SacredHeart', 'sacredheart', 'admin', 'teacher', 'school', 'school123', 'divyansh', 'Zambia', 'zambia', 'ERP', 'erp'];
const symbols = ['', '@', '#', '!', '$'];
const numbers = ['', '123', '123456', '2025', '2026'];

for (let base of baseWords) {
    for (let sym of symbols) {
        for (let num of numbers) {
            const p = base + sym + num;
            const h = crypto.createHash("sha256").update(p).digest("hex");
            if (h === storedAdminHash) {
                console.log(`MATCH FOUND: '${p}'`);
            }
        }
    }
}

require('dotenv').config();
const crypto = require('crypto');

const password = 'SacredHeart';
const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
const storedHash = process.env.ADMINPASSWORD_HASH;

console.log("Input Hash:  ", hashedPassword, "Length:", hashedPassword.length);
console.log("Stored Hash: ", storedHash, "Length:", storedHash ? storedHash.length : 0);

if (hashedPassword === storedHash) {
    console.log("MATCH!");
} else {
    console.log("MISMATCH!");
    if (storedHash) {
        for (let i = 0; i < Math.max(hashedPassword.length, storedHash.length); i++) {
            if (hashedPassword[i] !== storedHash[i]) {
                console.log(`Difference at index ${i}: '${hashedPassword[i]}' vs '${storedHash[i]}' (code ${storedHash.charCodeAt(i)})`);
                break;
            }
        }
    }
}

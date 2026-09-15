require('dotenv').config();
const crypto = require('crypto');

const password = 'SacredHeart@123';
const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
const storedHash = process.env.ADMINPASSWORD_HASH;

console.log("Input Hash:  ", hashedPassword);
console.log("Stored Hash: ", storedHash);

if (hashedPassword === storedHash) {
    console.log("MATCH!");
} else {
    console.log("MISMATCH!");
}

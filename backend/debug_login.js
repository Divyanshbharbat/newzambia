require('dotenv').config();
const crypto = require('crypto');

const username = 'admin';
const password = 'SacredHeart';

const hashedUsername = crypto.createHash("sha256").update(username).digest("hex");
const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

console.log("Input Username:", username);
console.log("Input Hashed Username:", hashedUsername);
console.log("Stored Admin Hash:", process.env.ADMIN_HASH);

console.log("Input Password:", password);
console.log("Input Hashed Password:", hashedPassword);
console.log("Stored Admin Password Hash:", process.env.ADMINPASSWORD_HASH);

if (hashedUsername === process.env.ADMIN_HASH) {
    console.log("Username Matches!");
} else {
    console.log("Username MISMATCH!");
}

if (hashedPassword === process.env.ADMINPASSWORD_HASH) {
    console.log("Password Matches!");
} else {
    console.log("Password MISMATCH!");
}

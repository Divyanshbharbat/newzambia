const crypto = require("crypto");

// You can change these credentials
const adminUsername = "admin";
const adminPassword = "admin123";
const teacherUsername = "teacher";
const teacherPassword = "teacher123";

// Generate SHA256 hashes
const adminHash = crypto.createHash("sha256").update(adminUsername).digest("hex");
const adminPwHash = crypto.createHash("sha256").update(adminPassword).digest("hex");
const userHash = crypto.createHash("sha256").update(teacherUsername).digest("hex");
const userPwHash = crypto.createHash("sha256").update(teacherPassword).digest("hex");

console.log("Add these to your .env file:\n");
console.log(`ADMIN_HASH=${adminHash}`);
console.log(`ADMINPASSWORD_HASH=${adminPwHash}`);
console.log(`USER_HASH=${userHash}`);
console.log(`USERPASSWORD_HASH=${userPwHash}`);
console.log("\n--- Credentials ---");
console.log(`Admin Username: ${adminUsername}`);
console.log(`Admin Password: ${adminPassword}`);
console.log(`Teacher Username: ${teacherUsername}`);
console.log(`Teacher Password: ${teacherPassword}`);

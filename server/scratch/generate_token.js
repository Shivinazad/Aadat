const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const userId = process.argv[2] || '64f1a2b3c4d5e6f7a8b9c0d1';
const email = 'testuser@example.com';

const token = jwt.sign(
    { id: userId, email: email },
    JWT_SECRET,
    { expiresIn: '7d' }
);

console.log('\n--- Generated JWT Token ---');
console.log(token);
console.log('---------------------------\n');
console.log('User ID used:', userId);
console.log('Secret used:', JWT_SECRET);
console.log('\nYou can decode this at https://jwt.io to verify the payload.');

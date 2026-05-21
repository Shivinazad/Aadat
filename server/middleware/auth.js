require('dotenv').config();

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
    // 1. Try to read token from cookies
    let token = req.cookies?.token;

    // 2. Fallback to Authorization header if cookie not present
    if (!token) {
        const authHeader = req.header('Authorization');
        if (authHeader) {
            token = authHeader.replace('Bearer ', '');
        }
    }

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).json({ msg: 'Token is not valid.' });
    }
};

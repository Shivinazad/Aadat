require('dotenv').config();

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async (req, res, next) => {
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

        // Check suspension
        const { UserMongo } = require('../models-mongo');
        const user = await UserMongo.findById(decoded.id);
        if (user && user.isSuspended) {
            return res.status(403).json({ msg: 'Your account has been suspended due to multiple policy violations.' });
        }

        next();
    } catch (e) {
        res.status(401).json({ msg: 'Token is not valid.' });
    }
};

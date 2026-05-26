const express = require('express');
const { UserMongo } = require('../models-mongo');
const auth = require('../middleware/auth');
const { sendInvitationEmail } = require('../emailService');
const { getClientUrl } = require('../utils/urls');
const router = express.Router();
const engine = 'mongo';

const findSenderById = (id) => (engine === 'mongo' ? UserMongo.findById(id) : User.findByPk(id));
const findUserByEmail = (email) => (engine === 'mongo' ? UserMongo.findOne({ email }) : User.findOne({ where: { email } }));

// POST / - Send email invitation
router.post('/', auth, async (req, res) => {
    try {
        const { email } = req.body;
        const sender = await findSenderById(req.user.id);

        if (!sender) {
            return res.status(404).json({ msg: 'Sender not found.' });
        }

        if (!email) {
            return res.status(400).json({ msg: 'Email address is required.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ msg: 'Invalid email address.' });
        }

        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ msg: 'This user is already on Aadat!' });
        }

        const emailConfigured = process.env.SENDGRID_API_KEY || (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);

        if (emailConfigured) {
            try {
                await sendInvitationEmail(email, sender.username);
                res.status(200).json({
                    message: `Invitation sent to ${email}!`,
                    invitedEmail: email,
                    invitedBy: sender.username,
                    emailSent: true
                });
            } catch (emailError) {
                console.error('Email sending failed:', emailError.message || emailError);
                const inviteLink = getClientUrl();
                res.status(200).json({
                    message: `Email service unavailable. Here's your invite link for ${email}`,
                    invitedEmail: email,
                    invitedBy: sender.username,
                    inviteLink: `${inviteLink}?invited_by=${encodeURIComponent(sender.username)}`,
                    emailSent: false
                });
            }
        } else {
            const inviteLink = getClientUrl();
            res.status(200).json({
                message: `Invite link created for ${email}!`,
                invitedEmail: email,
                invitedBy: sender.username,
                inviteLink: `${inviteLink}?invited_by=${encodeURIComponent(sender.username)}`,
                emailSent: false,
                note: 'Share this link with your friend!'
            });
        }
    } catch (error) {
        console.error('Error processing invitation:', error);
        res.status(500).json({ msg: 'Server error processing invitation.' });
    }
});

module.exports = router;

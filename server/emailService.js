const { Resend } = require('resend');
const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const { getClientUrl } = require('./utils/urls');

// ---- Provider setup ----
let resend;
if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
}

if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const createGmailTransport = () => nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// ---- Generic send function (tries Resend → SendGrid → Gmail) ----
const sendEmail = async ({ to, subject, text, html }) => {
    // 1. Resend (HTTP API — works on all cloud hosts including Render)
    if (resend) {
        const fromEmail = process.env.RESEND_SENDER_EMAIL || 'onboarding@resend.dev';
        const { data, error } = await resend.emails.send({
            from: `Aadat <${fromEmail}>`,
            to: [to],
            subject,
            text,
            html
        });
        if (error) throw new Error(`Resend error: ${error.message}`);
        console.log(`✅ Email sent to ${to} via Resend`);
        return { success: true, messageId: data?.id };
    }

    // 2. SendGrid (HTTP API — works on cloud hosts)
    if (process.env.SENDGRID_API_KEY) {
        const senderEmail = process.env.SENDGRID_SENDER_EMAIL || 'noreply@yourdomain.com';
        const result = await sgMail.send({
            to,
            from: { email: senderEmail, name: 'Aadat' },
            replyTo: senderEmail,
            subject,
            text,
            html
        });
        console.log(`✅ Email sent to ${to} via SendGrid`);
        return { success: true, messageId: result[0].headers['x-message-id'] };
    }

    // 3. Gmail/Nodemailer (SMTP — only works locally, blocked on Render)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        const transporter = createGmailTransport();
        const info = await transporter.sendMail({
            from: `"Aadat" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html
        });
        console.log(`✅ Email sent to ${to} via Gmail`);
        return { success: true, messageId: info.messageId };
    }

    throw new Error('No email service configured (set RESEND_API_KEY, SENDGRID_API_KEY, or EMAIL_USER/EMAIL_PASSWORD)');
};

// ---- Invitation Email ----
const sendInvitationEmail = async (toEmail, senderName) => {
    try {
        const subject = `${senderName} invited you to Aadat`;
        const text = `Hi there!\n\n${senderName} has invited you to join Aadat, a habit-tracking platform where you can build better habits together.\n\nJoin now: ${getClientUrl()}\n\nBest regards,\nAadat Team`;
        const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
                            line-height: 1.6;
                            color: #1a1a1a;
                            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                            padding: 40px 20px;
                        }
                        .email-wrapper {
                            max-width: 600px;
                            margin: 0 auto;
                            background: #ffffff;
                            border-radius: 16px;
                            overflow: hidden;
                            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                        }
                        .header {
                            background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
                            padding: 40px 30px;
                            text-align: center;
                            position: relative;
                        }
                        .header::after {
                            content: '';
                            position: absolute;
                            bottom: -2px;
                            left: 0;
                            right: 0;
                            height: 4px;
                            background: linear-gradient(90deg, #00ff88 0%, #00cc6a 100%);
                        }
                        .logo {
                            font-size: 42px;
                            font-weight: 900;
                            color: #ffffff;
                            letter-spacing: -0.03em;
                            text-shadow: 0 2px 10px rgba(0, 255, 136, 0.3);
                        }
                        .neon-dot {
                            display: inline-block;
                            width: 10px;
                            height: 10px;
                            background: #00ff88;
                            border-radius: 50%;
                            margin-left: 6px;
                            box-shadow: 0 0 15px #00ff88, 0 0 30px rgba(0, 255, 136, 0.5);
                            animation: pulse 2s ease-in-out infinite;
                        }
                        @keyframes pulse {
                            0%, 100% { opacity: 1; transform: scale(1); }
                            50% { opacity: 0.7; transform: scale(0.95); }
                        }
                        .content {
                            padding: 50px 40px;
                        }
                        .invitation-badge {
                            display: inline-block;
                            background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
                            color: #000000;
                            padding: 8px 20px;
                            border-radius: 20px;
                            font-size: 13px;
                            font-weight: 700;
                            letter-spacing: 0.5px;
                            text-transform: uppercase;
                            margin-bottom: 20px;
                        }
                        h1 {
                            color: #000000;
                            font-size: 32px;
                            font-weight: 800;
                            margin: 20px 0;
                            line-height: 1.3;
                        }
                        .sender-highlight {
                            color: #00cc6a;
                            font-weight: 800;
                            position: relative;
                            display: inline-block;
                        }
                        .invitation-text {
                            font-size: 17px;
                            color: #4a5568;
                            margin: 25px 0;
                            line-height: 1.8;
                        }
                        .cta-container {
                            text-align: center;
                            margin: 40px 0;
                        }
                        .cta-button {
                            display: inline-block;
                            padding: 18px 45px;
                            background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
                            color: #ffffff;
                            text-decoration: none;
                            border-radius: 12px;
                            font-weight: 700;
                            font-size: 16px;
                            letter-spacing: 0.5px;
                            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
                            transition: all 0.3s ease;
                            border: 2px solid transparent;
                        }
                        .cta-button:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
                            border-color: #00ff88;
                        }
                        .features {
                            margin: 40px 0;
                            padding: 30px;
                            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                            border-radius: 12px;
                            border-left: 4px solid #00ff88;
                        }
                        .features h3 {
                            color: #1a1a1a;
                            font-size: 20px;
                            font-weight: 700;
                            margin-bottom: 20px;
                        }
                        .feature-item {
                            display: flex;
                            align-items: center;
                            margin: 15px 0;
                            color: #2d3748;
                            font-size: 15px;
                        }
                        .feature-icon {
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            width: 28px;
                            height: 28px;
                            background: #00ff88;
                            color: #000000;
                            border-radius: 50%;
                            font-weight: 900;
                            font-size: 14px;
                            margin-right: 15px;
                            flex-shrink: 0;
                        }
                        .stats-bar {
                            display: flex;
                            justify-content: space-around;
                            margin: 35px 0;
                            padding: 25px;
                            background: #ffffff;
                            border-radius: 12px;
                            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
                        }
                        .stat-item {
                            text-align: center;
                        }
                        .stat-number {
                            font-size: 28px;
                            font-weight: 900;
                            color: #00cc6a;
                            display: block;
                        }
                        .stat-label {
                            font-size: 12px;
                            color: #718096;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            margin-top: 5px;
                        }
                        .footer {
                            background: #f8f9fa;
                            padding: 30px 40px;
                            text-align: center;
                            border-top: 1px solid #e2e8f0;
                        }
                        .footer-text {
                            color: #718096;
                            font-size: 14px;
                            margin: 8px 0;
                        }
                        .footer-brand {
                            color: #1a1a1a;
                            font-weight: 700;
                            font-size: 15px;
                            margin-top: 15px;
                        }
                        .emoji {
                            font-size: 24px;
                            display: inline-block;
                        }
                    </style>
                </head>
                <body>
                    <div class="email-wrapper">
                        <!-- Header -->
                        <div class="header">
                            <div class="logo">
                                Aadat<span class="neon-dot"></span>
                            </div>
                        </div>
                        
                        <!-- Main Content -->
                        <div class="content">
                            <div class="invitation-badge">🎯 Personal Invitation</div>
                            
                            <h1>
                                <span class="sender-highlight">${senderName}</span> invited you to join Aadat!
                            </h1>
                            
                            <p class="invitation-text">
                                Your friend <strong>${senderName}</strong> thinks you'd be perfect for building better habits together! 
                                Aadat is a social platform where you can track habits, stay accountable, and celebrate progress with friends.
                            </p>
                            
                            <!-- CTA Button -->
                            <div class="cta-container">
                                <a href="${getClientUrl()}?invited_by=${encodeURIComponent(senderName)}" class="cta-button">
                                    🚀 Join Aadat Now
                                </a>
                            </div>
                            
                            <!-- Stats Bar -->
                            <div class="stats-bar">
                                <div class="stat-item">
                                    <span class="stat-number">12K+</span>
                                    <span class="stat-label">Active Users</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-number">500K+</span>
                                    <span class="stat-label">Habits Tracked</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-number">94%</span>
                                    <span class="stat-label">Success Rate</span>
                                </div>
                            </div>
                            
                            <!-- Features -->
                            <div class="features">
                                <h3>✨ What you can do on Aadat:</h3>
                                <div class="feature-item">
                                    <span class="feature-icon">📊</span>
                                    <span>Track your daily habits and build impressive streaks</span>
                                </div>
                                <div class="feature-item">
                                    <span class="feature-icon">🤝</span>
                                    <span>Share progress and motivate your friends</span>
                                </div>
                                <div class="feature-item">
                                    <span class="feature-icon">🏆</span>
                                    <span>Compete on the leaderboard and climb the ranks</span>
                                </div>
                                <div class="feature-item">
                                    <span class="feature-icon">🎖️</span>
                                    <span>Unlock achievements and celebrate milestones</span>
                                </div>
                                <div class="feature-item">
                                    <span class="feature-icon">💪</span>
                                    <span>Get motivated by a supportive community</span>
                                </div>
                            </div>
                            
                            <p style="color: #718096; font-size: 15px; text-align: center; margin-top: 30px;">
                                <span class="emoji">⚡</span> Start building better habits today. It's <strong>free</strong> and takes less than a minute!
                            </p>
                        </div>
                        
                        <!-- Footer -->
                        <div class="footer">
                            <p class="footer-text">This invitation was personally sent by <strong>${senderName}</strong></p>
                            <p class="footer-text">They're waiting for you to join them on their habit-building journey!</p>
                            <p class="footer-brand">Aadat · Build Better Habits Together</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

        return await sendEmail({ to: toEmail, subject, text, html });
    } catch (error) {
        console.error('❌ Error sending invitation email:', error);
        throw error;
    }
};

// ---- OTP Email ----
const sendOTPEmail = async (toEmail, otp, username) => {
    try {
        const subject = `Your verification code is ${otp}`;
        const text = `Hello ${username || 'there'},\n\nYour Aadat verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nAadat Team`;
        const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
                            line-height: 1.6;
                            color: #1a1a1a;
                            background: #f5f7fa;
                            padding: 40px 20px;
                        }
                        .email-wrapper {
                            max-width: 500px;
                            margin: 0 auto;
                            background: #ffffff;
                            border-radius: 16px;
                            overflow: hidden;
                            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                        }
                        .header {
                            background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
                            padding: 30px;
                            text-align: center;
                            border-bottom: 4px solid #00ff88;
                        }
                        .logo {
                            font-size: 32px;
                            font-weight: 900;
                            color: #ffffff;
                            letter-spacing: -0.03em;
                        }
                        .neon-dot {
                            display: inline-block;
                            width: 8px;
                            height: 8px;
                            background: #00ff88;
                            border-radius: 50%;
                            margin-left: 4px;
                            box-shadow: 0 0 15px #00ff88;
                        }
                        .content {
                            padding: 40px 30px;
                        }
                        h1 {
                            color: #000000;
                            font-size: 24px;
                            font-weight: 700;
                            margin-bottom: 15px;
                        }
                        .greeting {
                            color: #4a5568;
                            font-size: 16px;
                            margin-bottom: 30px;
                        }
                        .otp-container {
                            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                            border-radius: 12px;
                            padding: 30px;
                            text-align: center;
                            margin: 30px 0;
                            border: 2px solid #00ff88;
                        }
                        .otp-label {
                            color: #718096;
                            font-size: 14px;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                            margin-bottom: 15px;
                            font-weight: 600;
                        }
                        .otp-code {
                            font-size: 48px;
                            font-weight: 900;
                            color: #000000;
                            letter-spacing: 8px;
                            font-family: 'Courier New', monospace;
                            text-shadow: 2px 2px 0px #00ff88;
                        }
                        .expiry-text {
                            color: #e53e3e;
                            font-size: 14px;
                            margin-top: 15px;
                            font-weight: 600;
                        }
                        .info-text {
                            color: #4a5568;
                            font-size: 15px;
                            line-height: 1.8;
                            margin: 20px 0;
                        }
                        .warning-box {
                            background: #fff5f5;
                            border-left: 4px solid #e53e3e;
                            padding: 15px;
                            margin: 25px 0;
                            border-radius: 8px;
                        }
                        .warning-text {
                            color: #c53030;
                            font-size: 14px;
                            font-weight: 600;
                        }
                        .footer {
                            background: #f8f9fa;
                            padding: 25px 30px;
                            text-align: center;
                            border-top: 1px solid #e2e8f0;
                        }
                        .footer-text {
                            color: #718096;
                            font-size: 13px;
                            margin: 5px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="email-wrapper">
                        <div class="header">
                            <div class="logo">
                                Aadat<span class="neon-dot"></span>
                            </div>
                        </div>
                        
                        <div class="content">
                            <h1>🔐 Verify Your Email</h1>
                            <p class="greeting">Hello ${username || 'there'}! Welcome to Aadat.</p>
                            
                            <p class="info-text">
                                To complete your registration, please use the verification code below:
                            </p>
                            
                            <div class="otp-container">
                                <div class="otp-label">Your Verification Code</div>
                                <div class="otp-code">${otp}</div>
                                <div class="expiry-text">⏱️ Expires in 10 minutes</div>
                            </div>
                            
                            <p class="info-text">
                                Enter this code on the registration page to verify your email and activate your account.
                            </p>
                            
                            <div class="warning-box">
                                <p class="warning-text">🔒 Security Notice</p>
                                <p style="color: #718096; font-size: 13px; margin-top: 8px;">
                                    Never share this code with anyone. Aadat will never ask you for this code via email or phone.
                                </p>
                            </div>
                            
                            <p class="info-text">
                                If you didn't request this code, please ignore this email or contact our support team.
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p class="footer-text">This verification code was requested for your Aadat account</p>
                            <p class="footer-text">Aadat · Build Better Habits Together</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

        return await sendEmail({ to: toEmail, subject, text, html });
    } catch (error) {
        console.error('❌ Error sending OTP email:', error);
        throw error;
    }
};

module.exports = {
    sendInvitationEmail,
    sendOTPEmail
};

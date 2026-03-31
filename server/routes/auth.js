import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prisma/client.js';

const router = express.Router();

// POST /api/auth/login
// Accepts { username, password } — role is detected from DB
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ error: 'Username and password required' });

    try {
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        // Build JWT payload based on role
        const payload = { userId: user.id, role: user.role };
        let profileData = {};

        if (user.role === 'university') {
            const uni = await prisma.university.findUnique({ where: { user_id: user.id } });
            payload.universityId = uni?.id;
            profileData = { name: uni?.name, address: uni?.address };
        } else if (user.role === 'student') {
            const stu = await prisma.student.findUnique({ where: { user_id: user.id } });
            payload.studentId = stu?.id;
            payload.universityId = stu?.university_id;
            profileData = {
                enrollment_no: stu?.enrollment_no,
                wallet_address: stu?.wallet_address, // student's wallet where SBTs are minted
                name: user.name || stu?.enrollment_no,
            };
        } else if (user.role === 'company') {
            const comp = await prisma.company.findUnique({ where: { user_id: user.id } });
            payload.companyId = comp?.id;
            profileData = { name: comp?.name, wallet_address: comp?.wallet_address };
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        });

        res.json({
            token,
            role: user.role,
            userId: user.id,
            email: user.email,
            // wallet_address from profileData takes priority (company/student have role-specific wallets)
            // for university the wallet is on the User record
            wallet_address: profileData.wallet_address ?? user.wallet_address,
            universityId: payload.universityId, // explicitly return for frontend context
            studentId: payload.studentId,       // explicitly return for frontend context
            companyId: payload.companyId,       // explicitly return for frontend context
            ...profileData,
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
        const user = await prisma.user.findFirst({ where: { email } });
        // Always respond with same message to prevent user enumeration
        if (!user) {
            return res.json({ message: 'If this email exists, a reset link has been sent.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.passwordResetToken.create({
            data: { user_id: user.id, token, expires_at },
        });

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        if (process.env.NODE_ENV === 'development') {
            // In dev mode log to console instead of sending email
            console.log('\n🔑 PASSWORD RESET LINK (dev mode):');
            console.log(resetLink);
            console.log('');
        }

        // TODO: Send email in production using nodemailer
        res.json({ message: 'If this email exists, a reset link has been sent.' });

    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
        return res.status(400).json({ error: 'Token and new password required' });

    try {
        const resetRecord = await prisma.passwordResetToken.findUnique({ where: { token } });

        if (!resetRecord || resetRecord.used || resetRecord.expires_at < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const password_hash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: resetRecord.user_id },
            data: { password_hash },
        });

        await prisma.passwordResetToken.update({
            where: { token },
            data: { used: true },
        });

        res.json({ message: 'Password reset successful. Please login.' });

    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT USER ID — OTP FLOW
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/auth/forgot-userid/send-otp
// Body: { email }
// Generates a 6-digit OTP, stores it in otp_tokens, logs to console in dev.
router.post('/forgot-userid/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
        const user = await prisma.user.findFirst({ where: { email } });
        // Always respond with the same message to prevent user enumeration
        if (!user) {
            return res.json({ message: 'If this email is registered, an OTP has been sent.' });
        }

        // Invalidate any existing unused OTPs for this user+purpose
        await prisma.otpToken.updateMany({
            where: { user_id: user.id, purpose: 'forgot_userid', used: false },
            data: { used: true },
        });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await prisma.otpToken.create({
            data: { user_id: user.id, otp, purpose: 'forgot_userid', expires_at },
        });

        if (process.env.NODE_ENV === 'development') {
            console.log('\n🔑 FORGOT USER ID — OTP (dev mode):');
            console.log(`   Email : ${email}`);
            console.log(`   OTP   : ${otp}`);
            console.log('');
        }

        // TODO: send real email in production via nodemailer
        res.json({ message: 'If this email is registered, an OTP has been sent.' });

    } catch (err) {
        console.error('Forgot-userid send-otp error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/forgot-userid/verify-otp
// Body: { email, otp }
// Returns: { username, resetToken } on success — resetToken can be used to reset password.
router.post('/forgot-userid/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    try {
        const user = await prisma.user.findFirst({ where: { email } });
        if (!user) return res.status(400).json({ error: 'Invalid OTP' });

        const otpRecord = await prisma.otpToken.findFirst({
            where: {
                user_id: user.id,
                otp,
                purpose: 'forgot_userid',
                used: false,
                expires_at: { gt: new Date() },
            },
        });

        if (!otpRecord) return res.status(400).json({ error: 'Invalid or expired OTP' });

        // Mark OTP as used
        await prisma.otpToken.update({
            where: { id: otpRecord.id },
            data: { used: true },
        });

        // Issue a short-lived password-reset token so the user can optionally reset password
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.passwordResetToken.create({
            data: { user_id: user.id, token: resetToken, expires_at: resetExpires },
        });

        res.json({
            username: user.username,
            resetToken,
            message: 'OTP verified successfully.',
        });

    } catch (err) {
        console.error('Forgot-userid verify-otp error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/forgot-userid/reset-password
// Body: { resetToken, newPassword }
// Reuses PasswordResetToken model — same as the normal forgot-password reset flow.
router.post('/forgot-userid/reset-password', async (req, res) => {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword)
        return res.status(400).json({ error: 'Reset token and new password required' });

    try {
        const resetRecord = await prisma.passwordResetToken.findUnique({ where: { token: resetToken } });

        if (!resetRecord || resetRecord.used || resetRecord.expires_at < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const password_hash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: resetRecord.user_id },
            data: { password_hash },
        });

        await prisma.passwordResetToken.update({
            where: { token: resetToken },
            data: { used: true },
        });

        res.json({ message: 'Password reset successful. Please login.' });

    } catch (err) {
        console.error('Forgot-userid reset-password error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;

import express from 'express';
import prisma from '../prisma/client.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

// GET /api/consent/student-wallet?enrollment_no=STU2024001
// Company uses this to resolve student wallet before making on-chain tx
router.get('/student-wallet', authenticate, async (req, res) => {
    if (req.user.role !== 'company')
        return res.status(403).json({ error: 'Only companies can resolve student wallets' });

    const { enrollment_no } = req.query;
    if (!enrollment_no)
        return res.status(400).json({ error: 'enrollment_no required' });

    try {
        const stu = await prisma.student.findUnique({
            where: { enrollment_no },
            include: { user: { select: { name: true } } },
        });
        if (!stu) return res.status(404).json({ error: `No student found with enrollment "${enrollment_no}"` });
        if (!stu.wallet_address) return res.status(400).json({ error: `Student "${stu.user.name}" has no registered wallet` });

        res.json({
            student_id: stu.id,
            student_name: stu.user.name,
            enrollment_no: stu.enrollment_no,
            wallet_address: stu.wallet_address,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to resolve student wallet' });
    }
});

// POST /api/consent/request — company requests access by student enrollment_no
// Accepts optional on_chain_id (bytes32 from ConsentManager.requestConsent tx)
router.post('/request', authenticate, async (req, res) => {
    if (req.user.role !== 'company')
        return res.status(403).json({ error: 'Only companies can request consent' });

    const { student_id, enrollment_no, on_chain_id } = req.body;

    try {
        let resolvedStudentId = student_id;
        let studentName = null;
        if (!resolvedStudentId && enrollment_no) {
            const stu = await prisma.student.findUnique({
                where: { enrollment_no },
                include: { user: { select: { name: true } } },
            });
            if (!stu) return res.status(404).json({ error: `No student found with enrollment number "${enrollment_no}"` });
            resolvedStudentId = stu.id;
            studentName = stu.user.name || enrollment_no;
        }
        if (!resolvedStudentId) return res.status(400).json({ error: 'student_id or enrollment_no required' });

        // Check if request already exists
        const existing = await prisma.consentLog.findFirst({
            where: {
                student_id: resolvedStudentId,
                company_id: req.user.companyId,
                status: { in: ['pending', 'approved'] },
            },
        });
        if (existing)
            return res.status(400).json({ error: 'Consent request already exists for this student' });

        const consent = await prisma.consentLog.create({
            data: {
                student_id: resolvedStudentId,
                company_id: req.user.companyId,
                status: 'pending',
                // Store the on-chain bytes32 consentId for reference
                token_id: on_chain_id || null,
            },
        });
        res.json({ ...consent, student_name: studentName });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create consent request' });
    }
});

// GET /api/consent/pending — students see incoming requests; companies see their own
router.get('/pending', authenticate, async (req, res) => {
    try {
        if (req.user.role === 'student') {
            const requests = await prisma.consentLog.findMany({
                where: { student_id: req.user.studentId },
                include: {
                    company: { include: { user: { select: { name: true, email: true } } } },
                },
                orderBy: { created_at: 'desc' },
            });
            res.json(requests);
        } else if (req.user.role === 'company') {
            const requests = await prisma.consentLog.findMany({
                where: { company_id: req.user.companyId },
                include: {
                    student: { include: { user: { select: { name: true } } } },
                },
                orderBy: { created_at: 'desc' },
            });
            const shaped = requests.map(r => ({
                id: r.id,
                status: r.status,
                student_id: r.student_id,
                student_enrollment: r.student?.enrollment_no,
                student_name: r.student?.user?.name || r.student?.enrollment_no,
                student_wallet: r.student?.wallet_address,
                on_chain_id: r.token_id,
                created_at: r.created_at,
                granted_at: r.granted_at,
            }));
            res.json(shaped);
        } else {
            res.status(403).json({ error: 'Access denied' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch consent requests' });
    }
});

// POST /api/consent/approve — student approves (DB sync after on-chain tx)
router.post('/approve', authenticate, async (req, res) => {
    if (req.user.role !== 'student')
        return res.status(403).json({ error: 'Only students can approve consent' });

    const { consent_id } = req.body;
    try {
        const consent = await prisma.consentLog.findUnique({ where: { id: consent_id } });
        if (!consent || consent.student_id !== req.user.studentId)
            return res.status(403).json({ error: 'Not your consent request' });

        const updated = await prisma.consentLog.update({
            where: { id: consent_id },
            data: { status: 'approved', granted_at: new Date() },
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve consent' });
    }
});

// POST /api/consent/revoke — student revokes access
router.post('/revoke', authenticate, async (req, res) => {
    if (req.user.role !== 'student')
        return res.status(403).json({ error: 'Only students can revoke consent' });

    const { consent_id } = req.body;
    try {
        const consent = await prisma.consentLog.findUnique({ where: { id: consent_id } });
        if (!consent || consent.student_id !== req.user.studentId)
            return res.status(403).json({ error: 'Not your consent request' });

        const updated = await prisma.consentLog.update({
            where: { id: consent_id },
            data: { status: 'revoked', revoked_at: new Date() },
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to revoke consent' });
    }
});

// GET /api/consent/access?student_id=X — company checks if it has access
router.get('/access', authenticate, async (req, res) => {
    const { student_id } = req.query;
    try {
        const consent = await prisma.consentLog.findFirst({
            where: {
                company_id: req.user.companyId,
                student_id,
                status: 'approved',
            },
        });
        res.json({ hasAccess: !!consent, consent });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check access' });
    }
});

export default router;

import express from 'express';
import prisma from '../prisma/client.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

// GET /api/university/degrees — public, no auth needed
router.get('/degrees', async (req, res) => {
    try {
        const degrees = await prisma.degree.findMany({ orderBy: { name: 'asc' } });
        res.json(degrees);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch degrees' });
    }
});

// GET /api/university/departments?university_id=X[&degree_id=Y] — public
router.get('/departments', async (req, res) => {
    const { university_id, degree_id } = req.query;
    if (!university_id)
        return res.status(400).json({ error: 'university_id required' });

    try {
        const where = { university_id };
        if (degree_id) where.degree_id = degree_id;

        const departments = await prisma.department.findMany({
            where,
            orderBy: { name: 'asc' },
        });
        res.json(departments);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// GET /api/university/students — protected: university sees only its own students
router.get('/students', authenticate, async (req, res) => {
    if (req.user.role !== 'university')
        return res.status(403).json({ error: 'Access denied' });

    const { department_id } = req.query;

    try {
        const where = { university_id: req.user.universityId };
        if (department_id) where.department_id = department_id;

        const students = await prisma.student.findMany({
            where,
            include: { user: { select: { name: true, username: true, email: true, wallet_address: true } } },
            orderBy: { enrollment_no: 'asc' },
        });

        // Flatten to a frontend-friendly shape
        const shaped = students.map(s => ({
            id: s.id,
            userId: s.user_id,
            name: s.user.name || s.enrollment_no,  // fallback to enrollment_no if name not set
            rollNumber: s.enrollment_no,
            enrollment_no: s.enrollment_no,
            email: s.user.email,
            wallet: s.wallet_address || s.user.wallet_address, // prefer Student wallet, fall back to User
            dob: s.dob,
        }));

        res.json(shaped);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// GET /api/university/profile — get current university's details
router.get('/profile', authenticate, async (req, res) => {
    if (req.user.role !== 'university')
        return res.status(403).json({ error: 'Access denied' });

    try {
        const university = await prisma.university.findUnique({
            where: { id: req.user.universityId },
        });
        res.json(university);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

export default router;

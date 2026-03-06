import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/auth.js';
import universityRoutes from './routes/university.js';
import consentRoutes from './routes/consent.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Allow frontend origins (dev: localhost:5173/5174, prod: FRONTEND_URL)
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL]
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/university', universityRoutes);
app.use('/api/consent', consentRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'EduLedger API running' });
});

app.listen(PORT, () => {
    console.log(`\n🚀 EduLedger Backend running at http://localhost:${PORT}`);
});

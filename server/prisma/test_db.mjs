import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
console.log('URL preview:', process.env.DATABASE_URL?.replace(/:([^@]+)@/, ':***@'));
try {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter });
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ DB Connected! Result:', result);
    await prisma.$disconnect();
} catch (err) {
    console.error('❌ Full Error:', err.message);
}

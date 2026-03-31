import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    // Show students with their names
    const students = await prisma.user.findMany({
        where: { role: 'student' },
        select: { id: true, username: true, name: true, email: true },
    });
    console.log('\n=== Students ===');
    students.forEach(u => console.log(`  username=${u.username}  name=${u.name}  email=${u.email}`));

    // Update STU2024001 (harikrishnan student) email
    const r = await prisma.user.update({
        where: { username: 'STU2024001' },
        data: { email: 'harikrishnan5274@gmail.com' },
    });
    console.log(`\n  Updated STU2024001 email => ${r.email}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // List all users first
    const users = await prisma.user.findMany({
        select: { id: true, username: true, role: true, email: true },
        orderBy: { role: 'asc' },
    });
    console.log('Current users:');
    console.table(users);
}

main().catch(console.error).finally(() => prisma.$disconnect());

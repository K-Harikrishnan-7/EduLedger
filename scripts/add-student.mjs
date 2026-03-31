/**
 * Add a single student to the EduLedger database.
 *
 * Usage (from project root):
 *   node scripts/add-student.mjs --university=REC001 --enrollment=STU2024004 --name="Priya" --dob=2005-01-15 [--email=priya@example.com] [--wallet=0x...]
 *
 * - university: username of the university (e.g. REC001)
 * - enrollment: unique enrollment number (also used as login username)
 * - name: display name
 * - dob: date of birth YYYY-MM-DD (used as default password)
 * - email: optional
 * - wallet: optional Ethereum address for SBT minting / consent
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Parse argv: support --key=value and --key value; handle PowerShell passing one concatenated string
const args = {};
const raw = process.argv.slice(2).flatMap((a) => a.split(/\s+/).filter(Boolean));
for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (arg.startsWith('--')) {
        const eq = arg.indexOf('=');
        if (eq > 2) {
            const key = arg.slice(2, eq);
            let val = arg.slice(eq + 1);
            args[key] = val.replace(/^["']|["']$/g, '');
        } else if (i + 1 < raw.length && !raw[i + 1].startsWith('--')) {
            args[arg.slice(2)] = raw[++i].replace(/^["']|["']$/g, '');
        }
    }
}
const getArg = (name) => args[name] || null;

async function main() {
    const universityUsername = getArg('university');
    const enrollment = getArg('enrollment');
    const name = getArg('name');
    const dob = getArg('dob');
    const email = getArg('email') || null;
    const wallet = getArg('wallet') || null;

    if (!universityUsername || !enrollment || !name || !dob) {
        console.error('Usage: node scripts/add-student.mjs --university=REC001 --enrollment=STU2024004 --name="Student Name" --dob=2005-01-15 [--email=...] [--wallet=0x...]');
        process.exit(1);
    }

    const uniUser = await prisma.user.findUnique({ where: { username: universityUsername } });
    if (!uniUser || uniUser.role !== 'university') {
        console.error(`University "${universityUsername}" not found. Run seed first.`);
        process.exit(1);
    }
    const university = await prisma.university.findUnique({ where: { user_id: uniUser.id } });
    if (!university) {
        console.error('University record not found.');
        process.exit(1);
    }

    const existing = await prisma.user.findUnique({ where: { username: enrollment } });
    if (existing) {
        console.error(`User/enrollment "${enrollment}" already exists.`);
        process.exit(1);
    }

    const password_hash = await bcrypt.hash(dob, 10);
    const user = await prisma.user.create({
        data: {
            username: enrollment,
            password_hash,
            role: 'student',
            name,
            email,
            wallet_address: wallet,
        },
    });
    await prisma.student.create({
        data: {
            user_id: user.id,
            enrollment_no: enrollment,
            university_id: university.id,
            dob,
            wallet_address: wallet,
        },
    });

    console.log('Student added successfully.');
    console.log(`  Login: ${enrollment} / ${dob}`);
    console.log(`  Name: ${name}`);
    if (wallet) console.log(`  Wallet: ${wallet}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());

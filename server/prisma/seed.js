/**
 * EduLedger Admin Seed Script
 * Run: node server/prisma/seed.js
 *
 * Hardhat Account Assignments:
 *   Account 0: 0xf39F...2266  = Deployer (contract owner)
 *   Account 1: 0x7099...79C8  = University (REC)
 *   Account 2: 0x3C44...93BC  = Student Harikrishnan
 *   Account 3: 0x90F7...b906  = Student Harish
 *   Account 5: 0x9965...4dc   = Company (Google)
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Seeding EduLedger database...\n');

    // ─── 1. DEGREES (only B.E and B.Tech) ────────────────────────────────────
    const degreeNames = ['B.E', 'B.Tech'];
    const degreeMap = {};
    for (const name of degreeNames) {
        const degree = await prisma.degree.upsert({
            where: { name },
            update: {},
            create: { name },
        });
        degreeMap[name] = degree;
    }
    console.log(`✅ ${degreeNames.length} degrees seeded: ${degreeNames.join(', ')}`);

    // ─── 2. UNIVERSITY (Hardhat Account 1) ────────────────────────────────────
    const UNIVERSITY_WALLET = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const uniPasswordHash = await bcrypt.hash('REC@2024', 10);
    const uniUser = await prisma.user.upsert({
        where: { username: 'REC001' },
        update: { name: 'Rajalakshmi Engineering College', wallet_address: UNIVERSITY_WALLET },
        create: {
            username: 'REC001',
            password_hash: uniPasswordHash,
            role: 'university',
            name: 'Rajalakshmi Engineering College',
            email: 'admin@rec.ac.in',
            wallet_address: UNIVERSITY_WALLET,
        },
    });

    const university = await prisma.university.upsert({
        where: { user_id: uniUser.id },
        update: {},
        create: {
            user_id: uniUser.id,
            name: 'Rajalakshmi Engineering College',
            address: 'Rajalakshmi Nagar, Thandalam, Tamil Nadu 602105',
            accreditation_code: 'REC-AICTE-2024',
        },
    });
    console.log(`✅ University seeded: ${university.name}`);
    console.log(`   Wallet: ${UNIVERSITY_WALLET} (MetaMask Account 1)`);
    console.log(`   Login: REC001 / REC@2024`);

    // ─── 3. DEPARTMENTS (linked to degrees) ───────────────────────────────────
    const beDepartments = [
        'Computer Science and Engineering',
        'Electronics and Communication Engineering',
        'Mechanical Engineering',
        'Civil Engineering',
        'Electrical and Electronics Engineering',
        'Information Technology',
        'Artificial Intelligence and Data Science',
    ];
    for (const name of beDepartments) {
        await prisma.department.upsert({
            where: { name_university_id_degree_id: { name, university_id: university.id, degree_id: degreeMap['B.E'].id } },
            update: {},
            create: { name, university_id: university.id, degree_id: degreeMap['B.E'].id },
        });
    }
    console.log(`✅ ${beDepartments.length} B.E departments seeded`);

    const btechDepartments = [
        'Computer Science and Business Systems',
        'Computer Science and Engineering',
    ];
    const btechDeptMap = {};
    for (const name of btechDepartments) {
        const dept = await prisma.department.upsert({
            where: { name_university_id_degree_id: { name, university_id: university.id, degree_id: degreeMap['B.Tech'].id } },
            update: {},
            create: { name, university_id: university.id, degree_id: degreeMap['B.Tech'].id },
        });
        btechDeptMap[name] = dept;
    }
    console.log(`✅ ${btechDepartments.length} B.Tech departments seeded`);

    // ─── 4. REMOVE PRIYA if she exists ────────────────────────────────────────
    const priyaUser = await prisma.user.findUnique({ where: { username: 'STU2024003' } });
    if (priyaUser) {
        await prisma.user.delete({ where: { id: priyaUser.id } }); // cascades to Student
        console.log('🗑️  Removed student: Priya (STU2024003)');
    }

    // ─── 5. STUDENTS (Harish and Harikrishnan → B.Tech / CS&BS) ───────────────
    const csbs = btechDeptMap['Computer Science and Business Systems'];

    const studentsData = [
        {
            username: 'STU2024001',
            name: 'Harikrishnan',
            email: 'hari@gmail.com',
            dob: '2005-05-15',
            enrollment_no: 'STU2024001',
            wallet: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        }, // Account 2
        {
            username: 'STU2024002',
            name: 'Harish',
            email: 'harish@gmail.com',
            dob: '2005-08-22',
            enrollment_no: 'STU2024002',
            wallet: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        }, // Account 3
    ];

    for (const s of studentsData) {
        const hash = await bcrypt.hash(s.dob, 10);
        const stuUser = await prisma.user.upsert({
            where: { username: s.username },
            update: { name: s.name },
            create: {
                username: s.username,
                password_hash: hash,
                role: 'student',
                name: s.name,
                email: s.email,
                wallet_address: null,
            },
        });
        await prisma.student.upsert({
            where: { user_id: stuUser.id },
            update: { wallet_address: s.wallet, department_id: csbs.id },
            create: {
                user_id: stuUser.id,
                enrollment_no: s.enrollment_no,
                university_id: university.id,
                department_id: csbs.id,
                dob: s.dob,
                wallet_address: s.wallet,
            },
        });
        console.log(`  👤 ${s.name} | Dept: Computer Science and Business Systems (B.Tech) | Login: ${s.username} / ${s.dob}`);
    }
    console.log(`✅ ${studentsData.length} students seeded`);

    // ─── 6. COMPANY (Hardhat Account 5) ───────────────────────────────────────
    const COMPANY_WALLET = '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc';
    const compHash = await bcrypt.hash('Google@2024', 10);
    const compUser = await prisma.user.upsert({
        where: { username: 'GOOGLE001' },
        update: { name: 'Google', wallet_address: COMPANY_WALLET },
        create: {
            username: 'GOOGLE001',
            password_hash: compHash,
            role: 'company',
            name: 'Google',
            email: 'hr@google.com',
            wallet_address: COMPANY_WALLET,
        },
    });
    await prisma.company.upsert({
        where: { user_id: compUser.id },
        update: { wallet_address: COMPANY_WALLET },
        create: { user_id: compUser.id, name: 'Google', wallet_address: COMPANY_WALLET },
    });
    console.log(`✅ Company seeded: Google`);
    console.log(`   Wallet: ${COMPANY_WALLET} (MetaMask Account 5)`);
    console.log(`   Login: GOOGLE001 / Google@2024`);

    console.log('\n🎉 Seeding complete!');
    console.log('\n━━ MetaMask Account Map ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Account 0 → Deployer             (do NOT use in app)');
    console.log('  Account 1 → University (REC001)  → wallet 0x7099...79C8');
    console.log('  Account 2 → Student Harikrishnan → wallet 0x3C44...93BC');
    console.log('  Account 3 → Student Harish       → wallet 0x90F7...b906');
    console.log('  Account 5 → Company Google       → wallet 0x9965...4dc');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

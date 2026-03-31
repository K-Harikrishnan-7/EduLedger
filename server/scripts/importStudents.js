/**
 * EduLedger Student CSV Import Script
 *
 * Usage:
 *   node server/scripts/importStudents.js --file="./students.csv" --university="REC001"
 *
 * CSV Format (first row = headers):
 *   enrollment_no,name,email,dob,wallet_address
 *   STU2024001,Harikrishnan,hari@gmail.com,2005-05-15,0xABC...
 *
 * Rules:
 * - enrollment_no becomes the login username
 * - dob (YYYY-MM-DD) becomes the default password
 * - wallet_address is optional
 * - Duplicate enrollment_no rows are skipped (safe to re-run)
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import path from 'path';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Parse CLI arguments
const args = process.argv.slice(2);
const getArg = (name) => {
    const found = args.find(a => a.startsWith(`--${name}=`));
    return found ? found.split('=')[1] : null;
};

const csvFile = getArg('file');
const universityUsername = getArg('university');

if (!csvFile || !universityUsername) {
    console.error('❌ Usage: node server/scripts/importStudents.js --file="./students.csv" --university="REC001"');
    process.exit(1);
}

async function importStudents() {
    // Find university by username
    const uniUser = await prisma.user.findUnique({ where: { username: universityUsername } });
    if (!uniUser || uniUser.role !== 'university') {
        console.error(`❌ University "${universityUsername}" not found in DB. Seed it first.`);
        process.exit(1);
    }
    const university = await prisma.university.findUnique({ where: { user_id: uniUser.id } });
    console.log(`\n🏫 Importing students for: ${university.name}`);
    console.log(`📂 CSV file: ${path.resolve(csvFile)}\n`);

    const records = [];
    const parser = createReadStream(path.resolve(csvFile)).pipe(
        parse({ columns: true, skip_empty_lines: true, trim: true })
    );
    for await (const row of parser) {
        records.push(row);
    }

    console.log(`📋 Found ${records.length} records in CSV\n`);

    let imported = 0;
    let skipped = 0;

    for (const row of records) {
        const { enrollment_no, name, email, dob, wallet_address } = row;

        if (!enrollment_no || !dob) {
            console.warn(`⚠️  Skipping row — missing enrollment_no or dob: ${JSON.stringify(row)}`);
            skipped++;
            continue;
        }

        // Check if already exists
        const exists = await prisma.user.findUnique({ where: { username: enrollment_no } });
        if (exists) {
            console.log(`  ⏭️  Skip (already exists): ${enrollment_no}`);
            skipped++;
            continue;
        }

        const password_hash = await bcrypt.hash(dob, 10);
        const newUser = await prisma.user.create({
            data: {
                username: enrollment_no,
                password_hash,
                role: 'student',
                name: name || null,
                email: email || null,
                wallet_address: wallet_address || null,
            },
        });

        await prisma.student.create({
            data: {
                user_id: newUser.id,
                enrollment_no,
                university_id: university.id,
                dob: dob || null,
                wallet_address: wallet_address || null,
            },
        });

        console.log(`  ✅ Imported: ${name || enrollment_no} (${enrollment_no})`);
        imported++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Imported : ${imported}`);
    console.log(`   Skipped  : ${skipped}`);
    console.log(`   Total    : ${records.length}`);
    console.log(`\n🎉 Import complete!\n`);
}

importStudents()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

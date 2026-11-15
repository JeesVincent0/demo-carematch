import 'dotenv/config';
import { PrismaClient, VerificationStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { requiredDocuments } from '../src/modules/domain';
const db = new PrismaClient();
async function main() {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12)
    throw new Error('Set DEMO_PASSWORD (12+ characters) before seeding.');
  const passwordHash = await hash(password, 12);
  const admin = await db.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@carematch.demo' },
    update: {},
    create: {
      firstName: 'Alex',
      lastName: 'Morgan',
      email: process.env.ADMIN_EMAIL || 'admin@carematch.demo',
      passwordHash,
      role: 'ADMIN',
      phone: '07700 900001',
    },
  });
  const names = [
    ['Sarah', 'Mitchell'],
    ['James', 'Okafor'],
    ['Amara', 'Patel'],
    ['Emily', 'Thompson'],
    ['David', 'Williams'],
    ['Sophie', 'Evans'],
    ['Daniel', 'Campbell'],
    ['Aisha', 'Khan'],
    ['Oliver', 'Bennett'],
    ['Grace', 'Wilson'],
    ['Maya', 'Shah'],
    ['Thomas', 'Reed'],
    ['Freya', 'Davies'],
    ['Noah', 'Clarke'],
    ['Zara', 'Ahmed'],
    ['Isla', 'MacLeod'],
    ['Leo', 'Hughes'],
    ['Ruby', 'Turner'],
    ['Adam', 'Ali'],
    ['Chloe', 'Walker'],
  ];
  const cities = [
    'London',
    'Manchester',
    'Birmingham',
    'Leeds',
    'Bristol',
    'Liverpool',
    'Edinburgh',
    'Cardiff',
  ];
  const postcodes = [
    'SW1A 1AA',
    'M1 1AE',
    'B1 1AA',
    'LS1 1UR',
    'BS1 4ST',
    'L1 8JQ',
    'EH1 1YZ',
    'CF10 1EP',
  ];
  const categories = [
    'Nurse',
    'Home Carer',
    'Elderly Care Specialist',
    'Companion Carer',
    'Healthcare Assistant',
    'Support Worker',
    'Doctor',
    'Other Care Professional',
  ];
  const workerIds: string[] = [];
  const root = path.resolve(process.env.UPLOAD_DIR || '.local/uploads');
  await mkdir(root, { recursive: true });
  for (let i = 0; i < 20; i++) {
    const [firstName, lastName] = names[i];
    const email = `${firstName.toLowerCase()}@carematch.demo`;
    const exists = await db.user.findUnique({ where: { email }, include: { worker: true } });
    if (exists?.worker) {
      workerIds.push(exists.worker.id);
      continue;
    }
    const status: VerificationStatus =
      i < 10 ? 'APPROVED' : i < 15 ? 'PENDING' : i < 17 ? 'UNDER_REVIEW' : 'REJECTED';
    const profession = categories[i % 8];
    const user = await db.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role: 'WORKER',
        phone: `07700 9001${String(i).padStart(2, '0')}`,
        avatarUrl: `/images/portrait-${i % 5}.svg`,
        createdAt: new Date(Date.UTC(2026, 8 + (i % 3), 3 + i)),
        worker: {
          create: {
            slug: `${firstName}-${lastName}`.toLowerCase(),
            profession,
            jobTitle:
              profession === 'Nurse'
                ? 'Community nurse'
                : profession === 'Doctor'
                  ? 'General practitioner'
                  : profession,
            introduction: [
              'A calm, friendly presence with a passion for making everyday life a little easier.',
              'Thoughtful, person-centred support that puts your independence and comfort first.',
              'A warm approach to care, built around the routines and interests that matter to you.',
            ][i % 3],
            biography: `Hello, I’m ${firstName}. I believe good care begins with listening. I take time to understand the little things that make each day feel comfortable, familiar and enjoyable.\n\nI bring ${5 + (i % 12)} years of fictional experience in supporting adults and families, with a particular interest in maintaining independence and building a reassuring routine. Outside work, I enjoy gardening, cooking and walks in the countryside.\n\nThis is a fictional CareMatch demonstration profile. All experience, qualifications and availability are illustrative.`,
            experienceYears: 5 + (i % 12),
            hourlyRate: String(18 + ((i * 3) % 25)),
            city: cities[i % 8],
            postcode: postcodes[i % 8],
            address: 'Demo address — not a real care location',
            dateOfBirth: '1988-05-15',
            languages:
              i % 3 === 0 ? ['English', 'Hindi'] : i % 5 === 0 ? ['English', 'Welsh'] : ['English'],
            specialisations: [
              ['Dementia support', 'Mobility support', 'Recovery support', 'Older adult care'][
                i % 4
              ],
            ],
            registrationNumber: ['Nurse', 'Doctor'].includes(profession)
              ? `DEMO-ONLY-${10000 + i}`
              : '',
            verificationStatus: status,
            onboardingStep: 5,
            submittedAt: new Date(Date.UTC(2026, 10, 1 + (i % 12))),
            skills: {
              create: [
                { skillName: i % 2 ? 'Personal care' : 'Dementia support' },
                { skillName: i % 3 ? 'Companionship' : 'Mobility support' },
              ],
            },
            qualifications: {
              create: [
                {
                  qualificationName:
                    profession === 'Nurse'
                      ? 'BSc Adult Nursing (fictional)'
                      : profession === 'Doctor'
                        ? 'MBBS (fictional)'
                        : 'Level 3 Diploma in Adult Care (fictional)',
                  institution: 'Demo College of Care',
                  yearCompleted: 2013 + (i % 7),
                },
              ],
            },
            services: {
              create: [
                { serviceType: 'Hourly Care' },
                { serviceType: 'Companionship' },
                { serviceType: i % 2 ? 'Personal Care' : 'Elderly Care' },
                { serviceType: i % 3 ? 'Respite Care' : 'Overnight Care' },
              ],
            },
            availability: {
              create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
                dayOfWeek,
                startTime: '09:00',
                endTime: '17:00',
                isAvailable: dayOfWeek < 5 || i % 2 === 0,
              })),
            },
          },
        },
      },
      include: { worker: true },
    });
    const w = user.worker!;
    workerIds.push(w.id);
    for (const type of requiredDocuments(profession)) {
      const key = `seed-${w.id}-${type.replace(/[^a-z]/gi, '').toLowerCase()}`;
      // Original sample evidence, deliberately watermarked and containing no identity data.
      const svgText = 'CARE MATCH SAMPLE EVIDENCE - NOT VALID IDENTITY OR PROFESSIONAL EVIDENCE';
      const content = `BT /F1 16 Tf 35 740 Td (${svgText}) Tj 0 -40 Td /F1 12 Tf (Fictional worker: ${firstName} ${lastName}) Tj 0 -30 Td (Document category: ${type}) Tj 0 -40 Td (For testing the manual demo review workflow only.) Tj ET`;
      const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 900 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
      ];
      let pdf = '%PDF-1.4\n';
      const offsets = [0];
      objects.forEach((o, j) => {
        offsets.push(Buffer.byteLength(pdf));
        pdf += `${j + 1} 0 obj\n${o}\nendobj\n`;
      });
      const xref = Buffer.byteLength(pdf);
      pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((n) => String(n).padStart(10, '0') + ' 00000 n \n')
        .join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
      await writeFile(path.join(root, key), pdf, { mode: 0o600 });
      await db.verificationDocument.create({
        data: {
          workerId: w.id,
          documentType: type,
          privateStorageKey: key,
          originalFileName: `SAMPLE-${type.replaceAll(' ', '-')}.pdf`,
          mimeType: 'application/pdf',
          reviewStatus: status === 'APPROVED' ? 'REVIEWED' : 'UPLOADED',
        },
      });
    }
    await db.verificationReview.create({
      data: {
        workerId: w.id,
        reviewedBy: admin.id,
        previousStatus: status === 'APPROVED' ? 'UNDER_REVIEW' : 'DRAFT',
        newStatus: status,
        notes:
          status === 'REJECTED'
            ? 'The sample qualification evidence is incomplete. Please upload a complete sample document and resubmit.'
            : 'Seeded internal demo review. No external credential checks performed.',
      },
    });
    await db.notification.create({
      data: {
        userId: user.id,
        type: 'VERIFICATION',
        title: `Application ${status.toLowerCase().replace('_', ' ')}`,
        message: 'This is a fictional demonstration of the review workflow.',
      },
    });
    await db.auditLog.create({
      data: {
        actorId: admin.id,
        action: `Seeded verification ${status.toLowerCase()}`,
        entityType: 'WorkerProfile',
        entityId: w.id,
      },
    });
  }
  const clients = [
    ['Olivia', 'Taylor'],
    ['Harry', 'Green'],
    ['Charlotte', 'King'],
    ['George', 'Scott'],
    ['Amelia', 'Baker'],
    ['Henry', 'Adams'],
    ['Ella', 'Roberts'],
    ['Jack', 'Lewis'],
  ];
  for (let i = 0; i < clients.length; i++) {
    const [firstName, lastName] = clients[i];
    const email = `${firstName.toLowerCase()}@carematch.demo`;
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) continue;
    const u = await db.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role: 'CLIENT',
        phone: `07700 90020${i}`,
        createdAt: new Date(Date.UTC(2026, 9 + (i % 2), 5 + i)),
        client: { create: { city: cities[i], postcode: postcodes[i] } },
      },
      include: { client: true },
    });
    const c = u.client!;
    await db.favourite.createMany({
      data: [
        { clientId: c.id, workerId: workerIds[i] },
        { clientId: c.id, workerId: workerIds[(i + 1) % 10] },
      ],
    });
    for (let j = 0; j < 2; j++)
      await db.careRequest.create({
        data: {
          clientId: c.id,
          workerId: workerIds[(i + j) % 10],
          careType: 'Companionship',
          requestedDate: new Date(Date.UTC(2026, 11, 5 + i + j, 12)),
          startTime: '10:00',
          durationHours: 2,
          generalLocation: cities[i],
          description:
            'A friendly visit, a conversation over tea and support with everyday activities. Fictional demo request.',
          status:
            j === 0 ? 'PENDING' : i % 3 === 0 ? 'ACCEPTED' : i % 3 === 1 ? 'COMPLETED' : 'DECLINED',
        },
      });
    await db.notification.create({
      data: {
        userId: u.id,
        type: 'WELCOME',
        title: 'Welcome to your CareMatch dashboard',
        message: 'Explore professionals, save your favourites and track your care requests.',
      },
    });
    await db.auditLog.create({
      data: { actorId: u.id, action: 'Client registered', entityType: 'User', entityId: u.id },
    });
  }
  console.log(
    'Demo seed complete: 1 admin, 8 clients, 20 professionals. Existing accounts were preserved.',
  );
}
main().finally(() => db.$disconnect());

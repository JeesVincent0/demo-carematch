import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { compare } from 'bcryptjs';
import { db } from '../src/lib/prisma';
import {
  register,
  saveWorker,
  saveDraft,
  submitVerification,
  reviewWorker,
  createRequest,
  transitionRequest,
  favourite,
  accountStatus,
} from '../src/modules/services';
import { searchWorkers } from '../src/modules/queries';
import { requiredDocuments } from '../src/modules/domain';
const enabled = process.env.RUN_DB_TESTS === 'true';
test(
  'persistent registration → review → search → request lifecycle with ownership and audit checks',
  { skip: !enabled },
  async () => {
    const suffix = Date.now();
    const emails = [
      `integration-worker-${suffix}@carematch.demo`,
      `integration-client-${suffix}@carematch.demo`,
      `integration-other-${suffix}@carematch.demo`,
    ];
    let ids: string[] = [];
    try {
      const admin = await db.user.findFirstOrThrow({ where: { role: 'ADMIN' } });
      for (let i = 0; i < 3; i++) {
        const u = await register({
          firstName: i === 0 ? 'Integration' : 'Test',
          lastName: 'Journey',
          email: emails[i],
          phone: '07700900123',
          password: 'CareMatch-Test-2026!',
          confirmPassword: 'CareMatch-Test-2026!',
          terms: true,
          role: i === 0 ? 'WORKER' : 'CLIENT',
          profession: i === 0 ? 'Nurse' : undefined,
        });
        ids.push(u.id);
      }
      const [worker, client, other] = await Promise.all(
        ids.map((id) => db.user.findUniqueOrThrow({ where: { id } })),
      );
      assert.ok(await compare('CareMatch-Test-2026!', worker.passwordHash));
      assert.notEqual(worker.passwordHash, 'CareMatch-Test-2026!');
      await assert.rejects(() =>
        register({
          firstName: 'Duplicate',
          lastName: 'Email',
          email: emails[0],
          phone: '07700900123',
          password: 'CareMatch-Test-2026!',
          confirmPassword: 'CareMatch-Test-2026!',
          terms: true,
          role: 'CLIENT',
        }),
      );
      const profile = {
        firstName: 'Integration',
        lastName: 'Journey',
        phone: '07700900123',
        city: `TestCity${suffix}`,
        postcode: 'SW1A 1AA',
        address: 'Demo only',
        dateOfBirth: '1990-01-01',
        introduction: 'Thoughtful support for your everyday routines.',
        profession: 'Nurse',
        jobTitle: 'Community nurse',
        experienceYears: 6,
        biography:
          'Fictional test biography with enough information to explain a kind and thoughtful approach to care.',
        hourlyRate: '25.50',
        travelRadius: 10,
        languages: 'English',
        skills: 'Companionship, Mobility support',
        qualifications: 'Fictional nursing qualification',
        services: ['Hourly Care', 'Companionship'],
        registrationNumber: 'DEMO-NURSE-ONLY',
        onboardingStep: 5,
      };
      await saveWorker(worker, profile);
      await saveDraft(worker, { step: 5, data: {} });
      const preserved = await db.workerProfile.findUniqueOrThrow({ where: { userId: worker.id } });
      assert.equal(preserved.registrationNumber, profile.registrationNumber);
      assert.equal(preserved.address, profile.address);
      assert.equal(preserved.dateOfBirth, profile.dateOfBirth);
      const w = await db.workerProfile.findUniqueOrThrow({ where: { userId: worker.id } });
      assert.equal((await searchWorkers({ location: profile.city })).total, 0);
      await assert.rejects(() => submitVerification(worker), /Upload required evidence/);
      await db.verificationDocument.createMany({
        data: requiredDocuments('Nurse').map((documentType) => ({
          workerId: w.id,
          documentType,
          privateStorageKey: 'integration-test-no-file',
          originalFileName: 'sample.pdf',
          mimeType: 'application/pdf',
        })),
      });
      await submitVerification(worker);
      await assert.rejects(
        () => reviewWorker(client, { id: w.id, status: 'UNDER_REVIEW' }),
        /Administrator/,
      );
      await assert.rejects(
        () => reviewWorker(admin, { id: w.id, status: 'APPROVED', confirmed: true }),
        /transition/,
      );
      await reviewWorker(admin, { id: w.id, status: 'UNDER_REVIEW' });
      await assert.rejects(
        () => reviewWorker(admin, { id: w.id, status: 'APPROVED', confirmed: true }),
        /Review each required/,
      );
      await reviewWorker(admin, {
        id: w.id,
        status: 'REJECTED',
        notes: 'Please replace the incomplete sample evidence.',
      });
      assert.equal((await searchWorkers({ location: profile.city })).total, 0);
      await submitVerification(worker);
      await reviewWorker(admin, { id: w.id, status: 'UNDER_REVIEW' });
      await db.verificationDocument.updateMany({
        where: { workerId: w.id },
        data: { reviewStatus: 'REVIEWED' },
      });
      await reviewWorker(admin, { id: w.id, status: 'APPROVED', confirmed: true });
      assert.equal((await searchWorkers({ location: profile.city })).total, 1);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const r = await createRequest(client, {
        workerId: w.id,
        careType: 'Companionship',
        requestedDate: tomorrow,
        startTime: '10:00',
        durationHours: 2,
        generalLocation: 'London',
        description: 'A fictional friendly visit and conversation.',
      });
      await assert.rejects(
        () => transitionRequest(other, { id: r.id, status: 'CANCELLED' }),
        /another account/,
      );
      await assert.rejects(
        () => transitionRequest(client, { id: r.id, status: 'ACCEPTED' }),
        /cannot be changed/,
      );
      await transitionRequest(worker, { id: r.id, status: 'ACCEPTED' });
      assert.equal(
        (await db.careRequest.findUniqueOrThrow({ where: { id: r.id } })).status,
        'ACCEPTED',
      );
      await transitionRequest(client, { id: r.id, status: 'COMPLETED' });
      await assert.rejects(() => transitionRequest(worker, { id: r.id, status: 'DECLINED' }));
      await favourite(client, { workerId: w.id, saved: true });
      await favourite(client, { workerId: w.id, saved: true });
      assert.equal(await db.favourite.count({ where: { workerId: w.id } }), 1);
      await accountStatus(admin, { id: worker.id, status: 'SUSPENDED' });
      assert.equal((await searchWorkers({ location: profile.city })).total, 0);
      await assert.rejects(() =>
        createRequest(client, {
          workerId: w.id,
          careType: 'Companionship',
          requestedDate: tomorrow,
          startTime: '10:00',
          durationHours: 2,
          generalLocation: 'London',
          description: 'A fictional friendly visit and conversation.',
        }),
      );
      await accountStatus(admin, { id: worker.id, status: 'ACTIVE' });
      const fresh = await db.user.findUniqueOrThrow({ where: { id: worker.id } });
      await saveWorker(fresh, { ...profile, registrationNumber: 'CHANGED-DEMO-NUMBER' });
      assert.equal((await searchWorkers({ location: profile.city })).total, 0);
      assert.ok((await db.notification.count({ where: { userId: client.id } })) > 1);
      assert.ok((await db.auditLog.count({ where: { entityId: w.id } })) >= 5);
    } finally {
      if (ids.length) {
        const workers = await db.workerProfile.findMany({
          where: { userId: { in: ids } },
          select: { id: true },
        });
        const workerIds = workers.map((w) => w.id);
        const requests = await db.careRequest.findMany({
          where: { OR: [{ workerId: { in: workerIds } }, { client: { userId: { in: ids } } }] },
          select: { id: true },
        });
        await db.auditLog.deleteMany({
          where: {
            OR: [
              { actorId: { in: ids } },
              { entityId: { in: [...ids, ...workerIds, ...requests.map((r) => r.id)] } },
            ],
          },
        });
        await db.careRequest.deleteMany({ where: { id: { in: requests.map((r) => r.id) } } });
        await db.verificationReview.deleteMany({
          where: { OR: [{ reviewedBy: { in: ids } }, { workerId: { in: workerIds } }] },
        });
        await db.user.deleteMany({ where: { id: { in: ids } } });
      }
      await db.$disconnect();
    }
  },
);

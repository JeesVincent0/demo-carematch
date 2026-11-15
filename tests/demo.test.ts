import test from 'node:test';
import assert from 'node:assert/strict';
import { initialDemoData, getDemoData, resetDemoData, updateDemoData } from '../src/lib/demo/store';
import { userView } from '../src/lib/demo/repository';
import {
  register,
  saveWorker,
  saveDraft,
  submitVerification,
  reviewWorker,
  reviewDocument,
  createRequest,
  transitionRequest,
  favourite,
  accountStatus,
} from '../src/modules/services';
import { searchWorkers } from '../src/modules/queries';
import { requiredDocuments } from '../src/modules/domain';
test('bundled JSON contains the required fictional demo records', () => {
  const data = initialDemoData();
  assert.equal(data.users.length, 29);
  assert.equal(data.clients.length, 8);
  assert.equal(data.workers.length, 20);
  for (const [status, count] of [
    ['APPROVED', 10],
    ['PENDING', 5],
    ['UNDER_REVIEW', 2],
    ['REJECTED', 3],
  ] as const)
    assert.equal(data.workers.filter((w) => w.verificationStatus === status).length, count);
});
test('JSON demo preserves the complete worker review and care request journey', async () => {
  resetDemoData();
  const seed = initialDemoData();
  const admin = userView(seed, seed.users.find((u) => u.role === 'ADMIN')!.id);
  const client = userView(seed, seed.users.find((u) => u.email === 'olivia@carematch.demo')!.id);
  const outsider = userView(seed, seed.users.find((u) => u.email === 'harry@carematch.demo')!.id);
  const registered = await register({
    firstName: 'Test',
    lastName: 'Nurse',
    email: 'test-nurse@example.test',
    phone: '07700900123',
    password: 'CareMatch-Demo-2026!',
    confirmPassword: 'CareMatch-Demo-2026!',
    role: 'WORKER',
    profession: 'Nurse',
    terms: true,
  });
  const worker = userView(getDemoData(), registered.id);
  const profile = {
    firstName: 'Test',
    lastName: 'Nurse',
    phone: '07700900123',
    city: 'Testford',
    postcode: 'SW1A 1AA',
    address: 'Demo address',
    dateOfBirth: '1990-01-01',
    introduction: 'Thoughtful fictional support for daily life.',
    profession: 'Nurse',
    jobTitle: 'Community nurse',
    experienceYears: 7,
    biography:
      'A fictional professional offering thoughtful and compassionate support for everyday routines.',
    hourlyRate: '27.50',
    travelRadius: 10,
    languages: 'English',
    skills: 'Companionship',
    qualifications: 'Fictional nursing degree',
    registrationNumber: 'DEMO-NURSE',
    services: ['Companionship', 'Hourly Care'],
    onboardingStep: 5,
  };
  await saveWorker(worker, profile);
  await saveDraft(worker, { step: 5, data: {} });
  let w = getDemoData().workers.find((w) => w.userId === worker.id)!;
  assert.equal(w.registrationNumber, 'DEMO-NURSE');
  assert.equal(w.address, 'Demo address');
  assert.equal((await searchWorkers({ location: 'Testford' })).total, 0);
  await assert.rejects(() => submitVerification(worker), /Upload required/);
  updateDemoData((data) => {
    requiredDocuments('Nurse').forEach((documentType) =>
      data.documents.push({
        id: crypto.randomUUID(),
        workerId: w.id,
        documentType,
        originalFileName: 'sample.pdf',
        mimeType: 'application/pdf',
        reviewStatus: 'UPLOADED',
        uploadedAt: new Date(),
        dataUrl: '/demo/sample-evidence.pdf',
      }),
    );
  });
  await submitVerification(worker);
  await assert.rejects(
    () => reviewWorker(client, { id: w.id, status: 'UNDER_REVIEW' }),
    /Administrator/,
  );
  await reviewWorker(admin, { id: w.id, status: 'UNDER_REVIEW' });
  await assert.rejects(
    () => reviewWorker(admin, { id: w.id, status: 'APPROVED', confirmed: true }),
    /Review each/,
  );
  await reviewWorker(admin, {
    id: w.id,
    status: 'REJECTED',
    notes: 'Replace the incomplete sample evidence.',
  });
  assert.equal((await searchWorkers({ location: 'Testford' })).total, 0);
  await submitVerification(worker);
  await reviewWorker(admin, { id: w.id, status: 'UNDER_REVIEW' });
  for (const d of getDemoData().documents.filter((d) => d.workerId === w.id))
    await reviewDocument(admin, { id: d.id });
  await reviewWorker(admin, { id: w.id, status: 'APPROVED', confirmed: true });
  assert.equal((await searchWorkers({ location: 'Testford' })).total, 1);
  const request = await createRequest(client, {
    workerId: w.id,
    careType: 'Companionship',
    requestedDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    startTime: '10:00',
    durationHours: 2,
    generalLocation: 'Testford',
    description: 'A friendly fictional visit for conversation.',
  });
  await assert.rejects(
    () => transitionRequest(outsider, { id: request.id, status: 'CANCELLED' }),
    /another account/,
  );
  await transitionRequest(worker, { id: request.id, status: 'ACCEPTED' });
  assert.equal(getDemoData().requests.find((r) => r.id === request.id)?.status, 'ACCEPTED');
  await transitionRequest(client, { id: request.id, status: 'COMPLETED' });
  await assert.rejects(() => transitionRequest(worker, { id: request.id, status: 'DECLINED' }));
  await favourite(client, { workerId: w.id, saved: true });
  await favourite(client, { workerId: w.id, saved: true });
  assert.equal(getDemoData().favourites.filter((f) => f.workerId === w.id).length, 1);
  await accountStatus(admin, { id: worker.id, status: 'SUSPENDED' });
  assert.equal((await searchWorkers({ location: 'Testford' })).total, 0);
  await accountStatus(admin, { id: worker.id, status: 'ACTIVE' });
  await saveWorker(userView(getDemoData(), worker.id), {
    ...profile,
    registrationNumber: 'CHANGED',
  });
  assert.equal((await searchWorkers({ location: 'Testford' })).total, 0);
  assert.ok(getDemoData().notifications.some((n) => n.title === 'Request accepted'));
  assert.ok(getDemoData().auditLogs.some((a) => a.entityId === request.id));
  resetDemoData();
  assert.equal(getDemoData().users.length, 29);
});

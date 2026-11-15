import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canReview,
  canTransitionRequest,
  publiclyVisible,
  requiredDocuments,
} from '../src/modules/domain';
import {
  passwordSchema,
  registrationSchema,
  requestSchema,
  availabilitySchema,
  postcodeSchema,
} from '../src/modules/validation';
import { safeReturn } from '../src/lib/utils';
test('verification cannot skip review or resurrect a rejected application directly', () => {
  assert.equal(canReview('DRAFT', 'APPROVED'), false);
  assert.equal(canReview('PENDING', 'APPROVED'), false);
  assert.equal(canReview('PENDING', 'UNDER_REVIEW'), true);
  assert.equal(canReview('UNDER_REVIEW', 'APPROVED'), true);
  assert.equal(canReview('UNDER_REVIEW', 'REJECTED'), true);
  assert.equal(canReview('REJECTED', 'APPROVED'), false);
  assert.equal(canReview('APPROVED', 'SUSPENDED'), true);
});
test('request transitions enforce role and terminal states', () => {
  assert.equal(canTransitionRequest('PENDING', 'ACCEPTED', 'CLIENT'), false);
  assert.equal(canTransitionRequest('PENDING', 'ACCEPTED', 'WORKER'), true);
  assert.equal(canTransitionRequest('ACCEPTED', 'CANCELLED', 'CLIENT'), true);
  assert.equal(canTransitionRequest('ACCEPTED', 'COMPLETED', 'WORKER'), true);
  for (const s of ['COMPLETED', 'DECLINED', 'CANCELLED'] as const)
    assert.equal(canTransitionRequest(s, 'ACCEPTED', 'WORKER'), false);
  assert.equal(canTransitionRequest('PENDING', 'ACCEPTED', 'ADMIN'), false);
});
test('search requires all three visibility conditions', () => {
  const w = { verificationStatus: 'APPROVED', isListed: true, user: { status: 'ACTIVE' } };
  assert.equal(publiclyVisible(w), true);
  for (const status of ['DRAFT', 'PENDING', 'UNDER_REVIEW', 'REJECTED', 'SUSPENDED'])
    assert.equal(publiclyVisible({ ...w, verificationStatus: status }), false);
  assert.equal(publiclyVisible({ ...w, isListed: false }), false);
  assert.equal(publiclyVisible({ ...w, user: { status: 'SUSPENDED' } }), false);
});
test('evidence requirements differ by profession', () => {
  assert.ok(requiredDocuments('Nurse').includes('Qualification evidence'));
  assert.ok(requiredDocuments('Doctor').includes('Qualification evidence'));
  assert.ok(!requiredDocuments('Companion Carer').includes('Qualification evidence'));
});
test('registration rejects weak passwords, mismatch and admin role', () => {
  assert.equal(passwordSchema.safeParse('password').success, false);
  assert.equal(passwordSchema.safeParse('Strong-Care-2026').success, true);
  const valid = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '07700900123',
    password: 'Strong-Care-2026',
    confirmPassword: 'Strong-Care-2026',
    role: 'CLIENT',
    terms: true,
  };
  assert.equal(registrationSchema.safeParse(valid).success, true);
  assert.equal(registrationSchema.safeParse({ ...valid, role: 'ADMIN' }).success, false);
  assert.equal(registrationSchema.safeParse({ ...valid, confirmPassword: 'wrong' }).success, false);
  assert.equal(registrationSchema.safeParse({ ...valid, terms: false }).success, false);
  assert.equal(registrationSchema.safeParse({ ...valid, role: 'WORKER' }).success, false);
});
test('UK postcode, request dates and time windows are validated', () => {
  assert.equal(postcodeSchema.safeParse('SW1A 1AA').success, true);
  assert.equal(postcodeSchema.safeParse('not a postcode').success, false);
  assert.equal(
    requestSchema.safeParse({
      workerId: '00000000-0000-4000-8000-000000000001',
      careType: 'Hourly Care',
      requestedDate: '2020-01-01',
      startTime: '25:99',
      durationHours: 0,
      generalLocation: 'London',
      description: 'A friendly visit',
    }).success,
    false,
  );
  const slots = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    startTime: '09:00',
    endTime: '17:00',
    isAvailable: true,
  }));
  assert.equal(availabilitySchema.safeParse(slots).success, true);
  assert.equal(
    availabilitySchema.safeParse(slots.map((s) => ({ ...s, dayOfWeek: 0 }))).success,
    false,
  );
  assert.equal(
    availabilitySchema.safeParse(slots.map((s) => ({ ...s, endTime: '08:00' }))).success,
    false,
  );
});
test('return targets cannot redirect off-site', () => {
  assert.equal(safeReturn('//evil.example'), '/dashboard');
  assert.equal(safeReturn('/\\evil.example'), '/dashboard');
  assert.equal(safeReturn('https://evil.example'), '/dashboard');
  assert.equal(safeReturn('/professionals/sarah-mitchell'), '/professionals/sarah-mitchell');
});

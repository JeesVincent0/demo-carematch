import { hash } from 'bcryptjs';
import { z } from 'zod';
import { getDemoData, updateDemoData } from '@/lib/demo/store';
import type {
  DemoData,
  User,
  UserRecord,
  WorkerRecord,
  VerificationStatus,
  RequestStatus,
} from '@/lib/demo/types';
import {
  registrationSchema,
  workerSchema,
  requestSchema,
  availabilitySchema,
  passwordSchema,
  postcodeSchema,
} from './validation';
import { canReview, canTransitionRequest, requiredDocuments } from './domain';
const id = () => crypto.randomUUID();
const split = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
function find<T>(rows: T[], predicate: (v: T) => boolean, message = 'Demo record not found.'): T {
  const row = rows.find(predicate);
  if (!row) throw new Error(message);
  return row;
}
function active(data: DemoData, user: UserRecord, role?: string) {
  const current = find(data.users, (u) => u.id === user.id);
  if (current.status !== 'ACTIVE' || current.sessionVersion !== user.sessionVersion)
    throw new Error('This demo session is no longer active.');
  if (role && current.role !== role)
    throw new Error(`${role === 'ADMIN' ? 'Administrator' : role} demo account required.`);
  return current;
}
function audit(
  data: DemoData,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
) {
  data.auditLogs.unshift({
    id: id(),
    actorId,
    action,
    entityType,
    entityId,
    createdAt: new Date(),
  });
}
function notify(data: DemoData, userId: string, title: string, message: string) {
  data.notifications.unshift({
    id: id(),
    userId,
    type: 'UPDATE',
    title,
    message,
    isRead: false,
    createdAt: new Date(),
  });
}
function newWorker(user: UserRecord, profession: string): WorkerRecord {
  return {
    id: id(),
    userId: user.id,
    slug: `${user.firstName}-${user.lastName}-${id().slice(0, 8)}`.toLowerCase(),
    profession,
    jobTitle: '',
    introduction: '',
    biography: '',
    experienceYears: 0,
    hourlyRate: '20.00',
    city: '',
    postcode: '',
    address: '',
    dateOfBirth: '',
    travelRadius: 10,
    languages: ['English'],
    specialisations: [],
    registrationNumber: '',
    preferredLocation: '',
    liveIn: false,
    overnight: false,
    isListed: true,
    verificationStatus: 'DRAFT',
    onboardingStep: 1,
    submittedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    qualifications: [],
    skills: [],
    services: [],
    availability: [],
  };
}
export async function register(input: unknown) {
  const v = registrationSchema.parse(input);
  const passwordHash = await hash(v.password, 10);
  return updateDemoData((data) => {
    if (data.users.some((u) => u.email === v.email))
      throw new Error('An account with this email already exists in this browser.');
    const u: UserRecord = {
      id: id(),
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      passwordHash,
      phone: v.phone,
      role: v.role,
      status: 'ACTIVE',
      avatarUrl: '/images/avatar.svg',
      sessionVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    data.users.push(u);
    if (v.role === 'WORKER') data.workers.push(newWorker(u, v.profession!));
    else data.clients.push({ id: id(), userId: u.id, city: '', postcode: '', address: '' });
    audit(data, u.id, 'Account registered', 'User', u.id);
    notify(
      data,
      u.id,
      'Welcome to CareMatch',
      'Your fictional demo account is ready. Complete your profile to get started.',
    );
    return { id: u.id, role: u.role };
  });
}
function applyWorker(data: DemoData, user: UserRecord, v: Partial<z.infer<typeof workerSchema>>) {
  const w = find(data.workers, (w) => w.userId === user.id);
  const {
    firstName,
    lastName,
    phone,
    skills,
    qualifications,
    services,
    languages,
    specialisations,
    ...rest
  } = v;
  Object.assign(w, rest, { updatedAt: new Date() });
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (phone !== undefined) user.phone = phone;
  if (languages !== undefined) w.languages = split(languages);
  if (specialisations !== undefined) w.specialisations = split(specialisations);
  if (skills !== undefined)
    w.skills = split(skills).map((skillName) => ({ id: id(), workerId: w.id, skillName }));
  if (qualifications !== undefined)
    w.qualifications = split(qualifications).map((qualificationName) => ({
      id: id(),
      workerId: w.id,
      qualificationName,
      institution: '',
      yearCompleted: new Date().getFullYear(),
    }));
  if (services !== undefined)
    w.services = services.map((serviceType) => ({ id: id(), workerId: w.id, serviceType }));
  return w;
}
export async function saveDraft(user: User, input: unknown) {
  const v = z
    .object({ step: z.number().int().min(1).max(5), data: z.record(z.string(), z.unknown()) })
    .parse(input);
  const parsed = workerSchema.partial().parse(v.data);
  for (const key of Object.keys(parsed) as (keyof typeof parsed)[])
    if (!Object.hasOwn(v.data, key)) delete parsed[key];
  updateDemoData((data) => {
    const u = active(data, user, 'WORKER');
    const w = find(data.workers, (w) => w.userId === u.id);
    if (!['DRAFT', 'REJECTED'].includes(w.verificationStatus))
      throw new Error('Profile is locked during review.');
    applyWorker(data, u, { ...parsed, onboardingStep: v.step });
  });
}
export async function saveWorker(user: User, input: unknown) {
  const v = workerSchema.parse(input);
  return updateDemoData((data) => {
    const u = active(data, user, 'WORKER');
    const w = find(data.workers, (w) => w.userId === u.id);
    if (['PENDING', 'UNDER_REVIEW', 'SUSPENDED'].includes(w.verificationStatus))
      throw new Error('This profile is locked during review or suspension.');
    const sensitive =
      w.profession !== v.profession ||
      w.registrationNumber !== v.registrationNumber ||
      w.qualifications.map((q) => q.qualificationName).join(',') !==
        split(v.qualifications).join(',') ||
      u.firstName !== v.firstName ||
      u.lastName !== v.lastName ||
      w.dateOfBirth !== v.dateOfBirth;
    const reReview = w.verificationStatus === 'APPROVED' && sensitive;
    applyWorker(data, u, v);
    if (reReview) {
      w.verificationStatus = 'DRAFT';
      data.reviews.push({
        id: id(),
        workerId: w.id,
        reviewedBy: u.id,
        previousStatus: 'APPROVED',
        newStatus: 'DRAFT',
        notes: 'Credentials changed; re-review required.',
        reviewedAt: new Date(),
      });
      data.documents
        .filter((d) => d.workerId === w.id)
        .forEach((d) => {
          d.reviewStatus = 'UPLOADED';
        });
      notify(
        data,
        u.id,
        'Re-review required',
        'Your credentials have changed. Resubmit your demo profile.',
      );
    }
    audit(data, u.id, 'Professional profile saved', 'WorkerProfile', w.id);
    return { reReview };
  });
}
export async function submitVerification(user: User) {
  updateDemoData((data) => {
    const u = active(data, user, 'WORKER');
    const w = find(data.workers, (w) => w.userId === u.id);
    if (!['DRAFT', 'REJECTED'].includes(w.verificationStatus))
      throw new Error('This application has already been submitted.');
    workerSchema.parse({
      ...w,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      languages: w.languages.join(','),
      specialisations: w.specialisations.join(','),
      skills: w.skills.map((s) => s.skillName).join(','),
      qualifications: w.qualifications.map((q) => q.qualificationName).join(','),
      services: w.services.map((s) => s.serviceType),
    });
    const docs = data.documents.filter((d) => d.workerId === w.id);
    const missing = requiredDocuments(w.profession).filter(
      (t) => !docs.some((d) => d.documentType === t),
    );
    if (missing.length) throw new Error(`Upload required evidence: ${missing.join(', ')}.`);
    if (['Nurse', 'Doctor'].includes(w.profession) && !w.registrationNumber)
      throw new Error('Supply a fictional professional registration number.');
    data.reviews.push({
      id: id(),
      workerId: w.id,
      reviewedBy: u.id,
      previousStatus: w.verificationStatus,
      newStatus: 'PENDING',
      notes: 'Application submitted for internal demo review.',
      reviewedAt: new Date(),
    });
    w.verificationStatus = 'PENDING';
    w.submittedAt = new Date();
    w.onboardingStep = 5;
    w.updatedAt = new Date();
    audit(data, u.id, 'Verification submitted', 'WorkerProfile', w.id);
    notify(data, u.id, 'Application submitted', 'Your profile has been submitted for review.');
    data.users
      .filter((a) => a.role === 'ADMIN')
      .forEach((a) =>
        notify(
          data,
          a.id,
          'New verification application',
          `${u.firstName} ${u.lastName} is ready for demo review.`,
        ),
      );
  });
}
export async function reviewWorker(user: User, input: unknown) {
  const v = z
    .object({
      id: z.uuid(),
      status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'DRAFT']),
      notes: z.string().max(2000).default(''),
      confirmed: z.boolean().default(false),
    })
    .parse(input);
  updateDemoData((data) => {
    active(data, user, 'ADMIN');
    const w = find(data.workers, (w) => w.id === v.id);
    if (!canReview(w.verificationStatus, v.status))
      throw new Error('This verification transition is not permitted.');
    if (v.status === 'APPROVED' && !v.confirmed)
      throw new Error('Confirm your application review.');
    if (['REJECTED', 'SUSPENDED'].includes(v.status) && v.notes.trim().length < 10)
      throw new Error('Give a reason of at least 10 characters.');
    if (v.status === 'APPROVED') {
      const docs = data.documents.filter((d) => d.workerId === w.id);
      if (
        find(data.users, (u) => u.id === w.userId).status !== 'ACTIVE' ||
        requiredDocuments(w.profession).some(
          (t) => !docs.some((d) => d.documentType === t && d.reviewStatus === 'REVIEWED'),
        )
      )
        throw new Error(
          'Review each required document and ensure the account is active before approval.',
        );
    }
    data.reviews.push({
      id: id(),
      workerId: w.id,
      reviewedBy: user.id,
      previousStatus: w.verificationStatus,
      newStatus: v.status,
      notes: v.notes || 'Internal demo review. No external register check performed.',
      reviewedAt: new Date(),
    });
    w.verificationStatus = v.status;
    w.updatedAt = new Date();
    audit(data, user.id, `Verification ${v.status.toLowerCase()}`, 'WorkerProfile', w.id);
    notify(
      data,
      w.userId,
      `Verification: ${v.status.toLowerCase().replace('_', ' ')}`,
      v.notes || 'Your demo application status has changed.',
    );
  });
}
export async function reviewDocument(user: User, input: unknown) {
  const { id: documentId } = z.object({ id: z.uuid() }).parse(input);
  updateDemoData((data) => {
    active(data, user, 'ADMIN');
    const doc = find(data.documents, (d) => d.id === documentId);
    const w = find(data.workers, (w) => w.id === doc.workerId);
    if (w.verificationStatus !== 'UNDER_REVIEW')
      throw new Error('Start the application review first.');
    doc.reviewStatus = 'REVIEWED';
    audit(data, user.id, 'Sample document reviewed', 'VerificationDocument', doc.id);
  });
}
export async function createRequest(user: User, input: unknown) {
  const v = requestSchema.parse(input);
  return updateDemoData((data) => {
    active(data, user, 'CLIENT');
    const w = find(data.workers, (w) => w.id === v.workerId);
    if (
      w.verificationStatus !== 'APPROVED' ||
      !w.isListed ||
      find(data.users, (u) => u.id === w.userId).status !== 'ACTIVE'
    )
      throw new Error('This professional is not available for new requests.');
    if (!w.services.some((s) => s.serviceType === v.careType))
      throw new Error('Choose a service offered by this professional.');
    const c = find(data.clients, (c) => c.userId === user.id);
    const r = {
      ...v,
      id: id(),
      clientId: c.id,
      requestedDate: new Date(`${v.requestedDate}T12:00:00Z`),
      status: 'PENDING' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    data.requests.push(r);
    notify(
      data,
      w.userId,
      'New care request',
      `${user.firstName} requested ${v.careType.toLowerCase()}.`,
    );
    audit(data, user.id, 'Care request created', 'CareRequest', r.id);
    return r;
  });
}
export async function transitionRequest(user: User, input: unknown) {
  const v = z
    .object({ id: z.uuid(), status: z.enum(['ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED']) })
    .parse(input);
  updateDemoData((data) => {
    active(data, user);
    const r = find(data.requests, (r) => r.id === v.id);
    const w = find(data.workers, (w) => w.id === r.workerId);
    const c = find(data.clients, (c) => c.id === r.clientId);
    if (user.id !== (user.role === 'CLIENT' ? c.userId : w.userId))
      throw new Error('This request belongs to another account.');
    if (!canTransitionRequest(r.status, v.status, user.role))
      throw new Error('This request cannot be changed to that status.');
    if (
      v.status === 'ACCEPTED' &&
      (w.verificationStatus !== 'APPROVED' ||
        find(data.users, (u) => u.id === w.userId).status !== 'ACTIVE')
    )
      throw new Error('Only approved, active professionals can accept requests.');
    r.status = v.status;
    r.updatedAt = new Date();
    notify(
      data,
      user.role === 'CLIENT' ? w.userId : c.userId,
      `Request ${v.status.toLowerCase()}`,
      `Your ${r.careType.toLowerCase()} request has been ${v.status.toLowerCase()}.`,
    );
    audit(data, user.id, `Care request ${v.status.toLowerCase()}`, 'CareRequest', r.id);
  });
}
export async function favourite(user: User, input: unknown) {
  const v = z.object({ workerId: z.uuid(), saved: z.boolean() }).parse(input);
  updateDemoData((data) => {
    active(data, user, 'CLIENT');
    const c = find(data.clients, (c) => c.userId === user.id);
    if (!v.saved) {
      data.favourites = data.favourites.filter(
        (f) => f.clientId !== c.id || f.workerId !== v.workerId,
      );
      return;
    }
    const w = find(data.workers, (w) => w.id === v.workerId);
    if (
      w.verificationStatus !== 'APPROVED' ||
      !w.isListed ||
      find(data.users, (u) => u.id === w.userId).status !== 'ACTIVE'
    )
      throw new Error('This professional is not listed.');
    if (!data.favourites.some((f) => f.clientId === c.id && f.workerId === w.id))
      data.favourites.push({ id: id(), clientId: c.id, workerId: w.id, createdAt: new Date() });
  });
}
export async function availability(user: User, input: unknown) {
  const slots = availabilitySchema.parse(input);
  updateDemoData((data) => {
    active(data, user, 'WORKER');
    const w = find(data.workers, (w) => w.userId === user.id);
    w.availability = slots.map((s) => ({ ...s, id: id(), workerId: w.id }));
    w.updatedAt = new Date();
  });
}
export async function accountStatus(user: User, input: unknown) {
  const v = z.object({ id: z.uuid(), status: z.enum(['ACTIVE', 'SUSPENDED']) }).parse(input);
  updateDemoData((data) => {
    active(data, user, 'ADMIN');
    const u = find(data.users, (u) => u.id === v.id);
    if (u.role === 'ADMIN') throw new Error('Administrator accounts cannot be changed here.');
    u.status = v.status;
    u.sessionVersion++;
    audit(data, user.id, `Account ${v.status.toLowerCase()}`, 'User', u.id);
    notify(
      data,
      u.id,
      `Account ${v.status.toLowerCase()}`,
      'A demo administrator updated this account.',
    );
  });
}
export async function profile(user: User, input: unknown) {
  const v = z
    .object({
      firstName: z.string().min(2).max(60),
      lastName: z.string().min(2).max(60),
      phone: z.string().min(7).max(25),
      city: z.string().max(80),
      postcode: postcodeSchema,
    })
    .parse(input);
  updateDemoData((data) => {
    const u = active(data, user);
    if (u.role === 'WORKER')
      throw new Error('Use your professional profile to edit these details.');
    Object.assign(u, { firstName: v.firstName, lastName: v.lastName, phone: v.phone });
    if (u.role === 'CLIENT')
      Object.assign(
        find(data.clients, (c) => c.userId === u.id),
        { city: v.city, postcode: v.postcode },
      );
  });
}
export async function readNotifications(user: User) {
  updateDemoData((data) => {
    active(data, user);
    data.notifications
      .filter((n) => n.userId === user.id)
      .forEach((n) => {
        n.isRead = true;
      });
  });
}
async function digest(token: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
export async function forgot(input: unknown) {
  const { email } = z.object({ email: z.email().toLowerCase() }).parse(input);
  const u = getDemoData().users.find((u) => u.email === email);
  if (!u) return {};
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const tokenHash = await digest(token);
  updateDemoData((data) => {
    data.resetTokens.push({
      id: id(),
      userId: u.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 1800000),
    });
  });
  return { resetLink: `/reset-password?token=${token}` };
}
export async function resetPassword(input: unknown) {
  const v = z.object({ token: z.string().length(64), password: passwordSchema }).parse(input);
  const tokenHash = await digest(v.token);
  const passwordHash = await hash(v.password, 10);
  updateDemoData((data) => {
    const token = data.resetTokens.find(
      (t) => t.tokenHash === tokenHash && t.expiresAt > new Date(),
    );
    if (!token) throw new Error('This demo reset link is invalid or expired.');
    const u = find(data.users, (u) => u.id === token.userId);
    u.passwordHash = passwordHash;
    u.sessionVersion++;
    data.resetTokens = data.resetTokens.filter((t) => t.userId !== u.id);
  });
}

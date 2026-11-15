import { db } from '@/lib/prisma';
import { AppError } from '@/lib/security';
import { hash } from 'bcryptjs';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { Prisma, type User, type VerificationStatus, type RequestStatus } from '@prisma/client';
import {
  registrationSchema,
  workerSchema,
  requestSchema,
  availabilitySchema,
  passwordSchema,
  postcodeSchema,
} from './validation';
import { canReview, canTransitionRequest, requiredDocuments, publiclyVisible } from './domain';
import { z } from 'zod';
type Tx = Prisma.TransactionClient;
const split = (v: string) =>
  v
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
const audit = (tx: Tx, actorId: string, action: string, entityType: string, entityId: string) =>
  tx.auditLog.create({ data: { actorId, action, entityType, entityId } });
const notify = (tx: Tx, userId: string, title: string, message: string) =>
  tx.notification.create({ data: { userId, type: 'UPDATE', title, message } });
export async function register(input: unknown) {
  const v = registrationSchema.parse(input);
  const passwordHash = await hash(v.password, 12);
  try {
    return await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: v.firstName,
          lastName: v.lastName,
          email: v.email,
          passwordHash,
          phone: v.phone,
          role: v.role,
          ...(v.role === 'CLIENT'
            ? { client: { create: {} } }
            : {
                worker: {
                  create: {
                    profession: v.profession!,
                    slug: `${v.firstName}-${v.lastName}-${randomUUID().slice(0, 8)}`.toLowerCase(),
                  },
                },
              }),
        },
        select: { id: true, role: true },
      });
      await audit(tx, user.id, 'Account registered', 'User', user.id);
      await notify(
        tx,
        user.id,
        'Welcome to CareMatch',
        'Your account is ready. Complete your profile to get started.',
      );
      return user;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      throw new AppError('An account with this email already exists.');
    throw e;
  }
}
export async function saveWorker(user: User, input: unknown) {
  if (user.role !== 'WORKER') throw new AppError('Worker account required.', 403);
  const v = workerSchema.parse(input);
  const w = await db.workerProfile.findUniqueOrThrow({
    where: { userId: user.id },
    include: { qualifications: true },
  });
  if (['PENDING', 'UNDER_REVIEW', 'SUSPENDED'].includes(w.verificationStatus))
    throw new AppError('Your application cannot be edited during review or suspension.');
  const sensitive =
    w.profession !== v.profession ||
    w.registrationNumber !== v.registrationNumber ||
    w.qualifications.map((q) => q.qualificationName).join(',') !==
      split(v.qualifications).join(',') ||
    user.firstName !== v.firstName ||
    user.lastName !== v.lastName ||
    w.dateOfBirth !== v.dateOfBirth;
  const reReview = w.verificationStatus === 'APPROVED' && sensitive;
  const {
    firstName,
    lastName,
    phone,
    skills,
    qualifications,
    services,
    languages,
    specialisations,
    ...data
  } = v;
  await db.$transaction(async (tx) => {
    const changed = await tx.workerProfile.updateMany({
      where: { id: w.id, updatedAt: w.updatedAt },
      data: {
        ...data,
        languages: split(languages),
        specialisations: split(specialisations),
        ...(reReview ? { verificationStatus: 'DRAFT' as const } : {}),
      },
    });
    if (!changed.count) throw new AppError('Profile changed. Reload and try again.', 409);
    await tx.user.update({ where: { id: user.id }, data: { firstName, lastName, phone } });
    await tx.workerSkill.deleteMany({ where: { workerId: w.id } });
    await tx.workerSkill.createMany({
      data: split(skills).map((skillName) => ({ workerId: w.id, skillName })),
    });
    await tx.workerQualification.deleteMany({ where: { workerId: w.id } });
    await tx.workerQualification.createMany({
      data: split(qualifications).map((qualificationName) => ({
        workerId: w.id,
        qualificationName,
      })),
    });
    await tx.workerService.deleteMany({ where: { workerId: w.id } });
    await tx.workerService.createMany({
      data: services.map((serviceType) => ({ workerId: w.id, serviceType })),
    });
    if (reReview) {
      await tx.verificationReview.create({
        data: {
          workerId: w.id,
          reviewedBy: user.id,
          previousStatus: 'APPROVED',
          newStatus: 'DRAFT',
          notes: 'Credentials changed; re-review required.',
        },
      });
      await tx.verificationDocument.updateMany({
        where: { workerId: w.id },
        data: { reviewStatus: 'UPLOADED' },
      });
      await notify(
        tx,
        user.id,
        'Re-review required',
        'Your credentials have changed. Resubmit your profile for review.',
      );
    }
    await audit(tx, user.id, 'Professional profile saved', 'WorkerProfile', w.id);
  });
  return { reReview };
}
export async function saveDraft(user: User, input: unknown) {
  if (user.role !== 'WORKER') throw new AppError('Worker account required.', 403);
  const v = z
    .object({ step: z.number().int().min(1).max(5), data: z.record(z.string(), z.unknown()) })
    .parse(input);
  const w = await db.workerProfile.findUniqueOrThrow({ where: { userId: user.id } });
  if (!['DRAFT', 'REJECTED'].includes(w.verificationStatus))
    throw new AppError('Profile is locked during review.');
  // Validate individual populated fields while allowing unfinished steps.
  const schema = workerSchema.partial();
  const p = schema.parse(v.data);
  // Zod defaults also run inside optional fields. A partial step must only write
  // explicitly supplied keys, otherwise later steps erase earlier credentials.
  for (const key of Object.keys(p) as (keyof typeof p)[]) {
    if (!Object.hasOwn(v.data, key)) delete p[key];
  }
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
  } = p;
  await db.$transaction(async (tx) => {
    const updated = await tx.workerProfile.updateMany({
      where: { id: w.id, updatedAt: w.updatedAt },
      data: {
        ...rest,
        onboardingStep: v.step,
        ...(languages ? { languages: split(languages) } : {}),
        ...(specialisations ? { specialisations: split(specialisations) } : {}),
      },
    });
    if (!updated.count) throw new AppError('Profile changed. Reload and try again.', 409);
    if (firstName || lastName || phone)
      await tx.user.update({ where: { id: user.id }, data: { firstName, lastName, phone } });
    if (skills) {
      await tx.workerSkill.deleteMany({ where: { workerId: w.id } });
      await tx.workerSkill.createMany({
        data: split(skills).map((skillName) => ({ workerId: w.id, skillName })),
      });
    }
    if (qualifications) {
      await tx.workerQualification.deleteMany({ where: { workerId: w.id } });
      await tx.workerQualification.createMany({
        data: split(qualifications).map((qualificationName) => ({
          workerId: w.id,
          qualificationName,
        })),
      });
    }
    if (services) {
      await tx.workerService.deleteMany({ where: { workerId: w.id } });
      await tx.workerService.createMany({
        data: services.map((serviceType) => ({ workerId: w.id, serviceType })),
      });
    }
  });
}
export async function submitVerification(user: User) {
  if (user.role !== 'WORKER') throw new AppError('Worker account required.', 403);
  await db.$transaction(async (tx) => {
    const w = await tx.workerProfile.findUniqueOrThrow({
      where: { userId: user.id },
      include: { documents: true, qualifications: true, skills: true, services: true },
    });
    if (!['DRAFT', 'REJECTED'].includes(w.verificationStatus))
      throw new AppError('This application has already been submitted.');
    workerSchema.parse({
      ...w,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      hourlyRate: w.hourlyRate.toString(),
      languages: w.languages.join(','),
      skills: w.skills.map((s) => s.skillName).join(','),
      qualifications: w.qualifications.map((q) => q.qualificationName).join(','),
      specialisations: w.specialisations.join(','),
      services: w.services.map((s) => s.serviceType),
    });
    const missing = requiredDocuments(w.profession).filter(
      (t) => !w.documents.some((d) => d.documentType === t),
    );
    if (missing.length) throw new AppError(`Upload required evidence: ${missing.join(', ')}.`);
    if (['Nurse', 'Doctor'].includes(w.profession) && !w.registrationNumber)
      throw new AppError('Please supply your professional registration number.');
    const updated = await tx.workerProfile.updateMany({
      where: { id: w.id, verificationStatus: w.verificationStatus },
      data: { verificationStatus: 'PENDING', onboardingStep: 5, submittedAt: new Date() },
    });
    if (!updated.count) throw new AppError('Application changed. Refresh and try again.', 409);
    await tx.verificationReview.create({
      data: {
        workerId: w.id,
        reviewedBy: user.id,
        previousStatus: w.verificationStatus,
        newStatus: 'PENDING',
        notes: 'Application submitted for manual demo review.',
      },
    });
    await audit(tx, user.id, 'Verification submitted', 'WorkerProfile', w.id);
    await notify(
      tx,
      user.id,
      'Application submitted',
      'Your profile has been submitted for review. You will be notified when the review is complete.',
    );
    const admins = await tx.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    for (const a of admins)
      await notify(
        tx,
        a.id,
        'New verification application',
        `${user.firstName} ${user.lastName} is ready for review.`,
      );
  });
}
export async function reviewWorker(user: User, input: unknown) {
  if (user.role !== 'ADMIN') throw new AppError('Administrator permission required.', 403);
  const v = z
    .object({
      id: z.uuid(),
      status: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'DRAFT']),
      notes: z.string().max(2000).default(''),
      confirmed: z.boolean().default(false),
    })
    .parse(input);
  if (v.status === 'APPROVED' && !v.confirmed)
    throw new AppError('Confirm that you have reviewed this application.');
  if (['REJECTED', 'SUSPENDED'].includes(v.status) && v.notes.trim().length < 10)
    throw new AppError('Give a reason of at least 10 characters.');
  await db.$transaction(async (tx) => {
    const w = await tx.workerProfile.findUniqueOrThrow({
      where: { id: v.id },
      include: { documents: true, user: true },
    });
    if (!canReview(w.verificationStatus, v.status as VerificationStatus))
      throw new AppError('This verification transition is not permitted.', 409);
    if (
      v.status === 'APPROVED' &&
      (w.user.status !== 'ACTIVE' ||
        requiredDocuments(w.profession).some(
          (t) => !w.documents.some((d) => d.documentType === t && d.reviewStatus === 'REVIEWED'),
        ))
    )
      throw new AppError(
        'Review each required document and ensure the account is active before approval.',
      );
    const changed = await tx.workerProfile.updateMany({
      where: { id: w.id, verificationStatus: w.verificationStatus },
      data: { verificationStatus: v.status },
    });
    if (!changed.count)
      throw new AppError('Another reviewer changed this application. Refresh and try again.', 409);
    await tx.verificationReview.create({
      data: {
        workerId: w.id,
        reviewedBy: user.id,
        previousStatus: w.verificationStatus,
        newStatus: v.status,
        notes: v.notes || 'Internal demo review; no external register check performed.',
      },
    });
    await audit(tx, user.id, `Verification ${v.status.toLowerCase()}`, 'WorkerProfile', w.id);
    await notify(
      tx,
      w.userId,
      `Verification: ${v.status.toLowerCase().replace('_', ' ')}`,
      v.notes || 'Your application status has been updated. This is an internal demo review.',
    );
  });
}
export async function createRequest(user: User, input: unknown) {
  if (user.role !== 'CLIENT')
    throw new AppError('Sign in with a client account to request care.', 403);
  const v = requestSchema.parse(input);
  return db.$transaction(
    async (tx) => {
      const w = await tx.workerProfile.findUniqueOrThrow({
        where: { id: v.workerId },
        include: { user: true, services: true },
      });
      if (!publiclyVisible(w))
        throw new AppError('This professional is not available for new requests.');
      if (!w.services.some((s) => s.serviceType === v.careType))
        throw new AppError('Choose a service offered by this professional.');
      const c = await tx.clientProfile.findUniqueOrThrow({ where: { userId: user.id } });
      const request = await tx.careRequest.create({
        data: { ...v, requestedDate: new Date(`${v.requestedDate}T12:00:00Z`), clientId: c.id },
      });
      await notify(
        tx,
        w.userId,
        'New care request',
        `${user.firstName} has requested ${v.careType.toLowerCase()}.`,
      );
      await audit(tx, user.id, 'Care request created', 'CareRequest', request.id);
      return request;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
export async function transitionRequest(user: User, input: unknown) {
  const v = z
    .object({ id: z.uuid(), status: z.enum(['ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED']) })
    .parse(input);
  await db.$transaction(
    async (tx) => {
      const r = await tx.careRequest.findUniqueOrThrow({
        where: { id: v.id },
        include: { client: true, worker: { include: { user: true } } },
      });
      if (user.id !== (user.role === 'CLIENT' ? r.client.userId : r.worker.userId))
        throw new AppError('This request belongs to another account.', 403);
      if (!canTransitionRequest(r.status, v.status as RequestStatus, user.role))
        throw new AppError('This request cannot be changed to that status.', 409);
      if (
        v.status === 'ACCEPTED' &&
        (r.worker.verificationStatus !== 'APPROVED' || r.worker.user.status !== 'ACTIVE')
      )
        throw new AppError('Only approved, active professionals can accept requests.');
      const changed = await tx.careRequest.updateMany({
        where: { id: r.id, status: r.status },
        data: { status: v.status },
      });
      if (!changed.count) throw new AppError('Request changed. Refresh and try again.', 409);
      await notify(
        tx,
        user.role === 'CLIENT' ? r.worker.userId : r.client.userId,
        `Request ${v.status.toLowerCase()}`,
        `Your ${r.careType.toLowerCase()} request has been ${v.status.toLowerCase()}.`,
      );
      await audit(tx, user.id, `Care request ${v.status.toLowerCase()}`, 'CareRequest', r.id);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
export async function favourite(user: User, input: unknown) {
  if (user.role !== 'CLIENT') throw new AppError('Client account required.', 403);
  const { workerId, saved } = z.object({ workerId: z.uuid(), saved: z.boolean() }).parse(input);
  const client = await db.clientProfile.findUniqueOrThrow({ where: { userId: user.id } });
  if (!saved) {
    await db.favourite.deleteMany({ where: { clientId: client.id, workerId } });
    return;
  }
  const w = await db.workerProfile.findUniqueOrThrow({
    where: { id: workerId },
    include: { user: true },
  });
  if (!publiclyVisible(w)) throw new AppError('This professional is no longer listed.');
  await db.favourite.upsert({
    where: { clientId_workerId: { clientId: client.id, workerId } },
    create: { clientId: client.id, workerId },
    update: {},
  });
}
export async function availability(user: User, input: unknown) {
  if (user.role !== 'WORKER') throw new AppError('Worker account required.', 403);
  const slots = availabilitySchema.parse(input);
  const w = await db.workerProfile.findUniqueOrThrow({ where: { userId: user.id } });
  await db.$transaction(
    slots.map((s) =>
      db.workerAvailability.upsert({
        where: { workerId_dayOfWeek: { workerId: w.id, dayOfWeek: s.dayOfWeek } },
        create: { ...s, workerId: w.id },
        update: s,
      }),
    ),
  );
}
export async function accountStatus(user: User, input: unknown) {
  if (user.role !== 'ADMIN') throw new AppError('Administrator permission required.', 403);
  const v = z.object({ id: z.uuid(), status: z.enum(['ACTIVE', 'SUSPENDED']) }).parse(input);
  if (v.id === user.id) throw new AppError('You cannot suspend your own account.');
  await db.$transaction(async (tx) => {
    const target = await tx.user.findUniqueOrThrow({ where: { id: v.id } });
    if (target.role === 'ADMIN')
      throw new AppError('Administrator accounts cannot be changed here.');
    await tx.user.update({
      where: { id: v.id },
      data: { status: v.status, sessionVersion: { increment: 1 } },
    });
    await audit(tx, user.id, `Account ${v.status.toLowerCase()}`, 'User', v.id);
    await notify(
      tx,
      v.id,
      `Account ${v.status.toLowerCase()}`,
      'An administrator has updated your account status.',
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
  if (user.role === 'WORKER')
    throw new AppError('Use your professional profile to edit these details.');
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { firstName: v.firstName, lastName: v.lastName, phone: v.phone },
    });
    if (user.role === 'CLIENT')
      await tx.clientProfile.update({
        where: { userId: user.id },
        data: { city: v.city, postcode: v.postcode },
      });
  });
}
export async function forgot(input: unknown) {
  const { email } = z.object({ email: z.email().toLowerCase() }).parse(input);
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return {};
  const token = randomBytes(32).toString('hex');
  await db.resetToken.create({
    data: {
      userId: user.id,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 30 * 60000),
    },
  });
  return process.env.DEMO_MODE === 'true' && process.env.NODE_ENV === 'development'
    ? { resetLink: `/reset-password?token=${token}` }
    : {};
}
export async function resetPassword(input: unknown) {
  const v = z.object({ token: z.string().length(64), password: passwordSchema }).parse(input);
  const tokenHash = createHash('sha256').update(v.token).digest('hex');
  const passwordHash = await hash(v.password, 12);
  await db.$transaction(async (tx) => {
    const t = await tx.resetToken.findUnique({ where: { tokenHash } });
    if (!t || t.expiresAt < new Date())
      throw new AppError('This reset link is invalid or has expired.');
    const used = await tx.resetToken.deleteMany({ where: { id: t.id } });
    if (!used.count) throw new AppError('This reset link has already been used.');
    await tx.user.update({
      where: { id: t.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await tx.resetToken.deleteMany({ where: { userId: t.userId } });
  });
}

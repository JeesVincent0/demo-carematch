import { z } from 'zod';
import { professions, careTypes } from './domain';
export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(72)
  .regex(/[a-z]/, 'Include a lower-case letter')
  .regex(/[A-Z]/, 'Include an upper-case letter')
  .regex(/[0-9]/, 'Include a number');
export const registrationSchema = z
  .object({
    firstName: z.string().trim().min(2).max(60),
    lastName: z.string().trim().min(2).max(60),
    email: z.email().toLowerCase(),
    phone: z.string().min(7).max(25),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(['CLIENT', 'WORKER']),
    profession: z.enum(professions).optional(),
    terms: z.literal(true),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((v) => v.role !== 'WORKER' || !!v.profession, {
    path: ['profession'],
    message: 'Select your profession',
  });
export const postcodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, 'Enter a valid UK postcode');
export const workerSchema = z.object({
  firstName: z.string().min(2).max(60),
  lastName: z.string().min(2).max(60),
  phone: z.string().min(7).max(25),
  city: z.string().min(2).max(80),
  postcode: postcodeSchema,
  address: z.string().max(200).default(''),
  dateOfBirth: z.string().max(10).default(''),
  introduction: z.string().min(10).max(240),
  profession: z.enum(professions),
  jobTitle: z.string().min(3).max(100),
  experienceYears: z.coerce.number().int().min(0).max(60),
  biography: z.string().min(30).max(5000),
  hourlyRate: z
    .string()
    .regex(/^\d{1,3}(\.\d{1,2})?$/, 'Use pounds and up to two decimal places')
    .refine((v) => Number(v) >= 10 && Number(v) <= 500, 'Rate must be £10–£500'),
  travelRadius: z.coerce.number().int().min(0).max(200),
  languages: z.string().min(2).max(200),
  skills: z.string().min(2).max(500),
  qualifications: z.string().min(2).max(1000),
  specialisations: z.string().max(500).default(''),
  services: z.array(z.enum(careTypes)).min(1),
  registrationNumber: z.string().max(80).default(''),
  preferredLocation: z.string().max(80).default(''),
  liveIn: z.boolean().default(false),
  overnight: z.boolean().default(false),
  isListed: z.boolean().default(true),
  onboardingStep: z.coerce.number().int().min(1).max(5).default(1),
});
export const requestSchema = z.object({
  workerId: z.uuid(),
  careType: z.enum(careTypes),
  requestedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (v) =>
        !isNaN(Date.parse(v)) && new Date(v) >= new Date(new Date().toISOString().slice(0, 10)),
      'Choose today or a future date',
    ),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationHours: z.coerce.number().int().min(1).max(24),
  generalLocation: z.string().min(2).max(100),
  description: z.string().min(10).max(1000),
  notes: z.string().max(1000).default(''),
});
export const availabilitySchema = z
  .array(
    z
      .object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        isAvailable: z.boolean(),
      })
      .refine((v) => !v.isAvailable || v.endTime > v.startTime, 'End time must follow start time'),
  )
  .length(7)
  .refine((a) => new Set(a.map((v) => v.dayOfWeek)).size === 7, 'Include each day exactly once');

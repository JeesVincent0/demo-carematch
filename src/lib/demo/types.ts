export type Role = 'CLIENT' | 'WORKER' | 'ADMIN';
export type VerificationStatus =
  'DRAFT' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';
export interface UserRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phone: string;
  role: Role;
  status: AccountStatus;
  avatarUrl: string;
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface ClientProfile {
  id: string;
  userId: string;
  city: string;
  postcode: string;
  address: string;
}
export interface Availability {
  id: string;
  workerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}
export interface Qualification {
  id: string;
  workerId: string;
  qualificationName: string;
  institution: string;
  yearCompleted: number;
}
export interface WorkerRecord {
  id: string;
  userId: string;
  slug: string;
  profession: string;
  jobTitle: string;
  introduction: string;
  biography: string;
  experienceYears: number;
  hourlyRate: string;
  city: string;
  postcode: string;
  address: string;
  dateOfBirth: string;
  travelRadius: number;
  languages: string[];
  specialisations: string[];
  registrationNumber: string;
  preferredLocation: string;
  liveIn: boolean;
  overnight: boolean;
  isListed: boolean;
  verificationStatus: VerificationStatus;
  onboardingStep: number;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  qualifications: Qualification[];
  skills: { id: string; workerId: string; skillName: string }[];
  services: { id: string; workerId: string; serviceType: string }[];
  availability: Availability[];
}
export interface Document {
  id: string;
  workerId: string;
  documentType: string;
  originalFileName: string;
  mimeType: string;
  reviewStatus: string;
  uploadedAt: Date;
  dataUrl: string;
}
export interface Review {
  id: string;
  workerId: string;
  reviewedBy: string;
  previousStatus: VerificationStatus;
  newStatus: VerificationStatus;
  notes: string;
  reviewedAt: Date;
}
export interface CareRequest {
  id: string;
  clientId: string;
  workerId: string;
  careType: string;
  requestedDate: Date;
  startTime: string;
  durationHours: number;
  generalLocation: string;
  description: string;
  notes: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
}
export interface Favourite {
  id: string;
  clientId: string;
  workerId: string;
  createdAt: Date;
}
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}
export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
}
export interface ResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}
export interface DemoData {
  version: number;
  users: UserRecord[];
  clients: ClientProfile[];
  workers: WorkerRecord[];
  documents: Document[];
  reviews: Review[];
  requests: CareRequest[];
  favourites: Favourite[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  resetTokens: ResetToken[];
}
export type User = UserRecord & { client: ClientProfile | null; worker: WorkerRecord | null };
export type Worker = WorkerRecord & {
  user: User;
  documents: Document[];
  reviews: (Review & { reviewer: User })[];
};
export type RequestWithPeople = CareRequest & {
  client: ClientProfile & { user: User };
  worker: Worker;
};

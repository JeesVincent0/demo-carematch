import type { Role, VerificationStatus, RequestStatus } from '@/lib/demo/types';
export const professions = [
  'Nurse',
  'Doctor',
  'Healthcare Assistant',
  'Home Carer',
  'Elderly Care Specialist',
  'Support Worker',
  'Companion Carer',
  'Other Care Professional',
] as const;
export const careTypes = [
  'Hourly Care',
  'Overnight Care',
  'Live-in Care',
  'Elderly Care',
  'Personal Care',
  'Companionship',
  'Respite Care',
  'Post-operative Support',
] as const;
export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const documentTypes = [
  'Identity document',
  'Right-to-work evidence',
  'Criminal-record-check evidence',
  'Qualification evidence',
  'Supporting certificate',
] as const;
export function requiredDocuments(profession: string) {
  return [
    ...documentTypes.slice(0, 3),
    ...(['Nurse', 'Doctor', 'Healthcare Assistant'].includes(profession)
      ? ['Qualification evidence']
      : []),
  ];
}
export function canReview(from: VerificationStatus, to: VerificationStatus) {
  const map: Record<VerificationStatus, VerificationStatus[]> = {
    DRAFT: [],
    PENDING: ['UNDER_REVIEW', 'REJECTED'],
    UNDER_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: ['SUSPENDED'],
    REJECTED: ['DRAFT'],
    SUSPENDED: ['UNDER_REVIEW'],
  };
  return map[from].includes(to);
}
export function canTransitionRequest(from: RequestStatus, to: RequestStatus, role: Role) {
  if (role === 'CLIENT')
    return (
      (['PENDING', 'ACCEPTED'].includes(from) && to === 'CANCELLED') ||
      (from === 'ACCEPTED' && to === 'COMPLETED')
    );
  if (role === 'WORKER')
    return (
      (from === 'PENDING' && ['ACCEPTED', 'DECLINED'].includes(to)) ||
      (from === 'ACCEPTED' && to === 'COMPLETED')
    );
  return false;
}
export const publiclyVisible = (w: {
  verificationStatus: string;
  isListed: boolean;
  user: { status: string };
}) => w.verificationStatus === 'APPROVED' && w.isListed && w.user.status === 'ACTIVE';

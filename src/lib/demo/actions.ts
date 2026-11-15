import { requireUser } from '@/lib/auth';
import * as services from '@/modules/services';
import { ZodError } from 'zod';
export async function demoAction(name: string, data: unknown = {}) {
  try {
    if (name === 'register') return { ok: true, ...(await services.register(data)) };
    if (name === 'forgot') return { ok: true, ...(await services.forgot(data)) };
    if (name === 'reset') {
      await services.resetPassword(data);
      return { ok: true };
    }
    const user = await requireUser();
    let result: unknown;
    switch (name) {
      case 'worker':
        result = await services.saveWorker(user, data);
        break;
      case 'draft':
        await services.saveDraft(user, data);
        break;
      case 'submit':
        await services.submitVerification(user);
        break;
      case 'review':
        await services.reviewWorker(user, data);
        break;
      case 'request':
        result = await services.createRequest(user, data);
        break;
      case 'request-status':
        await services.transitionRequest(user, data);
        break;
      case 'favourite':
        await services.favourite(user, data);
        break;
      case 'availability':
        await services.availability(user, data);
        break;
      case 'account-status':
        await services.accountStatus(user, data);
        break;
      case 'profile':
        await services.profile(user, data);
        break;
      case 'notifications':
        await services.readNotifications(user);
        break;
      case 'document-review':
        await services.reviewDocument(user, data);
        break;
      default:
        throw new Error('Unknown demo action.');
    }
    return { ok: true, ...(result && typeof result === 'object' ? result : {}) } as {
      ok: boolean;
      id?: string;
      reReview?: boolean;
      resetLink?: string;
    };
  } catch (e) {
    if (e instanceof ZodError)
      throw new Error(e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    throw e;
  }
}

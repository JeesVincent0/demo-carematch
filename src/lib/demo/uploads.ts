import { requireUser } from '@/lib/auth';
import { updateDemoData } from './store';
import { documentTypes } from '@/modules/domain';
export async function uploadDemoFile(file: File, type: string) {
  const u = await requireUser();
  if (file.size > 1024 * 1024 || file.size < 8)
    throw new Error('Choose a sample PDF, PNG or JPEG up to 1 MB. Browser storage is limited.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const mime = pdf ? 'application/pdf' : png ? 'image/png' : jpg ? 'image/jpeg' : null;
  if (!mime || file.type !== mime || (type === 'avatar' && pdf))
    throw new Error('Choose a matching PDF, PNG or JPEG sample file.');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read this sample file.'));
    reader.readAsDataURL(file);
  });
  updateDemoData((data) => {
    const user = data.users.find((user) => user.id === u.id);
    if (!user || user.status !== 'ACTIVE') throw new Error('Sign in to an active demo account.');
    if (type === 'avatar') {
      user.avatarUrl = dataUrl;
      return;
    }
    if (u.role !== 'WORKER' || !documentTypes.includes(type as (typeof documentTypes)[number]))
      throw new Error('Choose a valid evidence category.');
    const w = data.workers.find((w) => w.userId === u.id)!;
    if (!['DRAFT', 'REJECTED'].includes(w.verificationStatus))
      throw new Error('Sample documents are locked during review.');
    data.documents.push({
      id: crypto.randomUUID(),
      workerId: w.id,
      documentType: type,
      originalFileName: file.name.slice(0, 200),
      mimeType: mime,
      reviewStatus: 'UPLOADED',
      uploadedAt: new Date(),
      dataUrl,
    });
  });
}

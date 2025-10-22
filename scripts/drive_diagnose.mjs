#!/usr/bin/env node
import { google } from 'googleapis';

function tryParseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}
function maybeBase64Decode(text) {
  try {
    if (!text.trim().startsWith('{')) return Buffer.from(text, 'base64').toString('utf8');
  } catch {}
  return text;
}

function getCreds() {
  const jsonEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
  const emailEnv = process.env.GOOGLE_DRIVE_CLIENT_EMAIL?.trim();
  const keyEnvRaw = process.env.GOOGLE_DRIVE_PRIVATE_KEY;

  if (jsonEnv && jsonEnv !== '{}') {
    const text = maybeBase64Decode(jsonEnv);
    const parsed = tryParseJson(text);
    if (parsed?.client_email && parsed?.private_key) {
      return { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, '\n') };
    }
  }
  if (emailEnv && keyEnvRaw) {
    return { client_email: emailEnv, private_key: keyEnvRaw.replace(/\\n/g, '\n') };
  }
  throw new Error('Missing service account credentials');
}

async function main() {
  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  if (!parentId) throw new Error('GOOGLE_DRIVE_PARENT_FOLDER_ID is not set');
  const creds = getCreds();
  console.log(`[Diagnose] SA: ${creds.client_email}; Parent prefix: ${parentId.slice(0,6)}`);

  const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/drive'] });
  const drive = google.drive({ version: 'v3', auth });

  try {
    const meta = await drive.files.get({ fileId: parentId, supportsAllDrives: true, fields: 'id,name,mimeType,trashed,driveId,parents' });
    console.log('[Diagnose] Parent metadata:', meta.data);
  } catch (e) {
    const status = e?.code || e?.response?.status;
    console.error('[Diagnose] files.get error status:', status, e?.message);
    process.exit(2);
  }

  let fileId;
  try {
    const created = await drive.files.create({
      requestBody: { name: 'diagnose.txt', parents: [parentId], mimeType: 'text/plain' },
      media: { mimeType: 'text/plain', body: 'diagnose' },
      fields: 'id',
      supportsAllDrives: true,
    });
    fileId = created.data.id;
    console.log('[Diagnose] Created file id:', fileId);
  } catch (e) {
    const status = e?.code || e?.response?.status;
    console.error('[Diagnose] files.create error status:', status, e?.message);
    process.exit(3);
  }

  try {
    await drive.files.delete({ fileId, supportsAllDrives: true });
    console.log('[Diagnose] Deleted test file.');
  } catch (e) {
    console.warn('[Diagnose] Could not delete test file:', e?.message);
  }
}

main().catch((e) => {
  console.error('[Diagnose] Fatal error:', e);
  process.exit(1);
});

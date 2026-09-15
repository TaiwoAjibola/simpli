import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI
  );
}

async function getCentralOAuthClient() {
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (!refreshToken) return null;
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  try {
    await oauth2Client.getAccessToken();
  } catch {}
  return oauth2Client;
}

async function ensureFolder(drive: any, name: string, parentId: string | null): Promise<string> {
  const sanitized = name.replace(/'/g, "\\'");
  const q = `mimeType='application/vnd.google-apps.folder' and name='${sanitized}' and trashed=false${parentId ? ` and '${parentId}' in parents` : ''}`;
  const res = await drive.files.list({
    q,
    fields: 'files(id, name)',
    pageSize: 10,
    spaces: 'drive'
  });
  const found = res.data.files && res.data.files[0];
  if (found) return found.id as string;
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {})
    },
    fields: 'id'
  });
  return created.data.id as string;
}

const appFolderCache = new Map<string, { rootId: string; appFolderId: string }>();

async function ensureAppFolder(drive: any, appId: string, appName: string): Promise<{ rootId: string; appFolderId: string }> {
  const cacheKey = `${appId}:${appName}`;
  const cached = appFolderCache.get(cacheKey);
  if (cached) return cached;

  const rootId = await ensureFolder(drive, 'Simpli', null);

  const rawBase = appName && appName.trim() ? appName.trim() : appId;
  const sanitizedBase = rawBase.replace(/['"\\]/g, '').trim().slice(0, 100) || appId;
  const folderName = rawBase === appId ? sanitizedBase : `${sanitizedBase} — ${appId.slice(-6)}`;

  const appFolderId = await ensureFolder(drive, folderName, rootId);

  const result = { rootId, appFolderId };
  appFolderCache.set(cacheKey, result);
  return result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'auth-url': {
        const oauth2Client = getOAuth2Client();
        const url = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: SCOPES,
          prompt: 'consent',
          response_type: 'code',
        });
        return res.status(200).json({ url });
      }

      case 'callback': {
        const { code } = req.query;
        if (!code || typeof code !== 'string') {
          return res.status(400).json({ error: 'Missing code parameter' });
        }
        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        if (tokens.refresh_token) {
          console.log('Central Drive refresh_token — add to env GOOGLE_DRIVE_REFRESH_TOKEN:', tokens.refresh_token);
        }
        return res.status(200).json({
          tokens,
          ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {})
        });
      }

      case 'ensure-app-folder': {
        const { appId, appName, access_token } = req.body;
        if (!appId) {
          return res.status(400).json({ error: 'Missing appId' });
        }
        let drive: any = null;
        const centralClient = await getCentralOAuthClient();
        if (centralClient) {
          drive = google.drive({ version: 'v3', auth: centralClient });
        } else if (access_token) {
          const fallbackClient = getOAuth2Client();
          fallbackClient.setCredentials({ access_token });
          drive = google.drive({ version: 'v3', auth: fallbackClient });
        } else {
          return res.status(400).json({ error: 'Central Drive not configured — add GOOGLE_DRIVE_REFRESH_TOKEN. Use per-user picker as fallback.' });
        }
        const result = await ensureAppFolder(drive, appId, appName || appId);
        return res.status(200).json(result);
      }

      case 'upload-central': {
        const { appId, appName, fileName, mimeType, contentBase64, access_token } = req.body;
        if (!appId || !fileName || !contentBase64) {
          return res.status(400).json({ error: 'Missing appId, fileName or contentBase64' });
        }
        let drive: any = null;
        const centralClient = await getCentralOAuthClient();
        if (centralClient) {
          drive = google.drive({ version: 'v3', auth: centralClient });
        } else if (access_token) {
          const fallbackClient = getOAuth2Client();
          fallbackClient.setCredentials({ access_token });
          drive = google.drive({ version: 'v3', auth: fallbackClient });
        } else {
          return res.status(400).json({ error: 'Central Drive not configured — add GOOGLE_DRIVE_REFRESH_TOKEN. Use per-user picker as fallback.' });
        }
        const { appFolderId } = await ensureAppFolder(drive, appId, appName || appId);
        const buffer = Buffer.from(contentBase64, 'base64');
        const stream = Readable.from(buffer);
        const created = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [appFolderId]
          },
          media: {
            mimeType: mimeType || 'application/octet-stream',
            body: stream
          },
          fields: 'id, name, webViewLink, webContentLink'
        });
        return res.status(200).json({ file: created.data });
      }

      case 'list-central': {
        const { appId, appName, access_token } = req.body;
        if (!appId) {
          return res.status(400).json({ error: 'Missing appId' });
        }
        let drive: any = null;
        const centralClient = await getCentralOAuthClient();
        if (centralClient) {
          drive = google.drive({ version: 'v3', auth: centralClient });
        } else if (access_token) {
          const fallbackClient = getOAuth2Client();
          fallbackClient.setCredentials({ access_token });
          drive = google.drive({ version: 'v3', auth: fallbackClient });
        } else {
          return res.status(400).json({ error: 'Central Drive not configured — add GOOGLE_DRIVE_REFRESH_TOKEN. Use per-user picker as fallback.' });
        }
        const { appFolderId } = await ensureAppFolder(drive, appId, appName || appId);
        const response = await drive.files.list({
          q: `'${appFolderId}' in parents and trashed=false`,
          fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, iconLink, parents)',
          pageSize: 100,
          orderBy: 'modifiedTime desc'
        });
        return res.status(200).json({ files: response.data.files || [] });
      }

      case 'list': {
        const { access_token, folder_id, query } = req.body;
        if (!access_token) {
          return res.status(400).json({ error: 'Missing access_token' });
        }
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ access_token });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        let q = 'trashed = false';
        if (folder_id) {
          q += ` and '${folder_id}' in parents`;
        }
        if (query) {
          q += ` and name contains '${query}'`;
        }

        const response = await drive.files.list({
          q,
          fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink, parents)',
          pageSize: 50,
          orderBy: 'modifiedTime desc'
        });

        return res.status(200).json({ files: response.data.files || [] });
      }

      case 'get-file': {
        const { access_token, file_id } = req.body;
        if (!access_token || !file_id) {
          return res.status(400).json({ error: 'Missing access_token or file_id' });
        }
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ access_token });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        const file = await drive.files.get({
          fileId: file_id,
          fields: 'id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, thumbnailLink'
        });

        return res.status(200).json({ file: file.data });
      }

      case 'get-content': {
        const { access_token, file_id, mime_type } = req.body;
        if (!access_token || !file_id) {
          return res.status(400).json({ error: 'Missing access_token or file_id' });
        }
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ access_token });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        const response = await drive.files.get(
          { fileId: file_id, alt: 'media' },
          { responseType: 'arraybuffer' }
        );

        const buffer = Buffer.from(response.data as ArrayBuffer);
        const base64 = buffer.toString('base64');
        const contentType = mime_type || 'application/octet-stream';

        return res.status(200).json({
          content: `data:${contentType};base64,${base64}`,
          fileName: file_id,
          contentType,
          size: buffer.length
        });
      }

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error: any) {
    console.error('Drive API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

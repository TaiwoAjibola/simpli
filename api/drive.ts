import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI
  );
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
          prompt: 'consent'
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
        return res.status(200).json({ tokens });
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

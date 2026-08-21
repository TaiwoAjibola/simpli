import { logger } from './logger';

export async function sendEmail(
  recipients: { to: string[]; cc?: string[] },
  subject: string,
  html: string
): Promise<boolean> {
  try {
    console.log(`[Email] Sending to:`, recipients.to, `| Subject:`, subject);
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipients.to,
        cc: recipients.cc,
        subject,
        html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Email] API error (${response.status}):`, data.error);
      logger.error('email', `Send failed: ${subject}`, { to: recipients.to, cc: recipients.cc, status: response.status, error: data.error });
      return false;
    }

    console.log(`[Email] Sent successfully to:`, recipients.to, `| Subject:`, subject);
    logger.info('email', `Sent: ${subject}`, { to: recipients.to, subject });
    return true;
  } catch (error: any) {
    console.error('[Email] Network/fetch error:', error);
    logger.error('email', `Network error: ${subject}`, { to: recipients.to, error: error?.message }, error?.stack);
    return false;
  }
}

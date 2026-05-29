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
      return false;
    }

    console.log(`[Email] Sent successfully to:`, recipients.to, `| Subject:`, subject);
    return true;
  } catch (error) {
    console.error('[Email] Network/fetch error:', error);
    return false;
  }
}

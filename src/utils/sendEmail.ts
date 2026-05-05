export async function sendEmail(to: string | string[], subject: string, html: string): Promise<boolean> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Email API error:', data.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

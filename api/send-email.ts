import nodemailer from 'nodemailer';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, cc, subject, html } = req.body;

  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPassword) {
    return res.status(500).json({ error: 'Email configuration missing. Set GMAIL_USER and GMAIL_APP_PASSWORD in Vercel env vars.' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPassword
    }
  });

  try {
    const mailOptions: any = {
      from: `"Simpli" <${gmailUser}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html: html || subject
    };

    if (cc && cc.length > 0) {
      mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
    }

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Email sent' });
  } catch (error: any) {
    console.error('Email send error:', error);
    res.status(500).json({ error: error.message });
  }
}

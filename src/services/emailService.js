import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendInvite(candidateEmail, candidateName, sessionToken, timeLimitMinutes) {
  const link = `${process.env.FRONTEND_URL}/interview/${sessionToken}`;
  let senderEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'interviews@shadowcoder.com';
  if (senderEmail === 'resend') {
    senderEmail = 'onboarding@resend.dev';
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`\n======================================================`);
    console.log(`[SMTP CONFIGURATION MISSING] Mock Email Sent:`);
    console.log(`To: ${candidateEmail} (${candidateName})`);
    console.log(`Interview Link: ${link}`);
    console.log(`======================================================\n`);
    return { messageId: 'mock-id-smtp-disabled' };
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2>Hi ${candidateName},</h2>
      <p>You have been invited to complete a technical coding interview.</p>
      <p><strong>Time allowed:</strong> ${timeLimitMinutes} minutes.</p>
      <p>
        <a href="${link}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-top: 10px;">
          Start Interview
        </a>
      </p>
      <p style="margin-top: 20px; font-size: 0.9em; color: #666;">
        <em>Note: This link expires in 48 hours and can only be used once.</em>
      </p>
      <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
      <p style="font-size: 0.8em; color: #999;">Powered by Shadow Coder</p>
    </div>
  `;

  try {
    return await transporter.sendMail({
      from: `"Shadow Coder Interviews" <${senderEmail}>`,
      to: candidateEmail,
      subject: 'Your Technical Interview Invitation',
      html,
    });
  } catch (error) {
    const errorMsg = error.message || '';
    if (error.responseCode === 550 || errorMsg.includes('550') || errorMsg.includes('testing emails')) {
      const match = errorMsg.match(/\(([^)]+)\)/);
      const testReceiver = match ? match[1] : (process.env.SMTP_TEST_RECEIVER || 'rajarajendraprasad123@gmail.com');
      
      console.warn(`[SMTP REDIRECT] Redirecting sandbox email from ${candidateEmail} to registered owner ${testReceiver} due to Resend restrictions.`);
      
      return await transporter.sendMail({
        from: `"Shadow Coder Interviews (Sandbox)" <${senderEmail}>`,
        to: testReceiver,
        subject: `[Dev Redirect: ${candidateEmail}] Your Technical Interview Invitation`,
        html: `
          <div style="background-color: #FEF3C7; color: #92400E; padding: 12px; margin-bottom: 20px; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; border: 1px solid #FCD34D;">
            <strong>Sandbox Mode Notice:</strong> This email was redirected to you because the candidate's email (<strong>${candidateEmail}</strong>) is not verified in your Resend sandbox account.
          </div>
          ${html}
        `,
      });
    }
    throw error;
  }
}

// Helper to delay
const delay = (ms) => new Promise(res => setTimeout(res, ms));

export async function sendBulkInvites(invites) {
  let sent = 0;
  const failed = [];

  for (const invite of invites) {
    try {
      await sendInvite(
        invite.email,
        invite.name,
        invite.sessionToken,
        invite.timeLimitMinutes
      );
      sent++;
      await delay(200); // Rate limit to 5 per second
    } catch (error) {
      console.error(`Failed to send email to ${invite.email}:`, error);
      failed.push(invite.email);
    }
  }

  return { sent, failed };
}

// Notification Service Layer (Email / SMS / WhatsApp)
// ==========================================================================
// To enable real delivery, set the provider and credentials in .env.
//
// Free tier options:
//   Email: Resend (resend.com) — 100 emails/day free
//   SMS:   Twilio / Msg91 / none (SMS free tiers are rare; mark pending)
//
// Supported providers:
//   EMAIL_PROVIDER: resend | sendgrid | ses | smtp | none
//   SMS_PROVIDER:   twilio | msg91 | none

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'none';
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@finzi.ai';
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'none';
const SMS_API_KEY = process.env.SMS_API_KEY || '';
const SMS_FROM = process.env.SMS_FROM || 'FINZIAI';

function isEmailConfigured() {
  return EMAIL_PROVIDER !== 'none' && Boolean(EMAIL_API_KEY);
}
function isSmsConfigured() {
  return SMS_PROVIDER !== 'none' && Boolean(SMS_API_KEY);
}

/**
 * Send an email notification via Resend (free tier: 100 emails/day).
 * Returns { success, messageId, error, pending }.
 */
async function sendResendEmail({ to, subject, html, text }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${EMAIL_API_KEY}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Resend API error: ${response.status} ${errText}`);
  }
  const result = await response.json();
  return { pending: false, messageId: result.id || null, error: null };
}

/**
 * Send an email notification.
 * Returns { success, messageId, error, pending }.
 */
async function sendEmail({ to, subject, html, text }) {
  if (!isEmailConfigured()) {
    return {
      pending: true,
      messageId: null,
      error: null,
      message: 'Email integration not configured. Set EMAIL_PROVIDER=resend and EMAIL_API_KEY in .env to enable email delivery.',
    };
  }

  try {
    switch (EMAIL_PROVIDER) {
      case 'resend': {
        return await sendResendEmail({ to, subject, html, text });
      }
      case 'sendgrid': {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(EMAIL_API_KEY);
        await sgMail.send({ to, from: EMAIL_FROM, subject, html, text });
        return { pending: false, messageId: 'sendgrid-queued', error: null };
      }
      case 'ses': {
        const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
        const client = new SESClient({ region: process.env.AWS_REGION || 'ap-south-1' });
        await client.send(new SendEmailCommand({
          Destination: { ToAddresses: [to] },
          Message: {
            Subject: { Data: subject },
            Body: { Html: { Data: html }, Text: { Data: text } },
          },
          Source: EMAIL_FROM,
        }));
        return { pending: false, messageId: 'ses-sent', error: null };
      }
      case 'smtp': {
        return { pending: true, messageId: null, error: null, message: 'SMTP adapter not yet implemented.' };
      }
      default:
        return { pending: true, messageId: null, error: null, message: `Unknown email provider: ${EMAIL_PROVIDER}` };
    }
  } catch (err) {
    console.error('Email send failed:', err.message);
    return { pending: false, messageId: null, error: err.message || 'Email send failed' };
  }
}

/**
 * Send an SMS notification.
 * Returns { success, messageId, error, pending }.
 */
async function sendSms({ to, body }) {
  if (!isSmsConfigured()) {
    return {
      pending: true,
      messageId: null,
      error: null,
      message: 'SMS integration not configured. Set SMS_PROVIDER and SMS_API_KEY in .env to enable SMS delivery.',
    };
  }

  try {
    switch (SMS_PROVIDER) {
      case 'twilio': {
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const message = await client.messages.create({ body, from: SMS_FROM, to });
        return { pending: false, messageId: message.sid, error: null };
      }
      case 'msg91': {
        return { pending: true, messageId: null, error: null, message: 'MSG91 adapter not yet implemented.' };
      }
      default:
        return { pending: true, messageId: null, error: null, message: `Unknown SMS provider: ${SMS_PROVIDER}` };
    }
  } catch (err) {
    console.error('SMS send failed:', err.message);
    return { pending: false, messageId: null, error: err.message || 'SMS send failed' };
  }
}

/**
 * Send a compliance reminder through all enabled channels.
 */
async function sendReminder({ reminder, channels = ['in_app'] }) {
  const results = { email: null, sms: null, in_app: { delivered: true } };
  if (channels.includes('email') && reminder.contact_email) {
    results.email = await sendEmail({
      to: reminder.contact_email,
      subject: `FINZI Reminder: ${reminder.title}`,
      html: `<p>${reminder.description || ''}</p><p>Due: ${reminder.due_date}</p><p>Priority: ${reminder.priority}</p>`,
      text: `${reminder.title}\n${reminder.description || ''}\nDue: ${reminder.due_date}\nPriority: ${reminder.priority}`,
    });
  }
  if (channels.includes('sms') && reminder.contact_phone) {
    results.sms = await sendSms({
      to: reminder.contact_phone,
      body: `FINZI Reminder: ${reminder.title}. Due ${reminder.due_date}. ${reminder.description || ''}`,
    });
  }
  return results;
}

module.exports = {
  sendEmail,
  sendSms,
  sendReminder,
  isEmailConfigured,
  isSmsConfigured,
  EMAIL_PROVIDER,
  SMS_PROVIDER,
};

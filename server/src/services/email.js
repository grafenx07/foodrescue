const nodemailer = require('nodemailer');

// ─── Transport ────────────────────────────────────────────────────────────────
// Singleton with a promise-based lock to prevent duplicate Ethereal account
// creation on concurrent startup requests.
let _transporter = null;
let _transporterPromise = null;

async function getTransporter() {
  if (_transporter) return _transporter;
  if (_transporterPromise) return _transporterPromise;

  _transporterPromise = (async () => {
    if (process.env.SMTP_USER) {
      _transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: false, // STARTTLS on port 587
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
      });
      // Verify connection config at startup
      await _transporter.verify().catch(err => {
        console.error('[Email] ⚠️  SMTP connection verification failed:', err.message);
        console.error('[Email]     Check SMTP_USER, SMTP_PASS, and that your Gmail App Password is correct.');
      });
      console.log('[Email] ✅ Gmail SMTP transport ready:', process.env.SMTP_USER);
    } else {
      // Dev fallback: Ethereal fake SMTP (no real emails sent)
      const testAccount = await nodemailer.createTestAccount();
      _transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      console.log('[Email] ⚠️  SMTP_USER not set — using Ethereal (dev only, no real emails)');
      console.log('[Email]     View sent emails at: https://ethereal.email/messages');
    }
    return _transporter;
  })();

  return _transporterPromise;
}

// ─── Sanitize user-supplied strings to prevent HTML injection in emails ───────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Shared HTML layout ───────────────────────────────────────────────────────
function htmlWrap(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FoodRescue</title>
</head>
<body style="margin:0;padding:0;background:#f0faf0;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0faf0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">&#127807; FoodRescue</h1>
              <p style="margin:4px 0 0;color:#bbf7d0;font-size:13px;">Connecting surplus food with those who need it</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">You received this email because you have an account on FoodRescue.</p>
              <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">&copy; ${new Date().getFullYear()} FoodRescue &mdash; Fighting food waste together.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(url, label) {
  // Whitelist URL schemes to prevent javascript: injection
  const safeUrl = /^https?:\/\//i.test(url) ? url : '#';
  return `<a href="${safeUrl}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:#16a34a;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;border-radius:10px;">${esc(label)}</a>`;
}

function heading(text) {
  return `<h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:700;">${esc(text)}</h2>`;
}

function para(html) {
  // para() receives pre-composed HTML (with <strong> tags etc.) — don't escape
  return `<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">${html}</p>`;
}

function infoBox(rows) {
  const cells = rows.map(([k, v]) => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#6b7280;font-weight:600;white-space:nowrap;">${esc(k)}</td>
      <td style="padding:8px 12px;font-size:13px;color:#111827;">${esc(String(v))}</td>
    </tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:10px;overflow:hidden;margin-top:20px;">${cells}</table>`;
}

// ─── Core sender ──────────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const transporter = await getTransporter();
  const from = process.env.EMAIL_FROM || '"FoodRescue" <noreply@foodrescue.app>';
  const info = await transporter.sendMail({ from, to, subject, html });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log('[Email] Preview URL:', previewUrl);
  return info;
}

// ─── 1. Welcome email ─────────────────────────────────────────────────────────
async function sendWelcomeEmail({ name, email, role }) {
  const roleLabel = { DONOR: 'Donor', RECEIVER: 'Receiver', VOLUNTEER: 'Volunteer', ADMIN: 'Admin' }[role] || role;
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const html = htmlWrap(`
    ${heading(`Welcome to FoodRescue, ${name}! 🎉`)}
    ${para(`Thank you for joining FoodRescue as a <strong>${esc(roleLabel)}</strong>. Together we're building a community that fights food waste and hunger.`)}
    ${para('Your account is ready &mdash; start exploring:')}
    ${infoBox([['Your role', roleLabel], ['Email', email]])}
    ${btn(appUrl, 'Go to FoodRescue →')}
  `);
  return sendEmail({ to: email, subject: 'Welcome to FoodRescue! 🌿', html });
}

// ─── 2. Password reset email ──────────────────────────────────────────────────
async function sendPasswordResetEmail({ name, email, resetUrl }) {
  const html = htmlWrap(`
    ${heading('Reset Your Password 🔐')}
    ${para(`Hi ${esc(name)}, we received a request to reset your FoodRescue password.`)}
    ${para('Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.')}
    ${btn(resetUrl, 'Reset Password')}
    <p style="margin-top:24px;color:#6b7280;font-size:13px;">
      If you didn&apos;t request this, you can safely ignore this email &mdash; your password won&apos;t change.
    </p>
    <p style="margin:8px 0 0;color:#6b7280;font-size:12px;word-break:break-all;">
      Or copy this link: <a href="${/^https?:\/\//i.test(resetUrl) ? resetUrl : '#'}" style="color:#16a34a;">${esc(resetUrl)}</a>
    </p>
  `);
  return sendEmail({ to: email, subject: 'Reset your FoodRescue password', html });
}

// ─── 3. Claim confirmed → receiver ───────────────────────────────────────────
async function sendClaimConfirmedEmail({ receiverName, receiverEmail, foodTitle, donorName, location, expiryTime }) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  let expiryStr = 'Unknown';
  try { expiryStr = new Date(expiryTime).toLocaleString(); } catch (_) {}
  const html = htmlWrap(`
    ${heading('Your Claim is Confirmed! ✅')}
    ${para(`Hi ${esc(receiverName)}, great news &mdash; your claim for the food listing below has been confirmed.`)}
    ${infoBox([
      ['Food', foodTitle],
      ['Donor', donorName],
      ['Pickup Location', location],
      ['Expires', expiryStr],
    ])}
    ${para('Head to your dashboard to track the status of your pickup.')}
    ${btn(`${appUrl}/receiver`, 'View My Claims →')}
  `);
  return sendEmail({ to: receiverEmail, subject: `Claim confirmed: ${foodTitle}`, html });
}

// ─── 4. Food was claimed → donor ─────────────────────────────────────────────
async function sendFoodClaimedEmail({ donorName, donorEmail, foodTitle, receiverName }) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const html = htmlWrap(`
    ${heading('Your Food Has Been Claimed! 🙌')}
    ${para(`Hi ${esc(donorName)}, someone just claimed your food listing.`)}
    ${infoBox([['Listing', foodTitle], ['Claimed by', receiverName]])}
    ${para('A volunteer will be assigned soon to coordinate the pickup, or the receiver will self-collect.')}
    ${btn(`${appUrl}/donor`, 'View My Listings →')}
  `);
  return sendEmail({ to: donorEmail, subject: `"${foodTitle}" has been claimed`, html });
}

// ─── 5. Volunteer assigned ────────────────────────────────────────────────────
async function sendVolunteerAssignedEmail({ volunteerName, volunteerEmail, foodTitle, pickupLocation, receiverName }) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const html = htmlWrap(`
    ${heading('New Pickup Task Assigned 🚗')}
    ${para(`Hi ${esc(volunteerName)}, you&apos;ve been assigned a new food pickup task!`)}
    ${infoBox([
      ['Food', foodTitle],
      ['Pick up from', pickupLocation],
      ['Deliver to', receiverName],
    ])}
    ${para('Please pick up the food before it expires. Update the status when you pick up and deliver.')}
    ${btn(`${appUrl}/volunteer`, 'View My Tasks →')}
  `);
  return sendEmail({ to: volunteerEmail, subject: `New task: Pick up "${foodTitle}"`, html });
}

// ─── 6. Picked up → receiver ─────────────────────────────────────────────────
async function sendPickedUpEmail({ receiverName, receiverEmail, foodTitle, volunteerName }) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const html = htmlWrap(`
    ${heading('Your Food Is On The Way! 🚚')}
    ${para(`Hi ${esc(receiverName)}, great news &mdash; your food is being delivered!`)}
    ${infoBox([
      ['Food', foodTitle],
      ['Volunteer', volunteerName],
      ['Status', 'Picked Up — En Route'],
    ])}
    ${para('You should receive it shortly. Thank you for using FoodRescue!')}
    ${btn(`${appUrl}/receiver`, 'Track My Order →')}
  `);
  return sendEmail({ to: receiverEmail, subject: `"${foodTitle}" is on its way!`, html });
}

// ─── 7. Delivered → receiver + donor ─────────────────────────────────────────
async function sendDeliveredEmail({ name, email, foodTitle, role }) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const isReceiver = role === 'RECEIVER';
  const html = htmlWrap(`
    ${heading('Food Delivered Successfully! 🎉')}
    ${para(`Hi ${esc(name)}, the food &ldquo;${esc(foodTitle)}&rdquo; has been successfully delivered.`)}
    ${isReceiver
      ? para('We hope this helped! Remember, every rescued meal makes a difference. 💚')
      : para('Thank you for your generous donation. Your contribution is making a real impact in the community!')}
    ${infoBox([['Listing', foodTitle], ['Status', '✅ Delivered']])}
    ${btn(`${appUrl}${isReceiver ? '/receiver' : '/donor'}`, 'View Dashboard →')}
  `);
  return sendEmail({ to: email, subject: `"${foodTitle}" delivered successfully ✅`, html });
}

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendClaimConfirmedEmail,
  sendFoodClaimedEmail,
  sendVolunteerAssignedEmail,
  sendPickedUpEmail,
  sendDeliveredEmail,
};

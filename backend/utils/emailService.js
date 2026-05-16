const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Initialize the email transporter.
 */
async function initTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  console.log(`🔍 Checking Environment Variables...`);
  console.log(`   EMAIL_USER: ${user ? (user.substring(0, 3) + '...') : 'MISSING'}`);
  console.log(`   EMAIL_PASS: ${pass ? 'PRESENT (hidden)' : 'MISSING'}`);

  if (user && pass) {
    // USE REAL GMAIL
    console.log(`✉️ Connecting to Gmail: ${user}`);
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    
    transporter.verify((error, success) => {
      if (error) {
        console.error("❌ Gmail Connection Error:", error.message);
      } else {
        console.log("✅ Gmail is ready to send emails!");
      }
    });
  } else {
    // FALLBACK TO ETHEREAL SANDBOX
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`✉️ Email Sandbox ready: ${testAccount.user}`);
      console.log(`💡 TIP: Set EMAIL_USER and EMAIL_PASS in .env to receive REAL emails.`);
    } catch (err) {
      console.error("Failed to initialize Ethereal Email Sandbox:", err);
    }
  }
}

// Call init on load
initTransporter();

/**
 * Send an alert email when PPE violations are detected.
 */
async function sendViolationAlert(options) {
  if (!transporter) return;
  const { to, siteName, violations, compliant, imageUrl } = options;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">🚨 Safety Violation Alert</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 16px; color: #1e293b;">A critical safety violation was just detected on your site.</p>
        <p><strong>Site:</strong> ${siteName || 'Untagged'}</p>
        <p><strong>Violations:</strong> ${violations}</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${imageUrl}" style="background-color: #1e293b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Image Details</a>
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"SafetySnap" <${process.env.EMAIL_USER || 'alerts@safetysnap.io'}>`,
      to: to || "safety-manager@company.com",
      subject: `⚠️ PPE Violation at ${siteName || 'Untagged Site'}`,
      html: html,
    });
    console.log("📨 ALERT EMAIL SENT!");
  } catch (err) {
    console.error("❌ Failed to send violation email:", err.message);
  }
}

/**
 * Send a password reset email.
 */
async function sendPasswordResetEmail(options) {
  if (!transporter) return;
  const { to, resetUrl } = options;
  const html = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 32px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">SafetySnap</h1>
      </div>
      <div style="padding: 40px 32px;">
        <h2 style="color: #0f172a; margin: 0 0 16px 0; font-size: 20px; font-weight: 700;">Password Reset Request</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          Click the button below to reset your password. This link expires in 10 minutes.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 700;">Reset My Password</a>
        </div>
      </div>
    </div>
  `;

  try {
    console.log(`📨 Sending password reset email to: ${to}...`);
    await transporter.sendMail({
      from: `"SafetySnap Support" <${process.env.EMAIL_USER || 'support@safetysnap.io'}>`,
      to: to,
      subject: "🔒 Reset Your SafetySnap Password",
      html: html,
    });
    console.log("✅ PASSWORD RESET EMAIL SENT!");
  } catch (err) {
    console.error("❌ Failed to send reset email:", err.message);
  }
}

module.exports = {
  sendViolationAlert,
  sendPasswordResetEmail
};

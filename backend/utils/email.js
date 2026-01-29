const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
<<<<<<< HEAD
  secure: parseInt(process.env.EMAIL_PORT) === 465, // true for 465, false for 587
=======
  secure: false, // true for 465, false for other ports
>>>>>>> 437520f78157dc21dd0d1309b4c5103c25dbe759
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send email
 */
exports.sendEmail = async (to, subject, html, text) => {
  try {
    const info = await transporter.sendMail({
      from: `"Nepdeals" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send OTP email
 */
exports.sendOTPEmail = async (to, otp) => {
  const subject = 'Your Nepdeals Verification Code';
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FAFAFA; color: #263238; border: 1px solid #CFD8DC;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #C62828; margin: 0;">Nepdeals</h1>
      </div>
      <div style="background-color: #FFFFFF; padding: 30px; border-radius: 8px; border: 1px solid #ECEFF1; box-shadow: 0 4px 6px rgba(38, 50, 56, 0.05);">
        <h2 style="color: #C62828; margin-top: 0;">Verification Code</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #37474F;">Your verification code is:</p>
        <div style="background-color: #F5F5F5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px dashed #C62828;">
          <h1 style="color: #C62828; font-size: 36px; letter-spacing: 5px; margin: 0;">${otp}</h1>
        </div>
        <p style="font-size: 14px; color: #546E7A;">This code will expire in 10 minutes.</p>
        <p style="font-size: 12px; color: #90A4AE; margin-top: 30px;">If you didn't request this code, please ignore this email.</p>
      </div>
    </div>
  `;
  const text = `Your Nepdeals verification code is: ${otp}. This code will expire in 10 minutes.`;

  return await exports.sendEmail(to, subject, html, text);
};

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = async (to, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const subject = 'Reset Your Nepdeals Password';
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FAFAFA; color: #263238; border: 1px solid #CFD8DC;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #C62828; margin: 0;">Nepdeals</h1>
      </div>
      <div style="background-color: #FFFFFF; padding: 30px; border-radius: 8px; border: 1px solid #ECEFF1; box-shadow: 0 4px 6px rgba(38, 50, 56, 0.05);">
        <h2 style="color: #C62828; margin-top: 0;">Password Reset Request</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #37474F;">Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #C62828; color: #FFFFFF; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 14px; color: #546E7A;">Or copy and paste this link:</p>
        <p style="font-size: 12px; color: #C62828; word-break: break-all;">${resetUrl}</p>
        <p style="font-size: 12px; color: #90A4AE; margin-top: 30px;">This link will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
      </div>
    </div>
  `;
  const text = `Reset your password by clicking this link: ${resetUrl}. This link will expire in 10 minutes.`;

  return await exports.sendEmail(to, subject, html, text);
};









exports.sendVerificationEmail = async (to, url) => {
  const subject = 'Verify your Nepdeals Account';
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FAFAFA; color: #263238; border: 1px solid #CFD8DC;">
      <h1 style="color: #C62828; text-align: center;">Nepdeals</h1>
      <div style="background-color: #FFFFFF; padding: 30px; border-radius: 8px; text-align: center; border: 1px solid #ECEFF1; box-shadow: 0 4px 6px rgba(38, 50, 56, 0.05);">
        <h2 style="color: #C62828;">Welcome to Nepdeals</h2>
        <p style="color: #37474F;">Please click the button below to verify your email address and activate your account.</p>
        <a href="${url}" style="display: inline-block; background-color: #C62828; color: #FFFFFF; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 4px; margin: 20px 0;">VERIFY ACCOUNT</a>
        <p style="font-size: 12px; color: #90A4AE;">This link expires in 24 hours.</p>
      </div>
    </div>
  `;
  return await exports.sendEmail(to, subject, html, `Verify your account here: ${url}`);
};




import nodemailer from "nodemailer";

// Pluggable notifier. Email now (SMTP via env); SMS can implement the same
// interface later with no call-site change. Dev fallback: log to console.
export interface Notifier {
  sendOtp(email: string, code: string, purpose: "verify" | "reset"): Promise<void>;
}

const smtpHost = process.env.SMTP_HOST;
const transporter = smtpHost
  ? nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null;

export const mailer: Notifier = {
  async sendOtp(email, code, purpose) {
    const subject =
      purpose === "verify" ? "Verify your Nafas email" : "Reset your Nafas password";
    const text = `Your Nafas ${purpose} code is: ${code}\nIt expires in 10 minutes.`;
    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "no-reply@nafas.app",
        to: email,
        subject,
        text,
      });
    } else {
      // Dev: no SMTP configured — surface the code in logs.
      console.log(`[mailer:dev] ${purpose} OTP for ${email}: ${code}`);
    }
  },
};

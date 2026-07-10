import { Resend } from 'resend';
import { env } from '../config/env.js';

const resend = new Resend(env.resendApiKey);

type Locale = 'fr' | 'en';

async function send(to: string, subject: string, html: string): Promise<void> {
    try {
        await resend.emails.send({ from: env.mailFrom, to, subject, html });
    } catch (error) {
        console.error('[email] Send failed:', error);
    }
}

// Minimal shell with inline CSS (email clients ignore <style> blocks).
function layout(title: string, bodyHtml: string): string {
    return `
  <div style="background:#0b0f1a;padding:32px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:18px;color:#f9fafb;">${title}</h1>
      <div style="font-size:14px;line-height:1.6;color:#cbd5e1;">${bodyHtml}</div>
      <p style="margin:32px 0 0;font-size:12px;color:#64748b;">Analytix</p>
    </div>
  </div>`;
}

function button(href: string, label: string): string {
    return `<a href="${href}" style="display:inline-block;margin:20px 0;padding:12px 20px;background:#38bdf8;color:#05070d;text-decoration:none;border-radius:8px;font-weight:600;">${label}</a>`;
}

const T = {
    fr: {
        confirmSubject: 'Votre compte est en attente de validation',
        confirmTitle: 'Inscription reçue',
        confirmBody:
            "Votre inscription a bien été reçue. Votre compte est en attente de validation par notre équipe administrative. Vous serez notifié dès qu'il sera actif.",
        resetSubject: 'Réinitialisation de votre mot de passe',
        resetTitle: 'Mot de passe oublié',
        resetIntro:
            'Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous (valable 30 minutes) :',
        resetButton: 'Réinitialiser mon mot de passe',
        resetOutro: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
    },
    en: {
        confirmSubject: 'Your account is pending validation',
        confirmTitle: 'Registration received',
        confirmBody:
            'Your registration has been received. Your account is pending validation by our administrative team. You will be notified once it is active.',
        resetSubject: 'Reset your password',
        resetTitle: 'Forgot password',
        resetIntro: 'You requested to reset your password. Click the button below (valid for 30 minutes):',
        resetButton: 'Reset my password',
        resetOutro: 'If you did not request this, please ignore this email.',
    },
} satisfies Record<Locale, Record<string, string>>;

export async function sendConfirmationEmail(to: string, locale: Locale = 'fr'): Promise<void> {
    const t = T[locale] ?? T.fr;
    await send(to, t.confirmSubject, layout(t.confirmTitle, `<p>${t.confirmBody}</p>`));
}

export async function sendPasswordResetEmail(
    to: string,
    resetUrl: string,
    locale: Locale = 'fr',
): Promise<void> {
    const t = T[locale] ?? T.fr;
    const body = `<p>${t.resetIntro}</p>${button(resetUrl, t.resetButton)}<p>${t.resetOutro}</p>`;
    await send(to, t.resetSubject, layout(t.resetTitle, body));
}

export async function sendNewConversationEmail(
    to: string,
    conversationId: string,
    subject: string,
): Promise<void> {
    const url = `${env.appWebUrl}/admin/support?id=${conversationId}`;
    const body = `<p>Une nouvelle demande de support a été créée :</p><p><strong>${subject}</strong></p>${button(url, 'Voir la conversation')}`;
    await send(to, `Nouvelle demande de support — ${subject}`, layout('Nouvelle demande de support', body));
}

export async function sendConversationAcceptedEmail(
    to: string,
    conversationId: string,
): Promise<void> {
    const url = `${env.appWebUrl}/support?id=${conversationId}`;
    const body = `<p>Votre demande de support a été prise en charge.</p><p>${button(url, 'Voir la conversation')}</p>`;
    await send(to, 'Votre demande de support a été prise en charge', layout('Demande prise en charge', body));
}
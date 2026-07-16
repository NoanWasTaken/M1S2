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

function button(href: string, label: string, fallback: string): string {
    return `<a href="${href}" style="display:inline-block;margin:20px 0;padding:12px 20px;background:#38bdf8;color:#05070d;text-decoration:none;border-radius:8px;font-weight:600;">${label}</a>
      <p style="margin:8px 0 0;font-size:12px;color:#64748b;">${fallback}<br/>
      <span style="color:#38bdf8;word-break:break-all;">${href}</span></p>`;
}

const T = {
    fr: {
        buttonFallback: 'Si le bouton ne fonctionne pas, copiez ce lien :',
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
        newConversationSubject: 'Nouvelle demande de support — {subject}',
        newConversationTitle: 'Nouvelle demande de support',
        newConversationBody: 'Une nouvelle demande de support a été créée :',
        viewConversation: 'Voir la conversation',
        acceptedSubject: 'Votre demande de support a été prise en charge',
        acceptedTitle: 'Demande prise en charge',
        acceptedBody: 'Votre demande de support a été prise en charge.',
        internalSubject: 'Demande interne — {subject}',
        internalTitle: 'Demande interne',
        internalBody: "Un membre de votre entreprise a besoin d'aide :",
        viewRequest: 'Voir la demande',
        newCompanySubject: 'Nouvelle entreprise à valider — {company}',
        newCompanyTitle: 'Nouvelle entreprise',
        newCompanyBody: 'Une nouvelle entreprise attend votre validation :',
        newCompanyWebmaster: 'Webmaster : {email}',
        validateCompany: "Valider l'entreprise",
        companyValidatedSubject: 'Votre entreprise a été validée',
        companyValidatedTitle: 'Entreprise validée',
        companyValidatedBody: 'Bonne nouvelle : votre entreprise <strong>{company}</strong> a été validée.',
        companyValidatedOutro: 'Vous pouvez désormais vous connecter à la plateforme.',
        signIn: 'Se connecter',
        companyRejectedSubject: "Votre demande n'a pas été validée",
        companyRejectedTitle: 'Demande refusée',
        companyRejectedBody: "Votre demande d'inscription pour <strong>{company}</strong> n'a pas été retenue.",
        companyRejectedOutro: 'Pour en savoir plus, contactez notre équipe.',
        accountRejectedSubject: 'Votre compte a été refusé',
        accountRejectedTitle: 'Compte refusé',
        accountRejectedBody: "Votre demande de création de compte n'a pas été acceptée.",
        accountRejectedOutro: 'Pour en savoir plus, contactez notre équipe.',
        accountSuspendedSubject: 'Votre compte a été suspendu',
        accountSuspendedTitle: 'Compte suspendu',
        accountSuspendedBody: 'Votre compte Analytix a été suspendu. Vous ne pouvez plus vous connecter pour le moment.',
        accountSuspendedOutro: 'Pour en savoir plus, contactez notre équipe.',
        accountDeletedSubject: 'Votre compte a été supprimé',
        accountDeletedTitle: 'Compte supprimé',
        accountDeletedBody: 'Votre compte Analytix a été définitivement supprimé.',
        accountDeletedOutro: 'Si vous pensez qu\'il s\'agit d\'une erreur, contactez notre équipe.',
        companyDeletedSubject: 'Votre entreprise a été supprimée',
        companyDeletedTitle: 'Entreprise supprimée',
        companyDeletedBody: 'L\'entreprise <strong>{company}</strong> a été supprimée de la plateforme. Votre compte a été suspendu.',
        companyDeletedOutro: 'Pour en savoir plus, contactez notre équipe.',
        invitationSubject: 'Invitation à rejoindre {company}',
        invitationTitle: 'Invitation',
        invitationBody: "Vous avez été invité à rejoindre l'équipe <strong>{company}</strong> sur Analytix.",
        invitationOutro: 'Créez votre compte en cliquant ci-dessous (lien valable 7 jours) :',
        createAccount: 'Créer mon compte',
        verifySubject: 'Confirmez votre adresse email',
        verifyTitle: 'Confirmation',
        verifyBody: 'Votre compte a bien été créé. Dernière étape : confirmez votre adresse email.',
        verifyButton: 'Confirmer mon adresse',
    },
    en: {
        buttonFallback: "If the button doesn't work, copy this link:",
        confirmSubject: 'Your account is pending validation',
        confirmTitle: 'Registration received',
        confirmBody:
            'Your registration has been received. Your account is pending validation by our administrative team. You will be notified once it is active.',
        resetSubject: 'Reset your password',
        resetTitle: 'Forgot password',
        resetIntro: 'You requested to reset your password. Click the button below (valid for 30 minutes):',
        resetButton: 'Reset my password',
        resetOutro: 'If you did not request this, please ignore this email.',
        newConversationSubject: 'New support request — {subject}',
        newConversationTitle: 'New support request',
        newConversationBody: 'A new support request has been created:',
        viewConversation: 'View conversation',
        acceptedSubject: 'Your support request has been accepted',
        acceptedTitle: 'Request accepted',
        acceptedBody: 'Your support request has been accepted.',
        internalSubject: 'Internal request — {subject}',
        internalTitle: 'Internal request',
        internalBody: 'A member of your company needs help:',
        viewRequest: 'View request',
        newCompanySubject: 'New company pending validation — {company}',
        newCompanyTitle: 'New company',
        newCompanyBody: 'A new company is waiting for your validation:',
        newCompanyWebmaster: 'Webmaster: {email}',
        validateCompany: 'Validate company',
        companyValidatedSubject: 'Your company has been validated',
        companyValidatedTitle: 'Company validated',
        companyValidatedBody: 'Good news: your company <strong>{company}</strong> has been validated.',
        companyValidatedOutro: 'You can now sign in to the platform.',
        signIn: 'Sign in',
        companyRejectedSubject: 'Your application was not approved',
        companyRejectedTitle: 'Application declined',
        companyRejectedBody: 'Your registration request for <strong>{company}</strong> was not approved.',
        companyRejectedOutro: 'Contact our team if you need more information.',
        accountRejectedSubject: 'Your account was declined',
        accountRejectedTitle: 'Account declined',
        accountRejectedBody: 'Your account registration request was not approved.',
        accountRejectedOutro: 'Contact our team if you need more information.',
        accountSuspendedSubject: 'Your account has been suspended',
        accountSuspendedTitle: 'Account suspended',
        accountSuspendedBody: 'Your Analytix account has been suspended. You can no longer sign in for now.',
        accountSuspendedOutro: 'Contact our team if you need more information.',
        accountDeletedSubject: 'Your account has been deleted',
        accountDeletedTitle: 'Account deleted',
        accountDeletedBody: 'Your Analytix account has been permanently deleted.',
        accountDeletedOutro: 'If you believe this is a mistake, contact our team.',
        companyDeletedSubject: 'Your company has been deleted',
        companyDeletedTitle: 'Company deleted',
        companyDeletedBody: 'The company <strong>{company}</strong> has been removed from the platform. Your account has been suspended.',
        companyDeletedOutro: 'Contact our team if you need more information.',
        invitationSubject: 'Invitation to join {company}',
        invitationTitle: 'Invitation',
        invitationBody: 'You have been invited to join the <strong>{company}</strong> team on Analytix.',
        invitationOutro: 'Create your account by clicking below (link valid for 7 days):',
        createAccount: 'Create my account',
        verifySubject: 'Confirm your email address',
        verifyTitle: 'Confirmation',
        verifyBody: 'Your account has been created. One last step: confirm your email address.',
        verifyButton: 'Confirm my email',
    },
} satisfies Record<Locale, Record<string, string>>;

function tpl(text: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce(
        (acc, [key, value]) => acc.replaceAll(`{${key}}`, value),
        text,
    );
}

function localeOf(locale?: Locale): Locale {
    return locale && locale in T ? locale : 'fr';
}

export async function sendConfirmationEmail(to: string, locale: Locale = 'fr'): Promise<void> {
    const t = T[localeOf(locale)];
    await send(to, t.confirmSubject, layout(t.confirmTitle, `<p>${t.confirmBody}</p>`));
}

export async function sendPasswordResetEmail(
    to: string,
    resetUrl: string,
    locale: Locale = 'fr',
): Promise<void> {
    const t = T[localeOf(locale)];
    const body = `<p>${t.resetIntro}</p>${button(resetUrl, t.resetButton, t.buttonFallback)}<p>${t.resetOutro}</p>`;
    await send(to, t.resetSubject, layout(t.resetTitle, body));
}

export async function sendNewConversationEmail(
    to: string,
    conversationId: string,
    subject: string,
    locale: Locale = 'fr',
): Promise<void> {
    const t = T[localeOf(locale)];
    const url = `${env.appWebUrl}/admin/support?id=${conversationId}`;
    const body = `<p>${t.newConversationBody}</p><p><strong>${subject}</strong></p>${button(url, t.viewConversation, t.buttonFallback)}`;
    await send(to, tpl(t.newConversationSubject, { subject }), layout(t.newConversationTitle, body));
}

export async function sendConversationAcceptedEmail(
    to: string,
    conversationId: string,
    locale: Locale = 'fr',
): Promise<void> {
    const t = T[localeOf(locale)];
    const url = `${env.appWebUrl}/support?id=${conversationId}`;
    const body = `<p>${t.acceptedBody}</p>${button(url, t.viewConversation, t.buttonFallback)}`;
    await send(to, t.acceptedSubject, layout(t.acceptedTitle, body));
}

export async function sendInternalRequestEmail(
    to: string,
    conversationId: string,
    subject: string,
    locale: Locale = 'fr',
): Promise<void> {
    const t = T[localeOf(locale)];
    const url = `${env.appWebUrl}/support?id=${conversationId}`;
    const body = `<p>${t.internalBody}</p><p><strong>${subject}</strong></p>${button(url, t.viewRequest, t.buttonFallback)}`;
    await send(to, tpl(t.internalSubject, { subject }), layout(t.internalTitle, body));
}

export async function sendAdminNewCompanyEmail(
    to: string,
    companyId: string,
    companyName: string,
    webmasterEmail: string,
    locale: Locale = 'fr',
): Promise<void> {
    const t = T[localeOf(locale)];
    const url = `${env.appWebUrl}/admin/companies?id=${companyId}`;
    const body = `<p>${t.newCompanyBody}</p>
      <p><strong>${companyName}</strong><br/>${tpl(t.newCompanyWebmaster, { email: webmasterEmail })}</p>
      ${button(url, t.validateCompany, t.buttonFallback)}`;
    await send(to, tpl(t.newCompanySubject, { company: companyName }), layout(t.newCompanyTitle, body));
}

export async function sendCompanyValidatedEmail(
    to: string,
    companyName: string,
    locale: Locale = 'fr',
): Promise<void> {
    const t = T[localeOf(locale)];
    const url = `${env.appWebUrl}/login`;
    const body = `<p>${tpl(t.companyValidatedBody, { company: companyName })}</p>
      <p>${t.companyValidatedOutro}</p>${button(url, t.signIn, t.buttonFallback)}`;
    await send(to, t.companyValidatedSubject, layout(t.companyValidatedTitle, body));
}

export async function sendCompanyRejectedEmail(
    to: string,
    companyName: string,
    locale: Locale = 'fr',
): Promise<void> {
    const t = T[localeOf(locale)];
    const body = `<p>${tpl(t.companyRejectedBody, { company: companyName })}</p>
      <p>${t.companyRejectedOutro}</p>`;
    await send(to, t.companyRejectedSubject, layout(t.companyRejectedTitle, body));
}

export async function sendAccountRejectedEmail(to: string, locale: Locale = 'fr'): Promise<void> {
    const t = T[localeOf(locale)];
    const body = `<p>${t.accountRejectedBody}</p><p>${t.accountRejectedOutro}</p>`;
    await send(to, t.accountRejectedSubject, layout(t.accountRejectedTitle, body));
}

export async function sendAccountSuspendedEmail(to: string, locale: Locale = 'fr'): Promise<void> {
    const t = T[localeOf(locale)];
    const body = `<p>${t.accountSuspendedBody}</p><p>${t.accountSuspendedOutro}</p>`;
    await send(to, t.accountSuspendedSubject, layout(t.accountSuspendedTitle, body));
}

export async function sendAccountDeletedEmail(to: string, locale: Locale = 'fr'): Promise<void> {
    const t = T[localeOf(locale)];
    const body = `<p>${t.accountDeletedBody}</p><p>${t.accountDeletedOutro}</p>`;
    await send(to, t.accountDeletedSubject, layout(t.accountDeletedTitle, body));
}

export async function sendCompanyDeletedEmail(
    to: string,
    companyName: string,
    locale: Locale = 'fr',
): Promise<void> {
    const t = T[localeOf(locale)];
    const body = `<p>${tpl(t.companyDeletedBody, { company: companyName })}</p>
      <p>${t.companyDeletedOutro}</p>`;
    await send(to, t.companyDeletedSubject, layout(t.companyDeletedTitle, body));
}

export async function sendInvitationEmail(
    to: string,
    url: string,
    companyName: string,
    locale: Locale = 'fr',
): Promise<void> {
    const t = T[localeOf(locale)];
    const body = `<p>${tpl(t.invitationBody, { company: companyName })}</p>
      <p>${t.invitationOutro}</p>
      ${button(url, t.createAccount, t.buttonFallback)}`;
    await send(to, tpl(t.invitationSubject, { company: companyName }), layout(t.invitationTitle, body));
}

export async function sendVerifyEmailEmail(to: string, url: string, locale: Locale = 'fr'): Promise<void> {
    const t = T[localeOf(locale)];
    const body = `<p>${t.verifyBody}</p>${button(url, t.verifyButton, t.buttonFallback)}`;
    await send(to, t.verifySubject, layout(t.verifyTitle, body));
}

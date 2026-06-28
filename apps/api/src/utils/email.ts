// for send confirmation email

export async function sendConfirmationEmail(to: string): Promise<void> {
    // TODO: branch real email service later
    console.log(`[email] Confirmation email to send to ${to}`);
}
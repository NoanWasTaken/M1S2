import argon2 from 'argon2';
import { CompanyModel } from '../../models/company.js';
import { UserModel } from '../../models/user.js';
import { AppError } from '../../utils/app-error.js';
import { sendConfirmationEmail } from '../../utils/email.js';
import type { RegisterInput } from './auth.schema.js';

export async function registerWebmaster(input: RegisterInput) {
    const email = input.user.email.toLowerCase();

    // 1. is the email already taken?
    const existing = await UserModel.findOne({ email });
    if (existing) {
        throw new AppError(409, 'email_already_used', 'An account already exists with this email.');
    }

    // 2. Hash the password (never stored in clear text)
    const passwordHash = await argon2.hash(input.user.password);

    // 3. Create the company (status "pending" by default)
    const company = await CompanyModel.create({
        name: input.company.name,
        baseUrl: input.company.baseUrl,
        kbisFileRef: input.company.kbisFileRef,
        contact: input.company.contact,
    });

    // 4. Create the webmaster user, attached to the company
    const user = await UserModel.create({
        email,
        passwordHash,
        role: 'webmaster',
        status: 'pending',
        companyId: company._id,
    });

    // 5. Send the confirmation email (placeholder)
    await sendConfirmationEmail(email);

    // 6. Return the result WITHOUT the password
    return {
        user: { id: user._id, email: user.email, role: user.role, status: user.status },
        company: { id: company._id, name: company.name, validationStatus: company.validationStatus },
    };
}
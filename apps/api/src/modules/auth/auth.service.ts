import argon2 from 'argon2';
import { CompanyModel } from '../../models/company.js';
import { UserModel } from '../../models/user.js';
import { AppError } from '../../utils/app-error.js';
import { sendConfirmationEmail } from '../../utils/email.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, type TokenPayload } from './jwt.js';

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
        teamRole: 'owner',
    });

    // 5. Send the confirmation email (placeholder)
    await sendConfirmationEmail(email);

    // 6. Return the result WITHOUT the password
    return {
        user: { id: user._id, email: user.email, role: user.role, status: user.status },
        company: { id: company._id, name: company.name, validationStatus: company.validationStatus },
    };
}

export async function loginUser(input: LoginInput) {
    const email = input.email.toLowerCase();

    // 1. access the user
    const user = await UserModel.findOne({ email });

    // 2. check the password (same error if user absent OR password is incorrect)
    const passwordOk = user ? await argon2.verify(user.passwordHash, input.password) : false;
    if (!user || !passwordOk) {
        throw new AppError(401, 'invalid_credentials', 'Invalid credentials.');
    }

    // 3. block if the account is not yet validated
    if (user.status === 'pending') {
        throw new AppError(403, 'account_pending', "Your account is pending validation.");
    }

    // 4. build the token payload
    const payload = {
        sub: user._id.toString(),
        role: user.role,
        companyId: user.companyId?.toString(),
        teamRole: user.teamRole,
    };

    // 5. generate the two tokens
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
        accessToken,
        refreshToken,
        user: { id: user._id, email: user.email, role: user.role },
    };
}

export async function refreshUserSession(refreshToken: string) {
    let payload: TokenPayload;
    try {
        payload = verifyRefreshToken(refreshToken);
    } catch {
        throw new AppError(401, 'invalid_refresh_token', 'Invalid or expired refresh token.');
    }

    const userExists = await UserModel.exists({ _id: payload.sub });
    if (!userExists) {
        throw new AppError(401, 'user_not_found', 'User no longer exists.');
    }

    const accessToken = signAccessToken({
        sub: payload.sub,
        role: payload.role,
        companyId: payload.companyId,
        teamRole: payload.teamRole,
    });

    return { accessToken };
}

export async function logoutUser() {
    return { message: 'Déconnecté' };
}
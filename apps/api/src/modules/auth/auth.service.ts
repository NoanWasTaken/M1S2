import argon2 from 'argon2';
import { CompanyModel } from '../../models/company.js';
import { UserModel } from '../../models/user.js';
import { AppError } from '../../utils/app-error.js';
import { sendConfirmationEmail } from '../../utils/email.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, type TokenPayload } from './jwt.js';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { sendPasswordResetEmail } from '../../utils/email.js';

export async function registerWebmaster(input: RegisterInput) {
    const email = input.user.email.toLowerCase();

    const existing = await UserModel.findOne({ email });
    if (existing) {
        throw new AppError(409, 'email_already_used', 'An account already exists with this email.');
    }

    const passwordHash = await argon2.hash(input.user.password);

    const company = await CompanyModel.create({
        name: input.company.name,
        baseUrl: input.company.baseUrl,
        kbisFileRef: input.company.kbisFileRef,
        contact: input.company.contact,
    });

    const user = await UserModel.create({
        email,
        passwordHash,
        role: 'webmaster',
        status: 'pending',
        companyId: company._id,
        teamRole: 'owner',
    });

    await sendConfirmationEmail(email);

    return {
        user: { id: user._id, email: user.email, role: user.role, status: user.status },
        company: { id: company._id, name: company.name, validationStatus: company.validationStatus },
    };
}

export async function loginUser(input: LoginInput) {
    const email = input.email.toLowerCase();

    const user = await UserModel.findOne({ email });

    const passwordOk = user ? await argon2.verify(user.passwordHash, input.password) : false;
    if (!user || !passwordOk) {
        throw new AppError(401, 'invalid_credentials', 'Invalid credentials.');
    }

    if (user.status === 'pending') {
        throw new AppError(403, 'account_pending', "Your account is pending validation.");
    }

    const payload = {
        sub: user._id.toString(),
        role: user.role,
        companyId: user.companyId?.toString(),
        teamRole: user.teamRole,
    };

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
    return { message: 'Logged out' };
}

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const candidates = await UserModel.find({
        resetTokenHash: { $ne: null },
        resetTokenExpiresAt: { $gt: new Date() },
    });

    let matched = null;
    for (const user of candidates) {
        if (user.resetTokenHash && (await argon2.verify(user.resetTokenHash, rawToken))) {
            matched = user;
            break;
        }
    }

    if (!matched) {
        throw new AppError(400, 'invalid_or_expired_token', 'Invalid or expired token.');
    }

    matched.passwordHash = await argon2.hash(newPassword);
    matched.resetTokenHash = null;
    matched.resetTokenExpiresAt = null;
    await matched.save();
}

export async function requestPasswordReset(email: string, locale: 'fr' | 'en' = 'fr'): Promise<void> {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = await argon2.hash(rawToken);
    user.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const resetUrl = `${env.appWebUrl}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl, locale);
}
import argon2 from 'argon2';
import crypto from 'crypto';
import { CompanyModel } from '../../models/company.js';
import { UserModel } from '../../models/user.js';
import { RefreshTokenModel } from '../../models/refresh-token.js';
import { AppError } from '../../utils/app-error.js';
import { sendAdminNewCompanyEmail, sendConfirmationEmail, sendPasswordResetEmail } from '../../utils/email.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, type TokenPayload } from './jwt.js';
import { env } from '../../config/env.js';
import { pushToAdmins } from '../../realtime/sse-registry.js';

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

    pushToAdmins('company:pending', {
        companyId: company._id,
        companyName: company.name,
        webmasterEmail: email,
        createdAt: new Date().toISOString(),
    });

    const admins = await UserModel.find({ role: 'admin' }).lean();
    for (const admin of admins) {
        await sendAdminNewCompanyEmail(
            admin.email,
            company._id.toString(),
            company.name,
            email,
        );
    }

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

    const jti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshTokenModel.create({ jti, userId: user._id, expiresAt });

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload, { jti });

    return {
        accessToken,
        refreshToken,
        user: { id: user._id, email: user.email, role: user.role, teamRole: user.teamRole },
    };
}

export async function refreshUserSession(refreshToken: string) {
    let payload: TokenPayload;
    try {
        payload = verifyRefreshToken(refreshToken);
    } catch {
        throw new AppError(401, 'invalid_refresh_token', 'Invalid or expired refresh token.');
    }

    if (payload.jti) {
        const tokenDoc = await RefreshTokenModel.findOne({ jti: payload.jti });
        if (!tokenDoc) {
            throw new AppError(401, 'invalid_refresh_token', 'Refresh token has been revoked.');
        }
        await tokenDoc.deleteOne();
    }

    const userExists = await UserModel.exists({ _id: payload.sub });
    if (!userExists) {
        throw new AppError(401, 'user_not_found', 'User no longer exists.');
    }

    const newPayload = {
        sub: payload.sub,
        role: payload.role,
        companyId: payload.companyId,
        teamRole: payload.teamRole,
        impersonatedBy: payload.impersonatedBy,
    };

    const newJti = crypto.randomUUID();
    const ttl = payload.impersonatedBy ? 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttl);
    await RefreshTokenModel.create({
        jti: newJti,
        userId: payload.sub,
        expiresAt,
        impersonatedBy: payload.impersonatedBy ?? null,
    });

    const accessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload, {
        jti: newJti,
        expiresIn: payload.impersonatedBy ? 3600 : undefined,
    });

    return { accessToken, refreshToken: newRefreshToken };
}

export async function logoutUser(refreshToken?: string) {
    if (refreshToken) {
        try {
            const payload = verifyRefreshToken(refreshToken);
            if (payload.jti) {
                await RefreshTokenModel.deleteOne({ jti: payload.jti });
            }
            await RefreshTokenModel.deleteMany({ userId: payload.sub });
        } catch {

        }
    }
    return { message: 'Logged out' };
}

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

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
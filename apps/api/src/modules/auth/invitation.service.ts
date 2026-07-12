import crypto from 'crypto';
import argon2 from 'argon2';
import { UserModel } from '../../models/user.js';
import { CompanyModel } from '../../models/company.js';
import { InvitationModel } from '../../models/invitation.js';
import { AppError } from '../../utils/app-error.js';
import { env } from '../../config/env.js';
import { sendVerifyEmailEmail } from '../../utils/email.js';

async function findInvitationByToken(rawToken: string) {
    const candidates = await InvitationModel.find({
        status: 'pending',
        expiresAt: { $gt: new Date() },
    });

    for (const invitation of candidates) {
        if (await argon2.verify(invitation.tokenHash, rawToken)) {
            return invitation;
        }
    }
    return null;
}

export async function getInvitationDetails(rawToken: string) {
    const invitation = await findInvitationByToken(rawToken);
    if (!invitation) {
        throw new AppError(400, 'invalid_invitation', 'This invitation is invalid or has expired.');
    }

    const company = await CompanyModel.findById(invitation.companyId).select('name').lean();

    return {
        email: invitation.email,
        companyName: company?.name ?? '',
    };
}

export async function acceptInvitation(rawToken: string, password: string) {
    const invitation = await findInvitationByToken(rawToken);
    if (!invitation) {
        throw new AppError(400, 'invalid_invitation', 'This invitation is invalid or has expired.');
    }

    const existing = await UserModel.findOne({ email: invitation.email });
    if (existing) {
        throw new AppError(409, 'email_already_used', 'An account already exists with this email.');
    }

    const passwordHash = await argon2.hash(password);

    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = await argon2.hash(rawVerifyToken);

    const user = await UserModel.create({
        email: invitation.email,
        passwordHash,
        role: 'webmaster',
        teamRole: 'member',
        status: 'pending',
        companyId: invitation.companyId,
        verifyTokenHash,
        verifyTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await invitation.save();

    const url = `${env.appWebUrl}/verify-email?token=${rawVerifyToken}`;
    await sendVerifyEmailEmail(user.email, url);

    return { id: user._id, email: user.email };
}

export async function verifyEmail(rawToken: string) {
    const candidates = await UserModel.find({
        verifyTokenHash: { $ne: null },
        verifyTokenExpiresAt: { $gt: new Date() },
    });

    let matched = null;
    for (const user of candidates) {
        if (user.verifyTokenHash && (await argon2.verify(user.verifyTokenHash, rawToken))) {
            matched = user;
            break;
        }
    }

    if (!matched) {
        throw new AppError(400, 'invalid_or_expired_token', 'This link is invalid or has expired.');
    }

    matched.status = 'active';
    matched.verifyTokenHash = null;
    matched.verifyTokenExpiresAt = null;
    await matched.save();

    return { verified: true, email: matched.email };
}
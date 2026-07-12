import crypto from 'crypto';
import argon2 from 'argon2';
import { UserModel } from '../../models/user.js';
import { CompanyModel } from '../../models/company.js';
import { InvitationModel } from '../../models/invitation.js';
import { AppError } from '../../utils/app-error.js';
import { env } from '../../config/env.js';
import { sendInvitationEmail } from '../../utils/email.js';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Requester = {
    userId: string;
    companyId?: string;
    teamRole?: 'owner' | 'member' | null;
};

// Owner-only team mgmt
function ensureOwner(requester: Requester) {
    if (!requester.companyId || requester.teamRole !== 'owner') {
        throw new AppError(403, 'forbidden', 'Only the owner of the company can manage the team.');
    }
}

export async function listMembers(requester: Requester) {
    if (!requester.companyId) {
        throw new AppError(400, 'company_required', 'No company associated.');
    }

    return UserModel.find({ companyId: requester.companyId })
        .select('email role teamRole status createdAt')
        .lean();
}

// Hashed token invite
export async function inviteMember(requester: Requester, email: string) {
    ensureOwner(requester);

    const normalizedEmail = email.toLowerCase();

    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing?.companyId) {
        if (existing.companyId.toString() === requester.companyId) {
            throw new AppError(409, 'already_member', 'This person is already in your company.');
        }
        throw new AppError(409, 'already_in_company', 'This user already belongs to another company.');
    }

    // Reinvite revokes pending
    await InvitationModel.updateMany(
        { email: normalizedEmail, companyId: requester.companyId, status: 'pending' },
        { status: 'revoked' },
    );

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await argon2.hash(rawToken);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    const invitation = await InvitationModel.create({
        email: normalizedEmail,
        companyId: requester.companyId,
        invitedBy: requester.userId,
        tokenHash,
        expiresAt,
        status: 'pending',
    });

    const company = await CompanyModel.findById(requester.companyId).select('name').lean();
    const url = `${env.appWebUrl}/accept-invitation?token=${rawToken}`;
    await sendInvitationEmail(normalizedEmail, url, company?.name ?? '');

    return {
        _id: invitation._id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
    };
}

export async function listInvitations(requester: Requester) {
    ensureOwner(requester);

    if (!requester.companyId) {
        throw new AppError(400, 'company_required', 'No company associated.');
    }

    return InvitationModel.find({
        companyId: requester.companyId,
        status: 'pending',
        expiresAt: { $gt: new Date() },
    })
        .select('email status expiresAt createdAt')
        .lean();
}

export async function revokeInvitation(requester: Requester, invitationId: string) {
    ensureOwner(requester);

    const invitation = await InvitationModel.findOne({
        _id: invitationId,
        companyId: requester.companyId,
        status: 'pending',
    });

    if (!invitation) {
        throw new AppError(404, 'invitation_not_found', 'Invitation not found.');
    }

    invitation.status = 'revoked';
    await invitation.save();

    return { revoked: true };
}

export async function removeMember(requester: Requester, memberId: string) {
    ensureOwner(requester);

    const user = await UserModel.findById(memberId);
    if (!user || user.companyId?.toString() !== requester.companyId) {
        throw new AppError(404, 'member_not_found', 'Member not found in your company.');
    }

    if (user._id.toString() === requester.userId) {
        throw new AppError(400, 'cannot_remove_self', 'The owner cannot remove itself.');
    }

    user.companyId = null as unknown as typeof user.companyId;
    user.teamRole = null as unknown as typeof user.teamRole;
    await user.save();

    return { removed: true };
}

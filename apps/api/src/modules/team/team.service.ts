import { UserModel } from '../../models/user.js';
import { AppError } from '../../utils/app-error.js';

type Requester = {
    userId: string;
    companyId?: string;
    teamRole?: 'owner' | 'member' | null;
};

// Check if the requester is the owner of the company
function ensureOwner(requester: Requester) {
    if (!requester.companyId || requester.teamRole !== 'owner') {
        throw new AppError(403, 'forbidden', "Only the owner of the company can manage the team.");
    }
}

// List the members of the company of the requester
export async function listMembers(requester: Requester) {
    if (!requester.companyId) {
        throw new AppError(400, 'company_required', 'No company associated.');
    }

    return UserModel.find({ companyId: requester.companyId })
        .select('email role teamRole status createdAt');
}

// Add a member to the company
export async function addMember(requester: Requester, email: string) {
    ensureOwner(requester);

    const normalizedEmail = email.toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail });

    // The colleague must already have an account
    if (!user) {
        throw new AppError(404, 'user_not_found', "No account exists with this email. The colleague must first register.");
    }

    // It must not already belong to another company
    if (user.companyId && user.companyId.toString() !== requester.companyId) {
        throw new AppError(409, 'already_in_company', 'This user already belongs to another company.');
    }
    user.companyId = requester.companyId as unknown as typeof user.companyId;
    user.teamRole = 'member';
    user.status = 'active';
    await user.save();

    return { id: user._id, email: user.email, teamRole: user.teamRole };
}

// Remove a member company
export async function removeMember(requester: Requester, memberId: string) {
    ensureOwner(requester);

    const user = await UserModel.findById(memberId);
    if (!user || user.companyId?.toString() !== requester.companyId) {
        throw new AppError(404, 'member_not_found', 'Member not found in your company.');
    }

    // cannot remove itself
    if (user._id.toString() === requester.userId) {
        throw new AppError(400, 'cannot_remove_self', 'The owner cannot remove itself.');
    }

    // Detach the user company
    user.companyId = null as unknown as typeof user.companyId;
    user.teamRole = null as unknown as typeof user.teamRole;
    await user.save();

    return { removed: true };
}
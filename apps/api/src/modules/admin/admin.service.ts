import { CompanyModel } from '../../models/company.js';
import { UserModel } from '../../models/user.js';
import { ApplicationModel } from '../../models/application.js';
import { AppError } from '../../utils/app-error.js';
import { signAccessToken, signRefreshToken } from '../auth/jwt.js';
import { sendCompanyValidatedEmail, sendCompanyRejectedEmail } from '../../utils/email.js';
import { pushToAdmins, pushToAccount } from '../../realtime/sse-registry.js';

export async function listCompanies() {
    return CompanyModel.find().sort({ createdAt: -1 }).lean();
}

export async function listUsers() {
    const users = await UserModel.find()
        .select('email role teamRole status companyId createdAt')
        .sort({ createdAt: -1 })
        .populate('companyId', 'name validationStatus')
        .lean();

    return users.map((u) => {
        const company = u.companyId as unknown as { _id?: unknown; name?: string; validationStatus?: string } | null;
        return {
            ...u,
            companyId: company?._id ?? null,
            companyName: company?.name ?? null,
            companyStatus: company?.validationStatus ?? null,
        };
    });
}

export async function countPendingCompanies() {
    return CompanyModel.countDocuments({ validationStatus: 'pending' });
}

export async function validateCompany(companyId: string, adminId: string) {
    const company = await CompanyModel.findById(companyId);
    if (!company) {
        throw new AppError(404, 'company_not_found', 'Company not found.');
    }

    company.validationStatus = 'validated';
    company.validatedBy = adminId as unknown as typeof company.validatedBy;
    await company.save();

    await UserModel.updateMany(
        { companyId: company._id, role: 'webmaster' },
        { status: 'active' },
    );

    const owner = await UserModel.findOne({ companyId: company._id, teamRole: 'owner' }).lean();
    if (owner) {
        pushToAccount(company._id.toString(), 'company:validated', {
            companyId: company._id,
            name: company.name,
        });
        await sendCompanyValidatedEmail(owner.email, company.name);
    }

    pushToAdmins('company:pending-count', { pending: await countPendingCompanies() });

    return company;
}

export async function rejectCompany(companyId: string) {
    const company = await CompanyModel.findById(companyId);
    if (!company) {
        throw new AppError(404, 'company_not_found', 'Company not found.');
    }

    company.validationStatus = 'rejected';
    await company.save();

    const owner = await UserModel.findOne({ companyId: company._id, teamRole: 'owner' }).lean();
    if (owner) {
        await sendCompanyRejectedEmail(owner.email, company.name);
    }

    pushToAdmins('company:pending-count', { pending: await countPendingCompanies() });

    return company;
}

export async function activateUser(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new AppError(404, 'user_not_found', 'User not found.');
    }
    if (user.role === 'admin') {
        throw new AppError(403, 'cannot_activate_admin', 'Cannot activate an admin user.');
    }
    if (user.status === 'active') {
        return { activated: true };
    }
    user.status = 'active';
    await user.save();
    return { activated: true };
}

export async function deleteUser(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new AppError(404, 'user_not_found', 'User not found.');
    }
    if (user.role === 'admin') {
        throw new AppError(403, 'cannot_delete_admin', 'Cannot delete an admin user.');
    }
    user.companyId = null;
    user.teamRole = null;
    user.status = 'suspended';
    await user.save();
    return { deleted: true };
}

export async function permanentlyDeleteUser(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw new AppError(404, 'user_not_found', 'User not found.');
    }
    if (user.role === 'admin') {
        throw new AppError(403, 'cannot_delete_admin', 'Cannot delete an admin user.');
    }
    if (user.status !== 'suspended') {
        throw new AppError(400, 'user_not_suspended', 'User must be suspended first before permanent deletion.');
    }
    await user.deleteOne();
    return { deleted: true };
}

export async function deleteCompany(companyId: string) {
    const company = await CompanyModel.findById(companyId);
    if (!company) {
        throw new AppError(404, 'company_not_found', 'Company not found.');
    }

    await Promise.all([
        ApplicationModel.deleteMany({ companyId: company._id }),
        UserModel.updateMany(
            { companyId: company._id },
            { companyId: null, teamRole: null, status: 'suspended' },
        ),
    ]);

    await company.deleteOne();

    pushToAdmins('company:pending-count', { pending: await countPendingCompanies() });

    return { deleted: true };
}

export async function impersonateWebmaster(webmasterId: string, adminId: string) {
    const webmaster = await UserModel.findById(webmasterId);
    if (!webmaster || webmaster.role !== 'webmaster') {
        throw new AppError(404, 'webmaster_not_found', 'Webmaster not found.');
    }

    const payload = {
        sub: webmaster._id.toString(),
        role: 'webmaster' as const,
        companyId: webmaster.companyId?.toString(),
        teamRole: webmaster.teamRole,
        impersonatedBy: adminId,
    };

    return {
        accessToken: signAccessToken(payload),
        refreshToken: signRefreshToken(payload),
        impersonating: {
            id: webmaster._id,
            email: webmaster.email,
            teamRole: webmaster.teamRole,
        },
    };
}

export async function getCompanyDetail(companyId: string) {
    const company = await CompanyModel.findById(companyId).lean();
    if (!company) {
        throw new AppError(404, 'company_not_found', 'Company not found.');
    }

    const [users, applications] = await Promise.all([
        UserModel.find({ companyId }).select('email teamRole status createdAt').lean(),
        ApplicationModel.find({ companyId }).select('name appId createdAt').lean(),
    ]);

    return { company, users, applications };
}
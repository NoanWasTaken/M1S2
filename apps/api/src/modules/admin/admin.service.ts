import { CompanyModel } from '../../models/company.js';
import { UserModel } from '../../models/user.js';
import { AppError } from '../../utils/app-error.js';
import { signAccessToken } from '../auth/jwt.js';

// List all companies
export async function listCompanies() {
    return CompanyModel.find().sort({ createdAt: -1 });
}

// Validate a company + activate its webmaster
export async function validateCompany(companyId: string, adminId: string) {
    const company = await CompanyModel.findById(companyId);
    if (!company) {
        throw new AppError(404, 'company_not_found', 'Company not found.');
    }

    company.validationStatus = 'validated';
    company.validatedBy = adminId as unknown as typeof company.validatedBy;
    await company.save();

    // Activate the webmaster(s) attached to this company
    await UserModel.updateMany(
        { companyId: company._id, role: 'webmaster' },
        { status: 'active' },
    );

    return company;
}

// Reject a company
export async function rejectCompany(companyId: string) {
    const company = await CompanyModel.findById(companyId);
    if (!company) {
        throw new AppError(404, 'company_not_found', 'Company not found.');
    }

    company.validationStatus = 'rejected';
    await company.save();

    return company;
}

// Impersonate a webmaster
export async function impersonateWebmaster(webmasterId: string, adminId: string) {
    const webmaster = await UserModel.findById(webmasterId);
    if (!webmaster || webmaster.role !== 'webmaster') {
        throw new AppError(404, 'webmaster_not_found', 'Webmaster not found.');
    }

    // An access token that identifies the admin as this webmaster
    const accessToken = signAccessToken({
        sub: webmaster._id.toString(),
        role: 'webmaster',
        companyId: webmaster.companyId?.toString(),
        impersonatedBy: adminId,
    });

    return {
        accessToken,
        impersonating: { id: webmaster._id, email: webmaster.email },
    };
}
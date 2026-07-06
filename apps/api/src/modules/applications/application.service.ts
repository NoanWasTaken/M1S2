import { ApplicationModel } from '../../models/application.js';
import { AppError } from '../../utils/app-error.js';
import { generateAppId } from '../../utils/generate-id.js';

type Creator = {
    userId: string;
    role: 'admin' | 'webmaster';
    companyId?: string;
};

export async function createApplication(
    creator: Creator,
    name: string,
    companyIdFromBody?: string,
) {
    // Determine the targeted company
    let companyId: string | undefined;

    if (creator.role === 'webmaster') {
        // The webmaster always creates for their own company
        companyId = creator.companyId;
    } else {
        // The admin must specify the targeted company
        companyId = companyIdFromBody;
    }

    if (!companyId) {
        throw new AppError(400, 'company_required', "The targeted company is required.");
    }

    const application = await ApplicationModel.create({
        name,
        appId: generateAppId(),
        companyId,
        createdBy: creator.userId,
    });

    return application;
}

export async function listApplications(creator: Creator, companyIdFromQuery?: string) {
    // The webmaster only sees applications for their own company
    // The admin can target a company via a parameter
    const companyId = creator.role === 'webmaster' ? creator.companyId : companyIdFromQuery;

    if (!companyId) {
        throw new AppError(400, 'company_required', "The targeted company is required.");
    }

    return ApplicationModel.find({ companyId }).sort({ createdAt: -1 });
}
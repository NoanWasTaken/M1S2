import { ApplicationModel } from '../../models/application.js';
import { AppError } from '../../utils/app-error.js';
import { generateAppId } from '../../utils/generate-id.js';
import { generateAppSecret, hashAppSecret } from '../../utils/app-secret.js';

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
    let companyId: string | undefined;

    if (creator.role === 'webmaster') {
        companyId = creator.companyId;
    } else {
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
    // Role-scoped company listing
    const companyId = creator.role === 'webmaster' ? creator.companyId : companyIdFromQuery;

    if (!companyId) {
        throw new AppError(400, 'company_required', "The targeted company is required.");
    }

    return ApplicationModel.find({ companyId }).sort({ createdAt: -1 });
}

async function getOwnedApplication(applicationId: string, creator: Creator) {
    const application = await ApplicationModel.findById(applicationId);
    if (!application) {
        throw new AppError(404, 'application_not_found', 'Application not found.');
    }

    // Webmaster ownership check
    if (creator.role === 'webmaster' && application.companyId.toString() !== creator.companyId) {
        throw new AppError(403, 'forbidden', "This application does not belong to your company.");
    }

    return application;
}

export async function generateApplicationSecret(applicationId: string, creator: Creator) {
    const application = await getOwnedApplication(applicationId, creator);

    const secret = generateAppSecret();
    application.appSecretHash = await hashAppSecret(secret);
    application.appSecretPrefix = secret.slice(0, 11);
    application.appSecretGeneratedAt = new Date();
    await application.save();

    return { secret, prefix: application.appSecretPrefix };
}

export async function deleteApplicationSecret(applicationId: string, creator: Creator) {
    const application = await getOwnedApplication(applicationId, creator);

    application.appSecretHash = null;
    application.appSecretPrefix = null;
    application.appSecretGeneratedAt = null;
    await application.save();

    return { deleted: true };
}

export async function deleteApplication(applicationId: string, creator: Creator) {
    const application = await getOwnedApplication(applicationId, creator);
    await application.deleteOne();
    return { deleted: true };
}

export async function updateAllowedOrigins(
    applicationId: string,
    creator: Creator,
    origins: string[],
) {
    const application = await getOwnedApplication(applicationId, creator);

    application.allowedOrigins = origins;
    await application.save();

    return application;
}

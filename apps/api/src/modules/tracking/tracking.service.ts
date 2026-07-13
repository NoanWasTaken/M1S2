import { ApplicationModel } from '../../models/application.js';
import { ConversionFunnelModel } from '../../models/conversion-funnel.js';
import { TrackingTagModel } from '../../models/tracking-tag.js';
import { AppError } from '../../utils/app-error.js';
import { generateTrackingId } from '../../utils/generate-tracking-id.js';

type Actor = {
    userId: string;
    role: 'admin' | 'webmaster';
    companyId?: string;
};

async function resolveApplication(applicationId: string, actor: Actor) {
    const application = await ApplicationModel.findById(applicationId);

    if (!application) {
        throw new AppError(404, 'application_not_found', 'Application not found.');
    }

    if (actor.role === 'webmaster' && application.companyId.toString() !== actor.companyId) {
        throw new AppError(403, 'forbidden', 'This application does not belong to your company.');
    }

    return application;
}

async function resolveTag(tagId: string, actor: Actor) {
    const tag = await TrackingTagModel.findOne({ tagId, deletedAt: null });

    if (!tag) {
        throw new AppError(404, 'tag_not_found', 'Tag not found.');
    }

    const application = await resolveApplication(tag.applicationId.toString(), actor);
    return { tag, application };
}

async function resolveFunnel(funnelId: string, actor: Actor) {
    const funnel = await ConversionFunnelModel.findOne({ funnelId, deletedAt: null });

    if (!funnel) {
        throw new AppError(404, 'funnel_not_found', 'Funnel not found.');
    }

    const application = await resolveApplication(funnel.applicationId.toString(), actor);
    return { funnel, application };
}

export async function listTrackingTags(applicationId: string, actor: Actor) {
    const application = await resolveApplication(applicationId, actor);

    return TrackingTagModel.find({ applicationId: application._id, deletedAt: null }).sort({ createdAt: -1 });
}

export async function createTrackingTag(applicationId: string, actor: Actor, comment: string) {
    const application = await resolveApplication(applicationId, actor);

    return TrackingTagModel.create({
        tagId: generateTrackingId('tag'),
        applicationId: application._id,
        appId: application.appId,
        companyId: application.companyId,
        comment,
        createdBy: actor.userId,
    });
}

export async function updateTrackingTagComment(tagId: string, actor: Actor, comment: string) {
    const { tag } = await resolveTag(tagId, actor);

    tag.comment = comment;
    tag.updatedBy = actor.userId as unknown as typeof tag.updatedBy;
    await tag.save();

    return tag;
}

export async function deleteTrackingTag(tagId: string, actor: Actor) {
    const { tag } = await resolveTag(tagId, actor);

    tag.deletedAt = new Date();
    tag.updatedBy = actor.userId as unknown as typeof tag.updatedBy;
    await tag.save();

    return { deleted: true };
}

export async function listConversionFunnels(applicationId: string, actor: Actor) {
    const application = await resolveApplication(applicationId, actor);

    return ConversionFunnelModel.find({ applicationId: application._id, deletedAt: null }).sort({ createdAt: -1 });
}

export async function createConversionFunnel(
    applicationId: string,
    actor: Actor,
    comment: string,
    tagIds: string[],
) {
    const application = await resolveApplication(applicationId, actor);

    const tags = await TrackingTagModel.find({
        applicationId: application._id,
        tagId: { $in: tagIds },
        deletedAt: null,
    });

    if (tags.length !== tagIds.length) {
        throw new AppError(400, 'invalid_tag_ids', 'One or more tags are invalid for this application.');
    }

    const steps = tagIds.map((tagId, index) => ({ tagId, position: index + 1 }));

    return ConversionFunnelModel.create({
        funnelId: generateTrackingId('funnel'),
        applicationId: application._id,
        appId: application.appId,
        companyId: application.companyId,
        steps,
        comment,
        createdBy: actor.userId,
    });
}

export async function updateConversionFunnelComment(funnelId: string, actor: Actor, comment: string) {
    const { funnel } = await resolveFunnel(funnelId, actor);

    funnel.comment = comment;
    funnel.updatedBy = actor.userId as unknown as typeof funnel.updatedBy;
    await funnel.save();

    return funnel;
}

export async function deleteConversionFunnel(funnelId: string, actor: Actor) {
    const { funnel } = await resolveFunnel(funnelId, actor);

    funnel.deletedAt = new Date();
    funnel.updatedBy = actor.userId as unknown as typeof funnel.updatedBy;
    await funnel.save();

    return { deleted: true };
}
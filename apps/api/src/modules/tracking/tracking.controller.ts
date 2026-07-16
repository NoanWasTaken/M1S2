import { Request, Response } from 'express';
import { AppError } from '../../utils/app-error.js';
import { assertValidObjectId } from '../../utils/validate-id.js';
import {
    createConversionFunnel,
    createTrackingTag,
    deleteConversionFunnel,
    deleteTrackingTag,
    listConversionFunnels,
    listTrackingTags,
    updateConversionFunnelComment,
    updateTrackingTagComment,
} from './tracking.service.js';
import {
    createConversionFunnelSchema,
    createTrackingTagSchema,
    updateConversionFunnelCommentSchema,
    updateTrackingTagCommentSchema,
} from './tracking.schema.js';

function getActor(req: Request) {
    return {
        userId: req.user!.sub,
        role: req.user!.role,
        companyId: req.user!.companyId,
    };
}

export async function getTags(req: Request, res: Response) {
    assertValidObjectId(req.params.applicationId, 'applicationId');
    const applicationId = req.params.applicationId as string;
    const tags = await listTrackingTags(applicationId, getActor(req));
    res.json({ tags });
}

export async function postTag(req: Request, res: Response) {
    assertValidObjectId(req.params.applicationId, 'applicationId');
    const applicationId = req.params.applicationId as string;
    const result = createTrackingTagSchema.safeParse(req.body);

    if (!result.success) {
        throw new AppError(400, 'invalid_input', 'Invalid data.');
    }

    const tag = await createTrackingTag(applicationId, getActor(req), result.data.comment);
    res.status(201).json({ tag });
}

export async function patchTagComment(req: Request, res: Response) {
    const result = updateTrackingTagCommentSchema.safeParse(req.body);

    if (!result.success) {
        throw new AppError(400, 'invalid_input', 'Invalid data.');
    }

    const tag = await updateTrackingTagComment(req.params.tagId as string, getActor(req), result.data.comment);
    res.json({ tag });
}

export async function deleteTag(req: Request, res: Response) {
    const result = await deleteTrackingTag(req.params.tagId as string, getActor(req));
    res.json(result);
}

export async function getFunnels(req: Request, res: Response) {
    assertValidObjectId(req.params.applicationId, 'applicationId');
    const applicationId = req.params.applicationId as string;
    const funnels = await listConversionFunnels(applicationId, getActor(req));
    res.json({ funnels });
}

export async function postFunnel(req: Request, res: Response) {
    assertValidObjectId(req.params.applicationId, 'applicationId');
    const applicationId = req.params.applicationId as string;
    const result = createConversionFunnelSchema.safeParse(req.body);

    if (!result.success) {
        throw new AppError(400, 'invalid_input', 'Invalid data.');
    }

    const funnel = await createConversionFunnel(
        applicationId,
        getActor(req),
        result.data.comment,
        result.data.tagIds,
    );
    res.status(201).json({ funnel });
}

export async function patchFunnelComment(req: Request, res: Response) {
    const result = updateConversionFunnelCommentSchema.safeParse(req.body);

    if (!result.success) {
        throw new AppError(400, 'invalid_input', 'Invalid data.');
    }

    const funnel = await updateConversionFunnelComment(
        req.params.funnelId as string,
        getActor(req),
        result.data.comment,
    );
    res.json({ funnel });
}

export async function deleteFunnel(req: Request, res: Response) {
    const result = await deleteConversionFunnel(req.params.funnelId as string, getActor(req));
    res.json(result);
}
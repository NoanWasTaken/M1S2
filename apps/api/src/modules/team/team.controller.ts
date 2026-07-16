import { Request, Response } from 'express';
import { AppError } from '../../utils/app-error.js';
import { assertValidObjectId } from '../../utils/validate-id.js';
import { addMemberSchema } from './team.schema.js';
import {
    listMembers,
    inviteMember,
    listInvitations,
    revokeInvitation,
    removeMember,
} from './team.service.js';

function getRequester(req: Request) {
    return {
        userId: req.user!.sub,
        companyId: req.user!.companyId,
        teamRole: req.user!.teamRole,
    };
}

export async function getMembers(req: Request, res: Response) {
    const members = await listMembers(getRequester(req));
    res.json({ members });
}

export async function postInvitation(req: Request, res: Response) {
    const result = addMemberSchema.safeParse(req.body);
    if (!result.success) {
        throw new AppError(400, 'invalid_input', 'Invalid input.');
    }
    const invitation = await inviteMember(getRequester(req), result.data.email);
    res.status(201).json({ invitation });
}

export async function getInvitations(req: Request, res: Response) {
    const invitations = await listInvitations(getRequester(req));
    res.json({ invitations });
}

export async function deleteInvitation(req: Request, res: Response) {
    assertValidObjectId(req.params.id);
    const result = await revokeInvitation(getRequester(req), req.params.id as string);
    res.json(result);
}

export async function deleteMember(req: Request, res: Response) {
    assertValidObjectId(req.params.id);
    const result = await removeMember(getRequester(req), req.params.id as string);
    res.json(result);
}
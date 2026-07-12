import { Request, Response } from 'express';
import { addMemberSchema } from './team.schema.js';
import {
    listMembers,
    inviteMember,
    listInvitations,
    revokeInvitation,
    removeMember,
} from './team.service.js';
import { AppError } from '../../utils/app-error.js';

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
        throw new AppError(400, 'invalid_input', result.error.issues[0]?.message ?? 'Invalid input.');
    }
    const invitation = await inviteMember(getRequester(req), result.data.email);
    res.status(201).json({ invitation });
}

export async function getInvitations(req: Request, res: Response) {
    const invitations = await listInvitations(getRequester(req));
    res.json({ invitations });
}

export async function deleteInvitation(req: Request, res: Response) {
    const result = await revokeInvitation(getRequester(req), req.params.id as string);
    res.json(result);
}

export async function deleteMember(req: Request, res: Response) {
    const result = await removeMember(getRequester(req), req.params.id as string);
    res.json(result);
}
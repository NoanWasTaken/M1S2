import { Request, Response } from 'express';
import { addMemberSchema } from './team.schema.js';
import { listMembers, addMember, removeMember } from './team.service.js';
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

export async function postMember(req: Request, res: Response) {
    const result = addMemberSchema.safeParse(req.body);
    if (!result.success) {
        throw new AppError(400, 'invalid_input', result.error.issues[0]?.message ?? 'Invalid input.');
    }
    const member = await addMember(getRequester(req), result.data.email);
    res.status(201).json({ member });
}

export async function deleteMember(req: Request, res: Response) {
    const result = await removeMember(getRequester(req), req.params.id as string);
    res.json(result);
}
import { Request, Response } from 'express';
import { listCompanies, validateCompany, rejectCompany, impersonateWebmaster } from './admin.service.js';

export async function getCompanies(_req: Request, res: Response) {
    const companies = await listCompanies();
    res.json({ companies });
}

export async function postValidateCompany(req: Request, res: Response) {
    const company = await validateCompany(req.params.id, req.user!.sub);
    res.json({ company });
}

export async function postRejectCompany(req: Request, res: Response) {
    const company = await rejectCompany(req.params.id);
    res.json({ company });
}

export async function postImpersonate(req: Request, res: Response) {
    const result = await impersonateWebmaster(req.params.id, req.user!.sub);
    res.json(result);
}
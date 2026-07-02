import { Request, Response } from 'express';
import { listCompanies, validateCompany, rejectCompany, impersonateWebmaster } from './admin.service.js';

export async function getCompanies(_req: Request, res: Response) {
    const companies = await listCompanies();
    res.json({ companies });
}

export async function postValidateCompany(req: Request, res: Response) {
    const companyId = req.params.id as string;
    const company = await validateCompany(companyId, req.user!.sub);
    res.json({ company });
}

export async function postRejectCompany(req: Request, res: Response) {
    const companyId = req.params.id as string;
    const company = await rejectCompany(companyId);
    res.json({ company });
}

export async function postImpersonate(req: Request, res: Response) {
    const webmasterId = req.params.id as string;
    const result = await impersonateWebmaster(webmasterId, req.user!.sub);
    res.json(result);
}
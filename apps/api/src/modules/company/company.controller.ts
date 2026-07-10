import { Request, Response } from 'express';
import { getCompanyById } from './company.service.js';
import { AppError } from '../../utils/app-error.js';

export async function getMyCompany(req: Request, res: Response) {
    const companyId = req.user!.companyId;
    if (!companyId) {
        throw new AppError(400, 'no_company', 'No company attached to this account.');
    }
    const company = await getCompanyById(companyId);
    res.json({ company });
}
import { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/app-error.js';
import { verifyRefreshToken, signAccessToken } from '../auth/jwt.js';
import {
    listCompanies,
    listUsers,
    countPendingCompanies,
    validateCompany,
    rejectCompany,
    activateUser,
    deleteUser,
    permanentlyDeleteUser,
    deleteCompany,
    impersonateWebmaster,
    getCompanyDetail,
} from './admin.service.js';
import { getPlatformStats } from './stats.service.js';

const isProd = env.nodeEnv === 'production';

function cookieOptions() {
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        ...(isProd && env.cookieDomain ? { domain: env.cookieDomain } : {}),
    };
}

export async function getCompanies(_req: Request, res: Response) {
    const companies = await listCompanies();
    res.json({ companies });
}

export async function getStats(_req: Request, res: Response) {
    res.json(await getPlatformStats());
}

export async function getCompany(req: Request, res: Response) {
    const detail = await getCompanyDetail(req.params.id as string);
    res.json(detail);
}

export async function getUsers(_req: Request, res: Response) {
    const users = await listUsers();
    res.json({ users });
}

export async function getPendingCount(_req: Request, res: Response) {
    const pending = await countPendingCompanies();
    res.json({ pending });
}

export async function postValidateCompany(req: Request, res: Response) {
    const company = await validateCompany(req.params.id as string, req.user!.sub);
    res.json({ company });
}

export async function postRejectCompany(req: Request, res: Response) {
    const company = await rejectCompany(req.params.id as string);
    res.json({ company });
}

export async function activateUserController(req: Request, res: Response) {
    res.json(await activateUser(req.params.id as string));
}

export async function deleteUserController(req: Request, res: Response) {
    res.json(await deleteUser(req.params.id as string));
}

export async function permanentlyDeleteUserController(req: Request, res: Response) {
    res.json(await permanentlyDeleteUser(req.params.id as string));
}

export async function deleteCompanyController(req: Request, res: Response) {
    res.json(await deleteCompany(req.params.id as string));
}

export async function postImpersonate(req: Request, res: Response) {
    const adminRefreshToken = req.cookies?.refreshToken;
    if (!adminRefreshToken) {
        throw new AppError(401, 'no_refresh_token', 'No admin session found.');
    }

    const { accessToken, refreshToken, impersonating } = await impersonateWebmaster(
        req.params.id as string,
        req.user!.sub,
    );

    res.cookie('adminRefreshToken', adminRefreshToken, cookieOptions());
    res.cookie('refreshToken', refreshToken, cookieOptions());

    res.json({ accessToken, impersonating });
}

export async function postStopImpersonate(req: Request, res: Response) {
    const adminRefreshToken = req.cookies?.adminRefreshToken;
    if (!adminRefreshToken) {
        throw new AppError(400, 'not_impersonating', 'No impersonation in progress.');
    }

    let payload;
    try {
        payload = verifyRefreshToken(adminRefreshToken);
    } catch {
        throw new AppError(401, 'invalid_refresh_token', 'Admin session expired. Please log in again.');
    }

    const accessToken = signAccessToken({
        sub: payload.sub,
        role: payload.role,
        companyId: payload.companyId,
        teamRole: payload.teamRole,
    });

    res.cookie('refreshToken', adminRefreshToken, cookieOptions());
    res.clearCookie('adminRefreshToken', cookieOptions());

    res.json({ accessToken });
}
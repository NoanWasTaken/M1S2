import 'express';

declare global {
    namespace Express {
        interface Request {
            user?: {
                sub: string;
                role: 'admin' | 'webmaster';
                companyId?: string;
                teamRole?: 'owner' | 'member' | null;
                impersonatedBy?: string;
            };
            application?: {
                id: string;
                appId: string;
            };
        }
    }
}
import 'express';

// Extend the Express Request interface to include the user object
declare global {
    namespace Express {
        interface Request {
            user?: {
                sub: string;
                role: 'admin' | 'webmaster';
                companyId?: string;
                teamRole?: 'owner' | 'member' | null;
                impersonatedBy?: string; // admin id
            };
            application?: {
                id: string;
                appId: string;
            };
        }
    }
}
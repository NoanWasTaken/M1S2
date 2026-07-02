import 'express';

// Extend the Express Request interface to include the user object
declare global {
    namespace Express {
        interface Request {
            user?: {
                sub: string;
                role: 'admin' | 'webmaster';
                companyId?: string;
                impersonatedBy?: string; // admin id
            };
        }
    }
}
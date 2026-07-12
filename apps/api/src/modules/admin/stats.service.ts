import { CompanyModel } from '../../models/company.js';
import { UserModel } from '../../models/user.js';
import { ApplicationModel } from '../../models/application.js';
import { EventModel } from '../../models/event.js';
import { countOnlineUsers, countConnections } from '../../realtime/presence.js';

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export async function getPlatformStats() {
    const since = new Date(Date.now() - ACTIVE_WINDOW_MS);

    const [
        companies,
        validatedCompanies,
        pendingCompanies,
        applications,
        users,
        activeSessions,
        eventsLastHour,
    ] = await Promise.all([
        CompanyModel.countDocuments(),
        CompanyModel.countDocuments({ validationStatus: 'validated' }),
        CompanyModel.countDocuments({ validationStatus: 'pending' }),
        ApplicationModel.countDocuments(),
        UserModel.countDocuments({ role: 'webmaster' }),
        EventModel.distinct('sessionId', {
            sessionId: { $ne: null },
            occurredAt: { $gte: since },
        }),
        EventModel.countDocuments({ occurredAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } }),
    ]);

    return {
        companies,
        validatedCompanies,
        pendingCompanies,
        applications,
        users,
        onlineUsers: countOnlineUsers(),
        connections: countConnections(),
        activeVisitors: activeSessions.length,
        eventsLastHour,
    };
}
import { AlertThresholdModel } from '../models/alert-threshold.js';
import { pushToAccount } from './sse-registry.js';


export async function checkAudiencePeak(
    appId: string,
    companyId: string,
    activeVisitors: number,
): Promise<void> {
    const threshold = await AlertThresholdModel.findOne({ appId, companyId, enabled: true });
    if (!threshold) return;

    if (activeVisitors < threshold.threshold) return;

    const now = Date.now();
    const lastFired = threshold.lastFiredAt ? threshold.lastFiredAt.getTime() : 0;
    if (now - lastFired < threshold.cooldownMs) return;

    threshold.lastFiredAt = new Date(now);
    await threshold.save();

    pushToAccount(companyId, 'alert:audience-peak', {
        accountId: companyId,
        appId,
        currentVisitors: activeVisitors,
        threshold: threshold.threshold,
        triggeredAt: new Date(now).toISOString(),
    });
}

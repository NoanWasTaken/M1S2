import type { Request } from 'express';

const NON_COUNTRY_CODES = new Set(['XX', 'T1', 'A1', 'A2', 'O1']);

function isValidIsoCode(code: string | undefined | null): code is string {
    return !!code && /^[A-Z]{2}$/.test(code) && !NON_COUNTRY_CODES.has(code);
}

function clientIp(req: Request): string | null {
    const forwarded = req.header('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim();
        if (first) return first;
    }
    return req.ip ?? req.socket?.remoteAddress ?? null;
}

type GeoipModule = { lookup: (ip: string) => { country?: string } | null };
let geoipLoaded = false;
let geoip: GeoipModule | null = null;

async function loadGeoip(): Promise<GeoipModule | null> {
    if (geoipLoaded) return geoip;
    geoipLoaded = true;
    try {
        const mod = (await import('geoip-lite')) as { default?: GeoipModule } & GeoipModule;
        geoip = mod.default ?? mod;
    } catch {
        geoip = null;
    }
    return geoip;
}

export async function resolveCountry(req: Request): Promise<string | null> {
    const cf = req.header('cf-ipcountry')?.toUpperCase();
    if (isValidIsoCode(cf)) return cf;

    const ip = clientIp(req);
    if (!ip) return null;

    const mod = await loadGeoip();
    if (!mod) return null;

    try {
        const code = mod.lookup(ip)?.country?.toUpperCase();
        return isValidIsoCode(code) ? code : null;
    } catch {
        return null;
    }
}
import countries from 'world-countries';

export type Centroid = { name: string; lat: number; lng: number };

const MAP: Record<string, Centroid> = Object.fromEntries(
    countries
        .filter((c) => Array.isArray(c.latlng) && c.latlng.length === 2)
        .map((c) => [
            c.cca2,
            { name: c.name.common, lat: c.latlng[0], lng: c.latlng[1] } satisfies Centroid,
        ]),
);

export const COUNTRY_CENTROIDS = MAP;

export function centroidOf(code: string): Centroid | null {
    return MAP[code?.toUpperCase()] ?? null;
}
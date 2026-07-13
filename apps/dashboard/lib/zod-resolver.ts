import { zodResolver as hookResolver } from '@hookform/resolvers/zod';

type ResolverSchema = Parameters<typeof hookResolver>[0];

export function zodResolver<T extends object>(schema: T) {
    return hookResolver(schema as unknown as ResolverSchema);
}

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../models/application.js', () => ({
    ApplicationModel: {
        findOne: vi.fn(),
    },
}));

import { ApplicationModel } from '../models/application.js';
import { authenticateApp } from './authenticate-app.js';

function mockReq(headers: Record<string, string> = {}): Request {
    const normalized = Object.fromEntries(
        Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
    );
    return {
        header(name: string) {
            return normalized[name.toLowerCase()];
        },
    } as Request;
}

const res = {} as Response;
const next = vi.fn() as NextFunction;

describe('authenticateApp', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects missing x-app-id', async () => {
        await expect(authenticateApp(mockReq(), res, next)).rejects.toMatchObject({
            statusCode: 401,
            code: 'missing_app_id',
        });
    });

    it('rejects invalid x-app-id', async () => {
        vi.mocked(ApplicationModel.findOne).mockResolvedValue(null);

        await expect(
            authenticateApp(mockReq({ 'x-app-id': 'app_unknown' }), res, next),
        ).rejects.toMatchObject({
            statusCode: 401,
            code: 'invalid_app_id',
        });
    });

    it('rejects when allowedOrigins is empty', async () => {
        vi.mocked(ApplicationModel.findOne).mockResolvedValue({
            _id: { toString: () => 'id1' },
            appId: 'app_test',
            allowedOrigins: [],
        } as never);

        await expect(
            authenticateApp(
                mockReq({ 'x-app-id': 'app_test', origin: 'https://shop.example.com' }),
                res,
                next,
            ),
        ).rejects.toMatchObject({
            statusCode: 403,
            code: 'origins_not_configured',
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects when origin header is missing', async () => {
        vi.mocked(ApplicationModel.findOne).mockResolvedValue({
            _id: { toString: () => 'id1' },
            appId: 'app_test',
            allowedOrigins: ['https://shop.example.com'],
        } as never);

        await expect(
            authenticateApp(mockReq({ 'x-app-id': 'app_test' }), res, next),
        ).rejects.toMatchObject({
            statusCode: 403,
            code: 'origin_not_allowed',
        });
    });

    it('rejects when origin is not in the whitelist', async () => {
        vi.mocked(ApplicationModel.findOne).mockResolvedValue({
            _id: { toString: () => 'id1' },
            appId: 'app_test',
            allowedOrigins: ['https://shop.example.com'],
        } as never);

        await expect(
            authenticateApp(
                mockReq({ 'x-app-id': 'app_test', origin: 'https://evil.example.com' }),
                res,
                next,
            ),
        ).rejects.toMatchObject({
            statusCode: 403,
            code: 'origin_not_allowed',
        });
    });

    it('allows a whitelisted origin', async () => {
        vi.mocked(ApplicationModel.findOne).mockResolvedValue({
            _id: { toString: () => 'id1' },
            appId: 'app_test',
            allowedOrigins: ['https://shop.example.com'],
        } as never);

        const req = mockReq({
            'x-app-id': 'app_test',
            origin: 'https://shop.example.com',
        });

        await authenticateApp(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(req.application).toEqual({ id: 'id1', appId: 'app_test' });
    });
});

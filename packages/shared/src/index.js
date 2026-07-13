"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
var zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    company: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Company name is required'),
        baseUrl: zod_1.z.string().url('Invalid website URL'),
        kbisFileRef: zod_1.z.string().min(1, 'KBIS document is required'),
        contact: zod_1.z.object({
            name: zod_1.z.string().min(1),
            email: zod_1.z.string().email(),
            phone: zod_1.z.string().optional(),
        }),
    }),
    user: zod_1.z
        .object({
        email: zod_1.z.string().email('Invalid email'),
        password: zod_1.z.string().min(8, 'Password must be at least 8 characters long'),
        confirmPassword: zod_1.z.string().min(1, 'Please confirm your password'),
    })
        .refine(function (data) { return data.password === data.confirmPassword; }, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    }),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});

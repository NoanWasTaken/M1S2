import 'dotenv/config';
import argon2 from 'argon2';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { UserModel } from '../models/user.js';

async function seedAdmin() {
    const email = process.env.ADMIN_EMAIL ?? 'admin@m1s2.local';
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
        console.error('ADMIN_PASSWORD environment variable is required.');
        process.exit(1);
    }

    await mongoose.connect(env.mongoUri);

    const existing = await UserModel.findOne({ email });
    if (existing) {
        console.log(`Admin already exists: ${email}`);
        await mongoose.disconnect();
        return;
    }

    const passwordHash = await argon2.hash(password);

    await UserModel.create({
        email,
        passwordHash,
        role: 'admin',
        status: 'active',
    });

    console.log(`Admin created: ${email}`);
    await mongoose.disconnect();
}

seedAdmin();
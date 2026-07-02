import 'dotenv/config';
import argon2 from 'argon2';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { UserModel } from '../models/user.js';

async function seedAdmin() {
    const email = process.env.ADMIN_EMAIL ?? 'admin@m1s2.local';
    const password = process.env.ADMIN_PASSWORD ?? 'admin1234';

    await mongoose.connect(env.mongoUri);

    // Do not recreate the admin if it already exists
    const existing = await UserModel.findOne({ email });
    if (existing) {
        console.log(`Admin already exists: ${email}`);
        await mongoose.disconnect();
        return;
    }

    // Hash the password (like during registration)
    const passwordHash = await argon2.hash(password);

    await UserModel.create({
        email,
        passwordHash,
        role: 'admin',
        status: 'active',
    });

    console.log(`Admin created: ${email} (password: ${password})`);
    await mongoose.disconnect();
}

seedAdmin();
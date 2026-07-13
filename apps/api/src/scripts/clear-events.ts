import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { EventModel } from '../models/event.js';

async function clearEvents() {
    await mongoose.connect(env.mongoUri);

    const result = await EventModel.deleteMany({});
    console.log(`${result.deletedCount} events deleted.`);

    await mongoose.disconnect();
}

clearEvents();
import { Schema, model, InferSchemaType } from 'mongoose';

const eventSchema = new Schema(
    {
        appId: { type: String, required: true, index: true },
        type: { type: String, required: true, index: true },
        url: { type: String },
        occurredAt: { type: Date, required: true, index: true },
        source: { type: String, enum: ['browser', 'server'], required: true },
        payload: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
);

export type EventDoc = InferSchemaType<typeof eventSchema>;
export const EventModel = model('Event', eventSchema);
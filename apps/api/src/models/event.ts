import { Schema, model, InferSchemaType } from 'mongoose';

const eventSchema = new Schema(
    {
        appId: { type: String, required: true, index: true },
        visitorId: { type: String, index: true },
        sessionId: { type: String, index: true },
        type: { type: String, required: true, index: true },
        url: { type: String },
        occurredAt: { type: Date, required: true, index: true },
        source: { type: String, enum: ['browser', 'server'], required: true },
        payload: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true },
);

eventSchema.index({ appId: 1, occurredAt: 1 });
eventSchema.index({ appId: 1, type: 1, occurredAt: 1 });

export type EventDoc = InferSchemaType<typeof eventSchema>;
export const EventModel = model('Event', eventSchema);
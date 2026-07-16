import { Schema, model, InferSchemaType } from 'mongoose';

const sharedDashboardSchema = new Schema(
    {
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
        appId:     { type: String, required: true, index: true },
        token:     { type: String, required: true, unique: true, index: true },
        label:     { type: String, default: '' },
        expiresAt: { type: Date, default: null },
        active:    { type: Boolean, default: true },
    },
    { timestamps: true },
);

export type SharedDashboard = InferSchemaType<typeof sharedDashboardSchema>;
export const SharedDashboardModel = model('SharedDashboard', sharedDashboardSchema);

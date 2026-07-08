import { Schema, model, InferSchemaType } from 'mongoose';

const funnelStepSchema = new Schema(
    {
        tagId: { type: String, required: true },
        position: { type: Number, required: true },
    },
    { _id: false },
);

const conversionFunnelSchema = new Schema(
    {
        funnelId: { type: String, required: true, unique: true, index: true },
        applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
        appId: { type: String, required: true, index: true },
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
        steps: { type: [funnelStepSchema], required: true },
        comment: { type: String, required: true },
        deletedAt: { type: Date, default: null, index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true },
);

conversionFunnelSchema.index({ applicationId: 1, deletedAt: 1 });

export type ConversionFunnel = InferSchemaType<typeof conversionFunnelSchema>;
export const ConversionFunnelModel = model('ConversionFunnel', conversionFunnelSchema);
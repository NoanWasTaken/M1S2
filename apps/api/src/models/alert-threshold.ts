import { Schema, model, InferSchemaType } from 'mongoose';

const alertThresholdSchema = new Schema(
    {
        companyId:   { type: Schema.Types.ObjectId, ref: 'Company',     required: true, index: true },
        appId:       { type: String,                                     required: true, index: true },
        threshold:   { type: Number,                required: true, min: 1 },
        enabled:     { type: Boolean,               default: true },
        cooldownMs:  { type: Number,                default: 5 * 60 * 1000 },
        lastFiredAt: { type: Date,                  default: null },
    },
    { timestamps: true },
);

alertThresholdSchema.index({ companyId: 1, appId: 1 }, { unique: true });

export type AlertThreshold = InferSchemaType<typeof alertThresholdSchema>;
export const AlertThresholdModel = model('AlertThreshold', alertThresholdSchema);

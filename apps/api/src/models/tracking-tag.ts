import { Schema, model, InferSchemaType } from 'mongoose';

const trackingTagSchema = new Schema(
    {
        tagId: { type: String, required: true, unique: true, index: true },
        applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
        appId: { type: String, required: true, index: true },
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
        comment: { type: String, required: true },
        deletedAt: { type: Date, default: null, index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true },
);

trackingTagSchema.index({ applicationId: 1, deletedAt: 1 });

export type TrackingTag = InferSchemaType<typeof trackingTagSchema>;
export const TrackingTagModel = model('TrackingTag', trackingTagSchema);
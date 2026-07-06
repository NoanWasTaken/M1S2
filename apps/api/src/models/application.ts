// App model for the API

import { Schema, model, InferSchemaType } from 'mongoose';

const applicationSchema = new Schema(
    {
        name: { type: String, required: true },
        appId: { type: String, required: true, unique: true },
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true },
);

export type Application = InferSchemaType<typeof applicationSchema>;
export const ApplicationModel = model('Application', applicationSchema);
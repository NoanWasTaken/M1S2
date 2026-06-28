import { Schema, model, InferSchemaType } from 'mongoose';

const companySchema = new Schema(
    {
        name: { type: String, required: true },
        contact: {
            name: { type: String, required: true },
            email: { type: String, required: true },
            phone: { type: String },
        },
        baseUrl: { type: String, required: true },
        kbisFileRef: { type: String, required: true },
        validationStatus: {
            type: String,
            enum: ['pending', 'validated', 'rejected'],
            default: 'pending',
        },
        validatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true },
);

export type Company = InferSchemaType<typeof companySchema>;
export const CompanyModel = model('Company', companySchema);
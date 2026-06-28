import { Schema, model, InferSchemaType } from 'mongoose';

const userSchema = new Schema(
    {
        email: { type: String, required: true, unique: true, lowercase: true },
        passwordHash: { type: String, required: true },
        role: {
            type: String,
            enum: ['admin', 'webmaster'],
            required: true,
        },
        companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
        status: {
            type: String,
            enum: ['pending', 'active', 'suspended'],
            default: 'pending',
        },
    },
    { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
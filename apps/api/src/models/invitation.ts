import { Schema, model, InferSchemaType } from 'mongoose';

const invitationSchema = new Schema(
    {
        email: { type: String, required: true, lowercase: true, index: true },
        companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
        invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        tokenHash: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'revoked'],
            default: 'pending',
            index: true,
        },
        acceptedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

export type Invitation = InferSchemaType<typeof invitationSchema>;
export const InvitationModel = model('Invitation', invitationSchema);
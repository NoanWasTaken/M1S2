import { Schema, model, InferSchemaType } from 'mongoose';

const conversationSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    kind: {
      type: String,
      enum: ['support', 'internal'],
      default: 'support',
      index: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'open', 'closed'],
      default: 'waiting',
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    openedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type Conversation = InferSchemaType<typeof conversationSchema>;
export const ConversationModel = model('Conversation', conversationSchema);

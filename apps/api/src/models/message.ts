import { Schema, model, InferSchemaType } from 'mongoose';

const messageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: {
      type: String,
      enum: ['webmaster', 'admin'],
      required: true,
    },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'system'],
      default: 'text',
    },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

export type Message = InferSchemaType<typeof messageSchema>;
export const MessageModel = model('Message', messageSchema);

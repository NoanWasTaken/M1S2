import { z } from 'zod';

export const addMemberSchema = z.object({
    email: z.string().email("The member's email is invalid"),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
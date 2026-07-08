import { z } from 'zod';

const commentSchema = z.string().min(1, 'Comment is required').max(500, 'Comment is too long');

export const createTrackingTagSchema = z.object({
    comment: commentSchema,
});

export const updateTrackingTagCommentSchema = z.object({
    comment: commentSchema,
});

export const createConversionFunnelSchema = z.object({
    comment: commentSchema,
    tagIds: z
        .array(z.string().min(1, 'Tag id is required'))
        .min(1, 'At least one tag is required')
        .refine((tagIds) => new Set(tagIds).size === tagIds.length, {
            message: 'Tag ids must be unique',
        }),
});

export const updateConversionFunnelCommentSchema = z.object({
    comment: commentSchema,
});

export type CreateTrackingTagInput = z.infer<typeof createTrackingTagSchema>;
export type UpdateTrackingTagCommentInput = z.infer<typeof updateTrackingTagCommentSchema>;
export type CreateConversionFunnelInput = z.infer<typeof createConversionFunnelSchema>;
export type UpdateConversionFunnelCommentInput = z.infer<typeof updateConversionFunnelCommentSchema>;
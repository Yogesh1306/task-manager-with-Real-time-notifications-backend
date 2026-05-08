import * as z from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'username must be atleast 3 characters')
      .max(20, 'username can be max 20 characters'),
    email: z.email('Invalid email').min(1, 'email is required'),
    password: z.string().min(8, 'password should be min 8 character'),
  })
  .strict();

export const loginSchema = z
  .object({
    userInput: z.union([z.email(), z.string().min(3).max(20)], {
      errorMap: () => ({ message: 'Must be a valid email or username' }),
    }),
    password: z.string().min(8, 'password should be min 8 character'),
  })
  .strict();

const attachmentSchema = z.object({
  url: z
    .url('Invalid file url')
    .refine(
      (url) => url.includes('res.cloudinary.com'),
      'Only Cloudinary URLs allowed',
    ),
  public_id: z
    .string()
    .min(1)
    .regex(/^[\w\-\/]+$/),
  bytes: z
    .number()
    .positive()
    .max(5 * 1024 * 1024)
    .optional(),
  format: z.enum(['jpg', 'png', 'pdf']).optional(),
});

export const createTaskSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(100, 'Title too long')
      .trim(),
    description: z
      .string()
      .max(1000, 'max description length of 100 characters')
      .optional(),
    dueDate: z.coerce
      .date()
      .optional()
      .refine((date) => !date || date > new Date(), {
        message: 'Due date must be in the future',
      }),
    boardId: z.string().optional(),
    assignedTo: z.string().regex(objectIdRegex, 'Invalid user id').optional(),
    status: z.enum(['todo', 'in-progress', 'done']).default('todo'),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    attachments: z.array(attachmentSchema).max(5, 'Max 5 files').optional(),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(1000).optional(),
    dueDate: z.coerce.date().optional(),
    status: z.enum(['todo', 'in-progress', 'done']).optional(),

    keepAttachments: z.array(z.string()).optional(),

    newAttachments: z.array(attachmentSchema).max(5).optional(),
  })
  .strict();

export const createBoardSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z
    .string()
    .min(100, 'description should be min 10 characters')
    .max(500, 'max description length can only be 500 characters')
    .optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().regex(objectIdRegex, 'Invalid user id').optional()
})
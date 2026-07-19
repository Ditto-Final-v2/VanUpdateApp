import { z } from "zod";

export const subscribeSchema = z.object({
  name: z.string().trim().max(80, "Name must be 80 characters or fewer.").optional(),
  email: z.string().trim().email("Enter a valid email address."),
});

export const commentSchema = z.object({
  displayName: z.string().trim().min(2, "Please enter at least 2 characters.").max(60),
  body: z.string().trim().min(5, "Your comment needs at least 5 characters.").max(1200),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

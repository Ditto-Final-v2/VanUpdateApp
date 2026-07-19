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

const nonnegativeNumber = z.coerce.number().finite().nonnegative("Statistics cannot be negative.");
const nonnegativeInteger = z.coerce.number().int().nonnegative("Statistics must be whole numbers.");

export const journalEntrySchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(180),
  entryDate: z.iso.date("Enter a valid entry date."),
  locationName: z.string().trim().min(1, "Enter a location name.").max(200),
  vanMileage: nonnegativeInteger,
  milesWalked: nonnegativeNumber,
  milesRan: nonnegativeNumber,
  milesBiked: nonnegativeNumber,
  majorCitiesVisited: nonnegativeInteger,
  newStatesVisited: nonnegativeInteger,
  newNationalParksVisited: nonnegativeInteger,
  tanksOfGas: nonnegativeNumber,
  notificationHook: z.string().trim().max(180).optional().default(""),
  body: z.string().trim().min(1, "Write the journal entry body."),
});

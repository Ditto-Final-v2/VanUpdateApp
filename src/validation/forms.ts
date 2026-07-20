import { z } from "zod";

export const subscribeSchema = z.object({
  name: z.string().trim().max(80, "Name must be 80 characters or fewer.").optional(),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(10, "Enter a valid mobile number.").max(25),
  smsConsent: z.literal("on", { error: "Agree to receive text updates before subscribing." }),
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
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  loopNumber: z.coerce.number().int().min(1).max(2),
  vanMileage: nonnegativeInteger,
  milesWalked: nonnegativeNumber,
  milesRan: nonnegativeNumber,
  milesBiked: nonnegativeNumber,
  majorCitiesVisited: nonnegativeInteger,
  newStatesVisited: nonnegativeInteger,
  newNationalParksVisited: nonnegativeInteger,
  tanksOfGas: nonnegativeNumber,
  notificationHook: z.string().trim().max(180).optional().default(""),
  sendNotification: z.preprocess((value) => value === "on", z.boolean()),
  body: z.string().trim().min(1, "Write the journal entry body."),
});

export const journalEditSchema = journalEntrySchema.extend({ status: z.enum(["draft", "published"]) });

import { z } from 'zod';

const MIN_AGE = 18;
const MAX_AGE = 130;

const yearsAgo = (years: number) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
};

// Valid US state codes
const VALID_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

/**
 * Normalize phone number by stripping common formatting characters
 * Accepts: +1-234-567-8900, (123) 456-7890, +1 234 567 8900, 1234567890, etc.
 */
export const normalizePhoneNumber = (phone: string): string => {
  return phone
    .replace(/[\s\-()]/g, '') // Remove spaces, hyphens, parentheses
    .trim();
};

const phoneNumberSchema = z
  .string()
  .min(1, "Phone number is required")
  .transform(normalizePhoneNumber)
  .refine(
    (phone) => /^\+?\d{10,15}$/.test(phone),
    "Phone number must be 10-15 digits (with optional + prefix). Format: +1-234-567-8900 or 1234567890"
  );

export const normalizeEmail = (email: string) =>
  email.trim().toLowerCase();

const emailSchema = z
  .string()
  .min(1, "Email is required")
  .trim()
  .toLowerCase()
  .refine(
    (email) => {
      // Basic email format
      const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailRegex.test(email);
    },
    "Please enter a valid email address"
  )
  .refine(
    (email) => {
      // No leading/trailing special characters in local part
      const [localPart] = email.split('@');
      if (!localPart) return false;
      return !/^[._+-]|[._+-]$/.test(localPart);
    },
    "Email cannot start or end with special characters"
  )
  .refine(
    (email) => {
      // No consecutive dots or special characters
      return !/[._+-]{2,}/.test(email) && !/\.\./.test(email);
    },
    "Email contains invalid consecutive characters"
  )
  .refine(
    (email) => {
      // Check for common TLD typos
      const commonTldTypos = [
        '.con', '.cmo', '.ocm', '.comm', '.co,', 
        '.net.', '.org.', '.edu.',
        '.gmial.com', '.gmai.com', '.yahooo.com',
      ];
      return !commonTldTypos.some(typo => email.endsWith(typo));
    },
    "Please check your email domain (common typo detected)"
  );

const passwordSchema = z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .refine(
      (password) => /[A-Z]/.test(password),
      "Password must contain an uppercase letter"
    )
    .refine(
      (password) => /[a-z]/.test(password),
      "Password must contain a lowercase letter"
    )
    .refine(
      (password) => /\d/.test(password),
      "Password must contain a number"
    )
    .refine(
      (password) => /[^A-Za-z0-9]/.test(password),
      "Password must contain a special character"
    );

const dateOfBirthSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .refine(
      (v) => new Date(v) <= new Date(),
      "Date of birth cannot be in the future"
    )
    .refine(
      (v) => new Date(v) <= yearsAgo(MIN_AGE),
      `You must be at least ${MIN_AGE} years old`
    )
    .refine(
      (v) => new Date(v) >= yearsAgo(MAX_AGE),
      `Age must be less than or equal to ${MAX_AGE}`
    );

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: phoneNumberSchema,
  dateOfBirth: dateOfBirthSchema,
  ssn: z.string().regex(/^\d{9}$/, "SSN must be 9 digits"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string()
    .length(2, "State must be 2 characters")
    .toUpperCase()
    .refine(
      (state) => VALID_STATES.includes(state),
      "Invalid state code. Please enter a valid US state abbreviation"
    ),
  zipCode: z.string().regex(/^\d{5}$/, "ZIP code must be 5 digits"),
}).refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Passwords don't match",
      path: ["confirmPassword"], // Shows error on confirmPassword field
    }
  );

export type SignupInput = z.infer<typeof signupSchema>;
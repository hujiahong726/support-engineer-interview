// lib/validation/schemas/funding.schema.ts
import { z } from 'zod';
import { isLuhnValid, normalizeCardNumber } from '@/lib/validation/card';

export const fundingSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+\.?\d{0,2}$/, "Invalid amount format")
    .refine(
      (val) => !/^0\d/.test(val),
      "Amount cannot start with a leading zero (e.g., enter 50.00 not 050.00)"
    )
    .refine(
      (val) => parseFloat(val) >= 0.01,
      "Amount must be at least $0.01"
    )
    .refine(
      (val) => parseFloat(val) <= 10000,
      "Amount cannot exceed $10,000"
    ),
  
  fundingType: z.enum(["card", "bank"]),
  
  accountNumber: z.string().min(1, "Account number is required"),
  
  routingNumber: z.string().optional(),
})
  .superRefine((data, ctx) => {
    // if fundingType is bank, routingNumber is required and must be 9 digits
    if (data.fundingType === "bank") {
        if (!data.routingNumber || data.routingNumber.trim().length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Routing number is required",
            path: ["routingNumber"],
        });
        } else if (!/^\d{9}$/.test(data.routingNumber)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Routing number must be 9 digits",
            path: ["routingNumber"],
        });
        }
    }
    // Validate accountNumber based on fundingType
    if (data.fundingType === "card") {
      const digits = normalizeCardNumber(data.accountNumber);
      
      if (!/^\d{13,19}$/.test(digits)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Card number must be 13-19 digits",
          path: ["accountNumber"],
        });
        return;
      }
      
      if (!isLuhnValid(digits)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid card number",
          path: ["accountNumber"],
        });
      }
    } else if (data.fundingType === "bank") {
      if (!/^\d+$/.test(data.accountNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid account number",
          path: ["accountNumber"],
        });
      }
    }
  });

export type FundingFormData = z.infer<typeof fundingSchema>;
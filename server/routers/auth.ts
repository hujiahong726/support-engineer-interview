import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc";
import { db } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSsnLast4, getSsnHash } from "@/lib/ssn-utils";
import { signupSchema } from '@/lib/validation/schemas/auth.schema';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const authRouter = router({
  signup: publicProcedure
    .input(signupSchema)
    .mutation(async ({ input, ctx }) => {
      const existingUser = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists",
        });
      }

      // Check for duplicate SSN
      const ssnHash = getSsnHash(input.ssn);
      const existingSsn = await db.select().from(users).where(eq(users.ssnHash, ssnHash)).get();

      if (existingSsn) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This SSN is already registered",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const ssnLast4 = getSsnLast4(input.ssn);

      const { ssn, ...inputWithoutSsn } = input;

      await db.insert(users).values({
        ...inputWithoutSsn,
        password: hashedPassword,
        ssnLast4,
        ssnHash,
      });

      // Fetch the created user
      const user = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }

      // Create session
      // Invalidate all existing sessions for this user
      await db.delete(sessions).where(eq(sessions.userId, user.id));
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "temporary-secret-for-interview", {
        expiresIn: "7d",
      });

      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt: expiresAt.toISOString(),
      });

      // Set cookie
      if ("setHeader" in ctx.res) {
        ctx.res.setHeader("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      } else {
        (ctx.res as Headers).set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      }

      return { user: { ...user, password: undefined }, token };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.select().from(users).where(eq(users.email, input.email)).get();

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const validPassword = await bcrypt.compare(input.password, user.password);

      if (!validPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      // Invalidate all existing sessions for this user
      await db.delete(sessions).where(eq(sessions.userId, user.id));

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "temporary-secret-for-interview", {
        expiresIn: "7d",
      });

      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt: expiresAt.toISOString(),
      });

      if ("setHeader" in ctx.res) {
        ctx.res.setHeader("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      } else {
        (ctx.res as Headers).set("Set-Cookie", `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      }

      return { user: { ...user, password: undefined }, token };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    let sessionDeleted = false;
    let message = "No active session";

    if (ctx.user) {
      // Extract session token from request
      let token: string | undefined;
      if ("cookies" in ctx.req) {
        token = (ctx.req as any).cookies.session;
      } else {
        const cookieHeader = ctx.req.headers.get?.("cookie") || (ctx.req.headers as any).cookie;
        token = cookieHeader
          ?.split("; ")
          .find((c: string) => c.startsWith("session="))
          ?.split("=")[1];
      }

      if (token) {
        // Verify session exists before deletion
        const existingSession = await db.select().from(sessions).where(eq(sessions.token, token)).get();
        
        if (existingSession) {
          // Delete the session
          await db.delete(sessions).where(eq(sessions.token, token));
          
          // Verify deletion was successful
          const deletedSession = await db.select().from(sessions).where(eq(sessions.token, token)).get();
          
          if (!deletedSession) {
            sessionDeleted = true;
            message = "Logged out successfully";
          } else {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to delete session",
            });
          }
        } else {
          message = "Session not found in database";
        }
      } else {
        message = "No session token in request";
      }
    }

    // Clear the session cookie
    if ("setHeader" in ctx.res) {
      ctx.res.setHeader("Set-Cookie", `session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    } else {
      (ctx.res as Headers).set("Set-Cookie", `session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    }

    return { success: sessionDeleted, message };
  }),
});

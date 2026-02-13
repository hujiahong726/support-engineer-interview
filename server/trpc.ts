import { initTRPC, TRPCError } from "@trpc/server";
import { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createContext(opts: CreateNextContextOptions | FetchCreateContextFnOptions) {
  // Handle different adapter types
  let req: any;
  let res: any;

  if ("req" in opts && "res" in opts) {
    // Next.js adapter
    req = opts.req;
    res = opts.res;
  } else {
    // Fetch adapter
    req = opts.req;
    res = opts.resHeaders;
  }

  // Get the session token
  let token: string | undefined;

  // For App Router, we need to read cookies from the request headers
  let cookieHeader = "";
  if (req.headers.cookie) {
    // Next.js Pages request
    cookieHeader = req.headers.cookie;
  } else if (req.headers.get) {
    // Fetch request (App Router)
    cookieHeader = req.headers.get("cookie") || "";
  }

  const cookiesObj = Object.fromEntries(
    cookieHeader
      .split("; ")
      .filter(Boolean)
      .map((c: string) => {
        const [key, ...val] = c.split("=");
        return [key, val.join("=")];
      })
  );
  token = cookiesObj.session;

  let user = null;
  let newTokenSet = false;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "temporary-secret-for-interview") as {
        userId: number;
      };

      const session = await db.select().from(sessions).where(eq(sessions.token, token)).get();

      // Check session exists and is not expired
      if (session) {
        const expiresAt = new Date(session.expiresAt);
        const now = new Date();

        if (expiresAt > now) {
          user = await db.select().from(users).where(eq(users.id, decoded.userId)).get();

          const expiresIn = expiresAt.getTime() - now.getTime();
          if (expiresIn < THRESHOLD_MS) {
            const JWT_SECRET = process.env.JWT_SECRET || "temporary-secret-for-interview";
            const newToken = jwt.sign({ userId: decoded.userId }, JWT_SECRET, { expiresIn: "7d" });
            const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

            await db.transaction(async (tx) => {
              // enforce strict single session per user:
              await tx.delete(sessions).where(eq(sessions.userId, decoded.userId));

              await tx.insert(sessions).values({
                userId: decoded.userId,
                token: newToken,
                expiresAt: newExpiresAt,
              });
            });

            const isProd = process.env.NODE_ENV === "production";
            const cookie = `session=${newToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${isProd ? "; Secure" : ""}`;

            if ("setHeader" in res) res.setHeader("Set-Cookie", cookie);
            else if (res && "set" in res) res.set("Set-Cookie", cookie);
          }
        } else {
          await db.delete(sessions).where(eq(sessions.token, token));
        }
      }
    } catch (error) {
      // Invalid token
    }
  }

  return {
    user,
    req,
    res,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

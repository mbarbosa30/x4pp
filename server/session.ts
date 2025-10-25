import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PgStore = connectPg(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
    username: string;
  }
}

// Detect production using Replit's REPLIT_DEPLOYMENT variable
const isProduction = process.env.REPLIT_DEPLOYMENT === "1";

export const sessionMiddleware = session({
  store: new PgStore({
    pool: pool,
    tableName: "session",
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: isProduction, // Use HTTPS cookies in production
    sameSite: "lax",
  },
});

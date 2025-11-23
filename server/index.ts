import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import "dotenv/config";
import pkg from "pg";
import passport from "passport";
import { configurePassport } from "./auth";
import { initRealtime } from "./realtime";
import {
  startResourceOptimizationScheduler,
  runResourceOptimizationCycle,
} from "./resourceOptimizationService";

import cors from "cors"; // 🔥 ajouté

const { Pool } = pkg;

const app = express();

// Extend IncomingMessage
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// JSON parser preserving raw body
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

// 🔥🔥 CRITICAL FIX FOR COOKIES IN DEV
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Session store (PostgreSQL)
const pgSession = ConnectPgSimple(session);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✔ COOKIE FIX FOR LOCALHOST – MUST BE BEFORE PASSPORT
app.use(
  session({
    store: new pgSession({
      pool,
      createTableIfMissing: true,
    }),
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    rolling: true, // 🔥 refresh session on each request
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false, // 🔥 required on Windows/localhost
      sameSite: "lax",
    },
  })
);

configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// MAIN SERVER FUNCTION
(async () => {
  registerRoutes(app);

  if (process.env.ENABLE_RESOURCE_OPTIMIZATION === "1") {
    startResourceOptimizationScheduler();
    void runResourceOptimizationCycle().catch((error) => {
      console.error("Initial resource optimization cycle failed:", error);
    });
  } else {
    console.log(
      "Resource optimization disabled (set ENABLE_RESOURCE_OPTIMIZATION=1 to enable)"
    );
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // PORT configuration
  const port = parseInt(process.env.PORT || "5000", 10);

  /**
   * ✔ WINDOWS + NODE 18+ FIX
   * - host must be 127.0.0.1 (NOT 0.0.0.0)
   * - reusePort must not be used
   */
  const server = app.listen(port, "localhost", () => {
    log(`Server running at http://localhost:${port}`);
  });

  // Realtime
  initRealtime(server);

  // Vite in dev
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
})();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import createMemoryStore from "memorystore";
import "dotenv/config";
import passport from "passport";
import { configurePassport } from "./auth";
import { initRealtime } from "./realtime";
import { startResourceOptimizationScheduler, runResourceOptimizationCycle } from "./resourceOptimizationService";
import { hasDatabase, pool } from "./db";

const app = express();

// Extend IncomingMessage
declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// JSON parser preserving raw body
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: false }));

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

// Session store (PostgreSQL or in-memory fallback)
const pgSession = ConnectPgSimple(session);
const MemoryStore = createMemoryStore(session);

const sessionStore = hasDatabase && pool
  ? new pgSession({
      pool,
      createTableIfMissing: true,
    })
  : new MemoryStore({
      checkPeriod: 24 * 60 * 60 * 1000,
    });

if (!hasDatabase) {
  log("DATABASE_URL absente : utilisation d'un store de session en mémoire (données non persistées).", "session");
}

// Express Session config
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  })
);

if (hasDatabase) {
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());
} else {
  log("Passport désactivé (pas de base de données disponible)", "auth");
}

// MAIN SERVER FUNCTION
(async () => {
  if (hasDatabase) {
    registerRoutes(app);
    if (process.env.ENABLE_RESOURCE_OPTIMIZATION === "1") {
      startResourceOptimizationScheduler();
      void runResourceOptimizationCycle().catch((error) => {
        console.error("Initial resource optimization cycle failed:", error);
      });
    } else {
      console.log("Resource optimization disabled (set ENABLE_RESOURCE_OPTIMIZATION=1 to enable)");
    }
  } else {
    app.use("/api", (_req, res) => {
      res.status(503).json({
        error: "Base de données non configurée",
        hint: "Ajoutez DATABASE_URL à votre fichier .env pour activer les routes API",
      });
    });
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
   * ✔ IMPORTANT FIX FOR WINDOWS + NODE 24
   * - host must NOT be "0.0.0.0"
   * - reusePort must NOT be used (unsupported on Windows)
   * - we use "127.0.0.1" which is perfect for:
   *   → local dev
   *   → SSH tunnel Linux ↔ Windows
   *   → security (isolated API)
   */
  const server = app.listen(port, "127.0.0.1", () => {
    log(`Server running at http://127.0.0.1:${port}`);
  });

  // VITE (only in development)
  initRealtime(server);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
})();

import express from "express";
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
import {
  attachRequestContext,
  logApiRequest,
} from "./middleware/requestContext";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import cors from "cors"; // 🔥 ajouté
import https from "https"; // 🔥 HTTPS
import fs from "fs"; // 🔥 Pour lire les certificats
import path from "path"; // 🔥 Pour les chemins
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const { Pool } = pkg;

const app = express();
const isProd = process.env.NODE_ENV === "production";

// Extend IncomingMessage
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// JSON parser preserving raw body
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));
app.use(attachRequestContext);

const defaultMobileOrigins = ["capacitor://localhost", "http://localhost"];
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)
  .concat(defaultMobileOrigins);

const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!isProd) {
      return callback(null, true);
    }
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn("[cors] blocked origin", origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
});

app.use(corsMiddleware);
app.options("*", corsMiddleware);

app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "wss:", "ws:"],
            frameAncestors: ["'none'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  })
);

const apiLimiter = rateLimit({
  windowMs:
    parseInt(process.env.RATE_LIMIT_WINDOW_MS || "", 10) ||
    15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || "300", 10),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);
app.use("/auth", apiLimiter);

if (isProd) {
  app.set("trust proxy", 1);
}

// Endpoint de test de connexion pour l'app mobile
app.get("/api/ping", (_req, res) => {
  res.json({
    ok: true,
    server: "TransportManager API",
    timestamp: new Date().toISOString(),
    message: "Serveur accessible ✅",
  });
});

app.use(logApiRequest);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
  });
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
      secure: isProd,
      sameSite: isProd ? "lax" : "lax",
    },
  })
);

configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// MAIN SERVER FUNCTION
(async () => {
  registerRoutes(app);
  app.use("/api", notFoundHandler);

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
  app.use(errorHandler);

  // PORT configuration
  const port = parseInt(process.env.PORT || "5000", 10);
  const httpsPort = parseInt(process.env.HTTPS_PORT || "5443", 10);

  // 🔥 Charger les certificats SSL
  const certsPath = path.join(process.cwd(), "certs");
  let httpsServer = null;

  if (fs.existsSync(path.join(certsPath, "server.key")) && fs.existsSync(path.join(certsPath, "server.crt"))) {
    const sslOptions = {
      key: fs.readFileSync(path.join(certsPath, "server.key")),
      cert: fs.readFileSync(path.join(certsPath, "server.crt")),
    };

    httpsServer = https.createServer(sslOptions, app);
    httpsServer.listen(httpsPort, "0.0.0.0", () => {
      log(`🔒 HTTPS Server running at https://localhost:${httpsPort}`);
      log(`🔒 HTTPS Network access: https://192.168.1.13:${httpsPort}`);
    });

    // Realtime sur HTTPS aussi
    initRealtime(httpsServer);
  } else {
    log("⚠️ Certificats SSL non trouvés - HTTPS désactivé");
  }

  /**
   * ✔ WINDOWS + NODE 18+ FIX
   * - host must be 127.0.0.1 (NOT 0.0.0.0)
   * - reusePort must not be used
   */
  const server = app.listen(port, "0.0.0.0", () => {
    log(`Server running at http://localhost:${port}`);
    log(`Network access: http://192.168.1.13:${port}`); // Remplacez par votre IP
  });

  // Realtime (HTTP)
  initRealtime(server);

  // Vite in dev
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
})();

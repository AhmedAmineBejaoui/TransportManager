import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

const REQUEST_ID_HEADER = "x-request-id";

const isValidRequestId = (value: string) => /^[a-zA-Z0-9-_.]{8,128}$/.test(value);

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      requestStartedAt: number;
    }
  }
}

export function attachRequestContext(req: Request, res: Response, next: NextFunction) {
  const inbound = req.header(REQUEST_ID_HEADER);
  const requestId = inbound && isValidRequestId(inbound) ? inbound : randomUUID();

  req.requestId = requestId;
  req.requestStartedAt = Date.now();
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}

export function logApiRequest(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (!req.path.startsWith("/api")) {
      return;
    }

    const durationMs = Date.now() - req.requestStartedAt;
    const line = [
      req.method,
      req.originalUrl,
      String(res.statusCode),
      `${durationMs}ms`,
      `rid=${req.requestId}`,
    ].join(" ");

    if (res.statusCode >= 500) {
      console.error(`[api] ${line}`);
      return;
    }

    console.log(`[api] ${line}`);
  });

  next();
}

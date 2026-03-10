import type { NextFunction, Request, Response } from "express";

type ErrorLike = Error & {
  status?: number;
  statusCode?: number;
  details?: unknown;
};

export function notFoundHandler(req: Request, res: Response) {
  const isApiRequest = req.originalUrl.startsWith("/api");

  if (!isApiRequest) {
    return res.status(404).send("Not found");
  }

  return res.status(404).json({
    message: "Endpoint not found",
    requestId: req.requestId,
    path: req.originalUrl,
  });
}

export function errorHandler(err: ErrorLike, req: Request, res: Response, _next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const safeMessage = status >= 500 ? "Internal Server Error" : err.message || "Request failed";

  if (status >= 500) {
    console.error("Unhandled API error", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      message: err.message,
      stack: err.stack,
    });
  }

  return res.status(status).json({
    message: safeMessage,
    requestId: req.requestId,
    details: status < 500 ? err.details : undefined,
  });
}

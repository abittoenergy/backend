import { Request, Response, NextFunction } from "express";
import { RateLimiterRedis, RateLimiterMemory } from "rate-limiter-flexible";
// import { getRedisClient } from "../config/redis";
import ResponseHelper from "../utils/helpers/response.helper";
import logger from "../config/logger";

export type KeyGenerator = (req: Request) => string;
export type SkipFn = (req: Request) => boolean;
export type OnBlocked = (args: { req: Request; key: string; retrySecs: number }) => void | Promise<void>;

export interface LimiterOptions {
  keyPrefix: string;
  points: number; // max number of requests within duration
  duration: number; // per seconds window
  blockDuration?: number; // seconds to block after consuming more than points
  keyGenerator?: KeyGenerator;
  skip?: SkipFn;
  onBlocked?: OnBlocked;
}

/**
 * Distributed rate limiter middleware backed by Redis.
 * - Safe for horizontal scaling
 * - Pluggable key generator (default uses req.clientIp || req.ip)
 * - Sets standard rate limit headers and Retry-After on block
 */
// export function createRateLimiter(options: LimiterOptions) {
//   const { keyPrefix, points, duration, blockDuration = 0, keyGenerator, skip, onBlocked } = options;

//   let limiter: RateLimiterRedis | null = null;

//   async function getLimiter() {
//     if (!limiter) {
//       const client = await getRedisClient();
//       limiter = new RateLimiterRedis({
//         storeClient: client,
//         keyPrefix,
//         points,
//         duration,
//         blockDuration,
//         insuranceLimiter: new RateLimiterMemory({ points, duration })
//       });
//     }
//     return limiter;
//   }

//   const defaultKeyGen: KeyGenerator = (req) => {
//     const xff = req.headers["x-forwarded-for"];
//     const forwarded = Array.isArray(xff) ? xff[0] : xff;
//     const ip = req.ip || forwarded || req.socket.remoteAddress || "";
//     return String(ip);
//   };

//   return async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
//     try {
//       if (skip && skip(req)) return next();

//       const key = (keyGenerator || defaultKeyGen)(req);
//       const rl = await getLimiter();
//       const result = await rl.consume(key, 1);

//       res.setHeader("X-RateLimit-Limit", String(points));
//       res.setHeader("X-RateLimit-Remaining", String(Math.max(0, result.remainingPoints)));
//       res.setHeader("X-RateLimit-Reset", String(Math.floor((Date.now() + result.msBeforeNext) / 1000)));

//       return next();
//     } catch (err: any) {
//       if (err && typeof err.msBeforeNext === "number") {
//         const retrySecs = Math.ceil(err.msBeforeNext / 1000);
//         const key = (keyGenerator || defaultKeyGen)(req);
//         if (onBlocked) {
//           try {
//             await onBlocked({ req, key, retrySecs });
//           } catch {
//             // ignore onBlocked errors
//           }
//         }
//         res.setHeader("Retry-After", String(retrySecs));
//         res.setHeader("X-RateLimit-Limit", String(points));
//         res.setHeader("X-RateLimit-Remaining", "0");
//         res.setHeader("X-RateLimit-Reset", String(Math.floor((Date.now() + err.msBeforeNext) / 1000)));
//         logger.info(`Rate limit exceeded for key: ${key}`);
//         return ResponseHelper.sendResponse(res, {
//           message: "Too many requests. Please try again later.",
//           statusCode: 429
//         });
//       }
//       return next(err);
//     }
//   };
// }

// export const globalRateLimiter = createRateLimiter({
//   keyPrefix: "rl:global",
//   points: 1000,
//   duration: 15 * 60
// });

// export const meterRateLimiter = createRateLimiter({
//   keyPrefix: "rl:meter",
//   points: 100,
//   duration: 60 * 60
// });
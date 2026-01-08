import { Request, Response, NextFunction } from "express";
import { RateLimiterRedis, RateLimiterMemory } from "rate-limiter-flexible";
import { getRedisClient } from "../config/redis";
import ResponseHelper from "../utils/helpers/response.helper";
import logger from "../config/logger";

export type KeyGenerator = (req: Request) => string;
export type SkipFn = (req: Request) => boolean;
export type OnBlocked = (args: { req: Request; key: string; retrySecs: number }) => void | Promise<void>;


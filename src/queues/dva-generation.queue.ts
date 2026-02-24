/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-floating-promises */
import Queue from "bull";
import Redis from "ioredis";
import logger from "../config/logger";
import envConfig from "../config/env";
import { DedicatedVirtualAccountService } from "../services/dedicated-virtual-account.service";

interface DVAJobData {
  userId: string;
}

const QUEUE_NAME = `DVA-generation-queue-${envConfig.env}`;

export const DVAGenerationQueue = new Queue<DVAJobData>(QUEUE_NAME, {
  createClient: (type) => {
    const opts = {
      enableReadyCheck: type === "client",
      lazyConnect: false,
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    };
    return new Redis(envConfig.redis.url, opts);
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 10,
    removeOnFail: 20,
  },
});

/**
 * Process DVA generation jobs
 */
DVAGenerationQueue.process(async (job) => {
  try {
    const { userId } = job.data;
    logger.info(`Processing DVA generation job for user: ${userId}`, { jobId: job.id });

    await DedicatedVirtualAccountService.generateDVAForUser(userId);

    logger.info(`DVA generation job completed for user: ${userId}`, { jobId: job.id });
  } catch (error: any) {
    logger.error(`DVA generation job failed`, {
      jobId: job.id,
      userId: job.data.userId,
      error: error.message,
      stack: error.stack,
      attempt: job.attemptsMade,
    });
    throw error; // Re-throw to trigger retry
  }
});

/**
 * Queue event handlers
 */
DVAGenerationQueue.on("completed", (job) => {
  logger.info(`DVA generation job completed`, {
    jobId: job.id,
    userId: job.data.userId
  });
});

DVAGenerationQueue.on("failed", (job, err) => {
  logger.error("DVA generation job failed after all retries", {
    jobId: job.id,
    userId: job.data.userId,
    error: err.message,
    attempts: job.attemptsMade,
  });
});

DVAGenerationQueue.on("stalled", (job) => {
  logger.warn("DVA generation job stalled", {
    jobId: job.id,
    userId: job.data.userId,
  });
});

/**
 * Helper function to enqueue DVA generation
 * @param userId - User ID to generate DVA for
 */
export async function enqueueDVAGeneration(userId: string): Promise<void> {
  await DVAGenerationQueue.add(
    { userId },
    {
      jobId: userId, // Deduplicate: only one pending job per user
      priority: 5,   // Medium-high priority
    }
  );
  logger.debug("DVA generation job enqueued", { userId });
}

export default DVAGenerationQueue;

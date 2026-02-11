/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-floating-promises */
import Queue from "bull";
import Redis from "ioredis";
import logger from "../config/logger";
import envConfig from "../config/env";
import { DedicatedVirtualAccountRepository } from "../repository/dedicated-virtual-account.repo";
import { enqueueDVAGeneration } from "./dva-generation.queue";

const QUEUE_NAME = `DVA-checker-queue-${envConfig.env}`;

export const DVACheckerQueue = new Queue(QUEUE_NAME, {
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
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 50,
    removeOnFail: false,
  },
});

/**
 * Process DVA checker jobs - finds verified users without DVAs and queues generation
 */
DVACheckerQueue.process(async (job) => {
  try {
    logger.info("Starting DVA checker job", { jobId: job.id });

    const dvaRepo = new DedicatedVirtualAccountRepository();
    const usersWithoutDVA = await dvaRepo.findVerifiedUsersWithoutDVA();

    logger.info(`Found ${usersWithoutDVA.length} verified users without DVAs`, { jobId: job.id });

    let queued = 0;
    let skipped = 0;

    for (const user of usersWithoutDVA) {
      // Validate required fields before queuing
      if (!user.firstName || !user.lastName || !user.phoneNumber) {
        logger.warn(`Skipping DVA generation for user ${user.id} - missing required fields`, {
          email: user.email,
          firstName: !!user.firstName,
          lastName: !!user.lastName,
          phoneNumber: !!user.phoneNumber,
        });
        skipped++;
        continue;
      }

      // Queue DVA generation
      await enqueueDVAGeneration(user.id);
      queued++;
    }

    logger.info("DVA checker job completed", {
      jobId: job.id,
      totalFound: usersWithoutDVA.length,
      queued,
      skipped,
    });
  } catch (error: any) {
    logger.error("DVA checker job failed", {
      jobId: job.id,
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
DVACheckerQueue.on("completed", (job) => {
  logger.info("DVA checker job completed successfully", { jobId: job.id });
});

DVACheckerQueue.on("failed", (job, err) => {
  logger.error("DVA checker job failed after all retries", {
    jobId: job.id,
    error: err.message,
    attempts: job.attemptsMade,
  });
});

DVACheckerQueue.on("stalled", (job) => {
  logger.warn("DVA checker job stalled", { jobId: job.id });
});

export default DVACheckerQueue;

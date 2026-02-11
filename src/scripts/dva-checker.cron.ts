import { DedicatedVirtualAccountRepository } from "../repository/dedicated-virtual-account.repo";
import DVAGenerationQueue from "../queues/dva-generation.queue";
import logger from "../config/logger";

/**
 * Background cron job to check for verified users without DVAs
 * This should be run periodically (e.g., daily or every 6 hours)
 */
export async function checkAndGenerateDVAs() {
  try {
    logger.info("Starting DVA checker cron job");

    const dvaRepo = new DedicatedVirtualAccountRepository();
    const usersWithoutDVA = await dvaRepo.findVerifiedUsersWithoutDVA();

    logger.info(`Found ${usersWithoutDVA.length} verified users without DVAs`);

    for (const user of usersWithoutDVA) {
      // Validate required fields before queuing
      if (!user.firstName || !user.lastName || !user.phoneNumber) {
        logger.warn(`Skipping DVA generation for user ${user.id} - missing required fields`, {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
        });
        continue;
      }

      // Queue DVA generation
      await DVAGenerationQueue.add(
        { userId: user.id },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        }
      );

      logger.info(`Queued DVA generation for user ${user.id}`, { email: user.email });
    }

    logger.info("DVA checker cron job completed successfully");
  } catch (error: any) {
    logger.error("DVA checker cron job failed", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// If running this file directly (for manual testing or cron)
if (require.main === module) {
  checkAndGenerateDVAs()
    .then(() => {
      logger.info("DVA checker completed");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("DVA checker failed", { error });
      process.exit(1);
    });
}

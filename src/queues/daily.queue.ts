import Bull from "bull";
import Redis from "ioredis";
import envConfig from "../config/env";
import logger from "../config/logger";

const DailyQueue: Bull.Queue<{}> = new Bull(`REPORT-queue-${envConfig.env}`, {
    createClient: (type) => {
        const opts = {
            enableReadyCheck: type === "client",
            lazyConnect: false,
            maxRetriesPerRequest: null,
            retryStrategy: (times: number) => Math.min(times * 50, 2000),
        };
        return new Redis(envConfig.redis.url, opts);
    },
});

DailyQueue.process(async (job, done) => {
    try {
        logger.info(`Job: daily job running`);
        done();
    } catch (error: any) {
        console.log(error);
        done(error);
    }
});

export default DailyQueue;

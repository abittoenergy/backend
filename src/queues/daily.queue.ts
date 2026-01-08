import Bull from "bull";
import envConfig from "../config/env";
import logger from "../config/logger";

const DailyQueue: Bull.Queue<{}> = new Bull(`REPORT-queue-${envConfig.env}`);

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

import { LeakReportRepo } from "../repository/leak-report.repo";
import { LeakReportStatus } from "../db/schema/leak-reports.schema";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import logger from "../config/logger";

export default class LeakReportService {
  static async getLeakReports(query: {
    page?: string;
    limit?: string;
    status?: LeakReportStatus;
    search?: string;
  }) {
    const page = parseInt(query.page || "1", 10);
    const limit = parseInt(query.limit || "20", 10);

    const { results, total } = await LeakReportRepo.findAllAdmin({
      page,
      limit,
      status: query.status,
      search: query.search,
    });

    return {
      reports: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async resolveLeak(reportId: string, adminId: string, notes: string) {
    const result = await LeakReportRepo.findById(reportId);
    if (!result) {
      throw new AppError("Leak report not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    if (result.leakReport.status === LeakReportStatus.RESOLVED) {
      throw new AppError("Leak report is already resolved", ResponseHelper.BAD_REQUEST);
    }

    const updatedReport = await LeakReportRepo.update(reportId, {
      status: LeakReportStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedBy: adminId,
      resolutionNotes: notes,
    });

    await LeakReportRepo.createAudit({
      reportId,
      meterId: result.leakReport.meterId,
      action: "LEAK_RESOLVED",
      actorId: adminId,
      details: { notes },
    });

    logger.info(`Leak report ${reportId} resolved by admin ${adminId}`);
    return updatedReport;
  }
}

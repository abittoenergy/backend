import { IncidentReportRepo } from "../repository/incident-report.repo";
import { IncidentReportStatus, IncidentType } from "../db/schema/incident-reports.schema";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import logger from "../config/logger";

export default class IncidentReportService {
  static async getIncidentReports(query: {
    page?: string;
    limit?: string;
    status?: IncidentReportStatus;
    type?: IncidentType;
    search?: string;
  }) {
    const page = parseInt(query.page || "1", 10);
    const limit = parseInt(query.limit || "20", 10);

    const { results, total } = await IncidentReportRepo.findAllAdmin({
      page,
      limit,
      status: query.status,
      type: query.type,
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

  static async resolveIncident(reportId: string, adminId: string, notes: string) {
    const result = await IncidentReportRepo.findById(reportId);
    if (!result) {
      throw new AppError("Incident report not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    if (result.incidentReport.status === IncidentReportStatus.RESOLVED) {
      throw new AppError("Incident report is already resolved", ResponseHelper.BAD_REQUEST);
    }

    const updatedReport = await IncidentReportRepo.update(reportId, {
      status: IncidentReportStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedBy: adminId,
      resolutionNotes: notes,
    });

    await IncidentReportRepo.createAudit({
      reportId,
      meterId: result.incidentReport.meterId,
      action: "INCIDENT_RESOLVED",
      actorId: adminId,
      details: { notes },
    });

    logger.info(`Incident report ${reportId} resolved by admin ${adminId}`);
    return updatedReport;
  }
}

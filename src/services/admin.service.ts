import { desc, eq, and, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import db from "../config/db";
import { users } from "../db/schema/users.schema";
import { gasPurchases } from "../db/schema/gas-purchases.schema";
import { gasTransfers } from "../db/schema/gas-transfers.schema";
import { meterLinkRequests } from "../db/schema/meter-link-requests.schema";
import { UserRepository } from "../repository/user";
import { TransactionRepository } from "../repository/transaction";
import { MeterRepo } from "../repository/meter";
import { GasPurchaseRepository } from "../repository/gas-purchase.repo";
import { IncidentReportRepo } from "../repository/incident-report.repo";
import { AdminInvitationService } from "./admin-invitation.service";
import { adminRoles } from "../db/schema/admin/role.schema";
import { Role } from "../db/schema/users.schema";
import { GroupRepository } from "../repository/admin/group.repo";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";

export interface PlatformActivity {
  id: string;
  type: "USER_REGISTRATION" | "GAS_PURCHASE" | "GAS_TRANSFER" | "METER_LINK_REQUEST";
  title: string;
  description: string;
  userId: string;
  userEmail: string;
  amount?: string;
  createdAt: Date;
}

export class AdminService {
  private static userRepo = new UserRepository();
  private static transactionRepo = new TransactionRepository();
  private static gasPurchaseRepo = new GasPurchaseRepository();
  private static groupRepo = new GroupRepository();

  static async getPlatformStats() {
    const userStats = await this.userRepo.getGlobalStats();
    const meterStats = await MeterRepo.getStats();
    const transactionStats = await this.transactionRepo.getAdminStats();
    const gasStats = await this.gasPurchaseRepo.getGlobalGasSoldStats();
    const activeIncidentsCount = await IncidentReportRepo.countUnresolved();

    return {
      totalUsers: userStats.totalUsers,
      totalMeters: meterStats.total,
      totalTransactions: transactionStats.totalTransactions,
      totalGasPurchased: gasStats.totalGasSoldKg,
      activeIncidents: activeIncidentsCount,
    };
  }

  static async getRecentActivity(limit: number = 10): Promise<PlatformActivity[]> {
    const activities: PlatformActivity[] = [];

    // 1. Recent user registrations
    const recentUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
    recentUsers.forEach((user) => {
      activities.push({
        id: user.id,
        type: "USER_REGISTRATION",
        title: "New User Registered",
        description: `${user.firstName} ${user.lastName} (${user.email})`,
        userId: user.id,
        userEmail: user.email,
        createdAt: user.createdAt,
      });
    });

    // 2. Recent gas purchases
    const buyerAlias = alias(users, "buyer");
    const recentPurchases = await db
      .select({
        purchase: gasPurchases,
        user: buyerAlias,
      })
      .from(gasPurchases)
      .leftJoin(buyerAlias, eq(gasPurchases.userId, buyerAlias.id))
      .orderBy(desc(gasPurchases.createdAt))
      .limit(limit);

    recentPurchases.forEach((p) => {
      activities.push({
        id: p.purchase.id,
        type: "GAS_PURCHASE",
        title: "Gas Purchased",
        description: `${p.purchase.kgPurchased}kg purchased`,
        userId: p.purchase.userId,
        userEmail: p.user?.email || "Unknown",
        amount: (p.purchase.amountPaid / 100).toFixed(2).toString(), // Convert kobo to naira/main currency
        createdAt: p.purchase.createdAt,
      });
    });

    // 3. Recent gas transfers
    const senderAlias = alias(users, "sender");
    const recentTransfers = await db
      .select({
        transfer: gasTransfers,
        sender: senderAlias,
      })
      .from(gasTransfers)
      .leftJoin(senderAlias, eq(gasTransfers.senderId, senderAlias.id))
      .orderBy(desc(gasTransfers.createdAt))
      .limit(limit);

    recentTransfers.forEach((t) => {
      activities.push({
        id: t.transfer.id,
        type: "GAS_TRANSFER",
        title: "Gas Transferred",
        description: `${t.transfer.amountKg}kg sent to user ID ${t.transfer.recipientId}`,
        userId: t.transfer.senderId,
        userEmail: t.sender?.email || "Unknown",
        createdAt: t.transfer.createdAt,
      });
    });

    // 4. Recent meter link requests
    const requesterAlias = alias(users, "requester");
    const recentRequests = await db
      .select({
        request: meterLinkRequests,
        user: requesterAlias,
      })
      .from(meterLinkRequests)
      .leftJoin(requesterAlias, eq(meterLinkRequests.userId, requesterAlias.id))
      .orderBy(desc(meterLinkRequests.createdAt))
      .limit(limit);

    recentRequests.forEach((r) => {
      activities.push({
        id: r.request.id,
        type: "METER_LINK_REQUEST",
        title: "Meter Link Requested",
        description: `Request for status ${r.request.status}`,
        userId: r.request.userId,
        userEmail: r.user?.email || "Unknown",
        createdAt: r.request.createdAt,
      });
    });

    return activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  static async getAdminRoles() {
    return await db.select().from(adminRoles).where(eq(adminRoles.isArchived, false));
  }

  static async getAdminGroups() {
    return await this.groupRepo.findAll();
  }

  static async createAdminGroup(data: { name: string; description?: string }) {
    const existing = await this.groupRepo.findByName(data.name);
    if (existing) {
      throw new AppError("Group name already exists", ResponseHelper.BAD_REQUEST);
    }
    return await this.groupRepo.create(data);
  }

  static async getAllAdmins(currentUserId: string) {
    return await this.userRepo.findAllAdminsWithRoles(currentUserId);
  }

  static async updateAdminRole(id: string, adminRoleId: string, role?: Role) {
    const data: any = { adminRoleId };
    if (role) data.role = role;

    return await this.userRepo.update(id, data);
  }

  static async deleteAdmin(id: string) {
    return await this.userRepo.deleteAdmin(id);
  }

  static async sendAdminInvitation(email: string, roleId: string, invitedBy: string, groupId: string) {
    return await AdminInvitationService.inviteAdmin(email, roleId, invitedBy, groupId);
  }

  static async verifyAdminInvitation(token: string) {
    return await AdminInvitationService.verifyInvitation(token);
  }

  static async completeAdminSetup(tempToken: string, userData: any) {
    return await AdminInvitationService.completeSetup(tempToken, userData);
  }

  static async acceptAdminInvitation(token: string, userData: any) {
    return await AdminInvitationService.acceptInvitation(token, userData);
  }

  static async cancelAdminInvitation(id: string) {
    return await AdminInvitationService.cancelInvitation(id);
  }

  static async getAllInvitations(options: any) {
    return await AdminInvitationService.getAllInvitations(options);
  }
}

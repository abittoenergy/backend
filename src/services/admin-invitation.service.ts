import crypto from "crypto";
import jwt from "jsonwebtoken";
import envConfig from "../config/env";
import { AdminInvitationRepository } from "../repository/admin-invitation.repo";
import { UserRepository } from "../repository/user";
import { InvitationStatus } from "../db/schema/admin/invitations.schema";
import EmailService from "./email.service";
import AppError from "../utils/appError";
import ResponseHelper from "../utils/helpers/response.helper";
import logger from "../config/logger";
import { Role } from "../db/schema/users.schema";
import * as bcrypt from "bcrypt";
import { RoleRepository } from "../repository/admin/role.repo";
import { GroupRepository } from "../repository/admin/group.repo";

export class AdminInvitationService {
  private static userRepo = new UserRepository();
  private static roleRepo = new RoleRepository();
  private static groupRepo = new GroupRepository();

  static async inviteAdmin(email: string, roleId: string, invitedBy: string, groupId: string) {
    const existingUser = await this.userRepo.findByEmail(email);

    // check roleId exists
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new AppError("Role not found", ResponseHelper.BAD_REQUEST);
    }

    // check groupId exists
    const group = await this.groupRepo.findById(groupId);
    if (!group) {
      throw new AppError("Group not found", ResponseHelper.BAD_REQUEST);
    }

    if (existingUser) {
      if (existingUser.adminRoleId === roleId && existingUser.adminGroupId === groupId) {
        throw new AppError("User is already an admin", ResponseHelper.BAD_REQUEST);
      }
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const existingInvitation = await AdminInvitationRepository.findByEmail(email);
    if (existingInvitation && existingInvitation.status === InvitationStatus.PENDING) {
      // just resend the email, update the tokenhash, don't create a new record
      await AdminInvitationRepository.update(existingInvitation.id, {
        tokenHash,
        expiresAt,
      });

    } else {
      await AdminInvitationRepository.create({
        email,
        tokenHash,
        roleId,
        invitedBy,
        groupId,
        expiresAt,
      });
    }

    const invitationLink = `${envConfig.baseUrl}/api/admin/invitations/verify?token=${token}`;

    await EmailService.sendEmail({
      to: email,
      subject: "Invitation to join Abitto Energy Admin Panel",
      template: "admin-invitation",
      context: {
        invitationLink,
        expiresIn: "7 days",
      },
    }).catch(err => logger.error(`Failed to send admin invitation email to ${email}: ${err.message}`));

    return { message: "Invitation sent successfully" };
  }

  static async verifyInvitation(token: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const invitation = await AdminInvitationRepository.findByToken(tokenHash);

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new AppError("Invalid or expired invitation token", ResponseHelper.BAD_REQUEST);
    }

    if (invitation.expiresAt < new Date()) {
      await AdminInvitationRepository.updateStatus(invitation.id, InvitationStatus.EXPIRED);
      throw new AppError("Invitation has expired", ResponseHelper.BAD_REQUEST);
    }

    const existingUser = await this.userRepo.findByEmail(invitation.email);

    if (existingUser && existingUser.passwordHash) {
      return { redirect: `${envConfig.app.adminUrl}/login`, message: "User exists, redirecting to login" };
    }

    const tempToken = jwt.sign(
      {
        email: invitation.email,
        invitationId: invitation.id,
        roleId: invitation.roleId,
        groupId: invitation.groupId
      },
      envConfig.jwt.secret,
      { expiresIn: "1h" }
    );

    return {
      redirect: `${envConfig.app.adminUrl}/setup-profile?token=${tempToken}`,
      message: "New user or no password, redirecting to setup"
    };
  }

  static async completeSetup(tempToken: string, userData: { password: string; firstName: string; lastName: string }) {
    try {
      const decoded = jwt.verify(tempToken, envConfig.jwt.secret) as any;
      const { email, invitationId, roleId, groupId } = decoded;

      const invitation = await AdminInvitationRepository.findById(invitationId);
      if (!invitation || invitation.status !== InvitationStatus.PENDING) {
        throw new AppError("Invalid or expired setup session", ResponseHelper.BAD_REQUEST);
      }

      const saltRounds = envConfig.bcryptSaltRounds || 12;
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // Determine the correct user role from the admin role name
      const adminRole = await this.roleRepo.findById(roleId);
      let userRole: Role = Role.ADMIN;

      if (adminRole) {
        if (adminRole.name.toLowerCase() === "super-admin") userRole = Role.SUPER_ADMIN;
        else if (adminRole.name.toLowerCase() === "installer") userRole = Role.INSTALLER;
      }

      let user = await this.userRepo.findByEmail(email);

      if (!user) {
        user = await this.userRepo.create({
          email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          passwordHash,
          role: userRole,
          adminRoleId: roleId,
          adminGroupId: groupId,
          emailVerified: true,
          isActive: true
        });
      } else {
        await this.userRepo.update(user.id, {
          firstName: userData.firstName,
          lastName: userData.lastName,
          passwordHash,
          role: userRole,
          adminRoleId: roleId,
          adminGroupId: groupId,
          isActive: true
        });
      }

      await AdminInvitationRepository.updateStatus(invitationId, InvitationStatus.ACCEPTED);

      return { message: "Account setup successfully. You can now log in." };
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new AppError("Setup session expired. Please click the link in your email again.", ResponseHelper.BAD_REQUEST);
      }
      throw error;
    }
  }

  static async acceptInvitation(token: string, userData: { password?: string; firstName?: string; lastName?: string }) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const invitation = await AdminInvitationRepository.findByToken(tokenHash);

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new AppError("Invalid or expired invitation token", ResponseHelper.BAD_REQUEST);
    }

    if (invitation.expiresAt < new Date()) {
      await AdminInvitationRepository.updateStatus(invitation.id, InvitationStatus.EXPIRED);
      throw new AppError("Invitation has expired", ResponseHelper.BAD_REQUEST);
    }

    await AdminInvitationRepository.updateStatus(invitation.id, InvitationStatus.ACCEPTED);

    return {
      message: "Invitation accepted successfully",
      email: invitation.email,
      roleId: invitation.roleId
    };
  }

  static async cancelInvitation(id: string) {
    const invitation = await AdminInvitationRepository.findById(id);
    if (!invitation) {
      throw new AppError("Invitation not found", ResponseHelper.RESOURCE_NOT_FOUND);
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new AppError("Only pending invitations can be cancelled", ResponseHelper.BAD_REQUEST);
    }

    return await AdminInvitationRepository.updateStatus(id, InvitationStatus.EXPIRED);
  }

  static async getAllInvitations(options: any) {
    return await AdminInvitationRepository.findAll(options);
  }
}

import * as bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import db from "../../config/db";
import envConfig from "../../config/env";
import { adminGroups } from "../../db/schema/admin/groups.schema";
import { adminRoles } from "../../db/schema/admin/role.schema";
import { Role, users } from "../../db/schema/users.schema";
import { permissions } from "../schema/admin/permissions.schema";
import { rolePermissions } from "../schema/admin/role-permission.schema";

const PERMISSIONS = [
  // Support
  { key: "user_search", description: "Search users", category: "Support" },
  { key: "user_disable", description: "Disable users", category: "Support" },
  { key: "user_enable", description: "Enable users", category: "Support" },
  { key: "refund_transaction", description: "Refund transactions", category: "Support" },
  { key: "send_notification", description: "Send notifications", category: "Support" },

  // User Management
  { key: "user_list", description: "List all users", category: "User Management" },
  { key: "user_view", description: "View user details", category: "User Management" },
  { key: "user_view_kyc", description: "View user KYC", category: "User Management" },
  { key: "user_view_devices", description: "View user devices", category: "User Management" },

  // Admin Management
  { key: "invite_admin", description: "Invite new admins", category: "Admin Management" },
  { key: "view_admins", description: "View all admins", category: "Admin Management" },
  { key: "update_admin_role", description: "Update admin role", category: "Admin Management" },

  // Groups
  { key: "group_create", description: "Create admin group", category: "Groups" },
  { key: "group_list", description: "List admin groups", category: "Groups" },
  { key: "group_view", description: "View admin group", category: "Groups" },
  { key: "group_update", description: "Update admin group", category: "Groups" },
  { key: "group_delete", description: "Delete admin group", category: "Groups" },

  // Roles & Permissions
  { key: "role_list", description: "List roles", category: "Roles & Permissions" },
  { key: "role_create", description: "Create role", category: "Roles & Permissions" },
  { key: "role_view", description: "View role", category: "Roles & Permissions" },
  { key: "role_delete", description: "Delete role", category: "Roles & Permissions" },
  { key: "permission_list", description: "List permissions", category: "Roles & Permissions" },
  { key: "permission_create", description: "Create permission", category: "Roles & Permissions" },
  { key: "permission_assign", description: "Assign permissions", category: "Roles & Permissions" },
  { key: "permission_view", description: "View permission", category: "Roles & Permissions" },
  { key: "permission_update", description: "Update permission", category: "Roles & Permissions" },
  { key: "permission_delete", description: "Delete permission", category: "Roles & Permissions" },

  // Audit & Security
  { key: "audit_approve", description: "Approve audit actions", category: "Audit & Security" },
  { key: "audit_reject", description: "Reject audit actions", category: "Audit & Security" },
  { key: "audit_list", description: "List audit logs", category: "Audit & Security" },
  { key: "audit_view", description: "View audit log", category: "Audit & Security" },
  { key: "cipher_rotate", description: "Rotate cipher", category: "Audit & Security" },
  { key: "cipher_status", description: "View cipher status", category: "Audit & Security" },
  { key: "view_queues", description: "View background queues", category: "Audit & Security" },

  // Transactions
  { key: "transaction_list", description: "List transactions", category: "Transactions" },
  { key: "transaction_view", description: "View transaction details", category: "Transactions" },
  { key: "transaction_flag", description: "Flag transaction", category: "Transactions" },
  { key: "transaction_reverse", description: "Reverse transaction", category: "Transactions" },
  { key: "transaction_export", description: "Export transactions", category: "Transactions" },

  // Analytics
  { key: "analytics_view", description: "View analytics", category: "Analytics" },

  // Finance
  { key: "finance_view_revenue", description: "View revenue reports", category: "Finance" },
  { key: "finance_view_ledger", description: "View daily ledger", category: "Finance" },
  { key: "finance_view_payouts", description: "View payouts", category: "Finance" },
  { key: "finance_view_reconciliation", description: "View reconciliation stats", category: "Finance" },
  { key: "finance_export", description: "Export financial data", category: "Finance" },


  // Support Templates
  { key: "support_template_view", description: "View support templates", category: "Support" },
  { key: "support_template_manage", description: "Manage support templates", category: "Support" },

  // Meter Management
  { key: "meter_list", description: "List all meters", category: "Meter Management" },
  { key: "meter_link", description: "Link meters to users", category: "Meter Management" },
];

const ROLES = {
  SUPER_ADMIN: "super-admin",
  ADMIN: "admin",
  SUPPORT: "support",
  INSTALLER: "installer",
};

const GROUPS = {
  MANAGEMENT: "Management",
  CUSTOMER_SUPPORT: "Customer Support"
};

// Define Permission Sets

const USER_MGMT_PERMS = [
  "user_list",
  "user_view",
  "user_view_kyc",
  "user_view_devices",
  "user_search",
  "user_disable",
  "user_enable",
  "refund_transaction",
  "send_notification"
];
const TRANSACTION_PERMS = [
  "transaction_list",
  "transaction_view",
  "transaction_flag",
  "transaction_reverse",
  "transaction_export"
];


const SUPPORT_PERMS = [
  ...USER_MGMT_PERMS,
  ...TRANSACTION_PERMS,
];

const INSTALLER_PERMS = [
  "user_list",
  "meter_list",
  "meter_link",
];

const ADMIN_PERMS = PERMISSIONS.filter((p) => p.category !== "Groups" && p.category !== "Roles & Permissions").map(
  (p) => p.key
);

const seed: { id: string; name: string; run: () => Promise<void>; dependsOn?: string[]; alwaysRun?: boolean } = {
  id: "001-roles-permissions",
  name: "Seed roles, permissions and default admins",
  alwaysRun: true,
  run: async () => {
    console.log("[001-roles-permissions] Starting...");

    // 1. Sync Permissions
    console.log("[001-roles-permissions] Syncing permissions...");

    for (const perm of PERMISSIONS) {
      const [existing] = await db.select().from(permissions).where(eq(permissions.key, perm.key)).limit(1);
      if (existing) {
        await db
          .update(permissions)
          .set({ description: perm.description, category: perm.category, updatedAt: new Date() })
          .where(eq(permissions.key, perm.key));
      } else {
        await db.insert(permissions).values(perm);
      }
    }

    // 2. Sync Roles
    console.log("[001-roles-permissions] Syncing roles...");
    const rolesToSync = [
      { name: ROLES.SUPER_ADMIN, description: "Super Administrator with full access" },
      { name: ROLES.ADMIN, description: "Administrator with standard access" },
      { name: ROLES.SUPPORT, description: "Customer Support Specialist" },
      { name: ROLES.INSTALLER, description: "Meter Installer with limited access" },
    ];

    for (const role of rolesToSync) {
      const [existing] = await db.select().from(adminRoles).where(eq(adminRoles.name, role.name)).limit(1);
      if (existing) {
        await db
          .update(adminRoles)
          .set({ description: role.description, updatedAt: new Date() })
          .where(eq(adminRoles.name, role.name));
      } else {
        await db.insert(adminRoles).values(role);
      }
    }

    // 3. Sync Groups
    console.log("[001-roles-permissions] Syncing groups...");
    const groupsToSync = [
      { name: GROUPS.MANAGEMENT, description: "Management level group" },
      { name: GROUPS.CUSTOMER_SUPPORT, description: "Customer Support group" }
    ];

    for (const group of groupsToSync) {
      const [existing] = await db.select().from(adminGroups).where(eq(adminGroups.name, group.name)).limit(1);
      if (existing) {
        await db
          .update(adminGroups)
          .set({ description: group.description, updatedAt: new Date() })
          .where(eq(adminGroups.name, group.name));
      } else {
        await db.insert(adminGroups).values(group);
      }
    }

    // 4. Retrieve DB Records for linking
    const allDbPermissions = await db.select().from(permissions);
    const permissionMap = new Map(allDbPermissions.map((p) => [p.key, p.id]));
    const allRoles = await db.select().from(adminRoles);
    const roleMap = new Map(allRoles.map((r) => [r.name, r.id]));
    const managementGroup = (
      await db.select().from(adminGroups).where(eq(adminGroups.name, GROUPS.MANAGEMENT)).limit(1)
    )[0];

    // 5. Assign Permissions to Roles
    console.log("[001-roles-permissions] Assigning permissions...");

    const assign = async (roleName: string, keys: string[]) => {
      const roleId = roleMap.get(roleName);
      if (!roleId) return;

      const permIds = keys.map((k) => permissionMap.get(k)).filter(Boolean) as string[];
      for (const permId of permIds) {
        await db.insert(rolePermissions).values({ roleId: roleId, permissionId: permId }).onConflictDoNothing();
      }
    };

    // Super Admin gets ALL permissions in the DB
    await assign(
      ROLES.SUPER_ADMIN,
      allDbPermissions.map((p) => p.key)
    );

    // Admin gets standard set
    await assign(ROLES.ADMIN, ADMIN_PERMS);

    await assign(ROLES.SUPPORT, SUPPORT_PERMS);

    await assign(ROLES.INSTALLER, INSTALLER_PERMS);


    console.log("[001-roles-permissions] Ensuring default super admin...");
    const superAdminEmail = envConfig.admin.adminEmail;
    const superAdminPassword = envConfig.admin.adminPassword;
    const superAdminUsername = envConfig.admin.adminUsername;
    const superAdminFirstName = envConfig.admin.adminFirstName;
    const superAdminLastName = envConfig.admin.adminLastName;

    if (!superAdminEmail || !superAdminPassword || !superAdminUsername) {
      console.warn("[001-roles-permissions] Missing env vars. Skipping super admin creation.");
      return;
    }

    const superAdminRoleId = roleMap.get(ROLES.SUPER_ADMIN);
    if (!superAdminRoleId || !managementGroup) return;

    const saltRounds = Number(envConfig.bcryptSaltRounds) || 12;
    const pwdHash = await bcrypt.hash(superAdminPassword, saltRounds);

    const [existingUser] = await db.select().from(users).where(eq(users.email, superAdminEmail)).limit(1);

    if (!existingUser) {
      await db.insert(users).values({
        email: superAdminEmail,
        username: superAdminUsername,
        firstName: superAdminFirstName,
        lastName: superAdminLastName,
        passwordHash: pwdHash,
        role: Role.SUPER_ADMIN,
        adminRoleId: superAdminRoleId,
        adminGroupId: managementGroup.id,
        emailVerified: true,
        isActive: true
      });
    } else {
      await db
        .update(users)
        .set({
          passwordHash: pwdHash,
          role: Role.SUPER_ADMIN,
          adminRoleId: superAdminRoleId,
          adminGroupId: managementGroup.id
        })
        .where(eq(users.id, existingUser.id));
    }

    console.log("[001-roles-permissions] Done.");
  }
};

export default seed;

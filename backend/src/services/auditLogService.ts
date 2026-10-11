import { prisma } from '../config/prisma';

export interface AuditLogParams {
  userId?: string;
  action: string;
  entityAffected: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
}

export const logAuditEvent = async (params: AuditLogParams) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityAffected: params.entityAffected,
        entityId: params.entityId,
        detailsJson: params.details ? JSON.stringify(params.details) : undefined,
        ipAddress: params.ipAddress
      }
    });
  } catch (error) {
    console.error('[AuditLog Error] Failed to write audit log:', error);
  }
};

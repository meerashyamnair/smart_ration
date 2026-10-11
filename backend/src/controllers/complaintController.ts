import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { logAuditEvent } from '../services/auditLogService';
import { NotificationService } from '../services/notificationService';
import { ComplaintStatus } from '@prisma/client';

export const submitComplaint = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fpsShopId, category, subject, description, transactionRef } = req.body;
    const userId = req.user?.userId;

    const beneficiary = await prisma.beneficiary.findUnique({
      where: { userId },
      include: { rationCard: true }
    });

    if (!beneficiary || !beneficiary.rationCard) {
      return res.status(404).json({ success: false, message: 'Beneficiary profile not found' });
    }

    // Resolve shopId
    let shopId = beneficiary.rationCard.rationShopId;
    if (fpsShopId && fpsShopId !== 'fps-1') {
      const shop = await prisma.rationShop.findFirst({
        where: { OR: [{ id: fpsShopId }, { shopCode: fpsShopId }] }
      });
      if (shop) shopId = shop.id;
    }

    // Resolve optional transactionId
    let transactionId: string | undefined;
    if (transactionRef) {
      const txn = await prisma.distributionTransaction.findUnique({ where: { transactionRef } });
      if (txn) transactionId = txn.id;
    }

    const ticketId = `TKT_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    const complaint = await prisma.complaint.create({
      data: {
        ticketId,
        beneficiaryId: beneficiary.id,
        rationShopId: shopId,
        transactionId,
        category,
        subject,
        description,
        status: ComplaintStatus.SUBMITTED
      },
      include: { rationShop: true }
    });

    await logAuditEvent({
      userId,
      action: 'SUBMIT_COMPLAINT',
      entityAffected: 'Complaint',
      entityId: complaint.id,
      details: { ticketId, category, shopId },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Grievance ticket submitted successfully',
      data: {
        ...complaint,
        fpsShop: complaint.rationShop
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyComplaints = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const beneficiary = await prisma.beneficiary.findUnique({ where: { userId } });
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary profile not found' });
    }

    const complaints = await prisma.complaint.findMany({
      where: { beneficiaryId: beneficiary.id },
      include: { rationShop: true, transaction: true },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = complaints.map(c => ({
      ...c,
      fpsShop: c.rationShop
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

export const getAllComplaintsAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const complaints = await prisma.complaint.findMany({
      include: {
        beneficiary: { include: { user: true, rationCard: true } },
        rationShop: true,
        transaction: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = complaints.map(c => ({
      ...c,
      fpsShop: c.rationShop
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

export const resolveComplaint = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, adminResponse } = req.body;
    const adminUserId = req.user?.userId;

    const existing = await prisma.complaint.findUnique({
      where: { id },
      include: { beneficiary: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Complaint record not found' });
    }

    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        status: status as ComplaintStatus,
        adminResponse: typeof adminResponse === 'string' ? adminResponse : String(adminResponse || ''),
        resolvedByUserId: adminUserId,
        resolvedAt: status === ComplaintStatus.RESOLVED ? new Date() : undefined
      }
    });

    await logAuditEvent({
      userId: adminUserId,
      action: 'UPDATE_COMPLAINT_STATUS',
      entityAffected: 'Complaint',
      entityId: complaint.id,
      details: { status, adminResponse },
      ipAddress: req.ip
    });

    // Notify Beneficiary of status update & administrative resolution
    if (existing.beneficiary) {
      await NotificationService.send({
        userId: existing.beneficiary.userId,
        title: `Grievance #${complaint.ticketId} Updated (${status})`,
        message: `Your grievance regarding "${complaint.subject}" has been marked as ${status}. Notes: ${complaint.adminResponse || 'Updated by PDS Administrator.'}`,
        type: 'COMPLAINT'
      });
    }

    res.json({ success: true, message: 'Complaint ticket updated successfully', data: complaint });
  } catch (error) {
    next(error);
  }
};

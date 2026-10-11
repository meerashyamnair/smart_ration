import { z } from 'zod';

export enum UserRole {
  BENEFICIARY = 'BENEFICIARY',
  SHOPKEEPER = 'SHOPKEEPER',
  ADMIN = 'ADMIN'
}

export enum RationCategory {
  BPL = 'BPL', // Below Poverty Line
  AAY = 'AAY', // Antyodaya Anna Yojana
  APL = 'APL'  // Above Poverty Line
}

export enum QueueStatus {
  BOOKED = 'BOOKED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  MISSED = 'MISSED'
}

export enum ComplaintStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED'
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: string;
  createdAt: string;
}

export interface BeneficiaryProfileDTO {
  id: string;
  userId: string;
  rationCardNumber: string;
  qrToken: string;
  category: RationCategory;
  familyMembersCount: number;
  fpsShopId: string;
  address: string;
  user?: UserDTO;
  fpsShop?: FPSShopDTO;
}

export interface FPSShopDTO {
  id: string;
  shopCode: string;
  shopName: string;
  address: string;
  district: string;
  pincode: string;
  contactNumber: string;
  shopkeeperId?: string;
  shopkeeper?: UserDTO;
}

export interface RationItemDTO {
  id: string;
  itemCode: string;
  name: string;
  unit: string;
  standardPricePerUnit: number;
}

export interface StockDTO {
  id: string;
  fpsShopId: string;
  rationItemId: string;
  quantityAvailable: number;
  lastUpdated: string;
  rationItem?: RationItemDTO;
}

export interface TransactionDTO {
  id: string;
  transactionRef: string;
  beneficiaryId: string;
  fpsShopId: string;
  timestamp: string;
  totalAmount: number;
  verificationMode: string;
  status: string;
  items: TransactionItemDTO[];
  beneficiary?: BeneficiaryProfileDTO;
  fpsShop?: FPSShopDTO;
}

export interface TransactionItemDTO {
  id: string;
  transactionId: string;
  rationItemId: string;
  quantityDispensed: number;
  pricePerUnit: number;
  totalPrice: number;
  rationItem?: RationItemDTO;
}

// Zod Validation Schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const RegisterBeneficiarySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rationCardNumber: z.string().min(5, 'Invalid Ration Card Number'),
  category: z.nativeEnum(RationCategory),
  familyMembersCount: z.number().int().positive(),
  fpsShopId: z.string().min(1, 'FPS Shop selection is required'),
  address: z.string().min(5, 'Address is required')
});

export const QRVerifySchema = z.object({
  qrToken: z.string().optional(),
  manualReference: z.string().optional()
}).refine(data => data.qrToken || data.manualReference, {
  message: 'Either QR token or manual card reference must be provided'
});

export const DispenseRationSchema = z.object({
  beneficiaryId: z.string(),
  qrToken: z.string().optional(),
  idempotencyKey: z.string().optional(),
  verificationMode: z.string().optional(),
  items: z.array(z.object({
    rationItemId: z.string(),
    quantity: z.number().positive()
  })).min(1, 'At least one ration item must be selected')
});

export const BookQueueSchema = z.object({
  bookingDate: z.string(),
  timeSlot: z.string()
});

export const SubmitComplaintSchema = z.object({
  fpsShopId: z.string(),
  category: z.string().min(2),
  subject: z.string().min(3),
  description: z.string().min(10)
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterBeneficiaryInput = z.infer<typeof RegisterBeneficiarySchema>;
export type QRVerifyInput = z.infer<typeof QRVerifySchema>;
export type DispenseRationInput = z.infer<typeof DispenseRationSchema>;
export type BookQueueInput = z.infer<typeof BookQueueSchema>;
export type SubmitComplaintInput = z.infer<typeof SubmitComplaintSchema>;

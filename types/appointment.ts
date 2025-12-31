/**
 * Appointment Types
 * Strictly typed appointment system for Nexafya
 */

/**
 * Appointment status enum
 */
export enum AppointmentStatus {
  UPCOMING = 'UPCOMING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Appointment type enum
 */
export enum AppointmentType {
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  CHAT = 'CHAT',
  IN_PERSON = 'IN_PERSON',
}

/**
 * Payment status enum
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  HELD_IN_ESCROW = 'HELD_IN_ESCROW',
  RELEASED = 'RELEASED',
}

/**
 * Appointment interface
 * Represents a consultation appointment between patient and doctor
 */
export interface Appointment {
  id: string;
  doctorName: string;
  patientName: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // Time string (HH:MM format)
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  type: AppointmentType;
  doctorId?: string;
  patientId?: string;
  fee?: number;
  meetingLink?: string;
  notes?: string; // Clinical notes storage
  location?: string; // For in-person appointments
}

import { z } from 'zod';

// User validation schemas
export const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+255\d{9}$/, 'Phone must be in format +255XXXXXXXXX'),
  role: z.enum(['PATIENT', 'DOCTOR', 'PHARMACY', 'COURIER', 'ADMIN', 'CHW'], {
    errorMap: () => ({ message: 'Invalid role' })
  }),
});

// Order validation schema
export const orderSchema = z.object({
  patient_id: z.string().min(1, 'Patient ID is required'),
  pharmacy_id: z.string().min(1, 'Pharmacy ID is required'),
  items: z.array(z.object({
    inventory_id: z.string().min(1, 'Inventory ID is required'),
    name: z.string().min(1, 'Item name is required'),
    quantity: z.number().int('Quantity must be an integer').positive('Quantity must be positive'),
    price: z.number().positive('Price must be positive'),
  })).min(1, 'At least one item is required'),
  total: z.number().positive('Total must be positive'),
  location: z.string().min(1, 'Delivery location is required'),
  payment_method: z.enum(['mpesa', 'tigo_pesa', 'airtel_money', 'cash'], {
    errorMap: () => ({ message: 'Invalid payment method' })
  }),
  delivery_address: z.string().optional(),
});

// Inventory validation schema
export const inventorySchema = z.object({
  pharmacy_id: z.string().min(1, 'Pharmacy ID is required'),
  medicine_name: z.string().min(1, 'Medicine name is required'),
  stock: z.number().int('Stock must be an integer').nonnegative('Stock cannot be negative'),
  price: z.number().positive('Price must be positive'),
  category: z.string().optional(),
  expiry_date: z.date().optional().or(z.string().optional()),
  description: z.string().optional(),
  image_url: z.string().url('Invalid image URL').optional().or(z.literal('')),
});

// Appointment validation schema
export const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Patient ID is required'),
  patient_name: z.string().min(1, 'Patient name is required').optional(),
  doctor_id: z.string().min(1, 'Doctor ID is required'),
  doctor_name: z.string().min(1, 'Doctor name is required').optional(),
  date: z.string().or(z.date()),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  type: z.enum(['VIDEO', 'AUDIO', 'CHAT', 'IN_PERSON'], {
    errorMap: () => ({ message: 'Invalid appointment type' })
  }).optional(),
  status: z.enum(['PENDING', 'UPCOMING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'CANCELLED'], {
    errorMap: () => ({ message: 'Invalid appointment status' })
  }).optional(),
  payment_status: z.enum(['PENDING', 'PAID', 'HELD_IN_ESCROW', 'RELEASED'], {
    errorMap: () => ({ message: 'Invalid payment status' })
  }).optional(),
  fee: z.number().nonnegative('Fee cannot be negative').optional(),
  location: z.string().optional(),
  meetingLink: z.string().url('Invalid meeting link URL').optional().or(z.literal('')),
  notes: z.string().optional(),
  reason: z.string().min(1, 'Reason is required').optional(),
});

// Article validation schema
export const articleSchema = z.object({
  author_id: z.string().min(1, 'Author ID is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  image_url: z.string().url('Invalid image URL').optional().or(z.literal('')),
});

// Prescription validation schema
export const prescriptionSchema = z.object({
  patient_id: z.string().min(1, 'Patient ID is required'),
  patient_name: z.string().min(1, 'Patient name is required').optional(),
  doctor_id: z.string().min(1, 'Doctor ID is required'),
  doctor_name: z.string().min(1, 'Doctor name is required').optional(),
  appointment_id: z.string().optional(),
  items: z.array(z.object({
    medication: z.string().min(1, 'Medication name is required'),
    dosage: z.string().min(1, 'Dosage is required'),
    frequency: z.string().min(1, 'Frequency is required'),
    duration: z.string().min(1, 'Duration is required'),
    instructions: z.string().optional(),
  })).min(1, 'At least one medicine is required'),
  medicines: z.array(z.object({
    name: z.string().min(1, 'Medicine name is required'),
    dosage: z.string().min(1, 'Dosage is required'),
    frequency: z.string().min(1, 'Frequency is required'),
    duration: z.string().min(1, 'Duration is required'),
  })).optional(),
  status: z.enum(['ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED'], {
    errorMap: () => ({ message: 'Invalid prescription status' })
  }).optional(),
  notes: z.string().optional(),
  qrCode: z.string().url('Invalid QR code URL').optional().or(z.literal('')),
  expiresAt: z.date().or(z.string()).optional(),
});

// Subscription validation schema
export const subscriptionSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  plan: z.enum(['BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'PREMIUM'], {
    errorMap: () => ({ message: 'Invalid subscription plan' })
  }),
  price: z.number().nonnegative('Price cannot be negative'),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  autoRenew: z.boolean().optional(),
});

// Health Record validation schema
export const healthRecordSchema = z.object({
  patient_id: z.string().min(1, 'Patient ID is required'),
  record_type: z.enum(['VITALS', 'LAB_RESULT', 'DIAGNOSIS', 'TREATMENT', 'MEDICATION', 'ALLERGY', 'IMMUNIZATION', 'OTHER']),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
  date: z.string().or(z.date()),
  doctor_id: z.string().optional(),
  clinic_name: z.string().optional(),
  attachments: z.array(z.string().url()).optional(),
});

// Family Member validation schema
export const familyMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  relationship: z.enum(['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER']),
  dateOfBirth: z.string().or(z.date()).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  phone: z.string().regex(/^\+255\d{9}$/, 'Phone must be in format +255XXXXXXXXX').optional(),
});

/**
 * Sanitize input to prevent XSS attacks
 * @param input - String input to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validate and sanitize data against a schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with sanitized data or errors
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: boolean; data?: T; errors?: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Get user-friendly error messages from Zod errors
 * @param errors - Zod error object
 * @returns Array of error messages
 */
export function getValidationErrors(errors: z.ZodError): string[] {
  return errors.errors.map(err => {
    const path = err.path.join('.');
    return err.message || `${path} is invalid`;
  });
}

/**
 * Format validation error for display
 * @param errors - Zod error object
 * @returns Formatted error message string
 */
export function formatValidationError(errors: z.ZodError): string {
  const errorMessages = getValidationErrors(errors);
  return errorMessages.join(', ');
}

export type ReservationStatus =
  | 'inquiry'
  | 'reserved'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show'
  | 'completed';

export type RoomStatus =
  | 'vacant'
  | 'occupied'
  | 'cleaning'
  | 'maintenance'
  | 'out_of_service'
  | 'blocked'
  | 'reserved';

export type HousekeepingStatus =
  'pending' | 'in_progress' | 'inspected' | 'completed';

export type MaintenanceStatus =
  'reported' | 'assigned' | 'in_progress' | 'resolved' | 'verified';

export type RoomView =
  'garden' | 'pool' | 'sea' | 'city' | 'mountain' | 'courtyard' | 'none';

export type BoardType =
  'room_only' | 'bed_breakfast' | 'half_board' | 'full_board' | 'all_inclusive';

export type BookingSource =
  'direct' | 'walk_in' | 'ota' | 'corporate' | 'agent';

export type ChargeCategory =
  | 'room_tariff'
  | 'restaurant'
  | 'bar'
  | 'room_service'
  | 'laundry'
  | 'extra_bed'
  | 'amenities'
  | 'service_charge'
  | 'tax'
  | 'deposit'
  | 'other';

export type PaymentMode =
  'cash' | 'upi' | 'card' | 'bank' | 'credit' | 'online';

export type FolioStatus =
  'open' | 'closed' | 'partially_paid' | 'paid' | 'cancelled';

export type RoomEventType =
  | 'RESERVATION_CREATED'
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_CANCELLED'
  | 'GUEST_CHECKED_IN'
  | 'GUEST_CHECKED_OUT'
  | 'ROOM_OCCUPIED'
  | 'ROOM_VACANT'
  | 'ROOM_ASSIGNED'
  | 'ROOM_TRANSFERRED'
  | 'ROOM_UPGRADED'
  | 'ROOM_BLOCKED'
  | 'HOUSEKEEPING_STARTED'
  | 'HOUSEKEEPING_COMPLETED'
  | 'MAINTENANCE_OPENED'
  | 'MAINTENANCE_CLOSED'
  | 'CHARGE_POSTED'
  | 'PAYMENT_RECEIVED'
  | 'NIGHT_AUDIT_COMPLETED'
  | 'FOLIO_CLOSED'
  | 'STAY_EXTENDED';

export interface RoomType {
  id: string;
  name: string;
  code: string;
  description: string | null;
  baseRate: number;
  capacity: number;
  maxAdults: number;
  maxChildren: number;
  sizeSqft: number | null;
  bedType: string;
  amenities: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  roomNo: string;
  roomTypeId: string;
  roomTypeName: string;
  floor: number;
  view: RoomView;
  status: RoomStatus;
  isSmoking: boolean;
  isActive: boolean;
  notes: string | null;
  currentStayId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  idProofType: string | null;
  idProofNumber: string | null;
  idProofImage: string | null;
  nationality: string;
  isCorporate: boolean;
  companyName: string | null;
  companyGst: string | null;
  isBlacklisted: boolean;
  preferences: string | null;
  totalStays: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Reservation {
  id: string;
  reservationNo: string;
  guestId: string | null;
  guestName: string;
  guestPhone: string;
  guestEmail: string | null;
  roomTypeId: string | null;
  roomTypeName: string | null;
  roomId: string | null;
  roomNo: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  boardType: BoardType;
  status: ReservationStatus;
  source: BookingSource;
  sourceRef: string | null;
  specialRequests: string | null;
  corporateName: string | null;
  corporateGst: string | null;
  rateOverride: number | null;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Stay {
  id: string;
  reservationId: string | null;
  reservationNo: string | null;
  guestId: string;
  guestName: string;
  guestPhone: string;
  roomId: string;
  roomNo: string;
  roomTypeId: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string | null;
  expectedCheckOut: string;
  nights: number;
  adults: number;
  children: number;
  boardType: BoardType;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  folioId: string | null;
  folioNumber: string | null;
  balanceAmount: number;
  status: string;
  notes: string | null;
  checkedInBy: string | null;
  checkedOutBy: string | null;
  checkedOutAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomAssignment {
  id: string;
  stayId: string;
  roomId: string;
  roomNo: string;
  assignedAt: string;
  assignedBy: string | null;
  releasedAt: string | null;
  reason: string | null;
}

export interface Folio {
  id: string;
  folioNumber: string;
  stayId: string;
  guestId: string;
  guestName: string;
  roomNo: string;
  status: FolioStatus;
  roomCharges: number;
  restaurantCharges: number;
  barCharges: number;
  roomServiceCharges: number;
  laundryCharges: number;
  extraBedCharges: number;
  amenitiesCharges: number;
  serviceCharge: number;
  taxAmount: number;
  discounts: number;
  totalCharges: number;
  totalPayments: number;
  balanceAmount: number;
  notes: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  charges: FolioCharge[];
  payments: FolioPayment[];
}

export interface FolioCharge {
  id: string;
  folioId: string;
  category: ChargeCategory;
  description: string;
  amount: number;
  quantity: number;
  totalAmount: number;
  taxAmount: number;
  reference: string | null;
  postedAt: string;
  postedBy: string | null;
  notes: string | null;
}

export interface FolioPayment {
  id: string;
  folioId: string;
  mode: PaymentMode;
  amount: number;
  reference: string | null;
  processedAt: string;
  processedBy: string | null;
  notes: string | null;
}

export interface HousekeepingTask {
  id: string;
  roomId: string;
  roomNo: string;
  taskType: string;
  status: HousekeepingStatus;
  assignedTo: string | null;
  priority: number;
  scheduledDate: string;
  completedAt: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRequest {
  id: string;
  roomId: string;
  roomNo: string;
  issueType: string;
  description: string;
  status: MaintenanceStatus;
  priority: number;
  assignedTo: string | null;
  reportedBy: string;
  resolvedAt: string | null;
  resolution: string | null;
  verifiedBy: string | null;
  cost: number;
  createdAt: string;
  updatedAt: string;
}

export interface NightAudit {
  id: string;
  auditDate: string;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  outOfServiceRooms: number;
  blockedRooms: number;
  housekeepingRooms: number;
  totalRevenue: number;
  roomRevenue: number;
  restaurantRevenue: number;
  barRevenue: number;
  otherRevenue: number;
  totalTax: number;
  totalDiscounts: number;
  totalPayments: number;
  outstandingBalance: number;
  occupancyPercent: number;
  adr: number;
  revpar: number;
  status: string;
  notes: string | null;
  performedBy: string;
  createdAt: string;
}

export interface RoomEvent {
  id: string;
  eventType: RoomEventType;
  aggregateType: string;
  aggregateId: string;
  data: string | null;
  createdBy: string | null;
  timestamp: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}

export const RESERVATION_TRANSITIONS: Record<
  ReservationStatus,
  ReservationStatus[]
> = {
  inquiry: ['reserved', 'cancelled'],
  reserved: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['checked_out', 'cancelled'],
  checked_out: ['completed'],
  cancelled: [],
  no_show: [],
  completed: [],
};

export const RESERVATION_TRANSITION_PERMISSIONS: Record<string, string[]> = {
  'inquiry->reserved': ['reception', 'manager', 'owner'],
  'reserved->confirmed': ['reception', 'manager', 'owner'],
  'confirmed->checked_in': ['reception', 'manager', 'owner'],
  'checked_in->checked_out': ['reception', 'manager', 'owner'],
  'checked_out->completed': ['reception', 'manager', 'owner', 'accountant'],
  'inquiry->cancelled': ['reception', 'manager', 'owner'],
  'reserved->cancelled': ['reception', 'manager', 'owner'],
  'confirmed->cancelled': ['manager', 'owner'],
  'checked_in->cancelled': ['manager', 'owner'],
  'reserved->no_show': ['reception', 'manager', 'owner'],
  'confirmed->no_show': ['reception', 'manager', 'owner'],
};

export const VALID_RESERVATION_STATUSES: ReservationStatus[] = [
  'inquiry',
  'reserved',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
  'completed',
];

export const VALID_ROOM_STATUSES: RoomStatus[] = [
  'vacant',
  'occupied',
  'cleaning',
  'maintenance',
  'out_of_service',
  'blocked',
  'reserved',
];

export const VALID_CHARGE_CATEGORIES: ChargeCategory[] = [
  'room_tariff',
  'restaurant',
  'bar',
  'room_service',
  'laundry',
  'extra_bed',
  'amenities',
  'service_charge',
  'tax',
  'deposit',
  'other',
];

export const VALID_PAYMENT_MODES: PaymentMode[] = [
  'cash',
  'upi',
  'card',
  'bank',
  'credit',
  'online',
];

export const VALID_BOOKING_SOURCES: BookingSource[] = [
  'direct',
  'walk_in',
  'ota',
  'corporate',
  'agent',
];

export const VALID_BOARD_TYPES: BoardType[] = [
  'room_only',
  'bed_breakfast',
  'half_board',
  'full_board',
  'all_inclusive',
];

export interface CreateRoomTypeDto {
  name: string;
  code: string;
  description?: string;
  baseRate: number;
  capacity?: number;
  maxAdults?: number;
  maxChildren?: number;
  sizeSqft?: number;
  bedType?: string;
  amenities?: string;
}

export interface CreateRoomDto {
  roomNo: string;
  roomTypeId: string;
  floor?: number;
  view?: RoomView;
  isSmoking?: boolean;
  notes?: string;
}

export interface CreateGuestDto {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  idProofType?: string;
  idProofNumber?: string;
  nationality?: string;
  isCorporate?: boolean;
  companyName?: string;
  companyGst?: string;
  preferences?: string;
}

export interface CreateReservationDto {
  guestId?: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  roomTypeId?: string;
  roomId?: string;
  checkIn: string;
  checkOut: string;
  adults?: number;
  children?: number;
  boardType?: BoardType;
  source?: BookingSource;
  sourceRef?: string;
  specialRequests?: string;
  corporateName?: string;
  corporateGst?: string;
  rateOverride?: number;
  discountPercent?: number;
  notes?: string;
}

export interface CheckInDto {
  reservationId: string;
  roomId: string;
  adults?: number;
  children?: number;
  idProofType?: string;
  idProofNumber?: string;
  advanceAmount?: number;
  advanceMode?: PaymentMode;
  specialRequests?: string;
}

export interface CheckOutDto {
  stayId: string;
  paymentMode?: PaymentMode;
  notes?: string;
}

export interface CreateFolioChargeDto {
  folioId: string;
  category: ChargeCategory;
  description: string;
  amount: number;
  quantity?: number;
  taxAmount?: number;
  reference?: string;
  notes?: string;
}

export interface CreateFolioPaymentDto {
  folioId: string;
  mode: PaymentMode;
  amount: number;
  reference?: string;
  notes?: string;
}

export interface CreateHousekeepingDto {
  roomId: string;
  taskType: string;
  assignedTo?: string;
  priority?: number;
  scheduledDate: string;
  notes?: string;
}

export interface CreateMaintenanceDto {
  roomId: string;
  issueType: string;
  description: string;
  priority?: number;
  reportedBy: string;
  notes?: string;
}

export interface ReservationFilter {
  status?: ReservationStatus;
  roomTypeId?: string;
  guestId?: string;
  source?: BookingSource;
  fromDate?: string;
  toDate?: string;
  search?: string;
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface RoomFilter {
  roomTypeId?: string;
  status?: RoomStatus;
  floor?: number;
  view?: RoomView;
  isActive?: boolean;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface GuestFilter {
  search?: string;
  isCorporate?: boolean;
  isBlacklisted?: boolean;
  offset?: number;
  limit?: number;
}

export interface FolioFilter {
  status?: FolioStatus;
  guestId?: string;
  stayId?: string;
  offset?: number;
  limit?: number;
}

export interface HousekeepingFilter {
  status?: HousekeepingStatus;
  roomId?: string;
  assignedTo?: string;
  fromDate?: string;
  toDate?: string;
  offset?: number;
  limit?: number;
}

export interface MaintenanceFilter {
  status?: MaintenanceStatus;
  roomId?: string;
  assignedTo?: string;
  priority?: number;
  issueType?: string;
  offset?: number;
  limit?: number;
}

export interface OccupancyReport {
  date: string;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  occupancyPercent: number;
  outOfService: number;
  blocked: number;
  cleaning: number;
  revenue: number;
  adr: number;
  revpar: number;
}

export interface RevenueReport {
  fromDate: string;
  toDate: string;
  roomRevenue: number;
  restaurantRevenue: number;
  barRevenue: number;
  roomServiceRevenue: number;
  laundryRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  totalTax: number;
  totalDiscounts: number;
  netRevenue: number;
}

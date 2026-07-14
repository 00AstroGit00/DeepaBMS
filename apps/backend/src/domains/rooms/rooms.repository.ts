import { query, run } from '../../db';
import * as T from './rooms.types';

function rowToRoomType(row: any): T.RoomType {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description || null,
    baseRate: Number(row.base_rate),
    capacity: Number(row.capacity ?? 2),
    maxAdults: Number(row.max_adults ?? 2),
    maxChildren: Number(row.max_children ?? 1),
    sizeSqft: row.size_sqft ? Number(row.size_sqft) : null,
    bedType: row.bed_type || 'queen',
    amenities: row.amenities || null,
    isActive: Boolean(row.is_active ?? true),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToRoom(row: any): T.Room {
  return {
    id: row.id,
    roomNo: row.room_no,
    roomTypeId: row.room_type_id,
    roomTypeName: row.room_type_name || '',
    floor: Number(row.floor ?? 1),
    view: row.view || 'none',
    status: row.status,
    isSmoking: Boolean(row.is_smoking ?? false),
    isActive: Boolean(row.is_active ?? true),
    notes: row.notes || null,
    currentStayId: row.current_stay_id || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToGuest(row: any): T.Guest {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || null,
    address: row.address || null,
    idProofType: row.id_proof_type || null,
    idProofNumber: row.id_proof_number || null,
    idProofImage: row.id_proof_image || null,
    nationality: row.nationality || 'Indian',
    isCorporate: Boolean(row.is_corporate ?? false),
    companyName: row.company_name || null,
    companyGst: row.company_gst || null,
    isBlacklisted: Boolean(row.is_blacklisted ?? false),
    preferences: row.preferences || null,
    totalStays: Number(row.total_stays || 0),
    totalRevenue: Number(row.total_revenue || 0),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToReservation(row: any): T.Reservation {
  return {
    id: row.id,
    reservationNo: row.reservation_no,
    guestId: row.guest_id || null,
    guestName: row.guest_name || '',
    guestPhone: row.guest_phone || '',
    guestEmail: row.guest_email || null,
    roomTypeId: row.room_type_id || null,
    roomTypeName: row.room_type_name || null,
    roomId: row.room_id || null,
    roomNo: row.room_no || null,
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: Number(row.nights),
    adults: Number(row.adults ?? 1),
    children: Number(row.children ?? 0),
    boardType: row.board_type || 'room_only',
    status: row.status,
    source: row.source || 'direct',
    sourceRef: row.source_ref || null,
    specialRequests: row.special_requests || null,
    corporateName: row.corporate_name || null,
    corporateGst: row.corporate_gst || null,
    rateOverride: row.rate_override ? Number(row.rate_override) : null,
    discountPercent: Number(row.discount_percent || 0),
    discountAmount: Number(row.discount_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    advanceAmount: Number(row.advance_amount || 0),
    balanceAmount: Number(row.balance_amount || 0),
    notes: row.notes || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToStay(row: any): T.Stay {
  return {
    id: row.id,
    reservationId: row.reservation_id || null,
    reservationNo: row.reservation_no || null,
    guestId: row.guest_id,
    guestName: row.guest_name,
    guestPhone: row.guest_phone,
    roomId: row.room_id,
    roomNo: row.room_no,
    roomTypeId: row.room_type_id,
    roomTypeName: row.room_type_name,
    checkIn: row.check_in,
    checkOut: row.check_out || null,
    expectedCheckOut: row.expected_check_out,
    nights: Number(row.nights),
    adults: Number(row.adults ?? 1),
    children: Number(row.children ?? 0),
    boardType: row.board_type || 'room_only',
    rate: Number(row.rate),
    discountPercent: Number(row.discount_percent || 0),
    discountAmount: Number(row.discount_amount || 0),
    folioId: row.folio_id || null,
    folioNumber: row.folio_number || null,
    balanceAmount: Number(row.balance_amount || 0),
    status: row.status || 'active',
    notes: row.notes || null,
    checkedInBy: row.checked_in_by || null,
    checkedOutBy: row.checked_out_by || null,
    checkedOutAt: row.checked_out_at || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToAssignment(row: any): T.RoomAssignment {
  return {
    id: row.id,
    stayId: row.stay_id,
    roomId: row.room_id,
    roomNo: row.room_no,
    assignedAt: row.assigned_at || '',
    assignedBy: row.assigned_by || null,
    releasedAt: row.released_at || null,
    reason: row.reason || null,
  };
}

function rowToFolio(row: any): T.Folio {
  return {
    id: row.id,
    folioNumber: row.folio_number,
    stayId: row.stay_id,
    guestId: row.guest_id,
    guestName: row.guest_name,
    roomNo: row.room_no,
    status: row.status || 'open',
    roomCharges: Number(row.room_charges || 0),
    restaurantCharges: Number(row.restaurant_charges || 0),
    barCharges: Number(row.bar_charges || 0),
    roomServiceCharges: Number(row.room_service_charges || 0),
    laundryCharges: Number(row.laundry_charges || 0),
    extraBedCharges: Number(row.extra_bed_charges || 0),
    amenitiesCharges: Number(row.amenities_charges || 0),
    serviceCharge: Number(row.service_charge || 0),
    taxAmount: Number(row.tax_amount || 0),
    discounts: Number(row.discounts || 0),
    totalCharges: Number(row.total_charges || 0),
    totalPayments: Number(row.total_payments || 0),
    balanceAmount: Number(row.balance_amount || 0),
    notes: row.notes || null,
    closedAt: row.closed_at || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    charges: [],
    payments: [],
  };
}

function rowToFolioCharge(row: any): T.FolioCharge {
  return {
    id: row.id,
    folioId: row.folio_id,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
    quantity: Number(row.quantity ?? 1),
    totalAmount: Number(row.total_amount),
    taxAmount: Number(row.tax_amount || 0),
    reference: row.reference || null,
    postedAt: row.posted_at || '',
    postedBy: row.posted_by || null,
    notes: row.notes || null,
  };
}

function rowToFolioPayment(row: any): T.FolioPayment {
  return {
    id: row.id,
    folioId: row.folio_id,
    mode: row.mode,
    amount: Number(row.amount),
    reference: row.reference || null,
    processedAt: row.processed_at || '',
    processedBy: row.processed_by || null,
    notes: row.notes || null,
  };
}

function rowToHousekeepingTask(row: any): T.HousekeepingTask {
  return {
    id: row.id,
    roomId: row.room_id,
    roomNo: row.room_no,
    taskType: row.task_type,
    status: row.status || 'pending',
    assignedTo: row.assigned_to || null,
    priority: Number(row.priority || 0),
    scheduledDate: row.scheduled_date,
    completedAt: row.completed_at || null,
    notes: row.notes || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToMaintenanceRequest(row: any): T.MaintenanceRequest {
  return {
    id: row.id,
    roomId: row.room_id,
    roomNo: row.room_no,
    issueType: row.issue_type,
    description: row.description,
    status: row.status || 'reported',
    priority: Number(row.priority || 0),
    assignedTo: row.assigned_to || null,
    reportedBy: row.reported_by,
    resolvedAt: row.resolved_at || null,
    resolution: row.resolution || null,
    verifiedBy: row.verified_by || null,
    cost: Number(row.cost || 0),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function rowToNightAudit(row: any): T.NightAudit {
  return {
    id: row.id,
    auditDate: row.audit_date,
    totalRooms: Number(row.total_rooms),
    occupiedRooms: Number(row.occupied_rooms),
    vacantRooms: Number(row.vacant_rooms),
    outOfServiceRooms: Number(row.out_of_service_rooms || 0),
    blockedRooms: Number(row.blocked_rooms || 0),
    housekeepingRooms: Number(row.housekeeping_rooms || 0),
    totalRevenue: Number(row.total_revenue || 0),
    roomRevenue: Number(row.room_revenue || 0),
    restaurantRevenue: Number(row.restaurant_revenue || 0),
    barRevenue: Number(row.bar_revenue || 0),
    otherRevenue: Number(row.other_revenue || 0),
    totalTax: Number(row.total_tax || 0),
    totalDiscounts: Number(row.total_discounts || 0),
    totalPayments: Number(row.total_payments || 0),
    outstandingBalance: Number(row.outstanding_balance || 0),
    occupancyPercent: Number(row.occupancy_percent || 0),
    adr: Number(row.adr || 0),
    revpar: Number(row.revpar || 0),
    status: row.status || 'draft',
    notes: row.notes || null,
    performedBy: row.performed_by,
    createdAt: row.created_at || '',
  };
}

function rowToRoomEvent(row: any): T.RoomEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    data: row.data || null,
    createdBy: row.created_by || null,
    timestamp: row.timestamp || '',
  };
}

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function buildWhere(conditions: string[], params: any[]): string {
  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

function safeOrder(
  orderBy?: string,
  orderDir?: string,
): { field: string; dir: string } {
  const allowedOrders: Record<string, string> = {
    created_at: 'created_at',
    updated_at: 'updated_at',
    name: 'name',
    room_no: 'room_no',
    check_in: 'check_in',
    check_out: 'check_out',
    status: 'status',
    total_amount: 'total_amount',
    reservation_no: 'reservation_no',
    floor: 'floor',
    audit_date: 'audit_date',
    scheduled_date: 'scheduled_date',
    priority: 'priority',
    base_rate: 'base_rate',
  };
  const field = allowedOrders[orderBy || ''] || 'created_at';
  const dir = orderDir === 'desc' ? 'DESC' : 'ASC';
  return { field, dir };
}

async function reservationNo(): Promise<string> {
  const d = new Date();
  const year = d.getFullYear().toString();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `RSV-${year}${month}-`;
  const rows = await query(
    'SELECT COUNT(*) as cnt FROM reservations WHERE reservation_no LIKE ?',
    [`${prefix}%`],
  );
  const seq = (Number(rows[0]?.cnt || 0) + 1).toString().padStart(4, '0');
  return `${prefix}${seq}`;
}

async function folioNumber(): Promise<string> {
  const d = new Date();
  const year = d.getFullYear().toString();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `FIO-${year}${month}-`;
  const rows = await query(
    'SELECT COUNT(*) as cnt FROM folios WHERE folio_number LIKE ?',
    [`${prefix}%`],
  );
  const seq = (Number(rows[0]?.cnt || 0) + 1).toString().padStart(4, '0');
  return `${prefix}${seq}`;
}

export const RoomsRepository = {
  // ── Room Types ─────────────────────────────────────────────────────────

  async findAllRoomTypes(filter?: {
    search?: string;
    offset?: number;
    limit?: number;
  }): Promise<T.PaginatedResult<T.RoomType>> {
    const conditions: string[] = ['is_active = 1'];
    const params: any[] = [];
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;

    if (filter?.search) {
      conditions.push('(name LIKE ? OR code LIKE ?)');
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM room_types ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM room_types ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToRoomType), total, offset, limit };
  },

  async findRoomTypeById(id: string): Promise<T.RoomType | null> {
    const rows = await query('SELECT * FROM room_types WHERE id = ?', [id]);
    return rows.length ? rowToRoomType(rows[0]) : null;
  },

  async findRoomTypeByCode(code: string): Promise<T.RoomType | null> {
    const rows = await query('SELECT * FROM room_types WHERE code = ?', [code]);
    return rows.length ? rowToRoomType(rows[0]) : null;
  },

  async createRoomType(dto: T.CreateRoomTypeDto): Promise<T.RoomType> {
    const id = uid('rtp');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO room_types (id, name, code, description, base_rate, capacity, max_adults, max_children, size_sqft, bed_type, amenities, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id,
        dto.name,
        dto.code,
        dto.description || null,
        dto.baseRate,
        dto.capacity ?? 2,
        dto.maxAdults ?? 2,
        dto.maxChildren ?? 1,
        dto.sizeSqft || null,
        dto.bedType || 'queen',
        dto.amenities || null,
        now,
        now,
      ],
    );
    const rows = await query('SELECT * FROM room_types WHERE id = ?', [id]);
    return rowToRoomType(rows[0]);
  },

  async updateRoomType(
    id: string,
    changes: Partial<T.CreateRoomTypeDto>,
  ): Promise<T.RoomType> {
    const existing = await this.findRoomTypeById(id);
    if (!existing) throw new Error(`Room type not found: ${id}`);

    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (changes.name !== undefined) {
      sets.push('name = ?');
      params.push(changes.name);
    }
    if (changes.code !== undefined) {
      sets.push('code = ?');
      params.push(changes.code);
    }
    if (changes.description !== undefined) {
      sets.push('description = ?');
      params.push(changes.description);
    }
    if (changes.baseRate !== undefined) {
      sets.push('base_rate = ?');
      params.push(changes.baseRate);
    }
    if (changes.capacity !== undefined) {
      sets.push('capacity = ?');
      params.push(changes.capacity);
    }
    if (changes.maxAdults !== undefined) {
      sets.push('max_adults = ?');
      params.push(changes.maxAdults);
    }
    if (changes.maxChildren !== undefined) {
      sets.push('max_children = ?');
      params.push(changes.maxChildren);
    }
    if (changes.sizeSqft !== undefined) {
      sets.push('size_sqft = ?');
      params.push(changes.sizeSqft);
    }
    if (changes.bedType !== undefined) {
      sets.push('bed_type = ?');
      params.push(changes.bedType);
    }
    if (changes.amenities !== undefined) {
      sets.push('amenities = ?');
      params.push(changes.amenities);
    }

    if (params.length === 1) return existing;
    await run(`UPDATE room_types SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findRoomTypeById(id))!;
  },

  async archiveRoomType(id: string): Promise<void> {
    await run(
      'UPDATE room_types SET is_active = 0, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id],
    );
  },

  // ── Rooms ──────────────────────────────────────────────────────────────

  async findAllRooms(
    filter?: T.RoomFilter,
  ): Promise<T.PaginatedResult<T.Room>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;

    if (filter?.status) {
      conditions.push('r.status = ?');
      params.push(filter.status);
    }
    if (filter?.roomTypeId) {
      conditions.push('r.room_type_id = ?');
      params.push(filter.roomTypeId);
    }
    if (filter?.floor !== undefined) {
      conditions.push('r.floor = ?');
      params.push(filter.floor);
    }
    if (filter?.view) {
      conditions.push('r.view = ?');
      params.push(filter.view);
    }
    if (filter?.isActive !== undefined) {
      conditions.push('r.is_active = ?');
      params.push(filter.isActive ? 1 : 0);
    }
    if (filter?.search) {
      conditions.push('(r.room_no LIKE ? OR rt.name LIKE ?)');
      params.push(`%${filter.search}%`, `%${filter.search}%`);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM rooms r LEFT JOIN room_types rt ON r.room_type_id = rt.id ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT r.*, rt.name as room_type_name
       FROM rooms r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       ${where}
       ORDER BY r.room_no ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToRoom), total, offset, limit };
  },

  async findRoomById(id: string): Promise<T.Room | null> {
    const rows = await query(
      `SELECT r.*, rt.name as room_type_name
       FROM rooms r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       WHERE r.id = ?`,
      [id],
    );
    return rows.length ? rowToRoom(rows[0]) : null;
  },

  async findRoomByNo(roomNo: string): Promise<T.Room | null> {
    const rows = await query(
      `SELECT r.*, rt.name as room_type_name
       FROM rooms r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       WHERE r.room_no = ?`,
      [roomNo],
    );
    return rows.length ? rowToRoom(rows[0]) : null;
  },

  async findRoomsByType(roomTypeId: string): Promise<T.Room[]> {
    const rows = await query(
      `SELECT r.*, rt.name as room_type_name
       FROM rooms r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       WHERE r.room_type_id = ? AND r.is_active = 1
       ORDER BY r.room_no`,
      [roomTypeId],
    );
    return rows.map(rowToRoom);
  },

  async findAvailableRooms(
    checkIn: string,
    checkOut: string,
    roomTypeId?: string,
  ): Promise<T.Room[]> {
    const conditions: string[] = ["r.status = 'vacant'", 'r.is_active = 1'];
    const params: any[] = [];

    conditions.push(
      "r.id NOT IN (SELECT room_id FROM reservations WHERE status IN ('reserved', 'confirmed', 'checked_in') AND room_id IS NOT NULL AND check_out > ? AND check_in < ?)",
    );
    params.push(checkIn, checkOut);

    if (roomTypeId) {
      conditions.push('r.room_type_id = ?');
      params.push(roomTypeId);
    }

    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT r.*, rt.name as room_type_name
       FROM rooms r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       ${where}
       ORDER BY r.room_no`,
      params,
    );
    return rows.map(rowToRoom);
  },

  async findRoomsByStatus(status: T.RoomStatus): Promise<T.Room[]> {
    const rows = await query(
      `SELECT r.*, rt.name as room_type_name
       FROM rooms r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       WHERE r.status = ?
       ORDER BY r.room_no`,
      [status],
    );
    return rows.map(rowToRoom);
  },

  async createRoom(dto: T.CreateRoomDto): Promise<T.Room> {
    const existing = await this.findRoomByNo(dto.roomNo);
    if (existing)
      throw new Error(`Room with number ${dto.roomNo} already exists`);

    const roomType = await this.findRoomTypeById(dto.roomTypeId);
    if (!roomType) throw new Error(`Room type not found: ${dto.roomTypeId}`);

    const id = uid('rom');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO rooms (id, room_no, room_type_id, floor, view, status, is_smoking, is_active, notes, current_stay_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'vacant', ?, 1, NULL, NULL, ?, ?)`,
      [
        id,
        dto.roomNo,
        dto.roomTypeId,
        dto.floor ?? 1,
        dto.view || 'none',
        dto.isSmoking ?? false,
        now,
        now,
      ],
    );
    const rows = await query(
      `SELECT r.*, rt.name as room_type_name
       FROM rooms r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       WHERE r.id = ?`,
      [id],
    );
    return rowToRoom(rows[0]);
  },

  async updateRoom(
    id: string,
    changes: Partial<
      T.CreateRoomDto & {
        status: T.RoomStatus;
        notes: string;
        isActive: boolean;
      }
    >,
  ): Promise<T.Room> {
    const existing = await this.findRoomById(id);
    if (!existing) throw new Error(`Room not found: ${id}`);

    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (changes.roomNo !== undefined) {
      sets.push('room_no = ?');
      params.push(changes.roomNo);
    }
    if (changes.roomTypeId !== undefined) {
      sets.push('room_type_id = ?');
      params.push(changes.roomTypeId);
    }
    if (changes.floor !== undefined) {
      sets.push('floor = ?');
      params.push(changes.floor);
    }
    if (changes.view !== undefined) {
      sets.push('view = ?');
      params.push(changes.view);
    }
    if (changes.status !== undefined) {
      sets.push('status = ?');
      params.push(changes.status);
    }
    if (changes.isSmoking !== undefined) {
      sets.push('is_smoking = ?');
      params.push(changes.isSmoking ? 1 : 0);
    }
    if (changes.isActive !== undefined) {
      sets.push('is_active = ?');
      params.push(changes.isActive ? 1 : 0);
    }
    if (changes.notes !== undefined) {
      sets.push('notes = ?');
      params.push(changes.notes);
    }

    if (params.length === 1) return existing;
    await run(`UPDATE rooms SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findRoomById(id))!;
  },

  async updateRoomStatus(
    id: string,
    status: T.RoomStatus,
    stayId?: string,
  ): Promise<T.Room> {
    const sets: string[] = ['status = ?', 'updated_at = ?'];
    const params: any[] = [status, new Date().toISOString()];

    if (stayId !== undefined) {
      sets.push('current_stay_id = ?');
      params.push(stayId);
    }

    await run(`UPDATE rooms SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findRoomById(id))!;
  },

  async getOccupancySummary(): Promise<Record<string, number>> {
    const rows = await query(
      'SELECT status, COUNT(*) as cnt FROM rooms WHERE is_active = 1 GROUP BY status',
    );
    const result: Record<string, number> = {};
    for (const r of rows) {
      result[r.status] = Number(r.cnt);
    }
    for (const s of [
      'vacant',
      'occupied',
      'cleaning',
      'maintenance',
      'out_of_service',
      'blocked',
      'reserved',
    ]) {
      if (!result[s]) result[s] = 0;
    }
    return result;
  },

  // ── Guests ─────────────────────────────────────────────────────────────

  async findAllGuests(
    filter?: T.GuestFilter,
  ): Promise<T.PaginatedResult<T.Guest>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;

    if (filter?.isCorporate !== undefined) {
      conditions.push('is_corporate = ?');
      params.push(filter.isCorporate ? 1 : 0);
    }
    if (filter?.isBlacklisted !== undefined) {
      conditions.push('is_blacklisted = ?');
      params.push(filter.isBlacklisted ? 1 : 0);
    }
    if (filter?.search) {
      conditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ?)');
      params.push(
        `%${filter.search}%`,
        `%${filter.search}%`,
        `%${filter.search}%`,
      );
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM guests ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM guests ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToGuest), total, offset, limit };
  },

  async findGuestById(id: string): Promise<T.Guest | null> {
    const rows = await query('SELECT * FROM guests WHERE id = ?', [id]);
    return rows.length ? rowToGuest(rows[0]) : null;
  },

  async findGuestByPhone(phone: string): Promise<T.Guest | null> {
    const rows = await query('SELECT * FROM guests WHERE phone = ?', [phone]);
    return rows.length ? rowToGuest(rows[0]) : null;
  },

  async searchGuests(query_str: string): Promise<T.Guest[]> {
    const rows = await query(
      'SELECT * FROM guests WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY name ASC LIMIT 20',
      [`%${query_str}%`, `%${query_str}%`, `%${query_str}%`],
    );
    return rows.map(rowToGuest);
  },

  async createGuest(dto: T.CreateGuestDto): Promise<T.Guest> {
    const dup = await this.findGuestByPhone(dto.phone);
    if (dup) throw new Error(`Guest with phone ${dto.phone} already exists`);

    const id = uid('gst');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO guests (id, name, phone, email, address, id_proof_type, id_proof_number, nationality, is_corporate, company_name, company_gst, is_blacklisted, preferences, total_stays, total_revenue, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0, ?, ?)`,
      [
        id,
        dto.name,
        dto.phone,
        dto.email || null,
        dto.address || null,
        dto.idProofType || null,
        dto.idProofNumber || null,
        dto.nationality || 'Indian',
        dto.isCorporate ?? false,
        dto.companyName || null,
        dto.companyGst || null,
        dto.preferences || null,
        now,
        now,
      ],
    );
    const rows = await query('SELECT * FROM guests WHERE id = ?', [id]);
    return rowToGuest(rows[0]);
  },

  async updateGuest(
    id: string,
    changes: Partial<T.CreateGuestDto & { isBlacklisted: boolean }>,
  ): Promise<T.Guest> {
    const existing = await this.findGuestById(id);
    if (!existing) throw new Error(`Guest not found: ${id}`);

    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (changes.name !== undefined) {
      sets.push('name = ?');
      params.push(changes.name);
    }
    if (changes.phone !== undefined) {
      sets.push('phone = ?');
      params.push(changes.phone);
    }
    if (changes.email !== undefined) {
      sets.push('email = ?');
      params.push(changes.email);
    }
    if (changes.address !== undefined) {
      sets.push('address = ?');
      params.push(changes.address);
    }
    if (changes.idProofType !== undefined) {
      sets.push('id_proof_type = ?');
      params.push(changes.idProofType);
    }
    if (changes.idProofNumber !== undefined) {
      sets.push('id_proof_number = ?');
      params.push(changes.idProofNumber);
    }
    if (changes.nationality !== undefined) {
      sets.push('nationality = ?');
      params.push(changes.nationality);
    }
    if (changes.isCorporate !== undefined) {
      sets.push('is_corporate = ?');
      params.push(changes.isCorporate ? 1 : 0);
    }
    if (changes.companyName !== undefined) {
      sets.push('company_name = ?');
      params.push(changes.companyName);
    }
    if (changes.companyGst !== undefined) {
      sets.push('company_gst = ?');
      params.push(changes.companyGst);
    }
    if (changes.isBlacklisted !== undefined) {
      sets.push('is_blacklisted = ?');
      params.push(changes.isBlacklisted ? 1 : 0);
    }
    if (changes.preferences !== undefined) {
      sets.push('preferences = ?');
      params.push(changes.preferences);
    }

    if (params.length === 1) return existing;
    await run(`UPDATE guests SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findGuestById(id))!;
  },

  async incrementGuestStats(id: string, stayRevenue: number): Promise<T.Guest> {
    await run(
      'UPDATE guests SET total_stays = total_stays + 1, total_revenue = total_revenue + ?, updated_at = ? WHERE id = ?',
      [stayRevenue, new Date().toISOString(), id],
    );
    return (await this.findGuestById(id))!;
  },

  async blacklistGuest(id: string): Promise<T.Guest> {
    await run(
      'UPDATE guests SET is_blacklisted = 1, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id],
    );
    return (await this.findGuestById(id))!;
  },

  async findCorporateGuests(): Promise<T.Guest[]> {
    const rows = await query(
      'SELECT * FROM guests WHERE is_corporate = 1 AND is_blacklisted = 0 ORDER BY company_name, name',
    );
    return rows.map(rowToGuest);
  },

  // ── Reservations ───────────────────────────────────────────────────────

  async findAllReservations(
    filter?: T.ReservationFilter,
  ): Promise<T.PaginatedResult<T.Reservation>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;
    const { field, dir } = safeOrder(filter?.orderBy, filter?.orderDir);

    if (filter?.status) {
      conditions.push('r.status = ?');
      params.push(filter.status);
    }
    if (filter?.roomTypeId) {
      conditions.push('r.room_type_id = ?');
      params.push(filter.roomTypeId);
    }
    if (filter?.guestId) {
      conditions.push('r.guest_id = ?');
      params.push(filter.guestId);
    }
    if (filter?.source) {
      conditions.push('r.source = ?');
      params.push(filter.source);
    }
    if (filter?.fromDate) {
      conditions.push('r.check_in >= ?');
      params.push(filter.fromDate);
    }
    if (filter?.toDate) {
      conditions.push('r.check_out <= ?');
      params.push(filter.toDate);
    }
    if (filter?.search) {
      conditions.push(
        '(r.reservation_no LIKE ? OR r.guest_name LIKE ? OR r.guest_phone LIKE ?)',
      );
      params.push(
        `%${filter.search}%`,
        `%${filter.search}%`,
        `%${filter.search}%`,
      );
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM reservations r ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT r.*, rt.name as room_type_name, rm.room_no
       FROM reservations r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       LEFT JOIN rooms rm ON r.room_id = rm.id
       ${where}
       ORDER BY r.${field} ${dir} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToReservation), total, offset, limit };
  },

  async findReservationById(id: string): Promise<T.Reservation | null> {
    const rows = await query(
      `SELECT r.*, rt.name as room_type_name, rm.room_no
       FROM reservations r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       LEFT JOIN rooms rm ON r.room_id = rm.id
       WHERE r.id = ?`,
      [id],
    );
    return rows.length ? rowToReservation(rows[0]) : null;
  },

  async findReservationByNo(
    reservationNoStr: string,
  ): Promise<T.Reservation | null> {
    const rows = await query(
      `SELECT r.*, rt.name as room_type_name, rm.room_no
       FROM reservations r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       LEFT JOIN rooms rm ON r.room_id = rm.id
       WHERE r.reservation_no = ?`,
      [reservationNoStr],
    );
    return rows.length ? rowToReservation(rows[0]) : null;
  },

  async findReservationsByDateRange(
    from: string,
    to: string,
  ): Promise<T.Reservation[]> {
    const rows = await query(
      `SELECT r.*, rt.name as room_type_name, rm.room_no
       FROM reservations r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       LEFT JOIN rooms rm ON r.room_id = rm.id
       WHERE r.status IN ('reserved', 'confirmed', 'checked_in')
         AND r.check_out > ? AND r.check_in < ?
       ORDER BY r.check_in ASC`,
      [from, to],
    );
    return rows.map(rowToReservation);
  },

  async findReservationsByGuest(guestId: string): Promise<T.Reservation[]> {
    const rows = await query(
      `SELECT r.*, rt.name as room_type_name, rm.room_no
       FROM reservations r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       LEFT JOIN rooms rm ON r.room_id = rm.id
       WHERE r.guest_id = ?
       ORDER BY r.created_at DESC`,
      [guestId],
    );
    return rows.map(rowToReservation);
  },

  async createReservation(
    dto: T.CreateReservationDto,
    createdBy?: string,
  ): Promise<T.Reservation> {
    const id = uid('rsv');
    const now = new Date().toISOString();
    const rsvNo = await reservationNo();
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);
    const nights = Math.max(
      1,
      Math.round(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    let roomTypeName: string | null = null;
    let baseRate = 0;

    if (dto.roomTypeId) {
      const rt = await this.findRoomTypeById(dto.roomTypeId);
      if (rt) {
        roomTypeName = rt.name;
        baseRate = rt.baseRate;
      }
    }

    const rate = dto.rateOverride ?? baseRate;
    const totalAmount = rate * nights;
    const discountPercent = dto.discountPercent ?? 0;
    const discountAmount =
      discountPercent > 0 ? totalAmount * (discountPercent / 100) : 0;
    const finalTotal = totalAmount - discountAmount;

    await run(
      `INSERT INTO reservations (id, reservation_no, guest_id, guest_name, guest_phone, guest_email, room_type_id, room_id, check_in, check_out, nights, adults, children, board_type, status, source, source_ref, special_requests, corporate_name, corporate_gst, rate_override, discount_percent, discount_amount, total_amount, advance_amount, balance_amount, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'inquiry', ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`,
      [
        id,
        rsvNo,
        dto.guestId || null,
        dto.guestName,
        dto.guestPhone,
        dto.guestEmail || null,
        dto.roomTypeId || null,
        dto.roomId || null,
        dto.checkIn,
        dto.checkOut,
        nights,
        dto.adults ?? 1,
        dto.children ?? 0,
        dto.boardType || 'room_only',
        dto.source || 'direct',
        dto.sourceRef || null,
        dto.specialRequests || null,
        dto.corporateName || null,
        dto.corporateGst || null,
        dto.rateOverride || null,
        discountPercent,
        discountAmount,
        finalTotal,
        dto.notes || null,
        createdBy || null,
        now,
        now,
      ],
    );

    await this.recordRoomEvent(
      'RESERVATION_CREATED',
      'reservation',
      id,
      JSON.stringify({ reservationNo: rsvNo, guestName: dto.guestName }),
      createdBy || null,
    );

    return (await this.findReservationById(id))!;
  },

  async updateReservation(
    id: string,
    changes: Partial<T.CreateReservationDto & { status: T.ReservationStatus }>,
  ): Promise<T.Reservation> {
    const existing = await this.findReservationById(id);
    if (!existing) throw new Error(`Reservation not found: ${id}`);

    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (changes.guestId !== undefined) {
      sets.push('guest_id = ?');
      params.push(changes.guestId);
    }
    if (changes.guestName !== undefined) {
      sets.push('guest_name = ?');
      params.push(changes.guestName);
    }
    if (changes.guestPhone !== undefined) {
      sets.push('guest_phone = ?');
      params.push(changes.guestPhone);
    }
    if (changes.guestEmail !== undefined) {
      sets.push('guest_email = ?');
      params.push(changes.guestEmail);
    }
    if (changes.roomTypeId !== undefined) {
      sets.push('room_type_id = ?');
      params.push(changes.roomTypeId);
    }
    if (changes.roomId !== undefined) {
      sets.push('room_id = ?');
      params.push(changes.roomId);
    }
    if (changes.checkIn !== undefined) {
      sets.push('check_in = ?');
      params.push(changes.checkIn);
    }
    if (changes.checkOut !== undefined) {
      sets.push('check_out = ?');
      params.push(changes.checkOut);
    }
    if (changes.adults !== undefined) {
      sets.push('adults = ?');
      params.push(changes.adults);
    }
    if (changes.children !== undefined) {
      sets.push('children = ?');
      params.push(changes.children);
    }
    if (changes.boardType !== undefined) {
      sets.push('board_type = ?');
      params.push(changes.boardType);
    }
    if (changes.source !== undefined) {
      sets.push('source = ?');
      params.push(changes.source);
    }
    if (changes.sourceRef !== undefined) {
      sets.push('source_ref = ?');
      params.push(changes.sourceRef);
    }
    if (changes.specialRequests !== undefined) {
      sets.push('special_requests = ?');
      params.push(changes.specialRequests);
    }
    if (changes.corporateName !== undefined) {
      sets.push('corporate_name = ?');
      params.push(changes.corporateName);
    }
    if (changes.corporateGst !== undefined) {
      sets.push('corporate_gst = ?');
      params.push(changes.corporateGst);
    }
    if (changes.rateOverride !== undefined) {
      sets.push('rate_override = ?');
      params.push(changes.rateOverride);
    }
    if (changes.discountPercent !== undefined) {
      sets.push('discount_percent = ?');
      params.push(changes.discountPercent);
    }
    if (changes.notes !== undefined) {
      sets.push('notes = ?');
      params.push(changes.notes);
    }
    if (changes.status !== undefined) {
      sets.push('status = ?');
      params.push(changes.status);
    }

    if (params.length > 1) {
      await run(`UPDATE reservations SET ${sets.join(', ')} WHERE id = ?`, [
        ...params,
        id,
      ]);
    }

    const updated = await this.findReservationById(id);
    if (!updated) throw new Error(`Reservation not found after update: ${id}`);

    if (
      changes.checkIn !== undefined ||
      changes.checkOut !== undefined ||
      changes.rateOverride !== undefined ||
      changes.discountPercent !== undefined
    ) {
      const checkInDate = new Date(updated.checkIn);
      const checkOutDate = new Date(updated.checkOut);
      const nights = Math.max(
        1,
        Math.round(
          (checkOutDate.getTime() - checkInDate.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      let baseRate = updated.rateOverride ?? 0;
      if (!updated.rateOverride && updated.roomTypeId) {
        const rt = await this.findRoomTypeById(updated.roomTypeId);
        if (rt) baseRate = rt.baseRate;
      }
      const totalAmount = baseRate * nights;
      const discountPercent = updated.discountPercent;
      const discountAmount =
        discountPercent > 0 ? totalAmount * (discountPercent / 100) : 0;
      const finalTotal = totalAmount - discountAmount;
      await run(
        'UPDATE reservations SET nights = ?, discount_amount = ?, total_amount = ?, updated_at = ? WHERE id = ?',
        [nights, discountAmount, finalTotal, new Date().toISOString(), id],
      );
    }

    return (await this.findReservationById(id))!;
  },

  async updateReservationStatus(
    id: string,
    status: T.ReservationStatus,
    operator?: string,
  ): Promise<T.Reservation> {
    const existing = await this.findReservationById(id);
    if (!existing) throw new Error(`Reservation not found: ${id}`);

    const allowed = T.RESERVATION_TRANSITIONS[existing.status];
    if (!allowed || !allowed.includes(status)) {
      throw new Error(
        `Invalid reservation status transition: ${existing.status} -> ${status}`,
      );
    }

    await run(
      'UPDATE reservations SET status = ?, updated_at = ? WHERE id = ?',
      [status, new Date().toISOString(), id],
    );

    const eventMap: Record<string, T.RoomEventType> = {
      confirmed: 'RESERVATION_CONFIRMED',
      cancelled: 'RESERVATION_CANCELLED',
      checked_in: 'GUEST_CHECKED_IN',
      checked_out: 'GUEST_CHECKED_OUT',
    };
    const eventType = eventMap[status];
    if (eventType) {
      await this.recordRoomEvent(
        eventType,
        'reservation',
        id,
        JSON.stringify({ from: existing.status, to: status }),
        operator || null,
      );
    }

    return (await this.findReservationById(id))!;
  },

  async cancelReservation(
    id: string,
    operator?: string,
  ): Promise<T.Reservation> {
    return this.updateReservationStatus(id, 'cancelled', operator);
  },

  async getArrivalsToday(): Promise<T.Reservation[]> {
    const today = new Date().toISOString().split('T')[0];
    const rows = await query(
      `SELECT r.*, rt.name as room_type_name, rm.room_no
       FROM reservations r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       LEFT JOIN rooms rm ON r.room_id = rm.id
       WHERE r.check_in = ? AND r.status = 'confirmed'
       ORDER BY r.guest_name`,
      [today],
    );
    return rows.map(rowToReservation);
  },

  // ── Stays ──────────────────────────────────────────────────────────────

  async findAllStays(filter?: {
    guestId?: string;
    roomId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    offset?: number;
    limit?: number;
  }): Promise<T.PaginatedResult<T.Stay>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;

    if (filter?.guestId) {
      conditions.push('s.guest_id = ?');
      params.push(filter.guestId);
    }
    if (filter?.roomId) {
      conditions.push('s.room_id = ?');
      params.push(filter.roomId);
    }
    if (filter?.status) {
      conditions.push('s.status = ?');
      params.push(filter.status);
    }
    if (filter?.fromDate) {
      conditions.push('s.check_in >= ?');
      params.push(filter.fromDate);
    }
    if (filter?.toDate) {
      conditions.push('s.check_in <= ?');
      params.push(filter.toDate);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM stays s ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT s.*
       FROM stays s
       ${where}
       ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToStay), total, offset, limit };
  },

  async findStayById(id: string): Promise<T.Stay | null> {
    const rows = await query(
      `SELECT s.*
       FROM stays s
       WHERE s.id = ?`,
      [id],
    );
    return rows.length ? rowToStay(rows[0]) : null;
  },

  async findStayByReservation(reservationId: string): Promise<T.Stay | null> {
    const rows = await query(
      'SELECT * FROM stays WHERE reservation_id = ? ORDER BY created_at DESC LIMIT 1',
      [reservationId],
    );
    return rows.length ? rowToStay(rows[0]) : null;
  },

  async findActiveStays(): Promise<T.Stay[]> {
    const rows = await query(
      "SELECT * FROM stays WHERE status = 'active' AND check_out IS NULL ORDER BY check_in ASC",
    );
    return rows.map(rowToStay);
  },

  async findStaysByRoom(
    roomId: string,
    activeOnly?: boolean,
  ): Promise<T.Stay[]> {
    const conditions: string[] = ['room_id = ?'];
    const params: any[] = [roomId];
    if (activeOnly) {
      conditions.push("status = 'active'");
    }
    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT * FROM stays ${where} ORDER BY created_at DESC`,
      params,
    );
    return rows.map(rowToStay);
  },

  async createStay(dto: {
    reservationId?: string;
    guestId: string;
    guestName: string;
    guestPhone: string;
    roomId: string;
    roomNo: string;
    roomTypeId: string;
    roomTypeName: string;
    expectedCheckOut: string;
    nights: number;
    adults?: number;
    children?: number;
    boardType?: T.BoardType;
    rate: number;
    discountPercent?: number;
    notes?: string;
    checkedInBy?: string;
  }): Promise<T.Stay> {
    const id = uid('sta');
    const now = new Date().toISOString();
    const discountPercent = dto.discountPercent ?? 0;
    const totalAmount = dto.rate * dto.nights;
    const discountAmount =
      discountPercent > 0 ? totalAmount * (discountPercent / 100) : 0;

    const folioId = uid('fio');
    const fioNo = await folioNumber();

    await run(
      `INSERT INTO stays (id, reservation_id, guest_id, guest_name, guest_phone, room_id, room_no, room_type_id, room_type_name, check_in, check_out, expected_check_out, nights, adults, children, board_type, rate, discount_percent, discount_amount, folio_id, folio_number, balance_amount, status, notes, checked_in_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
      [
        id,
        dto.reservationId || null,
        dto.guestId,
        dto.guestName,
        dto.guestPhone,
        dto.roomId,
        dto.roomNo,
        dto.roomTypeId,
        dto.roomTypeName,
        now,
        dto.expectedCheckOut,
        dto.nights,
        dto.adults ?? 1,
        dto.children ?? 0,
        dto.boardType || 'bed_breakfast',
        dto.rate,
        discountPercent,
        discountAmount,
        folioId,
        fioNo,
        totalAmount,
        dto.notes || null,
        dto.checkedInBy || null,
        now,
        now,
      ],
    );

    await run(
      `INSERT INTO folios (id, folio_number, stay_id, guest_id, guest_name, room_no, status, room_charges, restaurant_charges, bar_charges, room_service_charges, laundry_charges, extra_bed_charges, amenities_charges, service_charge, tax_amount, discounts, total_charges, total_payments, balance_amount, notes, closed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?, NULL, ?, ?)`,
      [
        folioId,
        fioNo,
        id,
        dto.guestId,
        dto.guestName,
        dto.roomNo,
        totalAmount,
        dto.notes || null,
        now,
        now,
      ],
    );

    await this.updateRoomStatus(dto.roomId, 'occupied', id);

    if (dto.reservationId) {
      await run(
        "UPDATE reservations SET status = 'checked_in', updated_at = ? WHERE id = ?",
        [now, dto.reservationId],
      );
    }

    await this.recordRoomEvent(
      'GUEST_CHECKED_IN',
      'stay',
      id,
      JSON.stringify({ guestName: dto.guestName, roomNo: dto.roomNo }),
      dto.checkedInBy || null,
    );

    return (await this.findStayById(id))!;
  },

  async checkOutStay(id: string, operator: string): Promise<T.Stay> {
    const stay = await this.findStayById(id);
    if (!stay) throw new Error(`Stay not found: ${id}`);
    if (stay.status !== 'active') throw new Error(`Stay ${id} is not active`);

    const now = new Date().toISOString();

    await run(
      'UPDATE stays SET status = ?, check_out = ?, checked_out_by = ?, checked_out_at = ?, updated_at = ? WHERE id = ?',
      ['checked_out', now, operator, now, now, id],
    );

    await this.updateRoomStatus(
      stay.roomId,
      'vacant',
      stay.folioId || undefined,
    );
    await run('UPDATE rooms SET current_stay_id = NULL WHERE id = ?', [
      stay.roomId,
    ]);

    if (stay.folioId) {
      await this.recalculateFolio(stay.folioId);
    }

    if (stay.reservationId) {
      await run(
        "UPDATE reservations SET status = 'checked_out', updated_at = ? WHERE id = ?",
        [now, stay.reservationId],
      );
    }

    await this.recordRoomEvent(
      'GUEST_CHECKED_OUT',
      'stay',
      id,
      JSON.stringify({ guestName: stay.guestName, roomNo: stay.roomNo }),
      operator,
    );

    return (await this.findStayById(id))!;
  },

  async updateStay(
    id: string,
    changes: Partial<{
      expectedCheckOut: string;
      nights: number;
      adults: number;
      children: number;
      boardType: T.BoardType;
      rate: number;
      discountPercent: number;
      notes: string;
    }>,
  ): Promise<T.Stay> {
    const existing = await this.findStayById(id);
    if (!existing) throw new Error(`Stay not found: ${id}`);

    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (changes.expectedCheckOut !== undefined) {
      sets.push('expected_check_out = ?');
      params.push(changes.expectedCheckOut);
    }
    if (changes.nights !== undefined) {
      sets.push('nights = ?');
      params.push(changes.nights);
    }
    if (changes.adults !== undefined) {
      sets.push('adults = ?');
      params.push(changes.adults);
    }
    if (changes.children !== undefined) {
      sets.push('children = ?');
      params.push(changes.children);
    }
    if (changes.boardType !== undefined) {
      sets.push('board_type = ?');
      params.push(changes.boardType);
    }
    if (changes.rate !== undefined) {
      sets.push('rate = ?');
      params.push(changes.rate);
    }
    if (changes.discountPercent !== undefined) {
      sets.push('discount_percent = ?');
      params.push(changes.discountPercent);
    }
    if (changes.notes !== undefined) {
      sets.push('notes = ?');
      params.push(changes.notes);
    }

    if (params.length === 1) return existing;
    await run(`UPDATE stays SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findStayById(id))!;
  },

  // ── Room Assignments ────────────────────────────────────────────────────

  async findAssignmentsByStay(stayId: string): Promise<T.RoomAssignment[]> {
    const rows = await query(
      'SELECT * FROM room_assignments WHERE stay_id = ? ORDER BY assigned_at ASC',
      [stayId],
    );
    return rows.map(rowToAssignment);
  },

  async findAssignmentsByRoom(roomId: string): Promise<T.RoomAssignment[]> {
    const rows = await query(
      'SELECT * FROM room_assignments WHERE room_id = ? ORDER BY assigned_at DESC',
      [roomId],
    );
    return rows.map(rowToAssignment);
  },

  async createAssignment(dto: {
    stayId: string;
    roomId: string;
    roomNo: string;
    assignedBy?: string;
  }): Promise<T.RoomAssignment> {
    const id = uid('ras');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO room_assignments (id, stay_id, room_id, room_no, assigned_at, assigned_by, released_at, reason)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
      [id, dto.stayId, dto.roomId, dto.roomNo, now, dto.assignedBy || null],
    );
    await this.updateRoomStatus(dto.roomId, 'occupied');
    const rows = await query('SELECT * FROM room_assignments WHERE id = ?', [
      id,
    ]);
    return rowToAssignment(rows[0]);
  },

  async releaseAssignment(
    id: string,
    reason?: string,
  ): Promise<T.RoomAssignment> {
    const now = new Date().toISOString();
    await run(
      'UPDATE room_assignments SET released_at = ?, reason = ? WHERE id = ?',
      [now, reason || null, id],
    );
    const rows = await query('SELECT * FROM room_assignments WHERE id = ?', [
      id,
    ]);
    return rowToAssignment(rows[0]);
  },

  async getCurrentAssignment(roomId: string): Promise<T.RoomAssignment | null> {
    const rows = await query(
      'SELECT * FROM room_assignments WHERE room_id = ? AND released_at IS NULL ORDER BY assigned_at DESC LIMIT 1',
      [roomId],
    );
    return rows.length ? rowToAssignment(rows[0]) : null;
  },

  // ── Folios ──────────────────────────────────────────────────────────────

  async findAllFolios(
    filter?: T.FolioFilter,
  ): Promise<T.PaginatedResult<T.Folio>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;

    if (filter?.status) {
      conditions.push('f.status = ?');
      params.push(filter.status);
    }
    if (filter?.guestId) {
      conditions.push('f.guest_id = ?');
      params.push(filter.guestId);
    }
    if (filter?.stayId) {
      conditions.push('f.stay_id = ?');
      params.push(filter.stayId);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM folios f ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM folios f ${where} ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToFolio), total, offset, limit };
  },

  async findFolioById(id: string): Promise<T.Folio | null> {
    const rows = await query('SELECT * FROM folios WHERE id = ?', [id]);
    if (!rows.length) return null;
    const folio = rowToFolio(rows[0]);
    folio.charges = await query(
      'SELECT * FROM folio_charges WHERE folio_id = ? ORDER BY posted_at ASC',
      [id],
    ).then((r) => r.map(rowToFolioCharge));
    folio.payments = await query(
      'SELECT * FROM folio_payments WHERE folio_id = ? ORDER BY processed_at ASC',
      [id],
    ).then((r) => r.map(rowToFolioPayment));
    return folio;
  },

  async findFolioByStay(stayId: string): Promise<T.Folio | null> {
    const rows = await query(
      'SELECT * FROM folios WHERE stay_id = ? ORDER BY created_at DESC LIMIT 1',
      [stayId],
    );
    if (!rows.length) return null;
    const folio = rowToFolio(rows[0]);
    folio.charges = await query(
      'SELECT * FROM folio_charges WHERE folio_id = ? ORDER BY posted_at ASC',
      [folio.id],
    ).then((r) => r.map(rowToFolioCharge));
    folio.payments = await query(
      'SELECT * FROM folio_payments WHERE folio_id = ? ORDER BY processed_at ASC',
      [folio.id],
    ).then((r) => r.map(rowToFolioPayment));
    return folio;
  },

  async findFolioByNumber(folioNumberStr: string): Promise<T.Folio | null> {
    const rows = await query('SELECT * FROM folios WHERE folio_number = ?', [
      folioNumberStr,
    ]);
    if (!rows.length) return null;
    const folio = rowToFolio(rows[0]);
    folio.charges = await query(
      'SELECT * FROM folio_charges WHERE folio_id = ? ORDER BY posted_at ASC',
      [folio.id],
    ).then((r) => r.map(rowToFolioCharge));
    folio.payments = await query(
      'SELECT * FROM folio_payments WHERE folio_id = ? ORDER BY processed_at ASC',
      [folio.id],
    ).then((r) => r.map(rowToFolioPayment));
    return folio;
  },

  async createFolio(dto: {
    stayId: string;
    guestId: string;
    guestName: string;
    roomNo: string;
    notes?: string;
  }): Promise<T.Folio> {
    const id = uid('fio');
    const fioNo = await folioNumber();
    const now = new Date().toISOString();
    await run(
      `INSERT INTO folios (id, folio_number, stay_id, guest_id, guest_name, room_no, status, room_charges, restaurant_charges, bar_charges, room_service_charges, laundry_charges, extra_bed_charges, amenities_charges, service_charge, tax_amount, discounts, total_charges, total_payments, balance_amount, notes, closed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, NULL, ?, ?)`,
      [
        id,
        fioNo,
        dto.stayId,
        dto.guestId,
        dto.guestName,
        dto.roomNo,
        dto.notes || null,
        now,
        now,
      ],
    );
    return (await this.findFolioById(id))!;
  },

  async recalculateFolio(folioId: string): Promise<T.Folio> {
    const now = new Date().toISOString();

    const chargeRows = await query(
      `SELECT category, COALESCE(SUM(total_amount), 0) as total
       FROM folio_charges WHERE folio_id = ? GROUP BY category`,
      [folioId],
    );

    const charges: Record<string, number> = {};
    for (const r of chargeRows) {
      charges[r.category] = Number(r.total);
    }

    const roomCharges = charges.room_tariff || 0;
    const restaurantCharges = charges.restaurant || 0;
    const barCharges = charges.bar || 0;
    const roomServiceCharges = charges.room_service || 0;
    const laundryCharges = charges.laundry || 0;
    const extraBedCharges = charges.extra_bed || 0;
    const amenitiesCharges = charges.amenities || 0;
    const serviceCharge = charges.service_charge || 0;
    const taxAmount = charges.tax || 0;
    const deposits = charges.deposit || 0;
    const otherCharges = charges.other || 0;

    const totalCharges =
      roomCharges +
      restaurantCharges +
      barCharges +
      roomServiceCharges +
      laundryCharges +
      extraBedCharges +
      amenitiesCharges +
      serviceCharge +
      taxAmount +
      deposits +
      otherCharges;

    const payResult = await query(
      'SELECT COALESCE(SUM(amount), 0) as total FROM folio_payments WHERE folio_id = ?',
      [folioId],
    );
    const totalPayments = Number(payResult[0]?.total || 0);

    const folio = await query('SELECT * FROM folios WHERE id = ?', [folioId]);
    const discounts = Number(folio[0]?.discounts || 0);
    const balanceAmount = totalCharges - totalPayments - discounts;

    await run(
      `UPDATE folios SET
        room_charges = ?, restaurant_charges = ?, bar_charges = ?,
        room_service_charges = ?, laundry_charges = ?, extra_bed_charges = ?,
        amenities_charges = ?, service_charge = ?, tax_amount = ?,
        total_charges = ?, total_payments = ?, balance_amount = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        roomCharges,
        restaurantCharges,
        barCharges,
        roomServiceCharges,
        laundryCharges,
        extraBedCharges,
        amenitiesCharges,
        serviceCharge,
        taxAmount,
        totalCharges,
        totalPayments,
        balanceAmount,
        now,
        folioId,
      ],
    );

    return (await this.findFolioById(folioId))!;
  },

  async postCharge(dto: T.CreateFolioChargeDto): Promise<T.FolioCharge> {
    const id = uid('fch');
    const now = new Date().toISOString();
    const quantity = dto.quantity ?? 1;
    const totalAmount = dto.amount * quantity + (dto.taxAmount || 0);

    await run(
      `INSERT INTO folio_charges (id, folio_id, category, description, amount, quantity, total_amount, tax_amount, reference, posted_at, posted_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.folioId,
        dto.category,
        dto.description,
        dto.amount,
        quantity,
        totalAmount,
        dto.taxAmount || 0,
        dto.reference || null,
        now,
        null,
        dto.notes || null,
      ],
    );

    await this.recalculateFolio(dto.folioId);
    await this.recordRoomEvent(
      'CHARGE_POSTED',
      'folio_charge',
      id,
      JSON.stringify({
        folioId: dto.folioId,
        category: dto.category,
        amount: totalAmount,
      }),
      null,
    );

    const rows = await query('SELECT * FROM folio_charges WHERE id = ?', [id]);
    return rowToFolioCharge(rows[0]);
  },

  async postPayment(dto: T.CreateFolioPaymentDto): Promise<T.FolioPayment> {
    const id = uid('fpm');
    const now = new Date().toISOString();

    await run(
      `INSERT INTO folio_payments (id, folio_id, mode, amount, reference, processed_at, processed_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.folioId,
        dto.mode,
        dto.amount,
        dto.reference || null,
        now,
        null,
        dto.notes || null,
      ],
    );

    const folio = await this.recalculateFolio(dto.folioId);

    if (folio.balanceAmount <= 0) {
      await run("UPDATE folios SET status = 'paid' WHERE id = ?", [
        dto.folioId,
      ]);
    } else if (folio.totalPayments > 0) {
      await run("UPDATE folios SET status = 'partially_paid' WHERE id = ?", [
        dto.folioId,
      ]);
    }

    await this.recordRoomEvent(
      'PAYMENT_RECEIVED',
      'folio_payment',
      id,
      JSON.stringify({
        folioId: dto.folioId,
        mode: dto.mode,
        amount: dto.amount,
      }),
      null,
    );

    const rows = await query('SELECT * FROM folio_payments WHERE id = ?', [id]);
    return rowToFolioPayment(rows[0]);
  },

  async postFolioCharge(dto: T.CreateFolioChargeDto): Promise<T.FolioCharge> {
    return this.postCharge(dto);
  },

  async closeFolio(folioId: string): Promise<T.Folio> {
    const now = new Date().toISOString();
    await run(
      `UPDATE folios SET status = 'closed', closed_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, folioId],
    );
    await this.recordRoomEvent(
      'FOLIO_CLOSED',
      'folio',
      folioId,
      undefined,
      undefined,
    );
    return (await this.findFolioById(folioId))!;
  },

  async voidFolio(folioId: string): Promise<T.Folio> {
    await run(
      "UPDATE folios SET status = 'cancelled', updated_at = ? WHERE id = ?",
      [new Date().toISOString(), folioId],
    );
    return (await this.findFolioById(folioId))!;
  },

  async getFolioBalance(folioId: string): Promise<number> {
    const rows = await query('SELECT balance_amount FROM folios WHERE id = ?', [
      folioId,
    ]);
    return rows.length ? Number(rows[0].balance_amount) : 0;
  },

  // ── Housekeeping ────────────────────────────────────────────────────────

  async findAllHousekeepingTasks(
    filter?: T.HousekeepingFilter,
  ): Promise<T.PaginatedResult<T.HousekeepingTask>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;

    if (filter?.status) {
      conditions.push('h.status = ?');
      params.push(filter.status);
    }
    if (filter?.roomId) {
      conditions.push('h.room_id = ?');
      params.push(filter.roomId);
    }
    if (filter?.assignedTo) {
      conditions.push('h.assigned_to = ?');
      params.push(filter.assignedTo);
    }
    if (filter?.fromDate) {
      conditions.push('h.scheduled_date >= ?');
      params.push(filter.fromDate);
    }
    if (filter?.toDate) {
      conditions.push('h.scheduled_date <= ?');
      params.push(filter.toDate);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM housekeeping_tasks h ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM housekeeping_tasks h ${where} ORDER BY h.scheduled_date ASC, h.priority DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToHousekeepingTask), total, offset, limit };
  },

  async findHousekeepingTaskById(
    id: string,
  ): Promise<T.HousekeepingTask | null> {
    const rows = await query('SELECT * FROM housekeeping_tasks WHERE id = ?', [
      id,
    ]);
    return rows.length ? rowToHousekeepingTask(rows[0]) : null;
  },

  async findHousekeepingByRoom(roomId: string): Promise<T.HousekeepingTask[]> {
    const rows = await query(
      'SELECT * FROM housekeeping_tasks WHERE room_id = ? ORDER BY created_at DESC LIMIT 20',
      [roomId],
    );
    return rows.map(rowToHousekeepingTask);
  },

  async findHousekeepingByDate(date: string): Promise<T.HousekeepingTask[]> {
    const rows = await query(
      'SELECT * FROM housekeeping_tasks WHERE scheduled_date = ? ORDER BY priority DESC, created_at ASC',
      [date],
    );
    return rows.map(rowToHousekeepingTask);
  },

  async createHousekeepingTask(
    dto: T.CreateHousekeepingDto,
  ): Promise<T.HousekeepingTask> {
    const id = uid('hkt');
    const now = new Date().toISOString();

    const roomRows = await query('SELECT room_no FROM rooms WHERE id = ?', [
      dto.roomId,
    ]);
    const roomNo = roomRows.length ? roomRows[0].room_no : '';

    await run(
      `INSERT INTO housekeeping_tasks (id, room_id, room_no, task_type, status, assigned_to, priority, scheduled_date, completed_at, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, NULL, ?, ?, ?, ?)`,
      [
        id,
        dto.roomId,
        roomNo,
        dto.taskType,
        dto.assignedTo || null,
        dto.priority ?? 0,
        dto.scheduledDate,
        dto.notes || null,
        dto.assignedTo || null,
        now,
        now,
      ],
    );

    await this.recordRoomEvent(
      'HOUSEKEEPING_STARTED',
      'housekeeping_task',
      id,
      JSON.stringify({ roomId: dto.roomId, taskType: dto.taskType }),
      dto.assignedTo || null,
    );

    const rows = await query('SELECT * FROM housekeeping_tasks WHERE id = ?', [
      id,
    ]);
    return rowToHousekeepingTask(rows[0]);
  },

  async updateHousekeepingTask(
    id: string,
    changes: Partial<
      T.CreateHousekeepingDto & { status: T.HousekeepingStatus }
    >,
  ): Promise<T.HousekeepingTask> {
    const existing = await this.findHousekeepingTaskById(id);
    if (!existing) throw new Error(`Housekeeping task not found: ${id}`);

    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (changes.taskType !== undefined) {
      sets.push('task_type = ?');
      params.push(changes.taskType);
    }
    if (changes.status !== undefined) {
      sets.push('status = ?');
      params.push(changes.status);
    }
    if (changes.assignedTo !== undefined) {
      sets.push('assigned_to = ?');
      params.push(changes.assignedTo);
    }
    if (changes.priority !== undefined) {
      sets.push('priority = ?');
      params.push(changes.priority);
    }
    if (changes.scheduledDate !== undefined) {
      sets.push('scheduled_date = ?');
      params.push(changes.scheduledDate);
    }
    if (changes.notes !== undefined) {
      sets.push('notes = ?');
      params.push(changes.notes);
    }

    if (params.length === 1) return existing;
    await run(`UPDATE housekeeping_tasks SET ${sets.join(', ')} WHERE id = ?`, [
      ...params,
      id,
    ]);
    return (await this.findHousekeepingTaskById(id))!;
  },

  async completeHousekeepingTask(id: string): Promise<T.HousekeepingTask> {
    const now = new Date().toISOString();
    await run(
      "UPDATE housekeeping_tasks SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?",
      [now, now, id],
    );
    await this.recordRoomEvent(
      'HOUSEKEEPING_COMPLETED',
      'housekeeping_task',
      id,
      undefined,
      undefined,
    );
    return (await this.findHousekeepingTaskById(id))!;
  },

  async getHousekeepingSummary(date?: string): Promise<Record<string, number>> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (date) {
      conditions.push('scheduled_date = ?');
      params.push(date);
    }
    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT status, COUNT(*) as cnt FROM housekeeping_tasks ${where} GROUP BY status`,
      params,
    );
    const result: Record<string, number> = {};
    for (const r of rows) {
      result[r.status] = Number(r.cnt);
    }
    for (const s of ['pending', 'in_progress', 'inspected', 'completed']) {
      if (!result[s]) result[s] = 0;
    }
    return result;
  },

  // ── Maintenance ────────────────────────────────────────────────────────

  async findAllMaintenanceRequests(
    filter?: T.MaintenanceFilter,
  ): Promise<T.PaginatedResult<T.MaintenanceRequest>> {
    const conditions: string[] = [];
    const params: any[] = [];
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;

    if (filter?.status) {
      conditions.push('m.status = ?');
      params.push(filter.status);
    }
    if (filter?.roomId) {
      conditions.push('m.room_id = ?');
      params.push(filter.roomId);
    }
    if (filter?.assignedTo) {
      conditions.push('m.assigned_to = ?');
      params.push(filter.assignedTo);
    }
    if (filter?.priority !== undefined) {
      conditions.push('m.priority = ?');
      params.push(filter.priority);
    }
    if (filter?.issueType) {
      conditions.push('m.issue_type = ?');
      params.push(filter.issueType);
    }

    const where = buildWhere(conditions, params);
    const countResult = await query(
      `SELECT COUNT(*) as total FROM maintenance_requests m ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const rows = await query(
      `SELECT * FROM maintenance_requests m ${where} ORDER BY m.priority DESC, m.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data: rows.map(rowToMaintenanceRequest), total, offset, limit };
  },

  async findMaintenanceRequestById(
    id: string,
  ): Promise<T.MaintenanceRequest | null> {
    const rows = await query(
      'SELECT * FROM maintenance_requests WHERE id = ?',
      [id],
    );
    return rows.length ? rowToMaintenanceRequest(rows[0]) : null;
  },

  async findMaintenanceByRoom(roomId: string): Promise<T.MaintenanceRequest[]> {
    const rows = await query(
      'SELECT * FROM maintenance_requests WHERE room_id = ? ORDER BY created_at DESC LIMIT 20',
      [roomId],
    );
    return rows.map(rowToMaintenanceRequest);
  },

  async createMaintenanceRequest(
    dto: T.CreateMaintenanceDto,
  ): Promise<T.MaintenanceRequest> {
    const id = uid('mtc');
    const now = new Date().toISOString();

    const roomRows = await query('SELECT room_no FROM rooms WHERE id = ?', [
      dto.roomId,
    ]);
    const roomNo = roomRows.length ? roomRows[0].room_no : '';

    await run(
      `INSERT INTO maintenance_requests (id, room_id, room_no, issue_type, description, status, priority, assigned_to, reported_by, resolved_at, resolution, verified_by, cost, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'reported', ?, ?, ?, NULL, NULL, NULL, 0, ?, ?)`,
      [
        id,
        dto.roomId,
        roomNo,
        dto.issueType,
        dto.description,
        dto.priority ?? 0,
        null,
        dto.reportedBy,
        now,
        now,
      ],
    );

    await this.recordRoomEvent(
      'MAINTENANCE_OPENED',
      'maintenance_request',
      id,
      JSON.stringify({ roomId: dto.roomId, issueType: dto.issueType }),
      dto.reportedBy,
    );

    const rows = await query(
      'SELECT * FROM maintenance_requests WHERE id = ?',
      [id],
    );
    return rowToMaintenanceRequest(rows[0]);
  },

  async updateMaintenanceRequest(
    id: string,
    changes: Partial<
      T.CreateMaintenanceDto & {
        status: T.MaintenanceStatus;
        assignedTo: string;
      }
    >,
  ): Promise<T.MaintenanceRequest> {
    const existing = await this.findMaintenanceRequestById(id);
    if (!existing) throw new Error(`Maintenance request not found: ${id}`);

    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (changes.issueType !== undefined) {
      sets.push('issue_type = ?');
      params.push(changes.issueType);
    }
    if (changes.description !== undefined) {
      sets.push('description = ?');
      params.push(changes.description);
    }
    if (changes.status !== undefined) {
      sets.push('status = ?');
      params.push(changes.status);
    }
    if (changes.priority !== undefined) {
      sets.push('priority = ?');
      params.push(changes.priority);
    }
    if (changes.assignedTo !== undefined) {
      sets.push('assigned_to = ?');
      params.push(changes.assignedTo);
    }
    if (changes.notes !== undefined) {
      sets.push('notes = ?');
      params.push(changes.notes);
    }

    if (params.length === 1) return existing;
    await run(
      `UPDATE maintenance_requests SET ${sets.join(', ')} WHERE id = ?`,
      [...params, id],
    );
    return (await this.findMaintenanceRequestById(id))!;
  },

  async resolveMaintenance(
    id: string,
    resolution: string,
    cost: number,
    verifiedBy: string,
  ): Promise<T.MaintenanceRequest> {
    const now = new Date().toISOString();
    await run(
      `UPDATE maintenance_requests SET status = 'resolved', resolved_at = ?, resolution = ?, cost = ?, verified_by = ?, updated_at = ? WHERE id = ?`,
      [now, resolution, cost, verifiedBy, now, id],
    );
    await this.recordRoomEvent(
      'MAINTENANCE_CLOSED',
      'maintenance_request',
      id,
      JSON.stringify({ resolution, cost }),
      verifiedBy,
    );
    return (await this.findMaintenanceRequestById(id))!;
  },

  async getMaintenanceSummary(): Promise<{
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const statusRows = await query(
      'SELECT status, COUNT(*) as cnt FROM maintenance_requests GROUP BY status',
    );
    const byStatus: Record<string, number> = {};
    for (const r of statusRows) {
      byStatus[r.status] = Number(r.cnt);
    }
    for (const s of [
      'reported',
      'assigned',
      'in_progress',
      'resolved',
      'verified',
    ]) {
      if (!byStatus[s]) byStatus[s] = 0;
    }

    const priorityRows = await query(
      'SELECT priority, COUNT(*) as cnt FROM maintenance_requests GROUP BY priority',
    );
    const byPriority: Record<string, number> = {};
    for (const r of priorityRows) {
      byPriority[String(r.priority)] = Number(r.cnt);
    }

    return { byStatus, byPriority };
  },

  // ── Night Audit ────────────────────────────────────────────────────────

  async findNightAuditByDate(auditDate: string): Promise<T.NightAudit | null> {
    const rows = await query(
      'SELECT * FROM night_audit WHERE audit_date = ? ORDER BY created_at DESC LIMIT 1',
      [auditDate],
    );
    return rows.length ? rowToNightAudit(rows[0]) : null;
  },

  async findAllNightAudits(limit?: number): Promise<T.NightAudit[]> {
    const rows = await query(
      'SELECT * FROM night_audit ORDER BY audit_date DESC LIMIT ?',
      [limit ?? 30],
    );
    return rows.map(rowToNightAudit);
  },

  async performNightAudit(dto: {
    auditDate: string;
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    outOfServiceRooms?: number;
    blockedRooms?: number;
    housekeepingRooms?: number;
    totalRevenue?: number;
    roomRevenue?: number;
    restaurantRevenue?: number;
    barRevenue?: number;
    otherRevenue?: number;
    totalTax?: number;
    totalDiscounts?: number;
    totalPayments?: number;
    outstandingBalance?: number;
    notes?: string;
    performedBy: string;
  }): Promise<T.NightAudit> {
    const existing = await this.findNightAuditByDate(dto.auditDate);
    if (existing)
      throw new Error(`Night audit already exists for ${dto.auditDate}`);

    const id = uid('na');
    const now = new Date().toISOString();
    const totalRooms = dto.totalRooms || 1;
    const occupancyPercent =
      totalRooms > 0 ? (dto.occupiedRooms / totalRooms) * 100 : 0;
    const adr =
      dto.occupiedRooms > 0 ? (dto.roomRevenue || 0) / dto.occupiedRooms : 0;
    const revpar = totalRooms > 0 ? (dto.roomRevenue || 0) / totalRooms : 0;

    await run(
      `INSERT INTO night_audit (id, audit_date, total_rooms, occupied_rooms, vacant_rooms, out_of_service_rooms, blocked_rooms, housekeeping_rooms, total_revenue, room_revenue, restaurant_revenue, bar_revenue, other_revenue, total_tax, total_discounts, total_payments, outstanding_balance, occupancy_percent, adr, revpar, status, notes, performed_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
      [
        id,
        dto.auditDate,
        dto.totalRooms,
        dto.occupiedRooms,
        dto.vacantRooms,
        dto.outOfServiceRooms || 0,
        dto.blockedRooms || 0,
        dto.housekeepingRooms || 0,
        dto.totalRevenue || 0,
        dto.roomRevenue || 0,
        dto.restaurantRevenue || 0,
        dto.barRevenue || 0,
        dto.otherRevenue || 0,
        dto.totalTax || 0,
        dto.totalDiscounts || 0,
        dto.totalPayments || 0,
        dto.outstandingBalance || 0,
        occupancyPercent,
        adr,
        revpar,
        dto.notes || null,
        dto.performedBy,
        now,
      ],
    );

    await this.recordRoomEvent(
      'NIGHT_AUDIT_COMPLETED',
      'night_audit',
      id,
      JSON.stringify({ auditDate: dto.auditDate, occupancyPercent }),
      dto.performedBy,
    );

    return (await this.findNightAuditByDate(dto.auditDate))!;
  },

  async approveNightAudit(id: string): Promise<T.NightAudit> {
    await run("UPDATE night_audit SET status = 'approved' WHERE id = ?", [id]);
    const rows = await query('SELECT * FROM night_audit WHERE id = ?', [id]);
    return rowToNightAudit(rows[0]);
  },

  async getNightAuditSummary(
    fromDate: string,
    toDate: string,
  ): Promise<{
    totalRevenue: number;
    totalTax: number;
    totalPayments: number;
    avgOccupancy: number;
    avgAdr: number;
    avgRevpar: number;
    auditCount: number;
  }> {
    const rows = await query(
      `SELECT
        COALESCE(SUM(total_revenue), 0) as total_revenue,
        COALESCE(SUM(total_tax), 0) as total_tax,
        COALESCE(SUM(total_payments), 0) as total_payments,
        COALESCE(AVG(occupancy_percent), 0) as avg_occupancy,
        COALESCE(AVG(adr), 0) as avg_adr,
        COALESCE(AVG(revpar), 0) as avg_revpar,
        COUNT(*) as audit_count
       FROM night_audit
       WHERE audit_date >= ? AND audit_date <= ?`,
      [fromDate, toDate],
    );
    const r = rows[0];
    return {
      totalRevenue: Number(r.total_revenue),
      totalTax: Number(r.total_tax),
      totalPayments: Number(r.total_payments),
      avgOccupancy: Number(r.avg_occupancy),
      avgAdr: Number(r.avg_adr),
      avgRevpar: Number(r.avg_revpar),
      auditCount: Number(r.audit_count),
    };
  },

  async calculateOccupancy(date: string): Promise<{
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    occupancyPercent: number;
    outOfService: number;
    blocked: number;
    cleaning: number;
  }> {
    const rows = await query(
      `SELECT status, COUNT(*) as cnt FROM rooms WHERE is_active = 1 GROUP BY status`,
    );
    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[r.status] = Number(r.cnt);
    }
    const totalRooms = Object.values(counts).reduce((a, b) => a + b, 0);
    const occupiedRooms = counts.occupied || 0;
    const vacantRooms = counts.vacant || 0;
    const outOfService = counts.out_of_service || 0;
    const blocked = counts.blocked || 0;
    const cleaning = counts.cleaning || 0;
    const occupancyPercent =
      totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
    return {
      totalRooms,
      occupiedRooms,
      vacantRooms,
      occupancyPercent,
      outOfService,
      blocked,
      cleaning,
    };
  },

  // ── Events ─────────────────────────────────────────────────────────────

  async recordRoomEvent(
    eventType: T.RoomEventType,
    aggregateType: string,
    aggregateId: string,
    data?: string,
    createdBy?: string | null,
  ): Promise<T.RoomEvent> {
    const id = uid('rev');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO room_events (id, event_type, aggregate_type, aggregate_id, data, created_by, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        eventType,
        aggregateType,
        aggregateId,
        data || null,
        createdBy || null,
        now,
      ],
    );
    const rows = await query('SELECT * FROM room_events WHERE id = ?', [id]);
    return rowToRoomEvent(rows[0]);
  },

  async findRoomEvents(
    aggregateType?: string,
    aggregateId?: string,
  ): Promise<T.RoomEvent[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (aggregateType) {
      conditions.push('aggregate_type = ?');
      params.push(aggregateType);
    }
    if (aggregateId) {
      conditions.push('aggregate_id = ?');
      params.push(aggregateId);
    }

    const where = buildWhere(conditions, params);
    const rows = await query(
      `SELECT * FROM room_events ${where} ORDER BY timestamp DESC`,
      params,
    );
    return rows.map(rowToRoomEvent);
  },

  // ── Reporting ──────────────────────────────────────────────────────────

  async getOccupancyReport(
    fromDate: string,
    toDate: string,
  ): Promise<T.OccupancyReport[]> {
    const rows = await query(
      `SELECT
        audit_date as date, total_rooms, occupied_rooms, vacant_rooms,
        occupancy_percent, out_of_service_rooms as out_of_service,
        blocked_rooms as blocked, housekeeping_rooms as cleaning,
        total_revenue as revenue, adr, revpar
       FROM night_audit
       WHERE audit_date >= ? AND audit_date <= ?
       ORDER BY audit_date ASC`,
      [fromDate, toDate],
    );
    return rows.map((r: any) => ({
      date: r.date,
      totalRooms: Number(r.total_rooms),
      occupiedRooms: Number(r.occupied_rooms),
      vacantRooms: Number(r.vacant_rooms),
      occupancyPercent: Number(r.occupancy_percent),
      outOfService: Number(r.out_of_service),
      blocked: Number(r.blocked),
      cleaning: Number(r.cleaning),
      revenue: Number(r.revenue),
      adr: Number(r.adr),
      revpar: Number(r.revpar),
    }));
  },

  async getRevenueReport(
    fromDate: string,
    toDate: string,
  ): Promise<T.RevenueReport> {
    const rows = await query(
      `SELECT
        COALESCE(SUM(room_revenue), 0) as room_revenue,
        COALESCE(SUM(restaurant_revenue), 0) as restaurant_revenue,
        COALESCE(SUM(bar_revenue), 0) as bar_revenue,
        0 as room_service_revenue,
        0 as laundry_revenue,
        COALESCE(SUM(other_revenue), 0) as other_revenue,
        COALESCE(SUM(total_revenue), 0) as total_revenue,
        COALESCE(SUM(total_tax), 0) as total_tax,
        COALESCE(SUM(total_discounts), 0) as total_discounts
       FROM night_audit
       WHERE audit_date >= ? AND audit_date <= ?`,
      [fromDate, toDate],
    );
    const r = rows[0];
    const totalRevenue = Number(r.total_revenue);
    return {
      fromDate,
      toDate,
      roomRevenue: Number(r.room_revenue),
      restaurantRevenue: Number(r.restaurant_revenue),
      barRevenue: Number(r.bar_revenue),
      roomServiceRevenue: Number(r.room_service_revenue),
      laundryRevenue: Number(r.laundry_revenue),
      otherRevenue: Number(r.other_revenue),
      totalRevenue,
      totalTax: Number(r.total_tax),
      totalDiscounts: Number(r.total_discounts),
      netRevenue: totalRevenue - Number(r.total_tax),
    };
  },

  async getGuestHistory(guestId: string): Promise<
    {
      stayId: string;
      roomNo: string;
      checkIn: string;
      checkOut: string | null;
      nights: number;
      totalCharges: number;
      totalPayments: number;
      balance: number;
    }[]
  > {
    const rows = await query(
      `SELECT s.id as stay_id, s.room_no, s.check_in, s.check_out, s.nights,
              COALESCE(f.total_charges, 0) as total_charges,
              COALESCE(f.total_payments, 0) as total_payments,
              COALESCE(f.balance_amount, 0) as balance
       FROM stays s
       LEFT JOIN folios f ON s.folio_id = f.id
       WHERE s.guest_id = ?
       ORDER BY s.created_at DESC`,
      [guestId],
    );
    return rows.map((r: any) => ({
      stayId: r.stay_id,
      roomNo: r.room_no,
      checkIn: r.check_in,
      checkOut: r.check_out,
      nights: Number(r.nights),
      totalCharges: Number(r.total_charges),
      totalPayments: Number(r.total_payments),
      balance: Number(r.balance),
    }));
  },

  async getRoomHistory(roomId: string): Promise<
    {
      assignmentId: string;
      stayId: string;
      guestName: string;
      assignedAt: string;
      releasedAt: string | null;
    }[]
  > {
    const rows = await query(
      `SELECT ra.id as assignment_id, ra.stay_id, s.guest_name, ra.assigned_at, ra.released_at
       FROM room_assignments ra
       LEFT JOIN stays s ON ra.stay_id = s.id
       WHERE ra.room_id = ?
       ORDER BY ra.assigned_at DESC`,
      [roomId],
    );
    return rows.map((r: any) => ({
      assignmentId: r.assignment_id,
      stayId: r.stay_id,
      guestName: r.guest_name,
      assignedAt: r.assigned_at,
      releasedAt: r.released_at,
    }));
  },

  async getUpcomingArrivals(days: number): Promise<T.Reservation[]> {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + days * 86400000)
      .toISOString()
      .split('T')[0];
    const rows = await query(
      `SELECT r.*, rt.name as room_type_name, rm.room_no
       FROM reservations r
       LEFT JOIN room_types rt ON r.room_type_id = rt.id
       LEFT JOIN rooms rm ON r.room_id = rm.id
       WHERE r.check_in >= ? AND r.check_in <= ? AND r.status IN ('reserved', 'confirmed')
       ORDER BY r.check_in ASC`,
      [today, future],
    );
    return rows.map(rowToReservation);
  },
};

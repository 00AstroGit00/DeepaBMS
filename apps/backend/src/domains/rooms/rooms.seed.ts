import type { SeedModule } from '../../seed/types';
import * as R from './rooms.repository';
import { run } from '../../db';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

const ROOM_TYPES: {
  id: string;
  name: string;
  code: string;
  baseRate: number;
  capacity: number;
  bedType: string;
  amenities: string;
}[] = [
  {
    id: 'rtp-std',
    name: 'Standard Room',
    code: 'STD',
    baseRate: 2500,
    capacity: 2,
    bedType: 'queen',
    amenities: 'TV, AC, WiFi, Attached Bathroom',
  },
  {
    id: 'rtp-del',
    name: 'Deluxe Room',
    code: 'DEL',
    baseRate: 4000,
    capacity: 2,
    bedType: 'king',
    amenities: 'TV, AC, WiFi, Mini Bar, Attached Bathroom',
  },
  {
    id: 'rtp-sup',
    name: 'Superior Room',
    code: 'SUP',
    baseRate: 5500,
    capacity: 3,
    bedType: 'king',
    amenities: 'TV, AC, WiFi, Mini Bar, Balcony, Attached Bathroom',
  },
  {
    id: 'rtp-sui',
    name: 'Suite',
    code: 'SUI',
    baseRate: 8000,
    capacity: 3,
    bedType: 'king',
    amenities: 'TV, AC, WiFi, Mini Bar, Living Area, Balcony, Jacuzzi',
  },
  {
    id: 'rtp-pex',
    name: 'Premium Executive',
    code: 'PEX',
    baseRate: 12000,
    capacity: 2,
    bedType: 'king',
    amenities: 'TV, AC, WiFi, Mini Bar, Living Room, Study, Balcony',
  },
  {
    id: 'rtp-ps',
    name: 'Presidential Suite',
    code: 'PRS',
    baseRate: 25000,
    capacity: 4,
    bedType: 'king',
    amenities:
      'TV, AC, WiFi, Mini Bar, Living Room, Dining, Kitchen, Jacuzzi, Balcony',
  },
];

const ROOMS: {
  id: string;
  roomNo: string;
  typeId: string;
  floor: number;
  view: string;
  isSmoking: boolean;
}[] = [
  {
    id: 'rom-101',
    roomNo: '101',
    typeId: 'rtp-std',
    floor: 1,
    view: 'garden',
    isSmoking: false,
  },
  {
    id: 'rom-102',
    roomNo: '102',
    typeId: 'rtp-std',
    floor: 1,
    view: 'garden',
    isSmoking: false,
  },
  {
    id: 'rom-103',
    roomNo: '103',
    typeId: 'rtp-std',
    floor: 1,
    view: 'pool',
    isSmoking: true,
  },
  {
    id: 'rom-104',
    roomNo: '104',
    typeId: 'rtp-std',
    floor: 1,
    view: 'pool',
    isSmoking: false,
  },
  {
    id: 'rom-105',
    roomNo: '105',
    typeId: 'rtp-del',
    floor: 1,
    view: 'garden',
    isSmoking: false,
  },
  {
    id: 'rom-106',
    roomNo: '106',
    typeId: 'rtp-del',
    floor: 1,
    view: 'courtyard',
    isSmoking: false,
  },
  {
    id: 'rom-201',
    roomNo: '201',
    typeId: 'rtp-del',
    floor: 2,
    view: 'sea',
    isSmoking: false,
  },
  {
    id: 'rom-202',
    roomNo: '202',
    typeId: 'rtp-del',
    floor: 2,
    view: 'sea',
    isSmoking: false,
  },
  {
    id: 'rom-203',
    roomNo: '203',
    typeId: 'rtp-del',
    floor: 2,
    view: 'city',
    isSmoking: true,
  },
  {
    id: 'rom-204',
    roomNo: '204',
    typeId: 'rtp-del',
    floor: 2,
    view: 'city',
    isSmoking: false,
  },
  {
    id: 'rom-205',
    roomNo: '205',
    typeId: 'rtp-sup',
    floor: 2,
    view: 'sea',
    isSmoking: false,
  },
  {
    id: 'rom-206',
    roomNo: '206',
    typeId: 'rtp-sup',
    floor: 2,
    view: 'courtyard',
    isSmoking: false,
  },
  {
    id: 'rom-301',
    roomNo: '301',
    typeId: 'rtp-sup',
    floor: 3,
    view: 'garden',
    isSmoking: false,
  },
  {
    id: 'rom-302',
    roomNo: '302',
    typeId: 'rtp-sup',
    floor: 3,
    view: 'sea',
    isSmoking: false,
  },
  {
    id: 'rom-303',
    roomNo: '303',
    typeId: 'rtp-sup',
    floor: 3,
    view: 'sea',
    isSmoking: false,
  },
  {
    id: 'rom-304',
    roomNo: '304',
    typeId: 'rtp-sup',
    floor: 3,
    view: 'pool',
    isSmoking: true,
  },
  {
    id: 'rom-305',
    roomNo: '305',
    typeId: 'rtp-sui',
    floor: 3,
    view: 'sea',
    isSmoking: false,
  },
  {
    id: 'rom-306',
    roomNo: '306',
    typeId: 'rtp-sui',
    floor: 3,
    view: 'garden',
    isSmoking: false,
  },
  {
    id: 'rom-401',
    roomNo: '401',
    typeId: 'rtp-sui',
    floor: 4,
    view: 'sea',
    isSmoking: false,
  },
  {
    id: 'rom-402',
    roomNo: '402',
    typeId: 'rtp-sui',
    floor: 4,
    view: 'city',
    isSmoking: false,
  },
  {
    id: 'rom-403',
    roomNo: '403',
    typeId: 'rtp-pex',
    floor: 4,
    view: 'sea',
    isSmoking: false,
  },
  {
    id: 'rom-501',
    roomNo: '501',
    typeId: 'rtp-ps',
    floor: 5,
    view: 'sea',
    isSmoking: false,
  },
];

const GUESTS: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  nationality: string;
  idProofType: string | null;
  isCorporate?: boolean;
  companyName?: string;
  companyGst?: string;
}[] = [
  {
    id: 'gst-001',
    name: 'Rajesh Kumar',
    phone: '9876543210',
    email: 'rajesh@email.com',
    nationality: 'Indian',
    idProofType: 'Aadhaar',
  },
  {
    id: 'gst-002',
    name: 'Priya Sharma',
    phone: '9876543211',
    email: 'priya@email.com',
    nationality: 'Indian',
    idProofType: 'Passport',
  },
  {
    id: 'gst-003',
    name: 'John Smith',
    phone: '9876543212',
    email: 'john@email.com',
    nationality: 'British',
    idProofType: 'Passport',
  },
  {
    id: 'gst-004',
    name: 'Acme Corp',
    phone: '9876543213',
    email: 'travel@acme.com',
    nationality: 'Indian',
    idProofType: 'PAN',
    isCorporate: true,
    companyName: 'Acme Corp',
    companyGst: '32AABCU9603R1ZL',
  },
  {
    id: 'gst-005',
    name: 'Maria Garcia',
    phone: '9876543214',
    email: 'maria@email.com',
    nationality: 'Spanish',
    idProofType: 'Passport',
  },
];

export const roomsSeed: SeedModule = {
  name: 'rooms',
  dependsOn: ['auth', 'inventory'],

  async run(): Promise<void> {
    try {
      const existing = await R.RoomsRepository.findAllRoomTypes();
      if (existing.total > 0) {
        console.log('[rooms.seed] Room types already exist, skipping...');
        return;
      }

      console.log('[rooms.seed] Seeding rooms domain...');
      const now = new Date().toISOString();

      // 1. Room Types
      for (const rt of ROOM_TYPES) {
        await run(
          `INSERT OR IGNORE INTO room_types (id, name, code, description, base_rate, capacity, max_adults, max_children, size_sqft, bed_type, amenities, is_active, created_at, updated_at)
           VALUES (?, ?, ?, NULL, ?, ?, NULL, NULL, NULL, ?, ?, 1, ?, ?)`,
          [
            rt.id,
            rt.name,
            rt.code,
            rt.baseRate,
            rt.capacity,
            rt.bedType,
            rt.amenities,
            now,
            now,
          ],
        );
      }
      console.log(`[rooms.seed]   Created ${ROOM_TYPES.length} room types`);

      // 2. Rooms
      for (const r of ROOMS) {
        await run(
          `INSERT OR IGNORE INTO rooms (id, room_no, room_type_id, floor, view, status, is_smoking, is_active, notes, current_stay_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'vacant', ?, 1, NULL, NULL, ?, ?)`,
          [
            r.id,
            r.roomNo,
            r.typeId,
            r.floor,
            r.view,
            r.isSmoking ? 1 : 0,
            now,
            now,
          ],
        );
      }
      console.log(`[rooms.seed]   Created ${ROOMS.length} rooms`);

      // Override special room statuses
      await R.RoomsRepository.updateRoomStatus('rom-305', 'maintenance');
      await R.RoomsRepository.updateRoomStatus('rom-401', 'cleaning');
      console.log(
        '[rooms.seed]   Updated room statuses (305=maintenance, 401=cleaning)',
      );

      // 3. Guests
      for (const g of GUESTS) {
        await run(
          `INSERT OR IGNORE INTO guests (id, name, phone, email, address, id_proof_type, id_proof_number, nationality, is_corporate, company_name, company_gst, is_blacklisted, preferences, total_stays, total_revenue, created_at, updated_at)
           VALUES (?, ?, ?, ?, NULL, ?, NULL, ?, ?, ?, ?, 0, NULL, 0, 0, ?, ?)`,
          [
            g.id,
            g.name,
            g.phone,
            g.email,
            g.idProofType,
            g.nationality || 'Indian',
            g.isCorporate ? 1 : 0,
            g.companyName || null,
            g.companyGst || null,
            now,
            now,
          ],
        );
      }
      console.log(`[rooms.seed]   Created ${GUESTS.length} guests`);

      // 4. Reservations
      console.log('[rooms.seed]   Creating reservations...');

      // rsv-001: Rajesh Kumar — Deluxe Room, checked in 3 days ago, 3 nights
      const rsv1In = daysAgo(3);
      const rsv1Out = daysFromNow(0);
      await run(
        `INSERT INTO reservations (id, reservation_no, guest_id, guest_name, guest_phone, guest_email, room_type_id, room_id, check_in, check_out, nights, adults, children, board_type, status, source, source_ref, special_requests, corporate_name, corporate_gst, rate_override, discount_percent, discount_amount, total_amount, advance_amount, balance_amount, notes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'rsv-001',
          'RSV-001',
          'gst-001',
          'Rajesh Kumar',
          '9876543210',
          'rajesh@email.com',
          'rtp-del',
          'rom-201',
          rsv1In,
          rsv1Out,
          3,
          2,
          0,
          'room_only',
          'checked_in',
          'direct',
          null,
          null,
          null,
          null,
          null,
          0,
          0,
          12000,
          0,
          12000,
          null,
          null,
          now,
          now,
        ],
      );

      // rsv-002: John Smith — Suite, confirmed tomorrow, 2 nights
      const rsv2In = daysFromNow(1);
      const rsv2Out = daysFromNow(3);
      await run(
        `INSERT INTO reservations (id, reservation_no, guest_id, guest_name, guest_phone, guest_email, room_type_id, room_id, check_in, check_out, nights, adults, children, board_type, status, source, source_ref, special_requests, corporate_name, corporate_gst, rate_override, discount_percent, discount_amount, total_amount, advance_amount, balance_amount, notes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'rsv-002',
          'RSV-002',
          'gst-003',
          'John Smith',
          '9876543212',
          'john@email.com',
          'rtp-sui',
          null,
          rsv2In,
          rsv2Out,
          2,
          2,
          0,
          'bed_breakfast',
          'confirmed',
          'direct',
          null,
          null,
          null,
          null,
          null,
          0,
          0,
          16000,
          0,
          16000,
          null,
          null,
          now,
          now,
        ],
      );

      // rsv-003: Maria Garcia — Superior Room, reserved next week, 4 nights
      const rsv3In = daysFromNow(7);
      const rsv3Out = daysFromNow(11);
      await run(
        `INSERT INTO reservations (id, reservation_no, guest_id, guest_name, guest_phone, guest_email, room_type_id, room_id, check_in, check_out, nights, adults, children, board_type, status, source, source_ref, special_requests, corporate_name, corporate_gst, rate_override, discount_percent, discount_amount, total_amount, advance_amount, balance_amount, notes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'rsv-003',
          'RSV-003',
          'gst-005',
          'Maria Garcia',
          '9876543214',
          'maria@email.com',
          'rtp-sup',
          null,
          rsv3In,
          rsv3Out,
          4,
          2,
          0,
          'room_only',
          'reserved',
          'direct',
          null,
          null,
          null,
          null,
          null,
          0,
          0,
          22000,
          0,
          22000,
          null,
          null,
          now,
          now,
        ],
      );

      // rsv-004: Priya Sharma — Standard Room, walk-in checked in today, 1 night
      const rsv4In = daysAgo(0);
      const rsv4Out = daysFromNow(1);
      await run(
        `INSERT INTO reservations (id, reservation_no, guest_id, guest_name, guest_phone, guest_email, room_type_id, room_id, check_in, check_out, nights, adults, children, board_type, status, source, source_ref, special_requests, corporate_name, corporate_gst, rate_override, discount_percent, discount_amount, total_amount, advance_amount, balance_amount, notes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'rsv-004',
          'RSV-004',
          'gst-002',
          'Priya Sharma',
          '9876543211',
          'priya@email.com',
          'rtp-std',
          'rom-101',
          rsv4In,
          rsv4Out,
          1,
          1,
          0,
          'room_only',
          'checked_in',
          'walk_in',
          null,
          null,
          null,
          null,
          null,
          0,
          0,
          2500,
          0,
          2500,
          null,
          null,
          now,
          now,
        ],
      );

      // rsv-005: Acme Corp (corporate) — Premium Executive, confirmed 2 days from now, 2 nights
      const rsv5In = daysFromNow(2);
      const rsv5Out = daysFromNow(4);
      await run(
        `INSERT INTO reservations (id, reservation_no, guest_id, guest_name, guest_phone, guest_email, room_type_id, room_id, check_in, check_out, nights, adults, children, board_type, status, source, source_ref, special_requests, corporate_name, corporate_gst, rate_override, discount_percent, discount_amount, total_amount, advance_amount, balance_amount, notes, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'rsv-005',
          'RSV-005',
          'gst-004',
          'Acme Corp',
          '9876543213',
          'travel@acme.com',
          'rtp-pex',
          null,
          rsv5In,
          rsv5Out,
          2,
          2,
          0,
          'room_only',
          'confirmed',
          'corporate',
          null,
          null,
          'Acme Corp',
          '32AABCU9603R1ZL',
          null,
          0,
          0,
          24000,
          0,
          24000,
          null,
          null,
          now,
          now,
        ],
      );
      console.log('[rooms.seed]   Created 5 reservations');

      // 5. Stays
      console.log('[rooms.seed]   Creating stays...');

      // sta-001: from rsv-001 (Rajesh, Room 201, 3 nights Deluxe)
      const sta1In = daysAgo(3);
      const sta1ExpOut = daysFromNow(0);
      const sta1Rate = 4000;
      const sta1Total = sta1Rate * 3;
      await run(
        `INSERT INTO stays (id, reservation_id, guest_id, guest_name, guest_phone, room_id, room_no, room_type_id, room_type_name, check_in, check_out, expected_check_out, nights, adults, children, board_type, rate, discount_percent, discount_amount, folio_id, folio_number, balance_amount, status, notes, checked_in_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
        [
          'sta-001',
          'rsv-001',
          'gst-001',
          'Rajesh Kumar',
          '9876543210',
          'rom-201',
          '201',
          'rtp-del',
          'Deluxe Room',
          sta1In,
          sta1ExpOut,
          3,
          2,
          0,
          'room_only',
          sta1Rate,
          0,
          0,
          'fio-001',
          'FIO-001',
          sta1Total,
          null,
          null,
          now,
          now,
        ],
      );

      // sta-002: from rsv-004 (Priya, Room 101, 1 night Standard)
      const sta2In = daysAgo(0);
      const sta2ExpOut = daysFromNow(1);
      const sta2Rate = 2500;
      const sta2Total = sta2Rate * 1;
      await run(
        `INSERT INTO stays (id, reservation_id, guest_id, guest_name, guest_phone, room_id, room_no, room_type_id, room_type_name, check_in, check_out, expected_check_out, nights, adults, children, board_type, rate, discount_percent, discount_amount, folio_id, folio_number, balance_amount, status, notes, checked_in_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
        [
          'sta-002',
          'rsv-004',
          'gst-002',
          'Priya Sharma',
          '9876543211',
          'rom-101',
          '101',
          'rtp-std',
          'Standard Room',
          sta2In,
          sta2ExpOut,
          1,
          1,
          0,
          'room_only',
          sta2Rate,
          0,
          0,
          'fio-002',
          'FIO-002',
          sta2Total,
          null,
          null,
          now,
          now,
        ],
      );

      // Update rooms to occupied
      await R.RoomsRepository.updateRoomStatus(
        'rom-201',
        'occupied',
        'sta-001',
      );
      await R.RoomsRepository.updateRoomStatus(
        'rom-101',
        'occupied',
        'sta-002',
      );
      console.log('[rooms.seed]   Created 2 stays and updated room statuses');

      // 6. Folios (charges and payments)
      console.log('[rooms.seed]   Creating folios...');

      // fio-001 — sta-001 (Rajesh, Room 201, Deluxe)
      await run(
        `INSERT OR IGNORE INTO folios (id, folio_number, stay_id, guest_id, guest_name, room_no, status, room_charges, restaurant_charges, bar_charges, room_service_charges, laundry_charges, extra_bed_charges, amenities_charges, service_charge, tax_amount, discounts, total_charges, total_payments, balance_amount, notes, closed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'open', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?, NULL, ?, ?)`,
        [
          'fio-001',
          'FIO-001',
          'sta-001',
          'gst-001',
          'Rajesh Kumar',
          '201',
          sta1Total,
          null,
          now,
          now,
        ],
      );

      // Room tariff: ₹4000 × 2 nights
      await R.RoomsRepository.postCharge({
        folioId: 'fio-001',
        category: 'room_tariff',
        description: 'Room tariff - Night 1 & 2',
        amount: 4000,
        quantity: 2,
      });

      // Restaurant charge
      await R.RoomsRepository.postCharge({
        folioId: 'fio-001',
        category: 'restaurant',
        description: 'Room service dinner',
        amount: 1500,
        quantity: 1,
      });

      // Deposit payment
      await R.RoomsRepository.postPayment({
        folioId: 'fio-001',
        mode: 'cash',
        amount: 5000,
        reference: 'Cash deposit at check-in',
      });

      // fio-002 — sta-002 (Priya, Room 101, Standard)
      await run(
        `INSERT OR IGNORE INTO folios (id, folio_number, stay_id, guest_id, guest_name, room_no, status, room_charges, restaurant_charges, bar_charges, room_service_charges, laundry_charges, extra_bed_charges, amenities_charges, service_charge, tax_amount, discounts, total_charges, total_payments, balance_amount, notes, closed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'open', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, ?, NULL, ?, ?)`,
        [
          'fio-002',
          'FIO-002',
          'sta-002',
          'gst-002',
          'Priya Sharma',
          '101',
          sta2Total,
          null,
          now,
          now,
        ],
      );

      // Room tariff: ₹2500 × 1 night
      await R.RoomsRepository.postCharge({
        folioId: 'fio-002',
        category: 'room_tariff',
        description: 'Room tariff - 1 night',
        amount: 2500,
        quantity: 1,
      });

      // Bar / mini bar charge
      await R.RoomsRepository.postCharge({
        folioId: 'fio-002',
        category: 'bar',
        description: 'Mini bar consumption',
        amount: 1200,
        quantity: 1,
      });
      console.log('[rooms.seed]   Created 2 folios with charges and payments');

      // 7. Housekeeping Tasks
      console.log('[rooms.seed]   Creating housekeeping tasks...');
      const todayDate = new Date().toISOString().split('T')[0];
      const tomorrowDate = daysFromNow(1).split('T')[0];

      const HK_TASKS = [
        {
          id: 'hkt-001',
          roomId: 'rom-101',
          taskType: 'daily_cleaning',
          scheduledDate: todayDate,
          status: 'completed',
          completedAt: now,
          priority: 0,
        },
        {
          id: 'hkt-002',
          roomId: 'rom-102',
          taskType: 'daily_cleaning',
          scheduledDate: todayDate,
          status: 'in_progress',
          priority: 0,
        },
        {
          id: 'hkt-003',
          roomId: 'rom-103',
          taskType: 'deep_cleaning',
          scheduledDate: tomorrowDate,
          status: 'pending',
          priority: 1,
        },
        {
          id: 'hkt-004',
          roomId: 'rom-401',
          taskType: 'turn_down',
          scheduledDate: todayDate,
          status: 'pending',
          priority: 0,
        },
        {
          id: 'hkt-005',
          roomId: 'rom-305',
          taskType: 'post_maintenance',
          scheduledDate: todayDate,
          status: 'pending',
          priority: 1,
        },
      ];

      for (const hk of HK_TASKS) {
        await run(
          `INSERT OR IGNORE INTO housekeeping_tasks (id, room_id, room_no, task_type, status, assigned_to, priority, scheduled_date, completed_at, notes, created_by, created_at, updated_at)
           VALUES (?, ?, (SELECT room_no FROM rooms WHERE id = ?), ?, ?, NULL, ?, ?, ?, NULL, 'seed', ?, ?)`,
          [
            hk.id,
            hk.roomId,
            hk.roomId,
            hk.taskType,
            hk.status,
            hk.priority,
            hk.scheduledDate,
            hk.completedAt,
            now,
            now,
          ],
        );
      }
      console.log(
        `[rooms.seed]   Created ${HK_TASKS.length} housekeeping tasks`,
      );

      // 8. Maintenance Requests
      console.log('[rooms.seed]   Creating maintenance requests...');

      // mtc-001: Room 305 — AC fault, in progress
      await run(
        `INSERT OR IGNORE INTO maintenance_requests (id, room_id, room_no, issue_type, description, status, priority, assigned_to, reported_by, resolved_at, resolution, verified_by, cost, created_at, updated_at)
         VALUES (?, ?, (SELECT room_no FROM rooms WHERE id = ?), ?, ?, ?, ?, NULL, ?, NULL, NULL, NULL, 0, ?, ?)`,
        [
          'mtc-001',
          'rom-305',
          'rom-305',
          'ac_fault',
          'AC not cooling',
          'in_progress',
          1,
          'reception',
          now,
          now,
        ],
      );

      // mtc-002: Room 402 — Plumbing, resolved
      await run(
        `INSERT OR IGNORE INTO maintenance_requests (id, room_id, room_no, issue_type, description, status, priority, assigned_to, reported_by, resolved_at, resolution, verified_by, cost, created_at, updated_at)
         VALUES (?, ?, (SELECT room_no FROM rooms WHERE id = ?), ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'mtc-002',
          'rom-402',
          'rom-402',
          'plumbing',
          'Tap leaking in bathroom',
          'resolved',
          2,
          'housekeeping',
          now,
          now,
          'Replaced washer',
          'seed',
          350,
          now,
          now,
        ],
      );
      console.log('[rooms.seed]   Created 2 maintenance requests');

      console.log('[rooms.seed] Rooms seeding complete.');
    } catch (err) {
      console.error('[rooms.seed] Seeding failed:', err);
    }
  },

  async verify(): Promise<boolean> {
    const result = await R.RoomsRepository.findAllRoomTypes();
    return result.total >= ROOM_TYPES.length;
  },
};

import { Router, Response } from 'express';
import { query } from '../../db';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from '../../middleware/auth';
import { RoomsRepository } from './rooms.repository';
import * as T from './rooms.types';

const router = Router();

function handleError(
  res: Response,
  err: any,
  message = 'Internal server error',
): void {
  console.error('[rooms]', err.message);
  const status = err.message?.includes('not found')
    ? 404
    : err.message?.includes('Cannot') ||
        err.message?.includes('already') ||
        err.message?.includes('required') ||
        err.message?.includes('Invalid') ||
        err.message?.includes('must be') ||
        err.message?.includes('Validation')
      ? 400
      : 500;
  res.status(status).json({ message: err.message || message });
}

// ═════════════════════════════════════════════════════════════════════
// ROOM TYPES
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/room-types',
  authenticate,
  authorize('owner', 'manager', 'reception', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { search, offset, limit } = req.query as any;
      const result = await RoomsRepository.findAllRoomTypes({
        search,
        offset: Number(offset) || 0,
        limit: Number(limit) || 100,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/room-types/:id',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const roomType = await RoomsRepository.findRoomTypeById(req.params.id);
      if (!roomType) {
        res.status(404).json({ message: 'Room type not found' });
        return;
      }
      res.json(roomType);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/room-types',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, code, baseRate } = req.body;
      if (!name || !code || baseRate === undefined) {
        res
          .status(400)
          .json({ message: 'name, code, and baseRate are required' });
        return;
      }
      const existing = await RoomsRepository.findRoomTypeByCode(code);
      if (existing) {
        res
          .status(409)
          .json({ message: `Room type code ${code} already exists` });
        return;
      }
      const roomType = await RoomsRepository.createRoomType(req.body);
      res.status(201).json(roomType);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/room-types/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const roomType = await RoomsRepository.updateRoomType(
        req.params.id,
        req.body,
      );
      res.json(roomType);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.delete(
  '/room-types/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await RoomsRepository.archiveRoomType(req.params.id);
      res.json({ message: 'Room type archived' });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// ROOMS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/',
  authenticate,
  authorize('owner', 'manager', 'reception', 'housekeeping', 'fnb', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        roomTypeId,
        status,
        floor,
        view,
        isActive,
        search,
        offset,
        limit,
      } = req.query as any;
      const result = await RoomsRepository.findAllRooms({
        roomTypeId,
        status,
        floor: floor !== undefined ? Number(floor) : undefined,
        view,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        search,
        offset: Number(offset) || 0,
        limit: Number(limit) || 100,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/available',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { checkIn, checkOut, roomTypeId } = req.query as any;
      if (!checkIn || !checkOut) {
        res
          .status(400)
          .json({ message: 'checkIn and checkOut query params are required' });
        return;
      }
      const rooms = await RoomsRepository.findAvailableRooms(
        checkIn,
        checkOut,
        roomTypeId,
      );
      res.json(rooms);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/occupancy',
  authenticate,
  authorize('owner', 'manager', 'auditor'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = await RoomsRepository.getOccupancySummary();
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/by-status/:status',
  authenticate,
  authorize('owner', 'manager', 'reception', 'housekeeping'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.params;
      if (!T.VALID_ROOM_STATUSES.includes(status as T.RoomStatus)) {
        res.status(400).json({ message: `Invalid room status: ${status}` });
        return;
      }
      const rooms = await RoomsRepository.findRoomsByStatus(
        status as T.RoomStatus,
      );
      res.json(rooms);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/by-type/:roomTypeId',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rooms = await RoomsRepository.findRoomsByType(
        req.params.roomTypeId,
      );
      res.json(rooms);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/:id',
  authenticate,
  authorize('owner', 'manager', 'reception', 'housekeeping'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const room = await RoomsRepository.findRoomById(req.params.id);
      if (!room) {
        res.status(404).json({ message: 'Room not found' });
        return;
      }
      res.json(room);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { roomNo, roomTypeId } = req.body;
      if (!roomNo || !roomTypeId) {
        res.status(400).json({ message: 'roomNo and roomTypeId are required' });
        return;
      }
      const room = await RoomsRepository.createRoom(req.body);
      res.status(201).json(room);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/:id',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const room = await RoomsRepository.updateRoom(req.params.id, req.body);
      res.json(room);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/:id/status',
  authenticate,
  authorize('owner', 'manager', 'reception', 'housekeeping'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ message: 'status is required' });
        return;
      }
      if (!T.VALID_ROOM_STATUSES.includes(status as T.RoomStatus)) {
        res.status(400).json({ message: `Invalid room status: ${status}` });
        return;
      }
      const room = await RoomsRepository.updateRoomStatus(
        req.params.id,
        status as T.RoomStatus,
      );
      res.json(room);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/:id/history',
  authenticate,
  authorize('owner', 'manager', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const history = await RoomsRepository.getRoomHistory(req.params.id);
      res.json(history);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// GUESTS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/guests',
  authenticate,
  authorize('owner', 'manager', 'reception', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { search, isCorporate, isBlacklisted, offset, limit } =
        req.query as any;
      const result = await RoomsRepository.findAllGuests({
        search,
        isCorporate:
          isCorporate !== undefined ? isCorporate === 'true' : undefined,
        isBlacklisted:
          isBlacklisted !== undefined ? isBlacklisted === 'true' : undefined,
        offset: Number(offset) || 0,
        limit: Number(limit) || 100,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/guests/search',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q } = req.query as any;
      if (!q) {
        res.status(400).json({ message: 'Search query q is required' });
        return;
      }
      const guests = await RoomsRepository.searchGuests(q);
      res.json(guests);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/guests/corporate',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const guests = await RoomsRepository.findCorporateGuests();
      res.json(guests);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/guests/:id',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const guest = await RoomsRepository.findGuestById(req.params.id);
      if (!guest) {
        res.status(404).json({ message: 'Guest not found' });
        return;
      }
      res.json(guest);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/guests/:id/history',
  authenticate,
  authorize('owner', 'manager', 'reception', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const history = await RoomsRepository.getGuestHistory(req.params.id);
      res.json(history);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/guests',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, phone } = req.body;
      if (!name || !phone) {
        res.status(400).json({ message: 'name and phone are required' });
        return;
      }
      const guest = await RoomsRepository.createGuest(req.body);
      res.status(201).json(guest);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/guests/:id',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const guest = await RoomsRepository.updateGuest(req.params.id, req.body);
      res.json(guest);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/guests/:id/blacklist',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const guest = await RoomsRepository.blacklistGuest(req.params.id);
      res.json(guest);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// RESERVATIONS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/reservations',
  authenticate,
  authorize('owner', 'manager', 'reception', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        status,
        roomTypeId,
        guestId,
        source,
        fromDate,
        toDate,
        search,
        offset,
        limit,
        orderBy,
        orderDir,
      } = req.query as any;
      const result = await RoomsRepository.findAllReservations({
        status,
        roomTypeId,
        guestId,
        source,
        fromDate,
        toDate,
        search,
        offset: Number(offset) || 0,
        limit: Number(limit) || 100,
        orderBy,
        orderDir,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reservations/arrivals-today',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const arrivals = await RoomsRepository.getArrivalsToday();
      res.json(arrivals);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reservations/upcoming',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { days } = req.query as any;
      const arrivals = await RoomsRepository.getUpcomingArrivals(
        Number(days) || 7,
      );
      res.json(arrivals);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reservations/:id',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reservation = await RoomsRepository.findReservationById(
        req.params.id,
      );
      if (!reservation) {
        res.status(404).json({ message: 'Reservation not found' });
        return;
      }
      res.json(reservation);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/reservations',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { guestName, guestPhone, checkIn, checkOut } = req.body;
      if (!guestName || !guestPhone || !checkIn || !checkOut) {
        res.status(400).json({
          message: 'guestName, guestPhone, checkIn, and checkOut are required',
        });
        return;
      }
      const reservation = await RoomsRepository.createReservation(
        req.body,
        req.user?.name,
      );
      res.status(201).json(reservation);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/reservations/:id',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reservation = await RoomsRepository.updateReservation(
        req.params.id,
        req.body,
      );
      res.json(reservation);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/reservations/:id/confirm',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reservation = await RoomsRepository.updateReservationStatus(
        req.params.id,
        'confirmed',
        req.user?.name,
      );
      res.json(reservation);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/reservations/:id/cancel',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reservation = await RoomsRepository.cancelReservation(
        req.params.id,
        req.user?.name,
      );
      res.json(reservation);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/reservations/:id/no-show',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reservation = await RoomsRepository.updateReservationStatus(
        req.params.id,
        'no_show',
        req.user?.name,
      );
      res.json(reservation);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reservations/by-guest/:guestId',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reservations = await RoomsRepository.findReservationsByGuest(
        req.params.guestId,
      );
      res.json(reservations);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// CHECK-IN / CHECK-OUT
// ═════════════════════════════════════════════════════════════════════

router.post(
  '/check-in',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reservationId, roomId } = req.body;
      if (!reservationId || !roomId) {
        res
          .status(400)
          .json({ message: 'reservationId and roomId are required' });
        return;
      }

      const reservation =
        await RoomsRepository.findReservationById(reservationId);
      if (!reservation) {
        res.status(404).json({ message: 'Reservation not found' });
        return;
      }
      if (reservation.status !== 'confirmed') {
        res.status(400).json({
          message: `Reservation status must be confirmed, got ${reservation.status}`,
        });
        return;
      }

      const room = await RoomsRepository.findRoomById(roomId);
      if (!room) {
        res.status(404).json({ message: 'Room not found' });
        return;
      }
      if (room.status !== 'vacant' && room.status !== 'reserved') {
        res.status(409).json({
          message: `Room ${room.roomNo} is not available (status: ${room.status})`,
        });
        return;
      }

      const stay = await RoomsRepository.createStay({
        reservationId: reservation.id,
        guestId: reservation.guestId || '',
        guestName: reservation.guestName,
        guestPhone: reservation.guestPhone,
        roomId: room.id,
        roomNo: room.roomNo,
        roomTypeId: room.roomTypeId,
        roomTypeName: room.roomTypeName,
        expectedCheckOut: reservation.checkOut,
        nights: reservation.nights,
        adults: req.body.adults ?? reservation.adults,
        children: req.body.children ?? reservation.children,
        boardType: reservation.boardType,
        rate: reservation.rateOverride ?? 0,
        discountPercent: reservation.discountPercent,
        notes:
          req.body.specialRequests || reservation.specialRequests || undefined,
        checkedInBy: req.user?.name,
      });

      res.status(201).json(stay);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/check-out',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { stayId } = req.body;
      if (!stayId) {
        res.status(400).json({ message: 'stayId is required' });
        return;
      }
      const stay = await RoomsRepository.checkOutStay(
        stayId,
        req.user?.name || 'system',
      );
      res.json(stay);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/stays/active',
  authenticate,
  authorize('owner', 'manager', 'reception', 'fnb'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const stays = await RoomsRepository.findActiveStays();
      res.json(stays);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// STAYS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/stays',
  authenticate,
  authorize('owner', 'manager', 'reception', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { guestId, roomId, status, fromDate, toDate, offset, limit } =
        req.query as any;
      const result = await RoomsRepository.findAllStays({
        guestId,
        roomId,
        status,
        fromDate,
        toDate,
        offset: Number(offset) || 0,
        limit: Number(limit) || 100,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/stays/:id',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stay = await RoomsRepository.findStayById(req.params.id);
      if (!stay) {
        res.status(404).json({ message: 'Stay not found' });
        return;
      }
      res.json(stay);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/stays/by-room/:roomId',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { activeOnly } = req.query as any;
      const stays = await RoomsRepository.findStaysByRoom(
        req.params.roomId,
        activeOnly === 'true',
      );
      res.json(stays);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/stays/:id/extend',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { expectedCheckOut, nights } = req.body;
      if (!expectedCheckOut || !nights) {
        res
          .status(400)
          .json({ message: 'expectedCheckOut and nights are required' });
        return;
      }
      const stay = await RoomsRepository.updateStay(req.params.id, {
        expectedCheckOut,
        nights: Number(nights),
      });
      res.json(stay);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/stays/:id/transfer-room/:newRoomId',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stay = await RoomsRepository.findStayById(req.params.id);
      if (!stay) {
        res.status(404).json({ message: 'Stay not found' });
        return;
      }

      const newRoom = await RoomsRepository.findRoomById(req.params.newRoomId);
      if (!newRoom) {
        res.status(404).json({ message: 'New room not found' });
        return;
      }
      if (newRoom.status !== 'vacant') {
        res.status(409).json({
          message: `Room ${newRoom.roomNo} is not vacant (status: ${newRoom.status})`,
        });
        return;
      }

      const oldRoomId = stay.roomId;

      await RoomsRepository.updateStay(req.params.id, {
        expectedCheckOut: stay.expectedCheckOut,
        nights: stay.nights,
      });

      await RoomsRepository.createAssignment({
        stayId: req.params.id,
        roomId: newRoom.id,
        roomNo: newRoom.roomNo,
        assignedBy: req.user?.name,
      });

      await RoomsRepository.updateRoomStatus(oldRoomId, 'vacant');
      await RoomsRepository.updateRoomStatus(
        newRoom.id,
        'occupied',
        req.params.id,
      );

      await query(
        'UPDATE stays SET room_id = ?, room_no = ?, updated_at = ? WHERE id = ?',
        [newRoom.id, newRoom.roomNo, new Date().toISOString(), req.params.id],
      );

      await RoomsRepository.recordRoomEvent(
        'ROOM_TRANSFERRED',
        'stay',
        req.params.id,
        JSON.stringify({ fromRoomId: oldRoomId, toRoomId: newRoom.id }),
        req.user?.name,
      );

      const updatedStay = await RoomsRepository.findStayById(req.params.id);
      res.json(updatedStay);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// FOLIOS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/folios',
  authenticate,
  authorize('owner', 'manager', 'reception', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, guestId, stayId, offset, limit } = req.query as any;
      const result = await RoomsRepository.findAllFolios({
        status,
        guestId,
        stayId,
        offset: Number(offset) || 0,
        limit: Number(limit) || 100,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/folios/:id',
  authenticate,
  authorize('owner', 'manager', 'reception', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const folio = await RoomsRepository.findFolioById(req.params.id);
      if (!folio) {
        res.status(404).json({ message: 'Folio not found' });
        return;
      }
      res.json(folio);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/folios/by-stay/:stayId',
  authenticate,
  authorize('owner', 'manager', 'reception', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const folio = await RoomsRepository.findFolioByStay(req.params.stayId);
      if (!folio) {
        res.status(404).json({ message: 'Folio not found for this stay' });
        return;
      }
      res.json(folio);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/folios/:id/charges',
  authenticate,
  authorize('owner', 'manager', 'reception'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { category, description, amount } = req.body;
      if (!category || !description || amount === undefined) {
        res
          .status(400)
          .json({ message: 'category, description, and amount are required' });
        return;
      }
      if (!T.VALID_CHARGE_CATEGORIES.includes(category as T.ChargeCategory)) {
        res
          .status(400)
          .json({ message: `Invalid charge category: ${category}` });
        return;
      }
      const charge = await RoomsRepository.postFolioCharge({
        folioId: req.params.id,
        category,
        description,
        amount: Number(amount),
        quantity: req.body.quantity,
        taxAmount: req.body.taxAmount,
        reference: req.body.reference,
        notes: req.body.notes,
      });
      res.status(201).json(charge);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/folios/:id/payments',
  authenticate,
  authorize('owner', 'manager', 'reception', 'cashier'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { mode, amount } = req.body;
      if (!mode || amount === undefined) {
        res.status(400).json({ message: 'mode and amount are required' });
        return;
      }
      if (!T.VALID_PAYMENT_MODES.includes(mode as T.PaymentMode)) {
        res.status(400).json({ message: `Invalid payment mode: ${mode}` });
        return;
      }
      const payment = await RoomsRepository.postPayment({
        folioId: req.params.id,
        mode,
        amount: Number(amount),
        reference: req.body.reference,
        notes: req.body.notes,
      });
      res.status(201).json(payment);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/folios/:id/close',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const folio = await RoomsRepository.closeFolio(req.params.id);
      res.json(folio);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/folios/:id/balance',
  authenticate,
  authorize('owner', 'manager', 'reception', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const balance = await RoomsRepository.getFolioBalance(req.params.id);
      res.json({ balance });
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/folios/:id/void',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const folio = await RoomsRepository.voidFolio(req.params.id);
      res.json(folio);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// HOUSEKEEPING
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/housekeeping',
  authenticate,
  authorize('owner', 'manager', 'housekeeping'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, roomId, assignedTo, fromDate, toDate, offset, limit } =
        req.query as any;
      const result = await RoomsRepository.findAllHousekeepingTasks({
        status,
        roomId,
        assignedTo,
        fromDate,
        toDate,
        offset: Number(offset) || 0,
        limit: Number(limit) || 100,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/housekeeping/by-date/:date',
  authenticate,
  authorize('owner', 'manager', 'housekeeping'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tasks = await RoomsRepository.findHousekeepingByDate(
        req.params.date,
      );
      res.json(tasks);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/housekeeping',
  authenticate,
  authorize('owner', 'manager', 'housekeeping'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { roomId, taskType, scheduledDate } = req.body;
      if (!roomId || !taskType || !scheduledDate) {
        res.status(400).json({
          message: 'roomId, taskType, and scheduledDate are required',
        });
        return;
      }
      const task = await RoomsRepository.createHousekeepingTask(req.body);
      res.status(201).json(task);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/housekeeping/:id/complete',
  authenticate,
  authorize('owner', 'manager', 'housekeeping'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const task = await RoomsRepository.completeHousekeepingTask(
        req.params.id,
      );
      res.json(task);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/housekeeping/:id/inspect',
  authenticate,
  authorize('owner', 'manager', 'housekeeping'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const task = await RoomsRepository.updateHousekeepingTask(req.params.id, {
        status: 'inspected',
      });
      res.json(task);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/housekeeping/summary',
  authenticate,
  authorize('owner', 'manager', 'housekeeping'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date } = req.query as any;
      const summary = await RoomsRepository.getHousekeepingSummary(date);
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// MAINTENANCE
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/maintenance',
  authenticate,
  authorize('owner', 'manager', 'housekeeping'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, roomId, assignedTo, priority, issueType, offset, limit } =
        req.query as any;
      const result = await RoomsRepository.findAllMaintenanceRequests({
        status,
        roomId,
        assignedTo,
        priority: priority !== undefined ? Number(priority) : undefined,
        issueType,
        offset: Number(offset) || 0,
        limit: Number(limit) || 100,
      });
      res.json(result);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/maintenance/:id',
  authenticate,
  authorize('owner', 'manager', 'housekeeping'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const request = await RoomsRepository.findMaintenanceRequestById(
        req.params.id,
      );
      if (!request) {
        res.status(404).json({ message: 'Maintenance request not found' });
        return;
      }
      res.json(request);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.post(
  '/maintenance',
  authenticate,
  authorize('owner', 'manager', 'housekeeping'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { roomId, issueType, description, reportedBy } = req.body;
      if (!roomId || !issueType || !description || !reportedBy) {
        res.status(400).json({
          message:
            'roomId, issueType, description, and reportedBy are required',
        });
        return;
      }
      const request = await RoomsRepository.createMaintenanceRequest(req.body);
      res.status(201).json(request);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/maintenance/:id/assign',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { assignedTo } = req.body;
      if (!assignedTo) {
        res.status(400).json({ message: 'assignedTo is required' });
        return;
      }
      const request = await RoomsRepository.updateMaintenanceRequest(
        req.params.id,
        {
          assignedTo,
          status: 'assigned',
        },
      );
      res.json(request);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/maintenance/:id/resolve',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { resolution, cost, verifiedBy } = req.body;
      if (!resolution || !verifiedBy) {
        res
          .status(400)
          .json({ message: 'resolution and verifiedBy are required' });
        return;
      }
      const request = await RoomsRepository.resolveMaintenance(
        req.params.id,
        resolution,
        Number(cost || 0),
        verifiedBy,
      );
      res.json(request);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/maintenance/summary',
  authenticate,
  authorize('owner', 'manager', 'housekeeping'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = await RoomsRepository.getMaintenanceSummary();
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// NIGHT AUDIT
// ═════════════════════════════════════════════════════════════════════

router.post(
  '/night-audit',
  authenticate,
  authorize('owner', 'manager', 'accountant'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { auditDate, performedBy } = req.body;
      if (!auditDate || !performedBy) {
        res
          .status(400)
          .json({ message: 'auditDate and performedBy are required' });
        return;
      }

      const occupancy = await RoomsRepository.calculateOccupancy(auditDate);
      const audit = await RoomsRepository.performNightAudit({
        auditDate,
        totalRooms: occupancy.totalRooms,
        occupiedRooms: occupancy.occupiedRooms,
        vacantRooms: occupancy.vacantRooms,
        outOfServiceRooms: occupancy.outOfService,
        blockedRooms: occupancy.blocked,
        housekeepingRooms: occupancy.cleaning,
        performedBy,
        ...req.body,
      });
      res.status(201).json(audit);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/night-audit/:date',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const audit = await RoomsRepository.findNightAuditByDate(req.params.date);
      if (!audit) {
        res
          .status(404)
          .json({ message: 'Night audit not found for this date' });
        return;
      }
      res.json(audit);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/night-audit/:id/approve',
  authenticate,
  authorize('owner'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const audit = await RoomsRepository.approveNightAudit(req.params.id);
      res.json(audit);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/night-audit/summary',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      if (!fromDate || !toDate) {
        res
          .status(400)
          .json({ message: 'fromDate and toDate query params are required' });
        return;
      }
      const summary = await RoomsRepository.getNightAuditSummary(
        fromDate,
        toDate,
      );
      res.json(summary);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// REPORTS
// ═════════════════════════════════════════════════════════════════════

router.get(
  '/reports/occupancy',
  authenticate,
  authorize('owner', 'manager', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      if (!fromDate || !toDate) {
        res
          .status(400)
          .json({ message: 'fromDate and toDate query params are required' });
        return;
      }
      const report = await RoomsRepository.getOccupancyReport(fromDate, toDate);
      res.json(report);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/revenue',
  authenticate,
  authorize('owner', 'manager', 'accountant', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fromDate, toDate } = req.query as any;
      if (!fromDate || !toDate) {
        res
          .status(400)
          .json({ message: 'fromDate and toDate query params are required' });
        return;
      }
      const report = await RoomsRepository.getRevenueReport(fromDate, toDate);
      res.json(report);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/reports/current-occupancy',
  authenticate,
  authorize('owner', 'manager', 'reception', 'auditor'),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const occupancy = await RoomsRepository.calculateOccupancy(today);
      res.json(occupancy);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.get(
  '/events',
  authenticate,
  authorize('owner', 'manager', 'auditor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { aggregateType, aggregateId } = req.query as any;
      const events = await RoomsRepository.findRoomEvents(
        aggregateType,
        aggregateId,
      );
      res.json(events);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
// ROOM OPERATIONS
// ═════════════════════════════════════════════════════════════════════

router.put(
  '/:id/block',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const room = await RoomsRepository.updateRoomStatus(
        req.params.id,
        'blocked',
      );
      await RoomsRepository.recordRoomEvent(
        'ROOM_BLOCKED',
        'room',
        req.params.id,
        undefined,
        req.user?.name,
      );
      res.json(room);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/:id/unblock',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const room = await RoomsRepository.updateRoomStatus(
        req.params.id,
        'vacant',
      );
      res.json(room);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

router.put(
  '/:id/out-of-service',
  authenticate,
  authorize('owner', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const room = await RoomsRepository.updateRoomStatus(
        req.params.id,
        'out_of_service',
      );
      res.json(room);
    } catch (err: any) {
      handleError(res, err);
    }
  },
);

export default router;

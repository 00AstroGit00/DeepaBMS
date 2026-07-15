import { query, run } from '../../../db';
import { VectorClock, LWWRegisterMap, PNCounter } from './crdt';
import * as T from '../sync.types';

export const CRDTMergeEngine = {
  /**
   * Process a single synchronization event, merging its CRDT state and writing back
   * to actual application database tables.
   */
  async processAndMergeEvent(event: T.SyncEvent): Promise<{
    merged: boolean;
    conflictLogged: boolean;
    conflict?: T.SyncConflict;
  }> {
    const { aggregateType, aggregateId, data, deviceId, version } = event;
    const incomingClock = VectorClock.fromJSON(event.metadata?.vectorClock || {
      [deviceId || 'unknown']: version,
    });
    const incomingTimestamp = event.metadata?.timestamp || new Date(event.createdAt).getTime();

    let conflictLogged = false;
    let conflictObj: T.SyncConflict | undefined = undefined;

    // Determine target domain table based on aggregateType
    if (aggregateType === 'stay') {
      const existing = await query('SELECT * FROM stays WHERE id = ?', [aggregateId]);
      if (existing.length === 0) {
        // Create new stay record
        await run(
          `INSERT INTO stays (id, reservation_id, guest_id, guest_name, guest_phone, room_id, room_no, room_type_id,
            room_type_name, expected_check_out, rate, status, notes, check_in)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            aggregateId,
            data.reservationId || null,
            data.guestId || 'unknown',
            data.guestName || 'Anonymous',
            data.guestPhone || '',
            data.roomId || '',
            data.roomNo || '',
            data.roomTypeId || '',
            data.roomTypeName || '',
            data.expectedCheckOut || new Date().toISOString().slice(0, 10),
            data.rate || 0.0,
            data.status || 'active',
            data.notes || '',
            data.checkIn || new Date().toISOString(),
          ],
        );
      } else {
        // Merge attributes using LWWRegisterMap
        const current = existing[0];
        const currentMeta = JSON.parse(current.notes || '{}')._crdt || {};
        const register = LWWRegisterMap.fromJSON(currentMeta.registers);

        const incomingRegister = new LWWRegisterMap();
        for (const [k, v] of Object.entries(data)) {
          incomingRegister.set(k, v, incomingClock, incomingTimestamp);
        }

        // Check if clocks are concurrent (conflict detection)
        let hasConflict = false;
        for (const k of incomingRegister.keys()) {
          const regCur = register.getRegister(k);
          if (regCur) {
            const clockCur = VectorClock.fromJSON(regCur.vectorClock);
            if (clockCur.compare(incomingClock) === 'concurrent') {
              hasConflict = true;
            }
          }
        }

        register.merge(incomingRegister);
        const mergedValues = register.toValueObject();

        if (hasConflict) {
          // Log conflict to conflict_log table
          const conflictId = 'conf-' + Math.random().toString(36).slice(2, 8);
          await run(
            `INSERT INTO conflict_log (id, aggregate_type, aggregate_id, conflict_type,
              local_version, remote_version, local_data, remote_data, resolved_data, resolution)
             VALUES (?, ?, ?, 'lww', ?, ?, ?, ?, ?, 'merge')`,
            [
              conflictId,
              aggregateType,
              aggregateId,
              current.version || 1,
              version,
              JSON.stringify(current),
              JSON.stringify(data),
              JSON.stringify(mergedValues),
            ],
          );
          conflictLogged = true;
          conflictObj = {
            id: conflictId,
            aggregateType,
            aggregateId,
            conflictType: 'lww',
            localVersion: current.version || 1,
            remoteVersion: version,
            localData: current,
            remoteData: data,
            resolvedData: mergedValues,
            resolution: 'merge',
            deviceId: deviceId || null,
            resolvedBy: 'system',
            resolvedAt: new Date().toISOString(),
            notes: 'CRDT Auto-Merged conflict',
            createdAt: new Date().toISOString(),
          };
        }

        // Update stay table
        const notesObj = {
          ...JSON.parse(current.notes || '{}'),
          _crdt: { registers: register.toJSON() },
        };

        await run(
          `UPDATE stays SET
            guest_id = ?, guest_name = ?, guest_phone = ?, room_id = ?, room_no = ?,
            expected_check_out = ?, rate = ?, status = ?, notes = ?
           WHERE id = ?`,
          [
            mergedValues.guestId !== undefined ? mergedValues.guestId : current.guest_id,
            mergedValues.guestName !== undefined ? mergedValues.guestName : current.guest_name,
            mergedValues.guestPhone !== undefined ? mergedValues.guestPhone : current.guest_phone,
            mergedValues.roomId !== undefined ? mergedValues.roomId : current.room_id,
            mergedValues.roomNo !== undefined ? mergedValues.roomNo : current.room_no,
            mergedValues.expectedCheckOut !== undefined ? mergedValues.expectedCheckOut : current.expected_check_out,
            mergedValues.rate !== undefined ? mergedValues.rate : current.rate,
            mergedValues.status !== undefined ? mergedValues.status : current.status,
            JSON.stringify(notesObj),
            aggregateId,
          ],
        );
      }
      return { merged: true, conflictLogged, conflict: conflictObj };
    }

    if (aggregateType === 'inventory_item') {
      const existing = await query('SELECT * FROM inventory WHERE id = ?', [aggregateId]);
      if (existing.length === 0) {
        // Create new item
        const pCounter = new PNCounter();
        if (data.quantity !== undefined) {
          pCounter.increment(deviceId || 'unknown', data.quantity);
        }
        const metaObj = {
          _crdt: {
            quantity: pCounter.toJSON(),
          },
        };
        await run(
          `INSERT INTO inventory (id, name, quantity, min_stock, unit, cost_price, description)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            aggregateId,
            data.name || 'Unknown Item',
            pCounter.value(),
            data.minStock || 0,
            data.unit || 'pcs',
            data.costPrice || 0,
            JSON.stringify(metaObj),
          ],
        );
      } else {
        const current = existing[0];
        let metaObj: any = {};
        try {
          metaObj = JSON.parse(current.description || '{}');
        } catch {
          metaObj = {};
        }

        const pCounter = PNCounter.fromJSON(metaObj._crdt?.quantity);
        if (data.quantityDelta !== undefined) {
          if (data.quantityDelta > 0) {
            pCounter.increment(deviceId || 'unknown', data.quantityDelta);
          } else {
            pCounter.decrement(deviceId || 'unknown', -data.quantityDelta);
          }
        } else if (data.quantity !== undefined) {
          // If direct absolute value is passed, convert to delta based on last value
          const delta = data.quantity - pCounter.value();
          if (delta > 0) {
            pCounter.increment(deviceId || 'unknown', delta);
          } else if (delta < 0) {
            pCounter.decrement(deviceId || 'unknown', -delta);
          }
        }

        metaObj._crdt = {
          ...metaObj._crdt,
          quantity: pCounter.toJSON(),
        };

        await run(
          `UPDATE inventory SET
            name = COALESCE(?, name),
            quantity = ?,
            min_stock = COALESCE(?, min_stock),
            unit = COALESCE(?, unit),
            cost_price = COALESCE(?, cost_price),
            description = ?
           WHERE id = ?`,
          [
            data.name || null,
            pCounter.value(),
            data.minStock || null,
            data.unit || null,
            data.costPrice || null,
            JSON.stringify(metaObj),
            aggregateId,
          ],
        );
      }
      return { merged: true, conflictLogged, conflict: conflictObj };
    }

    if (aggregateType === 'room') {
      const existing = await query('SELECT * FROM rooms WHERE id = ?', [aggregateId]);
      if (existing.length === 0) {
        await run(
          `INSERT INTO rooms (id, room_no, room_type_id, status)
           VALUES (?, ?, ?, ?)`,
          [
            aggregateId,
            data.roomNo || '',
            data.roomTypeId || '',
            data.status || 'available',
          ],
        );
      } else {
        await run(
          `UPDATE rooms SET
            room_no = COALESCE(?, room_no),
            room_type_id = COALESCE(?, room_type_id),
            status = COALESCE(?, status)
           WHERE id = ?`,
          [
            data.roomNo || null,
            data.roomTypeId || null,
            data.status || null,
            aggregateId,
          ],
        );
      }
      return { merged: true, conflictLogged, conflict: conflictObj };
    }

    return { merged: false, conflictLogged };
  },
};

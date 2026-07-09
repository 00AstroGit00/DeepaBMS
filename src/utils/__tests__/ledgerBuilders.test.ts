import { buildGuestRegister } from '../ledgerBuilders';
import { GlobalState } from '../../context/StoreContext';

describe('ledgerBuilders buildGuestRegister', () => {
  const mockBaseState = {
    settings: {
      place: 'Test Place',
      gstin: '32AAAAA0000A1Z0'
    },
    rooms: [
      { id: '1', no: '101', category: 'Standard', rate: 1000, status: 'vacant' }
    ],
    stays: []
  } as unknown as GlobalState;

  test('should not crash with empty stays and empty arrivals', () => {
    const report = buildGuestRegister(mockBaseState);
    expect(report.title).toBe('GUEST REGISTER (Arrival / Departure Record)');
    expect(report.sections[0].rows.length).toBe(0);
    expect(report.sections[1].rows.length).toBe(0);
  });

  test('should not crash with stay containing undefined mode, dates, nights or amount', () => {
    const state = {
      ...mockBaseState,
      stays: [
        {
          id: 'stay-1',
          roomNo: undefined,
          category: undefined,
          guestName: undefined,
          phone: undefined,
          checkIn: undefined,
          checkOut: undefined,
          nights: undefined,
          amount: undefined,
          mode: undefined
        }
      ],
      rooms: [
        {
          id: '1',
          no: '101',
          category: 'Standard',
          rate: 1000,
          status: 'occupied',
          guest: {
            name: undefined,
            phone: undefined,
            idProof: undefined,
            adults: undefined,
            checkIn: undefined,
            advance: undefined
          }
        }
      ]
    } as unknown as GlobalState;

    const report = buildGuestRegister(state);
    expect(report.title).toBe('GUEST REGISTER (Arrival / Departure Record)');
    expect(report.sections[0].rows[0][1]).toBe('-'); // room guest name should default to '-'
    expect(report.sections[1].rows[0][1]).toBe('-'); // stay guest name should default to '-'
    expect(report.sections[1].rows[0][9]).toBe(''); // mode should be empty string upper-cased
  });
});

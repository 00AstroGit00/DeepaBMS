import { Room, Stay, Action } from '../types';

export const hotelReducer = (
  state: { rooms: Room[]; stays: Stay[] } = { rooms: [], stays: [] },
  action: Action,
): { rooms: Room[]; stays: Stay[] } => {
  switch (action.type) {
    case 'CHECK_IN':
      return {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === action.roomId
            ? { ...r, status: 'occupied', guest: action.guest }
            : r,
        ),
      };
    case 'CHECK_OUT':
      return {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === action.roomId
            ? { ...r, status: 'cleaning', guest: undefined }
            : r,
        ),
        stays: [action.stay, ...state.stays],
      };
    case 'SET_ROOM_STATUS':
      return {
        ...state,
        rooms: state.rooms.map((r) =>
          r.id === action.roomId ? { ...r, status: action.status } : r,
        ),
      };
    case 'HYDRATE':
      return {
        rooms:
          action.state.rooms && action.state.rooms.length > 0
            ? action.state.rooms
            : state.rooms,
        stays: action.state.stays ?? state.stays,
      };
    case 'RESET_DEMO':
      const seed = (action as any).seed;
      return { rooms: seed.rooms, stays: seed.stays };
    default:
      return state;
  }
};

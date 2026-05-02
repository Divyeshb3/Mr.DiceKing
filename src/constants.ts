import { PlayerColor } from './types';

export const BOARD_SIZE = 15;
export const TRACK_LENGTH = 52;

// Standard Ludo Path (Clockwise)
// 15x15 Grid (0-14)
// Starting at (6,0) so RED entry at (6,1) is index 1.
export const TRACK_COORDINATES: [number, number][] = [
  // RED to BLUE (13 steps)
  [6, 1], [5, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
  // BLUE to GREEN (13 steps)
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [7, 14],
  // GREEN to YELLOW (13 steps)
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [8, 8], [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7],
  // YELLOW to RED (13 steps)
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]
];

// Start Indices as per prompt
export const START_INDICES: Record<PlayerColor, number> = {
  RED: 0,      // [6,1]
  BLUE: 13,    // [1,8]
  GREEN: 26,   // [8,13]
  YELLOW: 39   // [13,6]
};

// Home Entry: The track index that leads to home (one before start)
export const HOME_ENTRY_INDICES: Record<PlayerColor, number> = {
  RED: 51,     // [6,0]
  BLUE: 12,    // [0,7]
  GREEN: 25,   // [7,14]
  YELLOW: 38   // [14,7]
};

// Home Path (5 steps + Finish)
export const HOME_PATHS: Record<PlayerColor, [number, number][]> = {
  RED: [[6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6]],
  BLUE: [[1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8]],
  GREEN: [[8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [8, 8]],
  YELLOW: [[13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 6]]
};

// Safe squares (star squares) as per prompt coordinates
export const SAFE_SQUARES_COORDS = new Set([
    "1,6", "2,8", "6,2", "8,1",
    "6,12", "8,13", "12,6", "13,8",
    "1,8", "6,1", "8,13", "13,6"
]);

// Helper to check if a grid pos is safe
export const isSafeSquare = (row: number, col: number) => {
    return SAFE_SQUARES_COORDS.has(`${row},${col}`);
};

// Fixed pre-defined slot positions inside the home quadrant (Bug #2)
export const HOME_SLOTS: Record<PlayerColor, [number, number][]> = {
  RED:    [[1, 1], [1, 3], [3, 1], [3, 3]],
  BLUE:   [[1, 11], [1, 13], [3, 11], [3, 13]],
  GREEN:  [[11, 11], [11, 13], [13, 11], [13, 13]], // GREEN at BR (offset 26)
  YELLOW: [[11, 1], [11, 3], [13, 1], [13, 3]]      // YELLOW at BL (offset 39)
};

export const BASE_POSITIONS = HOME_SLOTS;

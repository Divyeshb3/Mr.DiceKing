export type PlayerColor = 'RED' | 'GREEN' | 'YELLOW' | 'BLUE';

export enum GameState {
  INITIALIZING = 'INITIALIZING',
  WAITING_FOR_ROLL = 'WAITING_FOR_ROLL',
  ROLLING_DICE = 'ROLLING_DICE',
  WAITING_FOR_MOVE = 'WAITING_FOR_MOVE',
  MOVING_TOKEN = 'MOVING_TOKEN',
  SWITCHING_TURN = 'SWITCHING_TURN',
  GAME_OVER = 'GAME_OVER'
}

export type PlayerType = 'HUMAN' | 'AI';

export interface Player {
  id: PlayerColor;
  type: PlayerType;
  name: string;
  isActive: boolean;
  tokens: Token[];
}

export interface Token {
  id: number;
  position: number; // -1 for Base, 0-51 for main track, 52-57 for home path, 58 for Home
  isFinished: boolean;
}

export type Screen = 'HOME' | 'PLAYER_SELECTION' | 'GAME' | 'RESULT';

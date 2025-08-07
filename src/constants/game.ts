export const GAME_CONSTANTS = {
  TOTAL_ROUNDS: 9,
  ROUNDS_TO_WIN: 5,
  MAX_PLAYERS: 2,
  DEFAULT_BET: 100,
  
  TRUMP_CARDS: {
    MIN_PER_PLAYER: 1,
    MAX_PER_PLAYER: 4,
  },
  
  HAND_BALANCE: {
    MIN_HAND_VALUE: 55,
    MAX_HAND_VALUE: 90,
    MAX_VALUE_DIFFERENCE: 8,
    MIN_HIGH_CARD_VALUE: 11,
    MAX_RESHUFFLE_ATTEMPTS: 100,
  },
  
  TIMERS: {
    ROUND_PLAY_TIME_MS: 10000,
    ROUND_POPUP_DURATION_MS: 3000,  // 3 seconds for popup
    AUTO_PLAY_DELAY_MIN_MS: 100,
    AUTO_PLAY_DELAY_MAX_MS: 200,
    TIMER_UPDATE_INTERVAL_MS: 100,
    COUNTDOWN_INTERVAL_MS: 1000,
  },
  
  GAME_STATUS: {
    WAITING: 'waiting' as const,
    READY: 'ready' as const,
    PLAYING: 'playing' as const,
    MATCH_END: 'match_end' as const,
  },
  
  ROUND_RESULT: {
    PLAYER1: 'player1' as const,
    PLAYER2: 'player2' as const,
    DRAW: 'draw' as const,
  }
};

export type GameStatus = typeof GAME_CONSTANTS.GAME_STATUS[keyof typeof GAME_CONSTANTS.GAME_STATUS];
export type RoundResult = typeof GAME_CONSTANTS.ROUND_RESULT[keyof typeof GAME_CONSTANTS.ROUND_RESULT];
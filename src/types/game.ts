type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
}

interface Player {
  id: string;
  name: string;
  hand: Card[];
  cardsPlayed: Card[];
  roundsWon: number;
  currentCard: Card | null;
  ready: boolean;
}

type GameStatus = 'waiting' | 'ready' | 'dealing' | 'playing' | 'round_end' | 'match_end';

interface Round {
  player1Card: Card | null;
  player2Card: Card | null;
  winner: string | null;
  timestamp: number;
}

interface Game {
  id: string;
  createdAt: number;
  status: GameStatus;
  trumpSuit: Suit | null;
  currentRound: number;
  roundTimer: number | null;
  bet: number;
  players: Record<string, Player>;
  rounds: Round[];
}

export type { Suit, Rank, Card, Player, GameStatus, Round, Game };
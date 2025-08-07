import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

const db = admin.database();

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  currentCard: Card | null;
  cardsPlayed: Card[];
  roundsWon: number;
  ready: boolean;
}

export interface Game {
  id: string;
  createdAt: number;
  status: 'waiting' | 'ready' | 'playing' | 'match_end';
  trumpSuit: Suit | null;
  currentRound: number;
  roundTimer: number | null;
  players: { [key: string]: Player };
  rounds: RoundResult[];
  bet: number;
}

export interface RoundResult {
  player1Card: Card;
  player2Card: Card;
  winner: string | null;
  timestamp: number;
}

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function getCardValue(rank: Rank): number {
  switch (rank) {
    case 'J': return 11;
    case 'Q': return 12;
    case 'K': return 13;
    case 'A': return 14;
    default: return parseInt(rank);
  }
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        value: getCardValue(rank)
      });
    }
  }
  return deck;
}

// Cryptographically secure shuffle
function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomBytes = crypto.randomBytes(4);
    const randomInt = randomBytes.readUInt32BE(0);
    const j = randomInt % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function validateHands(hand1: Card[], hand2: Card[], trumpSuit: Suit): boolean {
  const value1 = hand1.reduce((sum, card) => sum + card.value, 0);
  const value2 = hand2.reduce((sum, card) => sum + card.value, 0);
  const valueDifference = Math.abs(value1 - value2);
  
  const trumpCards1 = hand1.filter(card => card.suit === trumpSuit).length;
  const trumpCards2 = hand2.filter(card => card.suit === trumpSuit).length;
  
  const highCards1 = hand1.filter(card => card.value >= 11).length;
  const highCards2 = hand2.filter(card => card.value >= 11).length;

  // Fair distribution rules
  if (value1 < 55 || value1 > 90) return false;
  if (value2 < 55 || value2 > 90) return false;
  if (valueDifference > 8) return false;
  if (trumpCards1 !== trumpCards2) return false;
  if (highCards1 === 0 || highCards2 === 0) return false;
  
  return true;
}

export function dealCards(trumpSuit: Suit): { player1Hand: Card[], player2Hand: Card[] } | null {
  const MAX_ATTEMPTS = 100;
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    const player1Hand = shuffled.slice(0, 9);
    const player2Hand = shuffled.slice(9, 18);
    
    if (validateHands(player1Hand, player2Hand, trumpSuit)) {
      return { player1Hand, player2Hand };
    }
  }
  
  // Fallback if no valid distribution found
  const deck = createDeck();
  const shuffled = shuffleDeck(deck);
  return {
    player1Hand: shuffled.slice(0, 9),
    player2Hand: shuffled.slice(9, 18)
  };
}

export function getRandomTrumpSuit(): Suit {
  const randomBytes = crypto.randomBytes(1);
  const randomIndex = randomBytes[0] % SUITS.length;
  return SUITS[randomIndex];
}

// SERVER-SIDE TRUTH: Determine round winner
export function determineRoundWinner(
  card1: Card,
  card2: Card,
  trumpSuit: Suit
): 'player1' | 'player2' | 'draw' {
  const isCard1Trump = card1.suit === trumpSuit;
  const isCard2Trump = card2.suit === trumpSuit;
  
  // Trump beats non-trump
  if (isCard1Trump && !isCard2Trump) return 'player1';
  if (!isCard1Trump && isCard2Trump) return 'player2';
  
  // Both are trump cards - higher value wins
  if (isCard1Trump && isCard2Trump) {
    if (card1.value > card2.value) return 'player1';
    if (card2.value > card1.value) return 'player2';
    return 'draw';
  }
  
  // Both are non-trump cards
  // Same rank and same suit = draw
  if (card1.value === card2.value && card1.suit === card2.suit) {
    return 'draw';
  }
  
  // Same rank but different non-trump suits = draw
  if (card1.value === card2.value) {
    return 'draw';
  }
  
  // Different ranks - higher wins
  if (card1.value > card2.value) return 'player1';
  if (card2.value > card1.value) return 'player2';
  
  return 'draw';
}

// Validate that a card is actually in the player's hand
export function validateCardPlay(
  playerId: string,
  card: Card,
  game: Game
): boolean {
  const player = game.players[playerId];
  if (!player) return false;
  
  // Check if card exists in player's hand
  return player.hand.some(
    handCard => handCard.suit === card.suit && handCard.rank === card.rank
  );
}

// Process round completion
export async function processRoundCompletion(gameId: string, game: Game): Promise<void> {
  const playerIds = Object.keys(game.players);
  if (playerIds.length !== 2) return;
  
  const player1Id = playerIds[0];
  const player2Id = playerIds[1];
  const player1Card = game.players[player1Id].currentCard;
  const player2Card = game.players[player2Id].currentCard;
  
  if (!player1Card || !player2Card) return;
  
  // Determine winner
  const winner = determineRoundWinner(player1Card, player2Card, game.trumpSuit!);
  const winnerId = winner === 'draw' ? null : (winner === 'player1' ? player1Id : player2Id);
  
  const updates: any = {};
  
  // Record round result
  const roundResult: RoundResult = {
    player1Card,
    player2Card,
    winner: winnerId,
    timestamp: Date.now()
  };
  updates[`rounds/${game.currentRound}`] = roundResult;
  
  // Update scores
  if (winnerId) {
    const currentScore = game.players[winnerId].roundsWon || 0;
    updates[`players/${winnerId}/roundsWon`] = currentScore + 1;
    
    // Check win condition
    if (currentScore + 1 >= 5 || game.currentRound >= 8) {
      updates['status'] = 'match_end';
    }
  }
  
  // Update hands and clear current cards
  for (const playerId of playerIds) {
    const player = game.players[playerId];
    const playedCard = player.currentCard!;
    
    // Remove played card from hand
    const newHand = player.hand.filter(
      c => !(c.suit === playedCard.suit && c.rank === playedCard.rank)
    );
    updates[`players/${playerId}/hand`] = newHand;
    
    // Add to played cards
    updates[`players/${playerId}/cardsPlayed`] = [...(player.cardsPlayed || []), playedCard];
    
    // Clear current card
    updates[`players/${playerId}/currentCard`] = null;
  }
  
  // Advance round or end game
  if (!updates['status']) {
    updates['currentRound'] = game.currentRound + 1;
    updates['roundTimer'] = Date.now() + 20000; // 5s popup + 15s play
  }
  
  await db.ref(`games/${gameId}`).update(updates);
}

// Auto-play first card when timer expires
export async function autoPlayCard(gameId: string, playerId: string, game: Game): Promise<void> {
  const player = game.players[playerId];
  if (!player || player.currentCard || player.hand.length === 0) return;
  
  const cardToPlay = player.hand[0];
  const updates: any = {};
  
  // Set current card
  updates[`players/${playerId}/currentCard`] = cardToPlay;
  
  await db.ref(`games/${gameId}`).update(updates);
}
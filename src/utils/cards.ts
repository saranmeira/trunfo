import type { Card, Suit, Rank } from '../types/game';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const MAX_RESHUFFLE_ATTEMPTS = 100;

export interface DealResult {
  player1Hand: Card[];
  player2Hand: Card[];
  reshuffleCount: number;
  validationDetails: {
    player1Value: number;
    player2Value: number;
    valueDifference: number;
    player1TrumpCount: number;
    player2TrumpCount: number;
    player1HighCards: number;
    player2HighCards: number;
  };
}

export function createDeck(): Card[] {
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

export function getCardValue(rank: Rank): number {
  switch (rank) {
    case 'J': return 11;
    case 'Q': return 12;
    case 'K': return 13;
    case 'A': return 14;
    default: return parseInt(rank);
  }
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCardsWithTrump(trumpSuit: Suit): DealResult {
  const deck = createDeck();
  let reshuffleCount = 0;
  let validationDetails: DealResult['validationDetails'] | null = null;

  for (let attempt = 0; attempt < MAX_RESHUFFLE_ATTEMPTS; attempt++) {
    const shuffled = shuffleDeck(deck);
    const player1Hand = shuffled.slice(0, 9);
    const player2Hand = shuffled.slice(9, 18);
    
    const validation = validateHandsWithTrump(player1Hand, player2Hand, trumpSuit);
    validationDetails = validation.details;
    
    if (validation.isValid) {
      
      return {
        player1Hand,
        player2Hand,
        reshuffleCount,
        validationDetails
      };
    }
    
    reshuffleCount++;
  }

  const shuffled = shuffleDeck(deck);
  
  return {
    player1Hand: shuffled.slice(0, 9),
    player2Hand: shuffled.slice(9, 18),
    reshuffleCount,
    validationDetails: validationDetails!
  };
}

export function dealCards(deck: Card[]): [Card[], Card[]] {
  const trumpSuit = getRandomTrumpSuit();
  const result = dealCardsWithTrump(trumpSuit);
  return [result.player1Hand, result.player2Hand];
}

interface ValidationResult {
  isValid: boolean;
  failureReason?: string;
  details: DealResult['validationDetails'];
}

function validateHandsWithTrump(
  hand1: Card[], 
  hand2: Card[], 
  trumpSuit: Suit
): ValidationResult {
  const value1 = hand1.reduce((sum, card) => sum + card.value, 0);
  const value2 = hand2.reduce((sum, card) => sum + card.value, 0);
  const valueDifference = Math.abs(value1 - value2);
  
  const trumpCards1 = hand1.filter(card => card.suit === trumpSuit).length;
  const trumpCards2 = hand2.filter(card => card.suit === trumpSuit).length;
  const trumpDifference = Math.abs(trumpCards1 - trumpCards2);
  
  const highCards1 = hand1.filter(card => card.value >= 11).length;
  const highCards2 = hand2.filter(card => card.value >= 11).length;

  const details: DealResult['validationDetails'] = {
    player1Value: value1,
    player2Value: value2,
    valueDifference,
    player1TrumpCount: trumpCards1,
    player2TrumpCount: trumpCards2,
    player1HighCards: highCards1,
    player2HighCards: highCards2
  };

  if (value1 < 55 || value1 > 90) {
    return { 
      isValid: false, 
      failureReason: `Player 1 hand value ${value1} outside range [55-90]`,
      details 
    };
  }
  
  if (value2 < 55 || value2 > 90) {
    return { 
      isValid: false, 
      failureReason: `Player 2 hand value ${value2} outside range [55-90]`,
      details 
    };
  }
  
  if (valueDifference > 8) {
    return { 
      isValid: false, 
      failureReason: `Value difference ${valueDifference} exceeds maximum of 8`,
      details 
    };
  }
  
  if (trumpCards1 !== trumpCards2) {
    return { 
      isValid: false, 
      failureReason: `Trump card imbalance: P1=${trumpCards1}, P2=${trumpCards2} (must be equal)`,
      details 
    };
  }
  
  if (highCards1 === 0) {
    return { 
      isValid: false, 
      failureReason: 'Player 1 has no high cards (J/Q/K/A)',
      details 
    };
  }
  
  if (highCards2 === 0) {
    return { 
      isValid: false, 
      failureReason: 'Player 2 has no high cards (J/Q/K/A)',
      details 
    };
  }

  return { isValid: true, details };
}

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
    return 'draw'; // Same trump card (rare)
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

export function getRandomTrumpSuit(): Suit {
  return SUITS[Math.floor(Math.random() * SUITS.length)];
}
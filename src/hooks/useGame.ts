import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { ref, onValue, set, update, get } from 'firebase/database';
import type { Game, Card } from '../types/game';
import { getRandomTrumpSuit, determineRoundWinner, dealCardsWithTrump } from '../utils/cards';
import { v4 as uuidv4 } from 'uuid';
import { GAME_CONSTANTS } from '../constants/game';

export function useGame(gameId: string | null, playerId: string) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    const gameRef = ref(db, `games/${gameId}`);
    
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGame(data as Game);
      } else {
        setError('Game not found');
      }
      setLoading(false);
    }, (error) => {
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameId]);

  const createGame = async (playerName: string): Promise<string> => {
    try {
      const gameId = uuidv4();
      const gameRef = ref(db, `games/${gameId}`);
      
      const initialGame: Game = {
        id: gameId,
        createdAt: Date.now(),
        status: GAME_CONSTANTS.GAME_STATUS.WAITING,
        trumpSuit: null,
        currentRound: 0,
        roundTimer: null,
        bet: GAME_CONSTANTS.DEFAULT_BET,
        players: {
          [playerId]: {
            id: playerId,
            name: playerName,
            hand: [],
            cardsPlayed: [],
            roundsWon: 0,
            currentCard: null,
            ready: false
          }
        },
        rounds: []
      };

      await set(gameRef, initialGame);
      return gameId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
      throw err;
    }
  };

  const joinGame = async (playerName: string, targetGameId?: string): Promise<void> => {
    const gameIdToJoin = targetGameId || gameId;
    if (!gameIdToJoin) {
      throw new Error('No game ID provided');
    }

    try {
      const gameRef = ref(db, `games/${gameIdToJoin}`);
      const snapshot = await get(gameRef);
      const currentGame = snapshot.val();
      
      if (!currentGame) {
        throw new Error('Game not found');
      }
      
      const playerCount = Object.keys(currentGame.players).length;
      
      if (playerCount >= GAME_CONSTANTS.MAX_PLAYERS) {
        throw new Error('Game is full');
      }

      const updates: any = {};
      updates[`games/${gameIdToJoin}/players/${playerId}`] = {
        id: playerId,
        name: playerName,
        hand: [],
        cardsPlayed: [],
        roundsWon: 0,
        currentCard: null,
        ready: false
      };
      
      // Reset other player's ready status when new player joins
      const existingPlayerIds = Object.keys(currentGame.players);
      existingPlayerIds.forEach(id => {
        updates[`games/${gameIdToJoin}/players/${id}/ready`] = false;
      });

      if (playerCount === 1) {
        updates[`games/${gameIdToJoin}/status`] = GAME_CONSTANTS.GAME_STATUS.READY;
      }

      await update(ref(db), updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
      throw err;
    }
  };

  const startGame = async (): Promise<void> => {
    if (!gameId || !game) return;

    try {
      const trumpSuit = getRandomTrumpSuit();
      const dealResult = dealCardsWithTrump(trumpSuit);
      const playerIds = Object.keys(game.players);


      const updates: any = {};
      updates[`games/${gameId}/status`] = GAME_CONSTANTS.GAME_STATUS.PLAYING;
      updates[`games/${gameId}/trumpSuit`] = trumpSuit;
      updates[`games/${gameId}/roundTimer`] = Date.now() + GAME_CONSTANTS.TIMERS.ROUND_PLAY_TIME_MS;
      
      updates[`games/${gameId}/players/${playerIds[0]}/hand`] = dealResult.player1Hand;
      updates[`games/${gameId}/players/${playerIds[0]}/ready`] = true;
      
      updates[`games/${gameId}/players/${playerIds[1]}/hand`] = dealResult.player2Hand;
      updates[`games/${gameId}/players/${playerIds[1]}/ready`] = true;

      await update(ref(db), updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
      throw err;
    }
  };

  const playCard = async (card: Card, _isAutoPlay: boolean = false): Promise<void> => {
    if (!gameId || !game) return;

    try {
      const updates: any = {};
      const opponent = Object.values(game.players).find(p => p.id !== playerId);
      
      // Check if we already have both cards played (stuck round scenario)
      if (game.players[playerId]?.currentCard && opponent?.currentCard) {
        // Both cards already played - just try to process the round
        // This handles the fallback case where round evaluation didn't trigger
      } else if (!game.players[playerId]?.currentCard) {
        // SECURITY: Validate that the card being played is in the player's hand
        const playerHand = game.players[playerId]?.hand || [];
        const cardInHand = playerHand.some(
          c => c.suit === card.suit && c.rank === card.rank
        );
        
        if (!cardInHand) {
          console.error('Security violation: Attempting to play card not in hand');
          throw new Error('Invalid card - not in player hand');
        }
        
        // Only update if player hasn't played a card yet this round
        updates[`games/${gameId}/players/${playerId}/currentCard`] = card;
      
        // Update player's hand immediately
        const newHand = playerHand.filter(
          c => !(c.suit === card.suit && c.rank === card.rank)
        );
        updates[`games/${gameId}/players/${playerId}/hand`] = newHand;
        updates[`games/${gameId}/players/${playerId}/cardsPlayed`] = 
          [...(game.players[playerId].cardsPlayed || []), card];
      } else {
        // Player already has a card played, ignore this play attempt
        return;
      }
      
      // Check if we need to handle round completion
      const myCardPlayed = updates[`games/${gameId}/players/${playerId}/currentCard`] || game.players[playerId]?.currentCard;
      const opponentCardPlayed = opponent?.currentCard;
      const bothCardsPlayed = myCardPlayed && opponentCardPlayed;
      
      // Process the round only if both cards are already played
      // SECURITY: Never process round without both cards being legitimately played
      if (bothCardsPlayed) {
        
        let opponentCard = opponent?.currentCard;
        let myCard = myCardPlayed || card;
        
        // SECURITY: Never allow client to set opponent's cards
        // Only process round if opponent has already played their card
        // Auto-play should only affect the current player's own cards
        
        // Process round completion only if we have both cards already played
        if (opponentCard && myCard) {
          // Determine the winner (re-get playerIds without sort for consistency)
          const playerIdsForWinner = Object.keys(game.players);
          const isPlayer1ForWinner = playerId === playerIdsForWinner[0];
          
          // myCard was already set above
          const player1Card = isPlayer1ForWinner ? myCard : opponentCard;
          const player2Card = isPlayer1ForWinner ? opponentCard : myCard;
        
        const winner = determineRoundWinner(
          player1Card,
          player2Card,
          game.trumpSuit!
        );

        const winnerId = winner === GAME_CONSTANTS.ROUND_RESULT.DRAW ? null : (winner === GAME_CONSTANTS.ROUND_RESULT.PLAYER1 ? playerIdsForWinner[0] : playerIdsForWinner[1]);
        
        // Record the round result
        const roundResult = {
          player1Card: player1Card,
          player2Card: player2Card,
          winner: winnerId,
          timestamp: Date.now()
        };
        updates[`games/${gameId}/rounds/${game.currentRound}`] = roundResult;

        // Update winner's score (only if not a draw)
        let newWinnerScore = 0;
        if (winnerId) {
          newWinnerScore = (game.players[winnerId].roundsWon || 0) + 1;
          updates[`games/${gameId}/players/${winnerId}/roundsWon`] = newWinnerScore;
        }

        // Update opponent's hand and cardsPlayed (only if not already done via auto-play)
        if (opponent?.currentCard && game.players[opponent.id]?.hand) {
          const opponentHand = game.players[opponent.id].hand || [];
          const opponentNewHand = opponentHand.filter(
            c => !(c.suit === opponentCard.suit && c.rank === opponentCard.rank)
          );
          updates[`games/${gameId}/players/${opponent.id}/hand`] = opponentNewHand;
          updates[`games/${gameId}/players/${opponent.id}/cardsPlayed`] = 
            [...(game.players[opponent.id].cardsPlayed || []), opponentCard];
        }

        // Clear current cards - ensure both players' cards are always cleared
        updates[`games/${gameId}/players/${playerId}/currentCard`] = null;
        if (opponent?.id) {
          updates[`games/${gameId}/players/${opponent.id}/currentCard`] = null;
        }
        // Extra safety: clear all player current cards
        Object.keys(game.players).forEach(pid => {
          updates[`games/${gameId}/players/${pid}/currentCard`] = null;
        });

        // Check if game is over (winner has 5 rounds or all 9 rounds played)
        if (newWinnerScore >= GAME_CONSTANTS.ROUNDS_TO_WIN || game.currentRound >= GAME_CONSTANTS.TOTAL_ROUNDS - 1) {
          updates[`games/${gameId}/status`] = GAME_CONSTANTS.GAME_STATUS.MATCH_END;
          updates[`games/${gameId}/roundTimer`] = null;
        } else {
          updates[`games/${gameId}/currentRound`] = game.currentRound + 1;
          // Set timer for next round (popup will show for 5s, then 15s to play)
          updates[`games/${gameId}/roundTimer`] = Date.now() + GAME_CONSTANTS.TIMERS.ROUND_POPUP_DURATION_MS + GAME_CONSTANTS.TIMERS.ROUND_PLAY_TIME_MS;
        }
        } // Close the if (opponentCard) block after determining winner
      } // Close the if (opponent?.currentCard || (isAutoPlay && timeExpired)) block

      await update(ref(db), updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play card');
      throw err;
    }
  };

  const setReady = async (): Promise<void> => {
    if (!gameId || !game) return;

    try {
      const updates: any = {};
      updates[`games/${gameId}/players/${playerId}/ready`] = true;
      
      // Check if both players are ready after this update
      const opponent = Object.values(game.players).find(p => p.id !== playerId);
      if (opponent?.ready) {
        // Both players will be ready, auto-start the game
        const trumpSuit = getRandomTrumpSuit();
        const dealResult = dealCardsWithTrump(trumpSuit);
        const playerIds = Object.keys(game.players);

        
        updates[`games/${gameId}/status`] = GAME_CONSTANTS.GAME_STATUS.PLAYING;
        updates[`games/${gameId}/trumpSuit`] = trumpSuit;
        updates[`games/${gameId}/roundTimer`] = Date.now() + GAME_CONSTANTS.TIMERS.ROUND_PLAY_TIME_MS;
        
        updates[`games/${gameId}/players/${playerIds[0]}/hand`] = dealResult.player1Hand;
        updates[`games/${gameId}/players/${playerIds[1]}/hand`] = dealResult.player2Hand;
      }

      await update(ref(db), updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set ready status');
      throw err;
    }
  };

  return {
    game,
    loading,
    error,
    createGame,
    joinGame,
    startGame,
    playCard,
    setReady
  };
}
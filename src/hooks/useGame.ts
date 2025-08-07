import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { ref, onValue, set, update, push, get } from 'firebase/database';
import type { Game, Player, Card, GameStatus } from '../types/game';
import { getRandomTrumpSuit, determineRoundWinner, dealCardsWithTrump } from '../utils/cards';
import { v4 as uuidv4 } from 'uuid';

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
        status: 'waiting',
        trumpSuit: null,
        currentRound: 0,
        roundTimer: null,
        bet: 100,
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
      
      if (playerCount >= 2) {
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
        updates[`games/${gameIdToJoin}/status`] = 'ready';
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
      updates[`games/${gameId}/status`] = 'playing';
      updates[`games/${gameId}/trumpSuit`] = trumpSuit;
      updates[`games/${gameId}/roundTimer`] = Date.now() + 15000; // 15s for first round (no popup)
      
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

  const playCard = async (card: Card, isAutoPlay: boolean = false): Promise<void> => {
    if (!gameId || !game) return;


    try {
      const updates: any = {};
      
      // First, update the current player's card
      updates[`games/${gameId}/players/${playerId}/currentCard`] = card;
      
      // Update player's hand immediately
      const newHand = game.players[playerId].hand.filter(
        c => !(c.suit === card.suit && c.rank === card.rank)
      );
      updates[`games/${gameId}/players/${playerId}/hand`] = newHand;
      updates[`games/${gameId}/players/${playerId}/cardsPlayed`] = 
        [...(game.players[playerId].cardsPlayed || []), card];

      const opponent = Object.values(game.players).find(p => p.id !== playerId);
      
      // Check if both players have played their cards OR if this is an auto-play after timer expired
      // For first round, timer expires at roundTimer
      // For subsequent rounds, timer expires 22 seconds after roundTimer is set (7s popup + 15s play)
      const timeExpired = game.roundTimer && Date.now() >= game.roundTimer; 
      
      // Always check if we should complete the round when timer has expired and this is auto-play
      // OR if opponent has already played their card
      if (opponent?.currentCard || (isAutoPlay && timeExpired)) {
        
        // If opponent hasn't played and time expired, we MUST auto-play their first card
        let opponentCard = opponent?.currentCard;
        if (!opponentCard && opponent?.hand && opponent.hand.length > 0 && timeExpired) {
          opponentCard = opponent.hand[0];
          updates[`games/${gameId}/players/${opponent.id}/currentCard`] = opponentCard;
          
          // Update opponent's hand immediately for auto-play
          if (opponent.hand && opponent.hand.length > 0) {
            const opponentNewHandForAutoPlay = opponent.hand.filter(
              c => !(c.suit === opponentCard!.suit && c.rank === opponentCard!.rank)
            );
            updates[`games/${gameId}/players/${opponent.id}/hand`] = opponentNewHandForAutoPlay;
            updates[`games/${gameId}/players/${opponent.id}/cardsPlayed`] = 
              [...(opponent.cardsPlayed || []), opponentCard];
          }
        }
        
        // Now we should have both cards (current player's card + opponent's card)
        if (opponentCard) {
          // Determine the winner
        const playerIds = Object.keys(game.players);
        const isPlayer1 = playerId === playerIds[0];
        
        const player1Card = isPlayer1 ? card : opponentCard;
        const player2Card = isPlayer1 ? opponentCard : card;
        
        const winner = determineRoundWinner(
          player1Card,
          player2Card,
          game.trumpSuit!
        );

        const winnerId = winner === 'draw' ? null : (winner === 'player1' ? playerIds[0] : playerIds[1]);
        
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

        // Clear current cards
        updates[`games/${gameId}/players/${playerId}/currentCard`] = null;
        if (opponent?.id) {
          updates[`games/${gameId}/players/${opponent.id}/currentCard`] = null;
        }

        // Check if game is over (winner has 5 rounds or all 9 rounds played)
        if (newWinnerScore >= 5 || game.currentRound >= 8) {
          updates[`games/${gameId}/status`] = 'match_end';
        } else {
          updates[`games/${gameId}/currentRound`] = game.currentRound + 1;
          // Set timer to start 5 seconds from now (after popup) + 15 seconds for play
          updates[`games/${gameId}/roundTimer`] = Date.now() + 20000; // Timer will be at 15s after popup ends
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

        
        updates[`games/${gameId}/status`] = 'playing';
        updates[`games/${gameId}/trumpSuit`] = trumpSuit;
        updates[`games/${gameId}/roundTimer`] = Date.now() + 15000; // 15s for first round (no popup)
        
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
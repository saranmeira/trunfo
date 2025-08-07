import { useState } from 'react';
import type { Game, Player, Card } from '../types/game';
import { getRandomTrumpSuit, determineRoundWinner, dealCardsWithTrump } from '../utils/cards';
import { GAME_CONSTANTS } from '../constants/game';

export function useGameLocal(_gameId: string | null, playerId: string) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const createGame = async (playerName: string): Promise<string> => {
    const newGameId = `game_${Date.now()}`;
    
    const initialGame: Game = {
      id: newGameId,
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

    setGame(initialGame);
    return newGameId;
  };

  const joinGame = async (playerName: string): Promise<void> => {
    if (!game) return;

    const playerCount = Object.keys(game.players).length;
    
    if (playerCount >= GAME_CONSTANTS.MAX_PLAYERS) {
      throw new Error('Game is full');
    }

    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      hand: [],
      cardsPlayed: [],
      roundsWon: 0,
      currentCard: null,
      ready: false
    };

    setGame({
      ...game,
      players: {
        ...game.players,
        [playerId]: newPlayer
      },
      status: playerCount === 1 ? GAME_CONSTANTS.GAME_STATUS.READY : game.status
    });
  };

  const startGame = async (): Promise<void> => {
    if (!game) return;

    const trumpSuit = getRandomTrumpSuit();
    const dealResult = dealCardsWithTrump(trumpSuit);
    const playerIds = Object.keys(game.players);

    const updatedPlayers = { ...game.players };
    updatedPlayers[playerIds[0]] = {
      ...updatedPlayers[playerIds[0]],
      hand: dealResult.player1Hand,
      ready: true
    };
    
    if (playerIds[1]) {
      updatedPlayers[playerIds[1]] = {
        ...updatedPlayers[playerIds[1]],
        hand: dealResult.player2Hand,
        ready: true
      };
    }

    setGame({
      ...game,
      status: GAME_CONSTANTS.GAME_STATUS.PLAYING,
      trumpSuit,
      roundTimer: Date.now() + GAME_CONSTANTS.TIMERS.ROUND_PLAY_TIME_MS,
      players: updatedPlayers
    });
  };

  const playCard = async (card: Card): Promise<void> => {
    if (!game) return;

    const updatedPlayers = { ...game.players };
    updatedPlayers[playerId] = {
      ...updatedPlayers[playerId],
      currentCard: card
    };

    const opponent = Object.values(game.players).find(p => p.id !== playerId);
    
    if (opponent?.currentCard) {
      const winner = determineRoundWinner(
        card,
        opponent.currentCard,
        game.trumpSuit!
      );

      const winnerId = winner === GAME_CONSTANTS.ROUND_RESULT.PLAYER1 ? playerId : opponent.id;
      
      updatedPlayers[winnerId] = {
        ...updatedPlayers[winnerId],
        roundsWon: (updatedPlayers[winnerId].roundsWon || 0) + 1
      };

      const newHand = game.players[playerId].hand.filter(
        c => !(c.suit === card.suit && c.rank === card.rank)
      );
      
      updatedPlayers[playerId] = {
        ...updatedPlayers[playerId],
        hand: newHand,
        cardsPlayed: [...updatedPlayers[playerId].cardsPlayed, card],
        currentCard: null
      };
      
      updatedPlayers[opponent.id] = {
        ...updatedPlayers[opponent.id],
        currentCard: null
      };
      
      // Extra safety: ensure all current cards are cleared
      Object.keys(updatedPlayers).forEach(pid => {
        updatedPlayers[pid].currentCard = null;
      });

      const isGameOver = updatedPlayers[winnerId].roundsWon >= GAME_CONSTANTS.ROUNDS_TO_WIN || game.currentRound >= GAME_CONSTANTS.TOTAL_ROUNDS - 1;
      
      setGame({
        ...game,
        players: updatedPlayers,
        rounds: [...game.rounds, {
          player1Card: card,
          player2Card: opponent.currentCard,
          winner: winnerId,
          timestamp: Date.now()
        }],
        currentRound: isGameOver ? game.currentRound : game.currentRound + 1,
        status: isGameOver ? GAME_CONSTANTS.GAME_STATUS.MATCH_END : game.status,
        roundTimer: isGameOver ? null : Date.now() + GAME_CONSTANTS.TIMERS.ROUND_POPUP_DURATION_MS + GAME_CONSTANTS.TIMERS.ROUND_PLAY_TIME_MS
      });
    } else {
      setGame({
        ...game,
        players: updatedPlayers
      });
    }
  };

  return {
    game,
    loading,
    error,
    createGame,
    joinGame,
    startGame,
    playCard
  };
}
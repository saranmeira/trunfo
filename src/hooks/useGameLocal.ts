import { useState } from 'react';
import type { Game, Player, Card } from '../types/game';
import { getRandomTrumpSuit, determineRoundWinner, dealCardsWithTrump } from '../utils/cards';

export function useGameLocal(gameId: string | null, playerId: string) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const createGame = async (playerName: string): Promise<string> => {
    const newGameId = `game_${Date.now()}`;
    
    const initialGame: Game = {
      id: newGameId,
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

    setGame(initialGame);
    return newGameId;
  };

  const joinGame = async (playerName: string): Promise<void> => {
    if (!game) return;

    const playerCount = Object.keys(game.players).length;
    
    if (playerCount >= 2) {
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
      status: playerCount === 1 ? 'ready' : game.status
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
      status: 'playing',
      trumpSuit,
      roundTimer: Date.now() + 8000,
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

      const winnerId = winner === 'player1' ? playerId : opponent.id;
      
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

      setGame({
        ...game,
        players: updatedPlayers,
        rounds: [...game.rounds, {
          player1Card: card,
          player2Card: opponent.currentCard,
          winner: winnerId,
          timestamp: Date.now()
        }],
        currentRound: game.currentRound === 8 ? game.currentRound : game.currentRound + 1,
        status: game.currentRound === 8 ? 'match_end' : game.status,
        roundTimer: game.currentRound === 8 ? null : Date.now() + 8000
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
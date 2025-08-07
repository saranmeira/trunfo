import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  Game,
  Card,
  dealCards,
  getRandomTrumpSuit,
  validateCardPlay,
  processRoundCompletion,
  autoPlayCard
} from './gameLogic';

admin.initializeApp();

const db = admin.database();

// When both players are ready, start the game with server-side card dealing
export const onPlayersReady = functions.database
  .ref('/games/{gameId}/players/{playerId}/ready')
  .onWrite(async (change, context) => {
    const { gameId } = context.params;
    
    if (!change.after.val()) return null; // Player became unready
    
    const gameSnapshot = await db.ref(`games/${gameId}`).once('value');
    const game: Game = gameSnapshot.val();
    
    if (!game || game.status !== 'ready') return null;
    
    // Check if both players are ready
    const playerIds = Object.keys(game.players);
    if (playerIds.length !== 2) return null;
    
    const allReady = playerIds.every(id => game.players[id].ready);
    
    if (allReady) {
      // Server-side game initialization
      const trumpSuit = getRandomTrumpSuit();
      const dealtCards = dealCards(trumpSuit);
      
      if (!dealtCards) {
        throw new Error('Failed to deal cards fairly');
      }
      
      const updates: any = {};
      updates['status'] = 'playing';
      updates['trumpSuit'] = trumpSuit;
      updates['currentRound'] = 0;
      updates['roundTimer'] = Date.now() + 15000; // 15s for first round
      updates[`players/${playerIds[0]}/hand`] = dealtCards.player1Hand;
      updates[`players/${playerIds[1]}/hand`] = dealtCards.player2Hand;
      
      await db.ref(`games/${gameId}`).update(updates);
    }
    
    return null;
  });

// Validate and process card plays
export const onCardPlayed = functions.database
  .ref('/games/{gameId}/players/{playerId}/currentCard')
  .onWrite(async (change, context) => {
    const { gameId, playerId } = context.params;
    const newCard: Card = change.after.val();
    
    if (!newCard) return null; // Card was removed
    
    const gameSnapshot = await db.ref(`games/${gameId}`).once('value');
    const game: Game = gameSnapshot.val();
    
    if (!game || game.status !== 'playing') return null;
    
    // CRITICAL: Validate the card is actually in player's hand
    if (!validateCardPlay(playerId, newCard, game)) {
      // Invalid play - remove the card and log potential cheating attempt
      await db.ref(`games/${gameId}/players/${playerId}/currentCard`).remove();
      await db.ref(`games/${gameId}/cheatingAttempts/${playerId}`).push({
        timestamp: Date.now(),
        attemptedCard: newCard,
        actualHand: game.players[playerId].hand
      });
      return null;
    }
    
    // Check if both players have played
    const playerIds = Object.keys(game.players);
    const bothPlayed = playerIds.every(id => {
      if (id === playerId) return true; // Current player just played
      return game.players[id].currentCard !== null;
    });
    
    if (bothPlayed) {
      // Process round completion server-side
      await processRoundCompletion(gameId, game);
    }
    
    return null;
  });

// Scheduled function to handle timer expiration (runs every minute)
export const timerCheck = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    const now = Date.now();
    
    // Get all playing games
    const gamesSnapshot = await db.ref('games')
      .orderByChild('status')
      .equalTo('playing')
      .once('value');
    
    const games = gamesSnapshot.val() || {};
    
    for (const gameId in games) {
      const game: Game = games[gameId];
      
      // Check if timer expired
      if (game.roundTimer && now >= game.roundTimer) {
        const playerIds = Object.keys(game.players);
        
        // Auto-play for players who haven't played
        for (const playerId of playerIds) {
          await autoPlayCard(gameId, playerId, game);
        }
        
        // Re-fetch game state after auto-plays
        const updatedGameSnapshot = await db.ref(`games/${gameId}`).once('value');
        const updatedGame: Game = updatedGameSnapshot.val();
        
        // Check if both have cards now
        const bothHaveCards = playerIds.every(
          id => updatedGame.players[id].currentCard !== null
        );
        
        if (bothHaveCards) {
          await processRoundCompletion(gameId, updatedGame);
        }
      }
    }
    
    return null;
  });

// Clean up abandoned games (runs every hour)
export const cleanupGames = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    const oldGamesSnapshot = await db.ref('games')
      .orderByChild('createdAt')
      .endAt(cutoffTime)
      .once('value');
    
    const oldGames = oldGamesSnapshot.val() || {};
    
    for (const gameId in oldGames) {
      await db.ref(`games/${gameId}`).remove();
    }
    
    return null;
  });

// Prevent clients from modifying critical game state
export const enforceSecurityRules = functions.database
  .ref('/games/{gameId}/{field}')
  .onWrite(async (change, context) => {
    const { gameId, field } = context.params;
    
    // Fields that should never be modified by clients
    const protectedFields = ['trumpSuit', 'currentRound', 'roundTimer', 'rounds', 'status'];
    
    if (protectedFields.includes(field)) {
      // Check if this was a client write (not from admin SDK)
      const auth = context.auth;
      if (auth && !auth.token.admin) {
        // Revert the change
        await change.before.ref.set(change.before.val());
        
        // Log the violation
        await db.ref(`games/${gameId}/violations`).push({
          playerId: auth.uid,
          field,
          attemptedValue: change.after.val(),
          timestamp: Date.now()
        });
      }
    }
    
    return null;
  });
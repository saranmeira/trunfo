import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Game, Card as CardType } from '../types/game';
import { Card } from './Card';
import { Crown, Heart, Diamond, Club, Spade, Trophy, Home } from 'lucide-react';

interface GameBoardProps {
  game: Game;
  playerId: string;
  onPlayCard: (card: CardType, isAutoPlay?: boolean) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ game, playerId, onPlayCard }) => {
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [lastRoundWinner, setLastRoundWinner] = useState<string | null>(null);
  const [modalCountdown, setModalCountdown] = useState(5);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const currentPlayer = game.players[playerId];
  const opponent = Object.values(game.players).find(p => p.id !== playerId);

  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const [isTimerExpired, setIsTimerExpired] = useState(false);

  useEffect(() => {
    if (game.status !== 'playing' || !game.roundTimer) return;

    const interval = setInterval(() => {
      const now = Date.now();
      
      // If we're showing the round result, keep timer at 15
      if (showRoundResult) {
        setTimeLeft(15);
        return;
      }
      
      // Calculate remaining time
      let remaining;
      if (game.currentRound === 0) {
        // First round: timer counts from roundTimer directly
        remaining = Math.max(0, Math.floor((game.roundTimer! - now) / 1000));
      } else {
        // Subsequent rounds: timer starts after 5-second popup
        const actualStartTime = game.roundTimer! - 20000 + 5000; // When the popup ends
        if (now < actualStartTime) {
          // Still in popup period, show 15
          remaining = 15;
        } else {
          // Popup is over, count down from 15
          remaining = Math.max(0, 15 - Math.floor((now - actualStartTime) / 1000));
        }
      }
      setTimeLeft(remaining);

      // Check if timer has expired
      const timerExpired = remaining <= 0 && !showRoundResult;
      
      // Set timer expired state
      if (timerExpired && !isTimerExpired) {
        setIsTimerExpired(true);
      }
      
      // Auto-play when timer expires
      if (timerExpired && !currentPlayer?.currentCard && currentPlayer?.hand.length > 0 && !hasAutoPlayed) {
        // Use selected card if available, otherwise use first card
        const cardToPlay = selectedCard || currentPlayer.hand[0];
        if (cardToPlay) {
          setHasAutoPlayed(true);
          setSelectedCard(null); // Clear selection immediately
          // Small delay to ensure both clients can auto-play
          setTimeout(() => {
            onPlayCard(cardToPlay, true); // Pass true for auto-play
          }, 100 + Math.random() * 100); // 100-200ms delay to avoid exact simultaneous writes
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [game.roundTimer, game.status, currentPlayer, onPlayCard, showRoundResult, hasAutoPlayed, playerId, selectedCard, isTimerExpired]);

  // Reset auto-play flag and timer expired state when round changes
  useEffect(() => {
    setHasAutoPlayed(false);
    setIsTimerExpired(false);
    setSelectedCard(null); // Clear any selection when round changes
  }, [game.currentRound]);

  // Detect when round ends (both players have played)
  useEffect(() => {
    if (game.rounds && game.rounds.length > 0) {
      const lastRound = game.rounds[game.rounds.length - 1];
      // Check if this is a new round result we haven't shown yet
      const roundKey = `${game.rounds.length}-${lastRound?.timestamp}`;
      const hasShownKey = `shown_${roundKey}`;
      
      if (lastRound && !sessionStorage.getItem(hasShownKey)) {
        sessionStorage.setItem(hasShownKey, 'true');
        setLastRoundWinner(lastRound.winner || 'draw');
        setShowRoundResult(true);
        setModalCountdown(5);
      }
    }
  }, [game.rounds]);

  // Reset timer when round changes
  useEffect(() => {
    if (game.roundTimer) {
      // Always start at 15 when round changes (timer countdown handled in main interval)
      setTimeLeft(15);
    }
  }, [game.currentRound, game.roundTimer]);

  // Handle modal countdown
  useEffect(() => {
    if (!showRoundResult) return;

    const interval = setInterval(() => {
      setModalCountdown(prev => {
        if (prev <= 1) {
          setShowRoundResult(false);
          setLastRoundWinner(null);
          setSelectedCard(null); // Clear any selected card
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showRoundResult]);

  const handleCardSelect = (card: CardType) => {
    // Block all actions if timer expired or card already played
    if (currentPlayer?.currentCard || isTimerExpired) return;
    setSelectedCard(card);
  };

  const handleConfirmPlay = () => {
    // Block confirmation if timer expired
    if (isTimerExpired || !selectedCard) return;
    
    onPlayCard(selectedCard);
    setSelectedCard(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-800 p-4">
      <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-2rem)] relative">
        {/* Exit Button - Hidden when game ends */}
        {game.status !== 'match_end' && (
          <button
            onClick={() => setShowLeaveModal(true)}
            className="absolute top-0 right-0 bg-white hover:bg-gray-100 text-black px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Leave
          </button>
        )}
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4 text-white">
          <div className="text-2xl font-bold">Round {game.currentRound + 1}/9</div>
          <div className="text-center">
            <div className="text-5xl font-bold">
              {showRoundResult ? '---' : `${timeLeft}s`}
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-400">Trump</div>
              <div className="flex justify-center mt-1">
                {(() => {
                  const iconProps = {
                    className: `w-8 h-8 ${
                      game.trumpSuit === '♥' || game.trumpSuit === '♦' 
                        ? 'text-red-500 fill-red-500' 
                        : 'text-white fill-white'
                    }`,
                  };
                  
                  switch(game.trumpSuit) {
                    case '♥': return <Heart {...iconProps} />;
                    case '♦': return <Diamond {...iconProps} />;
                    case '♣': return <Club {...iconProps} />;
                    case '♠': return <Spade {...iconProps} />;
                    default: return null;
                  }
                })()}
              </div>
            </div>
          </div>
          <div className="text-2xl font-bold opacity-0">Round</div>
        </div>

        {/* Battle Area */}
        <div className="flex-1 flex items-center justify-center py-4">
          <div className="flex flex-col items-center gap-4">
            {/* Opponent Card Area - Top */}
            <div className="flex items-center">
              <div className="text-right mr-4 w-24">
                <p className="text-red-400 font-bold text-sm">Opponent</p>
                <div className="text-white text-3xl font-bold">{opponent?.roundsWon || 0}</div>
              </div>
              <div className="w-20 h-28">
                {opponent?.currentCard ? (
                  timeLeft === 0 || (currentPlayer?.currentCard && opponent?.currentCard) ? (
                    <div className="border-2 border-red-500 rounded-lg">
                      <Card card={opponent.currentCard} noBorder />
                    </div>
                  ) : (
                    <div className="w-20 h-28 bg-gray-900 border-2 border-red-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs">Locked</span>
                    </div>
                  )
                ) : (
                  <div className="w-20 h-28 border-2 border-dashed border-red-500/50 rounded-lg" />
                )}
              </div>
            </div>

            {/* User Card Area - Bottom */}
            <div className="flex items-center">
              <div className="text-right mr-4 w-24">
                <p className="text-blue-400 font-bold text-sm">You</p>
                <div className="text-white text-3xl font-bold">{currentPlayer?.roundsWon || 0}</div>
              </div>
              <div className="w-20 h-28">
                {currentPlayer?.currentCard ? (
                  timeLeft === 0 || (currentPlayer?.currentCard && opponent?.currentCard) ? (
                    <div className="border-2 border-blue-500 rounded-lg">
                      <Card card={currentPlayer.currentCard} noBorder />
                    </div>
                  ) : (
                    <div className="w-20 h-28 bg-gray-900 border-2 border-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs">Locked</span>
                    </div>
                  )
                ) : (
                  <div className="w-20 h-28 border-2 border-dashed border-blue-500/50 rounded-lg" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hand Area */}
        <div className="bg-black/20 rounded-lg p-3">
          {selectedCard && !currentPlayer?.currentCard && !isTimerExpired && (
            <div className="text-center mb-3">
              <button
                onClick={handleConfirmPlay}
                className="bg-white text-black px-8 py-3 rounded-full hover:bg-gray-200 font-bold text-lg shadow-lg border-2 border-black"
              >
                Lock card
              </button>
            </div>
          )}
          <div className="flex justify-center gap-2 flex-wrap">
            {currentPlayer?.hand.map((card, index) => (
              <Card
                key={`${card.suit}-${card.rank}-${index}`}
                card={card}
                onClick={() => handleCardSelect(card)}
                disabled={!!currentPlayer.currentCard || isTimerExpired}
                selected={selectedCard?.suit === card.suit && selectedCard?.rank === card.rank}
              />
            ))}
          </div>
        </div>

        {showRoundResult && game.rounds && game.rounds.length > 0 && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-12 shadow-2xl">
              {/* Win/Lose Message */}
              <h1 className={`text-6xl font-bold text-center mb-12 ${
                lastRoundWinner === 'draw' ? 'text-gray-600' : 
                lastRoundWinner === playerId ? 'text-green-600' : 'text-red-600'
              }`}>
                {lastRoundWinner === 'draw' ? 'Draw!' : 
                 lastRoundWinner === playerId ? 'You Win!' : 'You Lose'}
              </h1>
              
              {/* Cards Display */}
              <div className="flex justify-center items-center gap-12">
                {/* Your Card (Left) */}
                <div className="relative">
                  {lastRoundWinner === playerId && lastRoundWinner !== 'draw' && (
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
                      <Crown className="w-8 h-8 text-yellow-400 animate-pulse" />
                    </div>
                  )}
                  <div className="border-2 border-blue-500 rounded-lg">
                    {(() => {
                      const lastRound = game.rounds[game.rounds.length - 1];
                      const playerCard = playerId === Object.keys(game.players)[0] 
                        ? lastRound?.player1Card 
                        : lastRound?.player2Card;
                      return playerCard ? <Card card={playerCard} noBorder /> : null;
                    })()}
                  </div>
                  <p className="text-blue-600 text-center mt-2 font-bold">You</p>
                </div>

                {/* Opponent's Card (Right) */}
                <div className="relative">
                  {lastRoundWinner !== playerId && lastRoundWinner !== 'draw' && (
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
                      <Crown className="w-8 h-8 text-yellow-400 animate-pulse" />
                    </div>
                  )}
                  <div className="border-2 border-red-500 rounded-lg">
                    {(() => {
                      const lastRound = game.rounds[game.rounds.length - 1];
                      const opponentCard = playerId === Object.keys(game.players)[0] 
                        ? lastRound?.player2Card 
                        : lastRound?.player1Card;
                      return opponentCard ? <Card card={opponentCard} noBorder /> : null;
                    })()}
                  </div>
                  <p className="text-red-600 text-center mt-2 font-bold">Opponent</p>
                </div>
              </div>
              
              {/* Countdown */}
              <div className="text-center mt-8">
                <p className="text-gray-600 text-lg">Next round in</p>
                <p className="text-4xl font-bold text-gray-800">{modalCountdown}</p>
              </div>
            </div>
          </div>
        )}

        {/* Leave Confirmation Modal */}
        {showLeaveModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 shadow-2xl max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-4">Leave Game?</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to leave the game? Your opponent will win by default.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition"
                >
                  Leave Game
                </button>
              </div>
            </div>
          </div>
        )}

        {game.status === 'match_end' && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-12 shadow-2xl max-w-lg w-full mx-4">
              {/* Winner/Loser Display */}
              <div className="text-center mb-8">
                {currentPlayer!.roundsWon > opponent!.roundsWon ? (
                  <>
                    <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4 animate-pulse" />
                    <h2 className="text-5xl font-bold text-green-600 mb-2">Victory!</h2>
                    <p className="text-gray-600">Congratulations, you won the match!</p>
                  </>
                ) : currentPlayer!.roundsWon < opponent!.roundsWon ? (
                  <>
                    <h2 className="text-5xl font-bold text-red-600 mb-2">Defeat</h2>
                    <p className="text-gray-600">Better luck next time!</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-5xl font-bold text-gray-600 mb-2">Draw</h2>
                    <p className="text-gray-600">The match ended in a tie!</p>
                  </>
                )}
              </div>

              {/* Score Summary */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4 text-center">Match Summary</h3>
                
                <div className="flex justify-between items-center mb-4">
                  <div className="text-center flex-1">
                    <p className="text-sm text-gray-600 mb-1">You</p>
                    <p className="text-3xl font-bold text-blue-600">{currentPlayer!.roundsWon}</p>
                    <p className="text-xs text-gray-500 mt-1">{currentPlayer!.name}</p>
                  </div>
                  
                  <div className="text-2xl font-bold text-gray-400 px-4">-</div>
                  
                  <div className="text-center flex-1">
                    <p className="text-sm text-gray-600 mb-1">Opponent</p>
                    <p className="text-3xl font-bold text-red-600">{opponent!.roundsWon}</p>
                    <p className="text-xs text-gray-500 mt-1">{opponent!.name}</p>
                  </div>
                </div>

                <div className="text-center text-sm text-gray-500 mt-4">
                  <p>Total Rounds Played: {game.rounds?.length || 0}</p>
                  <p className="mt-1">Trump Suit: 
                    {(() => {
                      const iconProps = {
                        className: `inline-block w-4 h-4 ml-1 ${
                          game.trumpSuit === '♥' || game.trumpSuit === '♦' 
                            ? 'text-red-500 fill-red-500' 
                            : 'text-gray-700 fill-gray-700'
                        }`,
                      };
                      
                      switch(game.trumpSuit) {
                        case '♥': return <Heart {...iconProps} />;
                        case '♦': return <Diamond {...iconProps} />;
                        case '♣': return <Club {...iconProps} />;
                        case '♠': return <Spade {...iconProps} />;
                        default: return null;
                      }
                    })()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center">
                <button
                  onClick={() => navigate('/')}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  Leave Game
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
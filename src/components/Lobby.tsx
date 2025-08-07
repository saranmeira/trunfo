import React, { useState } from 'react';
import type { Game } from '../types/game';
import { Check, Copy } from 'lucide-react';

interface LobbyProps {
  game: Game | null;
  playerId: string;
  onStartGame: () => void;
  onSetReady: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({ game, playerId, onStartGame, onSetReady }) => {
  const [copied, setCopied] = useState(false);
  const playerCount = game ? Object.keys(game.players).length : 0;
  const isHost = game && Object.keys(game.players)[0] === playerId;
  const gameUrl = game ? `${window.location.origin}/game/${game.id}` : '';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(gameUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold text-center mb-6">Game Lobby</h2>
        
        {game && (
          <>
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-2">Share this link with your friend:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gameUrl}
                  readOnly
                  className="flex-1 p-2 border rounded"
                />
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2 rounded transition-all duration-200 flex items-center gap-2 ${
                    copied 
                      ? 'bg-green-600 text-white' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">Players ({playerCount}/2)</h3>
              {Object.values(game.players).map(player => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{player.name}</span>
                    {player.id === playerId && <span className="text-sm text-gray-500">(You)</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {player.ready ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <Check className="w-5 h-5" />
                        <span className="text-sm font-medium">Ready</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not ready</span>
                    )}
                  </div>
                </div>
              ))}
              {playerCount < 2 && (
                <div className="p-3 border-2 border-dashed border-gray-300 rounded text-gray-400 text-center">
                  Waiting for opponent...
                </div>
              )}
            </div>

            {playerCount === 2 && (
              <div className="space-y-3">
                {!game.players[playerId]?.ready ? (
                  <button
                    onClick={onSetReady}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                  >
                    Ready!
                  </button>
                ) : (
                  <div className="w-full bg-gray-100 text-gray-600 py-3 rounded-lg text-center">
                    Waiting for other player...
                  </div>
                )}
                
                {Object.values(game.players).every(p => p.ready) && (
                  <div className="text-center text-green-600 font-semibold animate-pulse">
                    Both players ready! Starting game...
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
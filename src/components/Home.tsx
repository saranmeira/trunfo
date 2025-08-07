import React, { useState } from 'react';
import { Swords } from 'lucide-react';
import type { Player } from '../types/game';

interface HomeProps {
  onCreateGame: (name: string) => void;
  onJoinGame: (name: string) => void;
  gameIdFromUrl: string | null;
  existingPlayers?: Player[];
}

export const Home: React.FC<HomeProps> = ({ onCreateGame, onJoinGame, gameIdFromUrl, existingPlayers = [] }) => {
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (action: 'create' | 'join') => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (action === 'create') {
      onCreateGame(playerName);
    } else {
      onJoinGame(playerName);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-2 flex items-center justify-center gap-3">
          <Swords className="w-8 h-8" />
          Trunfo
          <Swords className="w-8 h-8 scale-x-[-1]" />
        </h1>
        <p className="text-gray-600 text-center mb-8">
          {gameIdFromUrl ? 'Join Existing Game' : '1v1 Strategic Card Battle'}
        </p>

        {gameIdFromUrl && existingPlayers.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Players in lobby:</h3>
            <ul className="space-y-1">
              {existingPlayers.map(player => (
                <li key={player.id} className="text-blue-700">
                  • {player.name} {existingPlayers.length === 1 && '(waiting for opponent)'}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your name"
              maxLength={20}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          {gameIdFromUrl ? (
            <button
              onClick={() => handleSubmit('join')}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              Join Game as Player 2
            </button>
          ) : (
            <button
              onClick={() => handleSubmit('create')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Create New Game
            </button>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold mb-2">How to Play:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Each player gets 9 cards</li>
            <li>• Trump suit beats all other suits</li>
            <li>• Play one card each round (15 seconds)</li>
            <li>• Win 5+ rounds to win the match</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
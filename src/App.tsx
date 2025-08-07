import { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { useGame } from './hooks/useGame';

function GamePage() {
  const { id: gameIdFromUrl } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gameId, setGameId] = useState<string | null>(gameIdFromUrl || null);
  const [playerId] = useState(() => {
    const stored = localStorage.getItem('playerId');
    if (stored) return stored;
    const id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('playerId', id);
    return id;
  });

  const { game, loading, error, createGame, joinGame, startGame, playCard, setReady = () => {} } = useGame(gameId, playerId);

  useEffect(() => {
    if (gameIdFromUrl) {
      setGameId(gameIdFromUrl);
    }
  }, [gameIdFromUrl]);

  const handleCreateGame = async (playerName: string) => {
    try {
      const newGameId = await createGame(playerName);
      setGameId(newGameId);
      navigate(`/game/${newGameId}`);
    } catch (err) {
      console.error('Failed to create game:', err);
    }
  };

  const handleJoinGame = async (playerName: string) => {
    try {
      if (gameIdFromUrl) {
        await joinGame(playerName, gameIdFromUrl);
        setGameId(gameIdFromUrl);
      }
    } catch (err) {
      console.error('Failed to join game:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p>{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <Home
        onCreateGame={handleCreateGame}
        onJoinGame={handleJoinGame}
        gameIdFromUrl={gameIdFromUrl}
      />
    );
  }

  const isPlayerInGame = game.players && game.players[playerId];

  if (!isPlayerInGame) {
    return (
      <Home
        onCreateGame={handleCreateGame}
        onJoinGame={handleJoinGame}
        gameIdFromUrl={gameId}
        existingPlayers={game ? Object.values(game.players) : []}
      />
    );
  }

  if (game.status === 'waiting' || game.status === 'ready') {
    return (
      <Lobby
        game={game}
        playerId={playerId}
        onStartGame={startGame}
        onSetReady={setReady}
      />
    );
  }

  return (
    <GameBoard
      game={game}
      playerId={playerId}
      onPlayCard={playCard}
    />
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [playerId] = useState(() => {
    const stored = localStorage.getItem('playerId');
    if (stored) return stored;
    const id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('playerId', id);
    return id;
  });

  const { createGame } = useGame(null, playerId);

  const handleCreateGame = async (playerName: string) => {
    try {
      const newGameId = await createGame(playerName);
      navigate(`/game/${newGameId}`);
    } catch (err) {
      console.error('Failed to create game:', err);
    }
  };

  return (
    <Home
      onCreateGame={handleCreateGame}
      onJoinGame={() => {}}
      gameIdFromUrl={null}
    />
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/game/:id" element={<GamePage />} />
    </Routes>
  );
}

export default App;
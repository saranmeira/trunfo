# Trump Card Game POC

A real-time 1v1 card game built with React, TypeScript, and Firebase.

## Setup

1. **Configure Firebase:**
   - Create a new Firebase project
   - Enable Realtime Database
   - Copy `.env.example` to `.env` and add your Firebase credentials

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

## How to Play

1. Player 1 creates a new game and shares the link
2. Player 2 joins via the shared link
3. Once both players are connected, the host starts the game
4. Each player gets 9 cards
5. A trump suit is randomly selected
6. Players have 8 seconds each round to play a card
7. Trump cards beat all non-trump cards
8. Win 5+ rounds to win the match

## Project Structure

- `/src/components` - React UI components
- `/src/hooks` - Custom React hooks for game logic
- `/src/types` - TypeScript type definitions
- `/src/utils` - Card dealing and game utilities
- `/src/config` - Firebase configuration
- `/GAME_LOGIC.md` - Detailed business logic documentation
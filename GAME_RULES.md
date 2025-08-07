# Trunfo Game Rules and Flow

## Game Overview
Trunfo is a 1v1 strategic card battle game where players compete across 9 rounds using a standard deck of cards with a trump suit mechanic.

## Game Setup
- **Players**: 2 players
- **Deck**: Standard 52-card deck (13 cards × 4 suits)
- **Hand Size**: Each player receives 9 cards
- **Trump Suit**: One suit is randomly selected as trump at game start
- **Victory Condition**: First player to win 5 rounds OR player with most rounds won after 9 rounds

## Card Distribution Rules
When dealing cards, the system ensures fairness by validating:
1. Each player's hand value is between 55-90 points
2. Value difference between hands ≤ 8 points
3. Trump cards are distributed equally between players
4. Each player has at least one high card (J/Q/K/A)

## Card Comparison Rules

### Test Cases for Card Comparison
Given Trump Suit: ♦ (Diamonds)

| Player 1 | Player 2 | Winner | Explanation |
|----------|----------|--------|-------------|
| ♦2 | ♦3 | Player 2 | Higher trump wins |
| ♦2 | ♥2 | Player 1 | Trump beats non-trump |
| ♥2 | ♦2 | Player 2 | Trump beats non-trump |
| ♥2 | ♥3 | Player 2 | Higher non-trump wins |
| ♥2 | ♥2 | Draw | Same rank + suit = draw |
| ♥2 | ♠2 | Draw | Same rank, different non-trump suits |
| ♥2 | ♠3 | Player 2 | 3 > 2, both non-trump |
| ♣5 | ♥7 | Player 2 | 7 > 5, both non-trump |
| ♣K | ♦2 | Player 2 | Trump beats high non-trump |
| ♦A | ♦K | Player 1 | Higher trump (A > K) |
| ♦3 | ♦3 | Draw | Identical cards (rare) |
| ♦Q | ♥K | Player 1 | Trump beats higher non-trump |
| ♥Q | ♥K | Player 2 | K > Q, same suit |
| ♠J | ♦10 | Player 2 | Trump beats non-trump |
| ♣10 | ♥10 | Draw | Same value, different non-trump suits |

### Card Comparison Logic
1. **Trump vs Non-Trump**: Trump always wins
2. **Trump vs Trump**: Higher value wins
3. **Non-Trump vs Non-Trump**:
   - Same rank, same suit → Draw
   - Same rank, different suits → Draw
   - Different ranks → Higher value wins

## Game Flow

### 1. Pre-Game Setup
```
1. Player creates game → receives unique game URL
2. Share URL with opponent
3. Opponent joins game
4. Both players see lobby with player names
5. Both players click "Ready!"
6. Game automatically starts when both ready
```

### 2. Game Initialization
```
1. System randomly selects trump suit
2. System deals 9 cards to each player
3. System validates card distribution for fairness
4. Round timer starts at 15 seconds
5. Round 1 begins
```

### 3. Round Sequence
```
For each round (1-9):

A. Card Selection Phase (15 seconds)
   1. Timer counts down from 15
   2. Players can:
      - Click cards to select (highlights in blue)
      - Click "Lock card" to confirm selection
   3. Selected cards show as "Locked" (hidden from opponent)

B. Timer Expiration Handling
   If timer reaches 0:
   1. Check if player has selected (but not locked) card
      → Auto-play selected card
   2. Else, auto-play first card in hand
   3. All card interactions are disabled
   4. Proceed to evaluation

C. Round Evaluation
   When both players have played cards:
   1. Reveal both cards simultaneously
   2. Compare cards using trump rules
   3. Determine winner (Player 1, Player 2, or Draw)
   4. Update winner's score (no points for draws)
   5. Record round result

D. Round Result Display (7 seconds)
   1. Show popup with:
      - "You Win!" / "You Lose" / "Draw!" message
      - Both played cards
      - Crown icon on winner's card
      - Countdown timer (7→1)
   2. After 7 seconds, popup closes automatically

E. Check Victory Conditions
   If (winner has 5 rounds) OR (9 rounds completed):
      → Go to Game End
   Else:
      → Start next round with 15-second timer
```

### 4. Game End
```
1. Display permanent game summary overlay
2. Show:
   - Victory/Defeat/Draw status
   - Final score (e.g., 5-3)
   - Total rounds played
   - Trump suit used
3. Single "Leave Game" button
4. Summary stays visible until player clicks leave
```

## Timer Rules

### Round Timer Breakdown
- **First Round**: 15 seconds total
- **Subsequent Rounds**: 22 seconds total
  - 7 seconds: Previous round result display
  - 15 seconds: Card selection time

### Timer Display
- Shows remaining play time (0-15 seconds)
- During result popup: Shows "---"
- Turns red when ≤ 5 seconds remain

### Auto-Play Rules
When timer expires:
1. If card selected but not locked → Play selected card
2. If no card selected → Play first card in hand
3. Both players' auto-plays execute with 0-200ms random delay
4. Round evaluation proceeds normally

## Special Situations

### Player Disconnection
- If a player leaves mid-game, opponent wins by default
- Leave button shows confirmation modal
- Game state persists in Firebase until explicitly left

### Simultaneous Actions
- Random 0-200ms delay prevents exact simultaneous database writes
- First write wins in case of conflicts
- Firebase real-time updates ensure consistency

### Draw Handling
- Draws don't award points to either player
- Game can end in overall draw if scores are tied after 9 rounds
- Individual round draws are shown in popup for 7 seconds

## UI States

### Card States
1. **Available**: In hand, clickable
2. **Selected**: Highlighted blue, larger size
3. **Locked**: Played for current round, shown as "Locked"
4. **Disabled**: Timer expired or card already played
5. **Revealed**: Both players' cards shown after round

### Game States
1. **waiting**: One player in lobby
2. **ready**: Two players in lobby
3. **playing**: Active game in progress
4. **match_end**: Game completed, showing summary

## Technical Implementation

### Data Structure
```typescript
Game {
  id: string (UUID v4)
  status: 'waiting' | 'ready' | 'playing' | 'match_end'
  trumpSuit: '♠' | '♥' | '♦' | '♣'
  currentRound: number (0-8)
  roundTimer: timestamp
  players: {
    [playerId]: {
      name: string
      hand: Card[]
      currentCard: Card | null
      cardsPlayed: Card[]
      roundsWon: number
      ready: boolean
    }
  }
  rounds: Round[]
}
```

### Round Result Structure
```typescript
Round {
  player1Card: Card
  player2Card: Card
  winner: playerId | null (null for draw)
  timestamp: number
}
```

## Fair Play Mechanisms

1. **Equal Trump Distribution**: Both players get same number of trump cards
2. **Balanced Hand Values**: Total card values within 8 points
3. **Timer Enforcement**: Auto-play prevents stalling
4. **Action Blocking**: No card changes after timer expires
5. **Synchronized State**: Firebase ensures both players see same game state
# 1v1 Trump Card Game - Business Logic

## Core Game Design

### Game Overview
- **Players**: 2 (1v1)
- **Deck**: Standard 52 cards
- **Cards per player**: 9
- **Rounds**: 9 (one card played per round)
- **Win condition**: Win majority of rounds (5+ out of 9)

### Match Flow

#### 1. Pre-Game
- Player 1 creates game → gets shareable link
- Player 2 joins via link
- Both players connected → each player marks ready
- once both players are ready, the game starts

#### 2. Match Start
- **Trump suit**: Randomly selected from ♠♥♦♣
- **Card dealing**: 9 cards per player (34 cards unused)
- **Betting**: Fixed amount placed before match
- **Visibility**: Players see only their own cards

#### 3. Round Structure (15 seconds each)
- Players select one card simultaneously
- Timer: 15 seconds to choose
- players can lock the card and if both players have locked the card, the round ends and the cards are revealed
- Cards revealed after both play
- Winner determined by trump rules
- Cards removed from hands
- Update round score

#### 4. Match End
- Player with most rounds won claims bet pot
- Match history available

## Card Rules

### Card Values
| Card | Value |
|------|-------|
| 2-10 | Face value |
| J | 11 |
| Q | 12 |
| K | 13 |
| A | 14 |

### Trump Logic
1. **Trump beats non-trump** (always)
2. **Trump vs Trump**: Higher value wins
3. **Non-trump vs Non-trump**: Higher value wins
4. **Non-trump + same rank and different suit**: Draw (rare with single deck)

## Dealing Fairness Rules

### Strict Constraints (Server-Side Validation)
- **Total hand value**: 55-90 points per player (points refer to the sum of the values of the cards in the hand)
- **Value difference**: Max 8 points between hands (player 1 cannot have more than 8 points more than player 2)
- **Trump distribution**: Number of trumps is random per match, both players must have the same number of trumps
- **High cards**: Each hand MUST have at least one J/Q/K/A

### Reshuffling Algorithm
1. Select trump suit first
2. Shuffle deck
3. Deal 9 cards to each player
4. Validate against ALL constraints:
   - Hand values in range [55-90]
   - Value difference ≤ 8 points
   - Same number of trumps
   - Both players have high cards
5. **If ANY constraint fails**: RESHUFFLE and repeat
6. Maximum attempts: 100 reshuffles
7. Log validation details and reshuffle count

### Validation Logging
The system logs:
- Number of reshuffles required
- Final hand values for both players
- Trump card distribution
- High card count per player
- Specific failure reasons for each reshuffle

## Technical Implementation

### Firebase Structure
```
/games/{gameId}
  - createdAt: timestamp
  - status: 'waiting' | 'active' | 'finished'
  - trumpSuit: '♠' | '♥' | '♦' | '♣'
  - currentRound: 0-8
  - roundTimer: timestamp
  - bet: number
  
  /players/{playerId}
    - name: string
    - hand: Card[] (private)
    - cardsPlayed: Card[]
    - roundsWon: number
    - currentCard: Card | null
    - ready: boolean
  
  /rounds/{roundNumber}
    - player1Card: Card
    - player2Card: Card
    - winner: playerId
    - timestamp: timestamp
```

### Game States
1. **WAITING**: One player in lobby
2. **READY**: Both players connected
3. **DEALING**: Cards being distributed
4. **PLAYING**: Active round
5. **ROUND_END**: Showing round result
6. **MATCH_END**: Game complete

### Real-Time Events
- `player-joined`: Second player enters
- `game-start`: Match begins
- `card-played`: Player selects card
- `round-complete`: Both cards revealed
- `match-complete`: Game ends

## Security Considerations
- Card dealing happens server-side
- Hands stored encrypted in Firebase
- Card reveal only after both play
- Timer enforced server-side
- Anti-cheat: Validate all card plays

## UI/UX Flow

### Screens
1. **Home**: Create/Join game
2. **Lobby**: Waiting for opponent
3. **Game Board**: 
   - Own hand (bottom)
   - Opponent card count
   - Trump indicator
   - Round timer
   - Score tracker
   - Play history
4. **Results**: Match summary

### Responsive Breakpoints
- Mobile: Stack vertically
- Desktop: Side-by-side layout

## POC Priorities
1. ✅ Basic multiplayer connection
2. ✅ Real-time card play sync
3. ✅ Trump logic implementation
4. ✅ 8-second timer
5. ⬜ Betting system (can be mocked)
6. ⬜ Advanced animations
7. ⬜ Persistent user accounts
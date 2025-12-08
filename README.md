# Chess Game

A fully functional chess game implemented in vanilla JavaScript, HTML, and CSS. Features complete chess rules including special moves, check/checkmate detection, and draw conditions.

## Features

- **Complete Chess Rules**: Implements all standard chess rules including castling, en passant, pawn promotion
- **Game Modes**: Pass & Play (two-player) and vs Computer (random moves)
- **Move Validation**: Prevents illegal moves and enforces check/checkmate rules
- **Draw Detection**: Handles 50-move rule, threefold repetition, and insufficient material
- **Responsive UI**: Clean, intuitive interface with piece selection and move feedback
- **Game State Management**: Tracks all game state including castling rights, en passant targets, and move history

## How to Play

1. Choose a game mode: Pass & Play or vs Computer
2. Click on a piece to select it (highlighted in blue)
3. Click on a destination square to move
4. The game automatically detects checkmate, stalemate, and draw conditions
5. Use the Reset button to start a new game

## Technical Implementation

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Game Logic**: Complete chess engine with move generation and validation
- **AI**: Simple random move selection for computer opponent
- **State Management**: In-memory game state with position history tracking

## Files

- `index.html` - Main HTML structure
- `script.js` - Game logic and chess engine
- `style.css` - Styling and layout

## Running the Game

Simply open `index.html` in any modern web browser. No dependencies required.

## Chess Rules Implemented

- ✅ Piece movements (pawn, knight, bishop, rook, queen, king)
- ✅ Castling (kingside and queenside)
- ✅ En passant captures
- ✅ Pawn promotion (auto-promotes to queen)
- ✅ Check and checkmate detection
- ✅ Stalemate detection
- ✅ Draw by 50-move rule
- ✅ Draw by threefold repetition
- ✅ Draw by insufficient material

Enjoy playing chess!

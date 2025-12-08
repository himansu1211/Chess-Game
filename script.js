const BOARD_ELEMENT = document.getElementById('chess-board');
const STATUS_ELEMENT = document.getElementById('status');
const MESSAGE_ELEMENT = document.getElementById('message');
const MODE_SELECTION = document.getElementById('mode-selection');
const GAME_CONTAINER = document.getElementById('game-container');

// Map piece codes to Unicode symbols
const PIECE_SYMBOLS = {
    'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
    'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
};

// Initial board setup
const INITIAL_BOARD = [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
];

// Game state
let gameState = {
    board: INITIAL_BOARD.map(row => row.slice()), // Deep copy
    turn: 'white',
    castlingRights: {
        whiteKingside: true,
        whiteQueenside: true,
        blackKingside: true,
        blackQueenside: true
    },
    enPassantTarget: null, // {row, col} or null
    halfmoveClock: 0, // For 50-move rule
    fullmoveNumber: 1,
    positionHistory: [], // For threefold repetition
    selectedSquare: null,
    gameMode: null,
    computerColor: 'black',
    gameOver: false
};

/**
 * Converts (row, col) to algebraic notation (e.g., (7, 0) -> 'A1').
 */
function toAlgebraic(row, col) {
    const file = String.fromCharCode(65 + col); // 65 is 'A'
    const rank = 8 - row;
    return `${file}${rank}`;
}

/**
 * Converts algebraic notation to (row, col) (e.g., 'A1' -> (7, 0)).
 */
function fromAlgebraic(algebraic) {
    const col = algebraic.charCodeAt(0) - 65;
    const row = 8 - parseInt(algebraic[1]);
    return { row, col };
}

/**
 * Clears the 'selected' highlight from all squares.
 */
function clearHighlights() {
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('selected', 'checkmate-king');
    });
}

/**
 * Renders the board based on the current game state.
 */
function renderBoard() {
    BOARD_ELEMENT.innerHTML = ''; // Clear existing board
    clearHighlights();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const algebraic = toAlgebraic(row, col);
            const piece = gameState.board[row][col];
            const isDark = (row + col) % 2 !== 0;

            const squareDiv = document.createElement('div');
            squareDiv.className = `square ${isDark ? 'dark' : 'light'}`;
            squareDiv.dataset.algebraic = algebraic;

            if (piece) {
                const pieceDiv = document.createElement('div');
                const pieceColor = piece[0] === 'w' ? 'white' : 'black';
                pieceDiv.className = `piece ${pieceColor}`;
                pieceDiv.textContent = PIECE_SYMBOLS[piece];
                squareDiv.appendChild(pieceDiv);
            }

            // Attach the click handler to the square
            squareDiv.addEventListener('click', () => handleSquareClick(algebraic, piece));
            BOARD_ELEMENT.appendChild(squareDiv);
        }
    }
}

/**
 * Handles a click on any square of the board.
 */
function handleSquareClick(algebraic, piece) {
    if (gameState.gameOver) {
        MESSAGE_ELEMENT.textContent = 'Game Over. Start a new game.';
        return;
    }

    const clickedSquare = document.querySelector(`[data-algebraic="${algebraic}"]`);

    // 1. **No square is currently selected**
    if (gameState.selectedSquare === null) {
        // Only select a piece if one exists
        if (piece) {
            const pieceColor = piece[0] === 'w' ? 'white' : 'black';

            // Check if it's the correct color's piece
            if (pieceColor === gameState.turn) {
                gameState.selectedSquare = algebraic;
                clickedSquare.classList.add('selected');
                MESSAGE_ELEMENT.textContent = `Selected piece at ${algebraic}.`;
            }
        }
    }
    // 2. **A piece is already selected** (Attempting to move or deselect)
    else {
        // A. Move to a new square
        if (algebraic !== gameState.selectedSquare) {
            makeMove(gameState.selectedSquare, algebraic);
        }
        // B. Clicked the same square again (Deselect)
        else {
            MESSAGE_ELEMENT.textContent = `Deselected piece at ${algebraic}.`;
        }

        // Reset selection state
        clearHighlights();
        gameState.selectedSquare = null;
    }
}

/**
 * Attempts to make a move from start to end.
 */
function makeMove(start, end) {
    const startPos = fromAlgebraic(start);
    const endPos = fromAlgebraic(end);

    if (isLegalMove(gameState.board, startPos, endPos, gameState.turn)) {
        applyMove(startPos, endPos);

        // Check for game over conditions
        if (isCheckmate(gameState.board, gameState.turn === 'white' ? 'black' : 'white')) {
            STATUS_ELEMENT.textContent = `Checkmate! ${gameState.turn === 'white' ? 'White' : 'Black'} wins.`;
            MESSAGE_ELEMENT.textContent = 'Game Over';
            gameState.gameOver = true;
            // Highlight the king
            const kingPos = findKing(gameState.board, gameState.turn === 'white' ? 'black' : 'white');
            if (kingPos) {
                const kingSquare = document.querySelector(`[data-algebraic="${toAlgebraic(kingPos.row, kingPos.col)}"]`);
                if (kingSquare) {
                    kingSquare.classList.add('checkmate-king');
                }
            }
            return;
        }

        if (isStalemate(gameState.board, gameState.turn === 'white' ? 'black' : 'white')) {
            STATUS_ELEMENT.textContent = 'Stalemate! It\'s a draw.';
            MESSAGE_ELEMENT.textContent = 'Game Over';
            gameState.gameOver = true;
            return;
        }

        // Check for draws
        if (isDraw()) {
            STATUS_ELEMENT.textContent = 'Draw!';
            MESSAGE_ELEMENT.textContent = 'Game Over';
            gameState.gameOver = true;
            return;
        }

        MESSAGE_ELEMENT.textContent = `Move: ${start} to ${end} was successful.`;

        // If vs-computer and it's computer's turn, make computer move
        if (gameState.gameMode === 'vs-computer' && gameState.turn === gameState.computerColor) {
            setTimeout(makeComputerMove, 1000); // Delay for better UX
        }
    } else {
        MESSAGE_ELEMENT.textContent = `Invalid Move: ${start} to ${end}`;
    }
}

/**
 * Makes a random legal move for the computer.
 */
function makeComputerMove() {
    const legalMoves = getLegalMoves(gameState.board, gameState.turn);
    if (legalMoves.length === 0) {
        MESSAGE_ELEMENT.textContent = 'Computer has no legal moves.';
        return;
    }

    const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    const start = toAlgebraic(randomMove.start.row, randomMove.start.col);
    const end = toAlgebraic(randomMove.end.row, randomMove.end.col);

    applyMove(randomMove.start, randomMove.end);

    MESSAGE_ELEMENT.textContent = `Computer moved: ${start} to ${end}`;

    // Check for game over after computer's move
    const opponent = gameState.turn === 'white' ? 'black' : 'white';
    if (isCheckmate(gameState.board, opponent)) {
        STATUS_ELEMENT.textContent = `Checkmate! ${gameState.turn === 'white' ? 'White' : 'Black'} wins.`;
        MESSAGE_ELEMENT.textContent = 'Game Over';
        gameState.gameOver = true;
        const kingPos = findKing(gameState.board, opponent);
        if (kingPos) {
            const kingSquare = document.querySelector(`[data-algebraic="${toAlgebraic(kingPos.row, kingPos.col)}"]`);
            if (kingSquare) {
                kingSquare.classList.add('checkmate-king');
            }
        }
        return;
    }

    if (isStalemate(gameState.board, opponent)) {
        STATUS_ELEMENT.textContent = 'Stalemate! It\'s a draw.';
        MESSAGE_ELEMENT.textContent = 'Game Over';
        gameState.gameOver = true;
        return;
    }

    if (isDraw()) {
        STATUS_ELEMENT.textContent = 'Draw!';
        MESSAGE_ELEMENT.textContent = 'Game Over';
        gameState.gameOver = true;
        return;
    }
}

// Mode selection
document.getElementById('pass-play-btn').addEventListener('click', () => startGame('pass-play'));
document.getElementById('vs-computer-btn').addEventListener('click', () => startGame('vs-computer'));

// Reset button
document.getElementById('reset-btn').addEventListener('click', () => {
    // Clear highlights
    document.querySelectorAll('.checkmate-king').forEach(sq => sq.classList.remove('checkmate-king'));
    // Restart the game
    startGame(gameState.gameMode);
});

function startGame(mode) {
    gameState = {
        board: INITIAL_BOARD.map(row => row.slice()),
        turn: 'white',
        castlingRights: {
            whiteKingside: true,
            whiteQueenside: true,
            blackKingside: true,
            blackQueenside: true
        },
        enPassantTarget: null,
        halfmoveClock: 0,
        fullmoveNumber: 1,
        positionHistory: [],
        selectedSquare: null,
        gameMode: mode,
        computerColor: 'black',
        gameOver: false
    };

    MODE_SELECTION.style.display = 'none';
    GAME_CONTAINER.style.display = 'block';
    renderBoard();
    STATUS_ELEMENT.textContent = `${gameState.turn.charAt(0).toUpperCase() + gameState.turn.slice(1)} to move.`;
}

// Chess engine functions will be implemented below

/**
 * Checks if a square is attacked by the enemy color.
 */
function isSquareAttacked(board, square, attackerColor) {
    const { row, col } = square;
    const enemyPrefix = attackerColor === 'white' ? 'w' : 'b';

    // Check pawn attacks
    const pawnDirection = attackerColor === 'white' ? -1 : 1;
    const pawnAttacks = [
        { row: row + pawnDirection, col: col - 1 },
        { row: row + pawnDirection, col: col + 1 }
    ];
    for (const attack of pawnAttacks) {
        if (attack.row >= 0 && attack.row < 8 && attack.col >= 0 && attack.col < 8) {
            const piece = board[attack.row][attack.col];
            if (piece === enemyPrefix + 'P') {
                return true;
            }
        }
    }

    // Check knight attacks
    const knightMoves = [
        { row: row - 2, col: col - 1 }, { row: row - 2, col: col + 1 },
        { row: row - 1, col: col - 2 }, { row: row - 1, col: col + 2 },
        { row: row + 1, col: col - 2 }, { row: row + 1, col: col + 2 },
        { row: row + 2, col: col - 1 }, { row: row + 2, col: col + 1 }
    ];
    for (const move of knightMoves) {
        if (move.row >= 0 && move.row < 8 && move.col >= 0 && move.col < 8) {
            const piece = board[move.row][move.col];
            if (piece === enemyPrefix + 'N') {
                return true;
            }
        }
    }

    // Check king attacks
    const kingMoves = [
        { row: row - 1, col: col - 1 }, { row: row - 1, col: col },
        { row: row - 1, col: col + 1 }, { row: row, col: col - 1 },
        { row: row, col: col + 1 }, { row: row + 1, col: col - 1 },
        { row: row + 1, col: col }, { row: row + 1, col: col + 1 }
    ];
    for (const move of kingMoves) {
        if (move.row >= 0 && move.row < 8 && move.col >= 0 && move.col < 8) {
            const piece = board[move.row][move.col];
            if (piece === enemyPrefix + 'K') {
                return true;
            }
        }
    }

    // Check rook and queen attacks (straight lines)
    const straightDirections = [
        { row: -1, col: 0 }, { row: 1, col: 0 },
        { row: 0, col: -1 }, { row: 0, col: 1 }
    ];
    for (const dir of straightDirections) {
        let r = row + dir.row;
        let c = col + dir.col;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const piece = board[r][c];
            if (piece) {
                if (piece === enemyPrefix + 'R' || piece === enemyPrefix + 'Q') {
                    return true;
                }
                break; // Blocked by own piece or enemy piece
            }
            r += dir.row;
            c += dir.col;
        }
    }

    // Check bishop and queen attacks (diagonals)
    const diagonalDirections = [
        { row: -1, col: -1 }, { row: -1, col: 1 },
        { row: 1, col: -1 }, { row: 1, col: 1 }
    ];
    for (const dir of diagonalDirections) {
        let r = row + dir.row;
        let c = col + dir.col;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const piece = board[r][c];
            if (piece) {
                if (piece === enemyPrefix + 'B' || piece === enemyPrefix + 'Q') {
                    return true;
                }
                break; // Blocked
            }
            r += dir.row;
            c += dir.col;
        }
    }

    return false;
}

/**
 * Checks if the king of the given color is in check.
 */
function isInCheck(board, color) {
    const kingPos = findKing(board, color);
    if (!kingPos) return false;
    const enemyColor = color === 'white' ? 'black' : 'white';
    return isSquareAttacked(board, kingPos, enemyColor);
}

/**
 * Gets all possible moves for a piece (without considering check).
 */
function getPieceMoves(board, from, color) {
    const { row, col } = from;
    const piece = board[row][col];
    if (!piece || piece[0] !== color[0]) return [];

    const moves = [];
    const type = piece[1];

    if (type === 'P') {
        // Pawn moves
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;

        // Forward move
        if (row + direction >= 0 && row + direction < 8 && !board[row + direction][col]) {
            moves.push({ row: row + direction, col });

            // Double move from starting position
            if (row === startRow && !board[row + 2 * direction][col]) {
                moves.push({ row: row + 2 * direction, col });
            }
        }

        // Captures
        for (const c of [col - 1, col + 1]) {
            if (c >= 0 && c < 8 && row + direction >= 0 && row + direction < 8) {
                const target = board[row + direction][c];
                if (target && target[0] !== color[0]) {
                    moves.push({ row: row + direction, col: c });
                }
                // En passant
                if (gameState.enPassantTarget &&
                    gameState.enPassantTarget.row === row + direction &&
                    gameState.enPassantTarget.col === c) {
                    moves.push({ row: row + direction, col: c });
                }
            }
        }
    } else if (type === 'N') {
        // Knight moves
        const knightMoves = [
            { row: row - 2, col: col - 1 }, { row: row - 2, col: col + 1 },
            { row: row - 1, col: col - 2 }, { row: row - 1, col: col + 2 },
            { row: row + 1, col: col - 2 }, { row: row + 1, col: col + 2 },
            { row: row + 2, col: col - 1 }, { row: row + 2, col: col + 1 }
        ];
        for (const move of knightMoves) {
            if (move.row >= 0 && move.row < 8 && move.col >= 0 && move.col < 8) {
                const target = board[move.row][move.col];
                if (!target || target[0] !== color[0]) {
                    moves.push(move);
                }
            }
        }
    } else if (type === 'B') {
        // Bishop moves
        const directions = [
            { row: -1, col: -1 }, { row: -1, col: 1 },
            { row: 1, col: -1 }, { row: 1, col: 1 }
        ];
        for (const dir of directions) {
            let r = row + dir.row;
            let c = col + dir.col;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const target = board[r][c];
                if (!target) {
                    moves.push({ row: r, col: c });
                } else {
                    if (target[0] !== color[0]) {
                        moves.push({ row: r, col: c });
                    }
                    break;
                }
                r += dir.row;
                c += dir.col;
            }
        }
    } else if (type === 'R') {
        // Rook moves
        const directions = [
            { row: -1, col: 0 }, { row: 1, col: 0 },
            { row: 0, col: -1 }, { row: 0, col: 1 }
        ];
        for (const dir of directions) {
            let r = row + dir.row;
            let c = col + dir.col;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const target = board[r][c];
                if (!target) {
                    moves.push({ row: r, col: c });
                } else {
                    if (target[0] !== color[0]) {
                        moves.push({ row: r, col: c });
                    }
                    break;
                }
                r += dir.row;
                c += dir.col;
            }
        }
    } else if (type === 'Q') {
        // Queen moves (combination of rook and bishop)
        const directions = [
            { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
            { row: 0, col: -1 }, { row: 0, col: 1 },
            { row: 1, col: -1 }, { row: 1, col: 0 }, { row: 1, col: 1 }
        ];
        for (const dir of directions) {
            let r = row + dir.row;
            let c = col + dir.col;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const target = board[r][c];
                if (!target) {
                    moves.push({ row: r, col: c });
                } else {
                    if (target[0] !== color[0]) {
                        moves.push({ row: r, col: c });
                    }
                    break;
                }
                r += dir.row;
                c += dir.col;
            }
        }
    } else if (type === 'K') {
        // King moves
        const kingMoves = [
            { row: row - 1, col: col - 1 }, { row: row - 1, col: col },
            { row: row - 1, col: col + 1 }, { row: row, col: col - 1 },
            { row: row, col: col + 1 }, { row: row + 1, col: col - 1 },
            { row: row + 1, col: col }, { row: row + 1, col: col + 1 }
        ];
        for (const move of kingMoves) {
            if (move.row >= 0 && move.row < 8 && move.col >= 0 && move.col < 8) {
                const target = board[move.row][move.col];
                if (!target || target[0] !== color[0]) {
                    moves.push(move);
                }
            }
        }

        // Castling
        if (canCastle(board, color, 'kingside')) {
            moves.push({ row, col: col + 2 });
        }
        if (canCastle(board, color, 'queenside')) {
            moves.push({ row, col: col - 2 });
        }
    }

    return moves;
}

/**
 * Checks if a move is legal.
 */
function isLegalMove(board, from, to, color) {
    const piece = board[from.row][from.col];
    if (!piece || piece[0] !== color[0]) return false;

    const target = board[to.row][to.col];
    if (target && target[0] === color[0]) return false; // Can't capture own piece

    // Check if the move is in the piece's possible moves
    const possibleMoves = getPieceMoves(board, from, color);
    const moveExists = possibleMoves.some(move => move.row === to.row && move.col === to.col);
    if (!moveExists) return false;

    // Simulate the move and check if it leaves king in check
    const tempBoard = board.map(row => row.slice());
    tempBoard[to.row][to.col] = piece;
    tempBoard[from.row][from.col] = null;

    // Handle en passant
    if (piece[1] === 'P' && gameState.enPassantTarget &&
        to.row === gameState.enPassantTarget.row && to.col === gameState.enPassantTarget.col) {
        const captureRow = color === 'white' ? to.row + 1 : to.row - 1;
        tempBoard[captureRow][to.col] = null;
    }

    // Handle castling
    if (piece[1] === 'K' && Math.abs(to.col - from.col) === 2) {
        const rookCol = to.col > from.col ? 7 : 0;
        const newRookCol = to.col > from.col ? 5 : 3;
        const rook = tempBoard[from.row][rookCol];
        tempBoard[from.row][newRookCol] = rook;
        tempBoard[from.row][rookCol] = null;
    }

    return !isInCheck(tempBoard, color);
}

/**
 * Gets all legal moves for the given color.
 */
function getLegalMoves(board, color) {
    const legalMoves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece[0] === color[0]) {
                const from = { row, col };
                const possibleMoves = getPieceMoves(board, from, color);
                for (const to of possibleMoves) {
                    if (isLegalMove(board, from, to, color)) {
                        legalMoves.push({ start: from, end: to });
                    }
                }
            }
        }
    }
    return legalMoves;
}

/**
 * Checks if the given color is in checkmate.
 */
function isCheckmate(board, color) {
    return isInCheck(board, color) && getLegalMoves(board, color).length === 0;
}

/**
 * Checks if the given color is in stalemate.
 */
function isStalemate(board, color) {
    return !isInCheck(board, color) && getLegalMoves(board, color).length === 0;
}

/**
 * Checks if castling is possible.
 */
function canCastle(board, color, side) {
    const row = color === 'white' ? 7 : 0;
    const kingCol = 4;
    const rookCol = side === 'kingside' ? 7 : 0;

    // Check if king and rook are in place
    const king = board[row][kingCol];
    const rook = board[row][rookCol];
    if (king !== (color === 'white' ? 'wK' : 'bK') || rook !== (color === 'white' ? 'wR' : 'bR')) {
        return false;
    }

    // Check castling rights
    const rightsKey = color + (side === 'kingside' ? 'Kingside' : 'Queenside');
    if (!gameState.castlingRights[rightsKey]) {
        return false;
    }

    // Check if squares between king and rook are empty
    const start = Math.min(kingCol, rookCol) + 1;
    const end = Math.max(kingCol, rookCol);
    for (let col = start; col < end; col++) {
        if (board[row][col]) return false;
    }

    // Check if king is in check or would pass through check
    const enemyColor = color === 'white' ? 'black' : 'white';
    if (isInCheck(board, color)) return false;

    // Check squares king moves through
    const kingMoveCol = side === 'kingside' ? 5 : 3;
    if (isSquareAttacked(board, { row, col: kingMoveCol }, enemyColor)) return false;

    return true;
}

/**
 * Applies a move to the board.
 */
function applyMove(from, to) {
    const piece = gameState.board[from.row][from.col];
    const capturedPiece = gameState.board[to.row][to.col];
    const color = piece[0] === 'w' ? 'white' : 'black';
    const enemyColor = color === 'white' ? 'black' : 'white';

    // Store previous state for undo (if needed)
    const previousState = {
        board: gameState.board.map(row => row.slice()),
        turn: gameState.turn,
        castlingRights: { ...gameState.castlingRights },
        enPassantTarget: gameState.enPassantTarget,
        halfmoveClock: gameState.halfmoveClock,
        fullmoveNumber: gameState.fullmoveNumber
    };

    // Move the piece
    gameState.board[to.row][to.col] = piece;
    gameState.board[from.row][from.col] = null;

    // Handle special moves
    let isCapture = !!capturedPiece;
    let isPawnMove = piece[1] === 'P';

    // En passant capture
    if (piece[1] === 'P' && gameState.enPassantTarget &&
        to.row === gameState.enPassantTarget.row && to.col === gameState.enPassantTarget.col) {
        const captureRow = color === 'white' ? to.row + 1 : to.row - 1;
        gameState.board[captureRow][to.col] = null;
        isCapture = true;
    }

    // Castling
    if (piece[1] === 'K' && Math.abs(to.col - from.col) === 2) {
        const rookCol = to.col > from.col ? 7 : 0;
        const newRookCol = to.col > from.col ? 5 : 3;
        const rook = gameState.board[from.row][rookCol];
        gameState.board[from.row][newRookCol] = rook;
        gameState.board[from.row][rookCol] = null;
    }

    // Pawn promotion (default to queen)
    if (piece[1] === 'P' && (to.row === 0 || to.row === 7)) {
        gameState.board[to.row][to.col] = color === 'white' ? 'wQ' : 'bQ';
    }

    // Update en passant target
    gameState.enPassantTarget = null;
    if (piece[1] === 'P' && Math.abs(to.row - from.row) === 2) {
        const epRow = color === 'white' ? to.row + 1 : to.row - 1;
        gameState.enPassantTarget = { row: epRow, col: to.col };
    }

    // Update castling rights
    if (piece === 'wK') {
        gameState.castlingRights.whiteKingside = false;
        gameState.castlingRights.whiteQueenside = false;
    } else if (piece === 'bK') {
        gameState.castlingRights.blackKingside = false;
        gameState.castlingRights.blackQueenside = false;
    } else if (piece === 'wR') {
        if (from.col === 0) gameState.castlingRights.whiteQueenside = false;
        if (from.col === 7) gameState.castlingRights.whiteKingside = false;
    } else if (piece === 'bR') {
        if (from.col === 0) gameState.castlingRights.blackQueenside = false;
        if (from.col === 7) gameState.castlingRights.blackKingside = false;
    }

    // Captured rook removes castling rights
    if (capturedPiece === 'wR') {
        if (to.col === 0) gameState.castlingRights.whiteQueenside = false;
        if (to.col === 7) gameState.castlingRights.whiteKingside = false;
    } else if (capturedPiece === 'bR') {
        if (to.col === 0) gameState.castlingRights.blackQueenside = false;
        if (to.col === 7) gameState.castlingRights.blackKingside = false;
    }

    // Update halfmove clock (for 50-move rule)
    if (isCapture || isPawnMove) {
        gameState.halfmoveClock = 0;
    } else {
        gameState.halfmoveClock++;
    }

    // Update fullmove number
    if (color === 'black') {
        gameState.fullmoveNumber++;
    }

    // Switch turn
    gameState.turn = enemyColor;

    // Update position history for threefold repetition
    const positionKey = JSON.stringify(gameState.board);
    gameState.positionHistory.push(positionKey);

    // Re-render the board
    renderBoard();
}

/**
 * Undoes the last move.
 */
function undoMove() {
    // Implement undo logic
    // This is a placeholder
}

/**
 * Promotes a pawn.
 */
function promotePawn(position, newPiece) {
    // Implement promotion
    // This is a placeholder
}

/**
 * Finds the king's position for the given color.
 */
function findKing(board, color) {
    const king = color === 'white' ? 'wK' : 'bK';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col] === king) {
                return { row, col };
            }
        }
    }
    return null;
}

/**
 * Checks for draw conditions.
 */
function isDraw() {
    // 50-move rule
    if (gameState.halfmoveClock >= 100) {
        return true;
    }

    // Threefold repetition
    const currentPosition = JSON.stringify(gameState.board);
    let count = 0;
    for (const position of gameState.positionHistory) {
        if (position === currentPosition) {
            count++;
            if (count >= 2) { // Current position + 2 previous = 3 total
                return true;
            }
        }
    }

    // Insufficient material
    const pieces = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece) {
                pieces.push(piece);
            }
        }
    }

    // King vs King
    if (pieces.length === 2) {
        return true;
    }

    // King and Bishop vs King
    if (pieces.length === 3) {
        const bishops = pieces.filter(p => p[1] === 'B');
        if (bishops.length === 1) {
            return true;
        }
    }

    // King and Knight vs King
    if (pieces.length === 3) {
        const knights = pieces.filter(p => p[1] === 'N');
        if (knights.length === 1) {
            return true;
        }
    }

    // King and Bishop vs King and Bishop (same color bishops)
    if (pieces.length === 4) {
        const bishops = pieces.filter(p => p[1] === 'B');
        if (bishops.length === 2) {
            // Check if bishops are on same color squares
            const bishopPositions = [];
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    if (gameState.board[row][col] && gameState.board[row][col][1] === 'B') {
                        bishopPositions.push({ row, col });
                    }
                }
            }
            if (bishopPositions.length === 2) {
                const color1 = (bishopPositions[0].row + bishopPositions[0].col) % 2;
                const color2 = (bishopPositions[1].row + bishopPositions[1].col) % 2;
                if (color1 === color2) {
                    return true;
                }
            }
        }
    }

    return false;
}

// Initialize the game
renderBoard();

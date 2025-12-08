from flask import Flask, jsonify, request, send_from_directory
import os

app = Flask(__name__, static_folder='.', static_url_path='')

# Initial Board State Representation (8x8 list)
# R, N, B, Q, K, P: White pieces (Uppercase)
# r, n, b, q, k, p: Black pieces (Lowercase)
board_state = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.'],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
]
current_turn = 'white' # 'white' or 'black'

def reset_board():
    """Reset the board to initial state."""
    global board_state, current_turn
    board_state = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['.', '.', '.', '.', '.', '.', '.', '.'],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ]
    current_turn = 'white'

def is_path_clear(board, start_row, start_col, end_row, end_col):
    """Check if the path between start and end is clear (no pieces in between)."""
    row_diff = end_row - start_row
    col_diff = end_col - start_col
    step_row = 1 if row_diff > 0 else -1 if row_diff < 0 else 0
    step_col = 1 if col_diff > 0 else -1 if col_diff < 0 else 0

    current_row = start_row + step_row
    current_col = start_col + step_col

    while current_row != end_row or current_col != end_col:
        if board[current_row][current_col] != '.':
            return False
        current_row += step_row
        current_col += step_col
    return True

def is_valid_pawn_move(board, start_row, start_col, end_row, end_col, piece):
    """Validate pawn move."""
    direction = -1 if piece.isupper() else 1  # White moves up (row decreases), Black down
    start_rank = 6 if piece.isupper() else 1  # Starting rank for double move

    row_diff = end_row - start_row
    col_diff = abs(end_col - start_col)

    # Forward move
    if col_diff == 0:
        if row_diff == direction and board[end_row][end_col] == '.':
            return True
        if row_diff == 2 * direction and start_row == start_rank and board[end_row][end_col] == '.' and board[start_row + direction][start_col] == '.':
            return True
    # Diagonal capture
    elif col_diff == 1 and row_diff == direction:
        if board[end_row][end_col] != '.' and (board[end_row][end_col].isupper() != piece.isupper()):
            return True
    return False

def is_valid_rook_move(board, start_row, start_col, end_row, end_col):
    """Validate rook move."""
    if start_row == end_row or start_col == end_col:
        return is_path_clear(board, start_row, start_col, end_row, end_col)
    return False

def is_valid_knight_move(start_row, start_col, end_row, end_col):
    """Validate knight move."""
    row_diff = abs(end_row - start_row)
    col_diff = abs(end_col - start_col)
    return (row_diff == 2 and col_diff == 1) or (row_diff == 1 and col_diff == 2)

def is_valid_bishop_move(board, start_row, start_col, end_row, end_col):
    """Validate bishop move."""
    if abs(end_row - start_row) == abs(end_col - start_col):
        return is_path_clear(board, start_row, start_col, end_row, end_col)
    return False

def is_valid_queen_move(board, start_row, start_col, end_row, end_col):
    """Validate queen move."""
    return is_valid_rook_move(board, start_row, start_col, end_row, end_col) or is_valid_bishop_move(board, start_row, start_col, end_row, end_col)

def is_valid_king_move(start_row, start_col, end_row, end_col):
    """Validate king move."""
    row_diff = abs(end_row - start_row)
    col_diff = abs(end_col - start_col)
    return row_diff <= 1 and col_diff <= 1 and (row_diff + col_diff) > 0

def is_valid_move(board, start_row, start_col, end_row, end_col, piece):
    """Check if the move is valid for the piece."""
    piece_type = piece.lower()
    if piece_type == 'p':
        return is_valid_pawn_move(board, start_row, start_col, end_row, end_col, piece)
    elif piece_type == 'r':
        return is_valid_rook_move(board, start_row, start_col, end_row, end_col)
    elif piece_type == 'n':
        return is_valid_knight_move(start_row, start_col, end_row, end_col)
    elif piece_type == 'b':
        return is_valid_bishop_move(board, start_row, start_col, end_row, end_col)
    elif piece_type == 'q':
        return is_valid_queen_move(board, start_row, start_col, end_row, end_col)
    elif piece_type == 'k':
        return is_valid_king_move(start_row, start_col, end_row, end_col)
    return False

def is_king_in_check(board, king_color):
    """Check if the king of the given color is in check."""
    # Find the king's position
    king_piece = 'K' if king_color == 'white' else 'k'
    king_pos = None
    for row in range(8):
        for col in range(8):
            if board[row][col] == king_piece:
                king_pos = (row, col)
                break
        if king_pos:
            break

    if not king_pos:
        return False  # King not found, shouldn't happen

    king_row, king_col = king_pos

    # Check if any enemy piece can attack the king
    enemy_color = 'black' if king_color == 'white' else 'white'
    for row in range(8):
        for col in range(8):
            piece = board[row][col]
            if piece != '.' and (piece.isupper() == (enemy_color == 'white')):
                if is_valid_move(board, row, col, king_row, king_col, piece):
                    return True
    return False

def has_legal_moves(board, color):
    """Check if the player of the given color has any legal moves."""
    for start_row in range(8):
        for start_col in range(8):
            piece = board[start_row][start_col]
            if piece != '.' and (piece.isupper() == (color == 'white')):
                for end_row in range(8):
                    for end_col in range(8):
                        if is_valid_move(board, start_row, start_col, end_row, end_col, piece):
                            # Simulate the move
                            temp_board = [row[:] for row in board]
                            temp_board[end_row][end_col] = piece
                            temp_board[start_row][start_col] = '.'
                            # Check if the move doesn't leave the king in check
                            if not is_king_in_check(temp_board, color):
                                return True
    return False

def is_checkmate(board, color):
    """Check if the player of the given color is in checkmate."""
    return is_king_in_check(board, color) and not has_legal_moves(board, color)

@app.route('/')
def index():
    """Serves the main HTML page."""
    return send_from_directory(os.getcwd(), 'index.html')

@app.route('/board_state')
def get_board_state():
    """Returns the current board state and turn."""
    return jsonify({
        'board': board_state,
        'turn': current_turn
    })

@app.route('/move', methods=['POST'])
def handle_move():
    """Handles a move request from the frontend."""
    global current_turn
    data = request.json
    start_sq = data.get('start') # e.g., 'E2'
    end_sq = data.get('end')     # e.g., 'E4'

    # --- Convert Algebraic Notation to (row, col) indices ---
    # 'A8' -> (0, 0), 'H1' -> (7, 7)
    try:
        # Convert file (A-H) to column (0-7)
        start_col = ord(start_sq[0].lower()) - ord('a')
        end_col = ord(end_sq[0].lower()) - ord('a')
        # Convert rank (1-8) to row (7-0)
        start_row = 8 - int(start_sq[1])
        end_row = 8 - int(end_sq[1])
    except Exception:
        return jsonify({"success": False, "message": "Invalid move format"}), 400

    # Basic bounds check
    if not all(0 <= x <= 7 for x in [start_row, start_col, end_row, end_col]):
        return jsonify({"success": False, "message": "Out of bounds move"}), 400

    piece = board_state[start_row][start_col]
    target_piece = board_state[end_row][end_col]

    # Simple validation 1: Check if a piece exists at the start square
    if piece == '.':
        return jsonify({"success": False, "message": "No piece at starting square"}), 400

    # Simple validation 2: Check if it's the correct color's turn
    piece_color = 'white' if piece.isupper() else 'black'
    if piece_color != current_turn:
        return jsonify({"success": False, "message": f"It's {current_turn}'s turn"}), 400

    # Simple validation 3: Prevent capturing own pieces
    target_color = 'white' if target_piece.isupper() else 'black'
    if target_piece != '.' and target_color == piece_color:
        return jsonify({"success": False, "message": "Cannot capture your own piece"}), 400

    # Full chess move validation
    if not is_valid_move(board_state, start_row, start_col, end_row, end_col, piece):
        return jsonify({"success": False, "message": "Invalid move for this piece"}), 400

    # --- Perform the move ---
    board_state[end_row][end_col] = piece
    board_state[start_row][start_col] = '.'

    # Switch turns
    current_turn = 'black' if current_turn == 'white' else 'white'

    # Check for checkmate
    checkmate = is_checkmate(board_state, current_turn)
    king_pos = None
    if checkmate:
        # Find the losing king's position
        king_piece = 'K' if current_turn == 'white' else 'k'
        for row in range(8):
            for col in range(8):
                if board_state[row][col] == king_piece:
                    king_pos = to_algebraic(row, col)
                    break
            if king_pos:
                break

    return jsonify({"success": True, "board": board_state, "turn": current_turn, "checkmate": checkmate, "king_pos": king_pos})

if __name__ == '__main__':
    reset_board()  # Reset board on startup
    print("Starting Flask server. Go to http://127.0.0.1:5000/")
    app.run(debug=True)

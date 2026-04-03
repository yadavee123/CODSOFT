"use strict";

const PLAYER = "X";
const AI     = "O";
const EMPTY  = null;

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6], 
];

const GameState = (() => {

  function createBoard() {
    return Array(9).fill(EMPTY);
  }

  function clone(board) {
    return [...board];
  }

  function applyMove(board, index, mark) {
    if (board[index] !== EMPTY) return null;
    const next = clone(board);
    next[index] = mark;
    return next;
  }

  function getWinner(board) {
    for (const [a, b, c] of WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { mark: board[a], line: [a, b, c] };
      }
    }
    return null;
  }

  function isDraw(board) {
    return !getWinner(board) && board.every(cell => cell !== EMPTY);
  }

  function isTerminal(board) {
    return !!getWinner(board) || isDraw(board);
  }

  function availableMoves(board) {
    return board.reduce((acc, cell, i) => {
      if (cell === EMPTY) acc.push(i);
      return acc;
    }, []);
  }

  function evaluate(board) {
    const result = getWinner(board);
    if (!result) return 0;
    return result.mark === AI ? 10 : -10;
  }

  return { createBoard, applyMove, getWinner, isDraw, isTerminal, availableMoves, evaluate };
})();


const AIEngine = (() => {

  let nodesVisited = 0; 

  function minimax(board, depth, isMaxing, alpha, beta) {
    nodesVisited++;

    if (GameState.isTerminal(board)) {
      const raw = GameState.evaluate(board);
      return raw === 0 ? 0 : raw > 0 ? raw + depth : raw - depth;
    }

    const moves = GameState.availableMoves(board);

    if (isMaxing) {
      let best = -Infinity;
      for (const move of moves) {
        const child = GameState.applyMove(board, move, AI);
        const score = minimax(child, depth - 1, false, alpha, beta);
        best  = Math.max(best, score);
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = +Infinity;
      for (const move of moves) {
        const child = GameState.applyMove(board, move, PLAYER);
        const score = minimax(child, depth + 1, true, alpha, beta);
        best = Math.min(best, score);
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  function getBestMove(board) {
    nodesVisited = 0;
    const moves = GameState.availableMoves(board);

    let bestScore = -Infinity;
    let bestMove  = moves[0];

    for (const move of moves) {
      const child = GameState.applyMove(board, move, AI);
      const score = minimax(child, 0, false, -Infinity, +Infinity);
      if (score > bestScore) {
        bestScore = score;
        bestMove  = move;
      }
    }

    console.info(
      `[AIEngine] chose cell ${bestMove} | score ${bestScore} | nodes searched: ${nodesVisited}`
    );
    return bestMove;
  }

  return { getBestMove };
})();


const UIManager = (() => {

  const cells        = document.querySelectorAll(".cell");
  const statusText   = document.getElementById("status-text");
  const restartBtn   = document.getElementById("restart-btn");
  const scoreX       = document.getElementById("score-x");
  const scoreO       = document.getElementById("score-o");
  const scoreDraw    = document.getElementById("score-draw");
  const modeToggle   = document.getElementById("mode-toggle");
  const diffSelect   = document.getElementById("difficulty");
  const thinkingDot  = document.getElementById("thinking");

  let onCellClick  = null;
  let onRestart    = null;
  let onModeChange = null;

  function bindCellClick(handler)  { onCellClick  = handler; }
  function bindRestart(handler)    { onRestart    = handler; }
  function bindModeChange(handler) { onModeChange = handler; }

  cells.forEach(cell => {
    cell.addEventListener("click", () => {
      const idx = parseInt(cell.dataset.index, 10);
      if (onCellClick) onCellClick(idx);
    });
  });

  restartBtn?.addEventListener("click", () => {
    if (onRestart) onRestart();
  });

  modeToggle?.addEventListener("change", () => {
    if (onModeChange) onModeChange(modeToggle.value);
  });

  function renderBoard(board) {
    cells.forEach((cell, i) => {
      const mark = board[i];
      cell.dataset.mark = mark ?? "";
      cell.textContent  = mark ?? "";
      cell.classList.toggle("taken", mark !== EMPTY);
    });
  }

  function highlightWinLine(indices) {
    indices.forEach(i => cells[i].classList.add("win-cell"));
  }

  function flashDraw() {
    cells.forEach(cell => cell.classList.add("draw-cell"));
  }

  function clearHighlights() {
    cells.forEach(cell => {
      cell.classList.remove("win-cell", "draw-cell", "taken");
      cell.dataset.mark = "";
      cell.textContent  = "";
    });
  }

  function setStatus(msg, type = "info") {
    if (!statusText) return;
    statusText.textContent = msg;
    statusText.dataset.type = type;
  }

  function setThinking(active) {
    thinkingDot?.classList.toggle("visible", active);
  }

  function updateScore(scores) {
    if (scoreX)    scoreX.textContent    = scores.X    ?? 0;
    if (scoreO)    scoreO.textContent    = scores.O    ?? 0;
    if (scoreDraw) scoreDraw.textContent = scores.draw ?? 0;
  }

  function disableBoard(disabled) {
    cells.forEach(cell => cell.classList.toggle("disabled", disabled));
  }

  function pulseCell(index) {
    const cell = cells[index];
    if (!cell) return;
    cell.classList.remove("pop");
    void cell.offsetWidth;
    cell.classList.add("pop");
  }

  function getDifficulty() {
    return diffSelect?.value ?? "hard";
  }

  return {
    renderBoard,
    highlightWinLine,
    flashDraw,
    clearHighlights,
    setStatus,
    setThinking,
    updateScore,
    disableBoard,
    pulseCell,
    getDifficulty,
    bindCellClick,
    bindRestart,
    bindModeChange,
  };
})();

function getAIMove(board, difficulty) {
  const moves = GameState.availableMoves(board);

  if (difficulty === "easy") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (difficulty === "medium") {
    if (Math.random() < 0.40) {
      return moves[Math.floor(Math.random() * moves.length)];
    }
  }

  return AIEngine.getBestMove(board);
}


const App = (() => {

  let board        = GameState.createBoard();
  let currentTurn  = PLAYER;
  let gameOver     = false;
  let mode         = "ai";
  const scores     = { X: 0, O: 0, draw: 0 };

  function oppositeOf(mark) { return mark === PLAYER ? AI : PLAYER; }

  function statusForTurn(turn) {
    if (mode === "pvp") {
      return turn === PLAYER ? "Player X — your move" : "Player O — your move";
    }
    return turn === PLAYER ? "Your move ✦" : "AI is thinking…";
  }

  function applyTurn(index) {
    const next = GameState.applyMove(board, index, currentTurn);
    if (!next) return;

    board = next;
    UIManager.renderBoard(board);
    UIManager.pulseCell(index);

    const result = GameState.getWinner(board);

    if (result) {
      scores[result.mark]++;
      UIManager.highlightWinLine(result.line);
      UIManager.updateScore(scores);
      UIManager.setStatus(
        result.mark === PLAYER
          ? (mode === "pvp" ? "Player X wins! 🎉" : "You win! 🎉")
          : (mode === "pvp" ? "Player O wins! 🎉" : "AI wins! 🤖"),
        "win"
      );
      gameOver = true;
      return;
    }

    if (GameState.isDraw(board)) {
      scores.draw++;
      UIManager.flashDraw();
      UIManager.updateScore(scores);
      UIManager.setStatus("It's a draw! 🤝", "draw");
      gameOver = true;
      return;
    }

    currentTurn = oppositeOf(currentTurn);
    UIManager.setStatus(statusForTurn(currentTurn));

    if (!gameOver && mode === "ai" && currentTurn === AI) {
      triggerAI();
    }
  }

  function triggerAI() {
    UIManager.disableBoard(true);
    UIManager.setThinking(true);

    const difficulty = UIManager.getDifficulty();

    setTimeout(() => {
      const move = getAIMove(board, difficulty);
      UIManager.setThinking(false);
      UIManager.disableBoard(false);
      applyTurn(move);
    }, 350 + Math.random() * 200);
  }

  function handleCellClick(index) {
    if (gameOver) return;
    if (board[index] !== EMPTY) return;
    if (mode === "ai" && currentTurn === AI) return;
    applyTurn(index);
  }

  function restart() {
    board       = GameState.createBoard();
    currentTurn = PLAYER;
    gameOver    = false;

    UIManager.clearHighlights();
    UIManager.renderBoard(board);
    UIManager.setThinking(false);
    UIManager.disableBoard(false);
    UIManager.setStatus(statusForTurn(currentTurn));
  }

  function handleModeChange(newMode) {
    mode = newMode;
    restart();
  }

  function init() {
    UIManager.bindCellClick(handleCellClick);
    UIManager.bindRestart(restart);
    UIManager.bindModeChange(handleModeChange);

    UIManager.renderBoard(board);
    UIManager.updateScore(scores);
    UIManager.setStatus(statusForTurn(currentTurn));

    console.info("[App] Tic-Tac-Toe initialised. AI uses Minimax + Alpha-Beta Pruning.");
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
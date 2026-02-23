import React, { useState, useEffect, useCallback } from 'react';
import { Settings, RefreshCw, Trophy, User, Cpu, ChevronRight, Shuffle, X } from 'lucide-react';

const GRID_SIZE = 12;

// Validation logic to ensure a layout is "Competitive"
const countPotentialPaths = (mask) => {
  let paths = 0;
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!mask[r][c]) continue;
      
      for (const [dr, dc] of directions) {
        let possible = true;
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (
            nr < 0 || nr >= GRID_SIZE || 
            nc < 0 || nc >= GRID_SIZE || 
            !mask[nr][nc]
          ) {
            possible = false;
            break;
          }
        }
        if (possible) paths++;
      }
    }
  }
  return paths;
};

const ARCHETYPES = {
  RANDOM: {
    name: "Fractal Random",
    description: "Procedural layout validated for competitive balance.",
    generate: () => {
      let mask;
      let pathCount = 0;
      let attempts = 0;
      while (pathCount < 15 && attempts < 50) {
        mask = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
        const density = 0.45 + Math.random() * 0.15;
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < Math.ceil(GRID_SIZE / 2); c++) {
            const isActive = Math.random() < density;
            mask[r][c] = isActive;
            mask[r][GRID_SIZE - 1 - c] = isActive;
          }
        }
        pathCount = countPotentialPaths(mask);
        attempts++;
      }
      return mask;
    }
  },
  SWISS_CHEESE: {
    name: "Swiss Cheese",
    description: "Alternating cells are void. Only diagonal wins are possible.",
    generate: () => {
      const mask = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if ((r + c) % 2 === 0) mask[r][c] = true;
        }
      }
      return mask;
    }
  },
  L_SHAPE: {
    name: "The 'L' Pivot",
    description: "Two rectangles meet at a 4x4 junction.",
    generate: () => {
      const mask = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (c >= 4 && c <= 7) mask[r][c] = true;
          if (r >= 4 && r <= 7) mask[r][c] = true;
        }
      }
      return mask;
    }
  },
  FIGURE_8: {
    name: "Figure-8",
    description: "Navigate around two large void islands in the center.",
    generate: () => {
      const mask = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(true));
      const islands = [[3, 3, 3, 3], [7, 7, 3, 3]];
      islands.forEach(([ir, ic, iw, ih]) => {
        for (let r = ir; r < ir + ih; r++) {
          for (let c = ic; c < ic + iw; c++) {
            mask[r][c] = false;
          }
        }
      });
      return mask;
    }
  },
  CORRIDORS: {
    name: "Corridors",
    description: "Narrow pathways force intense local skirmishes.",
    generate: () => {
      const mask = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(false));
      for (let r = 1; r < GRID_SIZE - 1; r++) {
        if (r % 4 === 1 || r % 4 === 2) {
          for (let c = 1; c < GRID_SIZE - 1; c++) mask[r][c] = true;
        }
        mask[r][1] = mask[r][2] = true;
        mask[r][GRID_SIZE-2] = mask[r][GRID_SIZE-3] = true;
      }
      return mask;
    }
  }
};

const App = () => {
  const [activeArch, setActiveArch] = useState('RANDOM');
  const [grid, setGrid] = useState([]);
  const [mask, setMask] = useState([]);
  const [turn, setTurn] = useState(1);
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState([]);
  const [isAiMode, setIsAiMode] = useState(true);
  const [stats, setStats] = useState({ paths: 0 });

  const initBoard = useCallback(() => {
    const newMask = ARCHETYPES[activeArch].generate();
    setMask(newMask);
    setGrid(Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0)));
    setTurn(1);
    setWinner(null);
    setWinningLine([]);
    setStats({ paths: countPotentialPaths(newMask) });
  }, [activeArch]);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  const checkWin = (board, r, c, player) => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of directions) {
      let line = [{ r, c }];
      // Check forward
      for (let i = 1; i < 4; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && board[nr][nc] === player) {
          line.push({ r: nr, c: nc });
        } else break;
      }
      // Check backward
      for (let i = 1; i < 4; i++) {
        const nr = r - dr * i, nc = c - dc * i;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && board[nr][nc] === player) {
          line.push({ r: nr, c: nc });
        } else break;
      }
      if (line.length >= 4) return line.slice(0, 4);
    }
    return null;
  };

  const aiMove = () => {
    if (winner) return;
    let bestScore = -Infinity;
    let move = null;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (mask[r][c] && grid[r][c] === 0) {
          let score = Math.random() * 5;
          const directions = [[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0],[-1,-1],[-1,1]];
          
          directions.forEach(([dr, dc]) => {
            let playerLine = 0;
            let opponentLine = 0;
            let possible = true;

            for (let i = 1; i < 4; i++) {
              const nr = r + dr * i, nc = c + dc * i;
              if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE || !mask[nr][nc]) {
                possible = false;
                break;
              }
              if (grid[nr][nc] === 2) playerLine++;
              if (grid[nr][nc] === 1) opponentLine++;
            }

            if (possible) {
              if (playerLine === 3) score += 10000;
              if (opponentLine === 3) score += 5000;
              score += playerLine * 15;
              score += opponentLine * 8;
            }
          });

          if (score > bestScore) {
            bestScore = score;
            move = { r, c };
          }
        }
      }
    }
    if (move) handleMove(move.r, move.c);
  };

  useEffect(() => {
    if (isAiMode && turn === 2 && !winner) {
      const timer = setTimeout(aiMove, 600);
      return () => clearTimeout(timer);
    }
  }, [turn, isAiMode, winner]);

  const handleMove = (r, c) => {
    if (winner || !mask[r][c] || grid[r][c] !== 0) return;
    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = turn;
    setGrid(newGrid);
    
    const winCoords = checkWin(newGrid, r, c, turn);
    if (winCoords) {
      setWinner(turn);
      setWinningLine(winCoords);
    } else {
      setTurn(turn === 1 ? 2 : 1);
    }
  };

  const isWinningCell = (r, c) => {
    return winningLine.some(coord => coord.r === r && coord.c === c);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Left Panel: Controls */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              TOPOLOGIC
            </h1>
            <p className="text-slate-400 text-sm mb-6 italic">Grid architecture validation: Online</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${turn === 1 ? 'bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-slate-600'}`} />
                  <span className={turn === 1 ? 'font-bold text-indigo-400' : 'text-slate-500'}>Player 1</span>
                </div>
                <div className="text-xs font-mono bg-slate-700 px-2 py-1 rounded">BLUE</div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${turn === 2 ? 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-slate-600'}`} />
                  <span className={turn === 2 ? 'font-bold text-rose-400' : 'text-slate-500'}>
                    {isAiMode ? 'AI Sentinel' : 'Player 2'}
                  </span>
                </div>
                <div className="text-xs font-mono bg-slate-700 px-2 py-1 rounded">RED</div>
              </div>
            </div>

            <button 
              disabled={!!winner}
              onClick={() => setIsAiMode(!isAiMode)}
              className="mt-6 w-full py-2 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all border border-slate-700 text-sm font-medium"
            >
              {isAiMode ? <User size={16} /> : <Cpu size={16} />}
              Switch to {isAiMode ? 'Local PvP' : 'AI Challenge'}
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex-1">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
              <Settings size={16} /> Topology Select
            </h2>
            <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[300px] lg:max-h-[400px] pr-2 custom-scrollbar">
              {Object.entries(ARCHETYPES).map(([key, data]) => (
                <button
                  key={key}
                  onClick={() => setActiveArch(key)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    activeArch === key 
                      ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                      : 'bg-slate-800/30 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {key === 'RANDOM' && <Shuffle size={14} className="text-indigo-400" />}
                      <span className="font-bold">{data.name}</span>
                    </div>
                    {activeArch === key && <ChevronRight size={16} className="text-indigo-400" />}
                  </div>
                  <p className="text-xs opacity-70 leading-relaxed">{data.description}</p>
                </button>
              ))}
            </div>
            
            <button 
              onClick={initBoard}
              className="mt-6 w-full py-3 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/20 font-bold"
            >
              <RefreshCw size={18} /> Re-Generate Level
            </button>
          </div>
        </div>

        {/* Right Panel: Game Board */}
        <div className="flex-1 relative flex flex-col">
          {/* Victory Toast */}
          {winner && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 duration-500 flex items-center gap-4 bg-slate-900 border-2 border-indigo-500/50 px-6 py-3 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-3">
                <Trophy className="text-yellow-500" size={24} />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 leading-none mb-1 uppercase tracking-wider">Simulation Complete</span>
                  <span className="text-sm font-black whitespace-nowrap">
                    {winner === 1 ? 'PLAYER 1' : (isAiMode ? 'AI SENTINEL' : 'PLAYER 2')} WINS
                  </span>
                </div>
              </div>
              <div className="h-8 w-[1px] bg-slate-700" />
              <button 
                onClick={initBoard}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
              >
                Reset Board
              </button>
              <button 
                onClick={() => setWinner(null)}
                className="text-slate-500 hover:text-white transition-colors"
                title="View Board"
              >
                <X size={18} />
              </button>
            </div>
          )}

          <div 
            className="grid gap-1 bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-inner flex-1"
            style={{ 
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              aspectRatio: '1/1'
            }}
          >
            {grid.map((row, r) => row.map((cell, c) => {
              const isPlayable = mask[r][c];
              const isWinCell = isWinningCell(r, c);
              
              return (
                <div 
                  key={`${r}-${c}`}
                  onClick={() => handleMove(r, c)}
                  className={`
                    relative rounded-md transition-all duration-200 cursor-pointer overflow-hidden
                    ${!isPlayable ? 'bg-slate-950/50 grayscale' : 'bg-slate-800/50 hover:bg-slate-700/50 shadow-sm border border-slate-700/30'}
                  `}
                >
                  {isPlayable && (
                    <div className="absolute inset-[15%] rounded-full border border-slate-700/40 shadow-inner bg-slate-900/40" />
                  )}

                  {cell !== 0 && (
                    <div className={`
                      absolute inset-[15%] rounded-full shadow-lg transform transition-all duration-500
                      ${isWinCell ? 'scale-110 z-10 animate-pulse' : 'scale-100'}
                      ${cell === 1 
                        ? 'bg-gradient-to-br from-indigo-400 to-indigo-600 border border-indigo-300/50 shadow-indigo-500/40' 
                        : 'bg-gradient-to-br from-rose-400 to-rose-600 border border-rose-300/50 shadow-rose-500/40'}
                      ${isWinCell ? 'ring-4 ring-yellow-500/40' : ''}
                    `} />
                  )}

                  {isPlayable && cell === 0 && !winner && (
                    <div className={`
                      absolute inset-[15%] rounded-full opacity-0 hover:opacity-20 transition-opacity
                      ${turn === 1 ? 'bg-indigo-400' : 'bg-rose-400'}
                    `} />
                  )}
                </div>
              );
            }))}
          </div>
          
          <div className="mt-4 flex justify-between items-center text-[10px] text-slate-500 font-mono tracking-tighter uppercase">
            <div className="flex gap-4">
              <span>UNITS: {GRID_SIZE}x{GRID_SIZE}</span>
              <span>PATHS_VALIDATED: {stats.paths}</span>
            </div>
            <div className="flex gap-4">
              <span>CORE: {ARCHETYPES[activeArch].name}</span>
              <span>STATE: {winner ? 'COMPLETED' : 'SIMULATING'}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
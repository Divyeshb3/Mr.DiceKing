import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  RotateCcw, 
  ArrowLeft,
  Trophy,
  Dices,
  Check,
  Shield,
  Info
} from 'lucide-react';

// --- CONSTANTS ---
const BOARD_PX   = 600;   // canvas width AND height in px
const GRID_SIZE  = 15;    // always 15 rows/cols
const CELL       = BOARD_PX / GRID_SIZE;  // = 40px exactly

// ─── COORDINATE CONVERTERS ───────────────────────
function cellCenter(row: number, col: number) {
  return {
    x: col * CELL + CELL * 0.5,
    y: row * CELL + CELL * 0.5
  };
}

function cellOrigin(row: number, col: number) {
  return {
    x: col * CELL,
    y: row * CELL
  };
}

function fillCell(ctx: CanvasRenderingContext2D, row: number, col: number, color: string) {
  const { x, y } = cellOrigin(row, col);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, CELL, CELL);
}

function strokeCell(ctx: CanvasRenderingContext2D, row: number, col: number, color: string, lw?: number) {
  const { x, y } = cellOrigin(row, col);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw || 0.5;
  ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
}

// Verified 52-step Ring Path
const RING: [number, number][] = [
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],[6,0]
];

// Safe zone ring indices — exactly 8 values.
const SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const FACTION_NEON = {
  red: "#ff2244", blue: "#2288ff",
  yellow: "#ffcc00", green: "#00ee77"
};

const HOME_CIRCLE_CELLS = {
  red:    [[1,1],[1,4],[4,1],[4,4]],
  blue:   [[1,10],[1,13],[4,10],[4,13]],
  yellow: [[10,1],[10,4],[13,1],[13,4]],
  green:  [[10,10],[10,13],[13,10],[13,13]]
};

const COLORS = {
  red: '#ff2244',
  blue: '#2288ff',
  yellow: '#ffcc00',
  green: '#00ee77',
  white: '#e8d9b0', 
  gold: '#ffc200',
  dark: '#05030f',
  tan: '#05030f',
  laneRed: '#1a0008',
  laneBlue: '#000f1a',
  laneYellow: '#1a1200',
  laneGreen: '#001a10'
};

const NEON_COLORS: Record<string, string> = {
  red: '#ff2244',
  blue: '#0088ff',
  green: '#00ff77',
  yellow: '#ffcc00'
};

const FACTION_NAMES: Record<string, string> = {
  red: 'CRIMSON OVERLORD',
  blue: 'AZURE ARCHON',
  green: 'JADE JUGGERNAUT',
  yellow: 'GOLDEN GUARDIAN'
};

const FACTION_SYMBOLS: Record<string, string> = {
  red: '⚔',
  blue: '✦',
  green: 'ᚱ',
  yellow: '★'
};

const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'];

// Convert to Set of "row,col" strings for O(1) lookup:
const SAFE_CELLS = new Set(
  [...SAFE_INDICES].map(i => {
    const [r, c] = RING[i];
    return `${r},${c}`;
  })
);

// Helper for safe cell check
function isSafeCell(row: number, col: number) {
  return SAFE_CELLS.has(`${row},${col}`);
}

const SAFE_CELLS_ARRAY = [
  RING[0],  RING[8],
  RING[13], RING[21],
  RING[26], RING[34],
  RING[39], RING[47]
];

// ─── BOARD DRAW FUNCTIONS ───────────────────────

function drawQuadrants(ctx: CanvasRenderingContext2D) {
  // RED top-left (0-5, 0-5)
  for (let r = 0; r <= 5; r++)
    for (let c = 0; c <= 5; c++)
      fillCell(ctx, r, c, "#1a0008");

  // BLUE top-right (0-5, 9-14)
  for (let r = 0; r <= 5; r++)
    for (let c = 9; c <= 14; c++)
      fillCell(ctx, r, c, "#000f1a");

  // YELLOW bottom-left (9-14, 0-5)
  for (let r = 9; r <= 14; r++)
    for (let c = 0; c <= 5; c++)
      fillCell(ctx, r, c, "#1a1200");

  // GREEN bottom-right (9-14, 9-14)
  for (let r = 9; r <= 14; r++)
    for (let c = 9; c <= 14; c++)
      fillCell(ctx, r, c, "#001a0a");
}

function drawPathCells(ctx: CanvasRenderingContext2D) {
  RING.forEach(([row, col]) => {
    fillCell(ctx, row, col, "#0d0b22");
    strokeCell(ctx, row, col, "rgba(80,60,160,0.5)", 0.5);
  });
}

function drawHomeLanes(ctx: CanvasRenderingContext2D) {
  const lanes = [
    {
      cells:  [[7,1],[7,2],[7,3],[7,4],[7,5]],
      fill:   "#1a0008",
      neon:   "#ff2244",
      edge:   "left"
    },
    {
      cells:  [[1,7],[2,7],[3,7],[4,7],[5,7]],
      fill:   "#000f1a",
      neon:   "#2288ff",
      edge:   "top"
    },
    {
      cells:  [[7,9],[7,10],[7,11],[7,12],[7,13]],
      fill:   "#001a0a",
      neon:   "#00ee77",
      edge:   "right"
    },
    {
      cells:  [[9,7],[10,7],[11,7],[12,7],[13,7]],
      fill:   "#1a1200",
      neon:   "#ffcc00",
      edge:   "bottom"
    }
  ];

  lanes.forEach(({ cells, fill, neon, edge }) => {
    cells.forEach(([row, col]) => {
      fillCell(ctx, row, col, fill);

      const { x, y } = cellOrigin(row, col);
      ctx.strokeStyle = neon;
      ctx.lineWidth   = 2;
      ctx.beginPath();

      if (edge === "left") {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + CELL);
      } else if (edge === "top") {
        ctx.moveTo(x, y);
        ctx.lineTo(x + CELL, y);
      } else if (edge === "right") {
        ctx.moveTo(x + CELL, y);
        ctx.lineTo(x + CELL, y + CELL);
      } else {
        ctx.moveTo(x, y + CELL);
        ctx.lineTo(x + CELL, y + CELL);
      }
      ctx.stroke();
    });
  });
}

function drawCenterTriangles(ctx: CanvasRenderingContext2D) {
  const cx  = 7 * CELL + CELL * 0.5;
  const cy  = 7 * CELL + CELL * 0.5;
  const TL  = { x: 6 * CELL, y: 6 * CELL };
  const TR  = { x: 9 * CELL, y: 6 * CELL };
  const BL  = { x: 6 * CELL, y: 9 * CELL };
  const BR  = { x: 9 * CELL, y: 9 * CELL };
  const C   = { x: cx, y: cy };

  const tris = [
    { pts:[TL,TR,C], fill:"#000f1a", neon:"#2288ff" }, // Top (Blue)
    { pts:[BL,BR,C], fill:"#1a1200", neon:"#ffcc00" }, // Bottom (Yellow)
    { pts:[TL,BL,C], fill:"#1a0008", neon:"#ff2244" }, // Left (Red)
    { pts:[TR,BR,C], fill:"#001a0a", neon:"#00ee77" }, // Right (Green)
  ];

  tris.forEach(({ pts, fill, neon }) => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.lineTo(pts[2].x, pts[2].y);
    ctx.closePath();
    ctx.fillStyle   = fill;
    ctx.fill();
    ctx.strokeStyle = neon;
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  });

  // Crown at center
  const { x: crx, y: cry } = cellCenter(7, 7);
  ctx.save();
  ctx.shadowColor  = "#ffc200";
  ctx.shadowBlur   = 16;
  ctx.fillStyle    = "#ffc200";
  ctx.font         = `bold ${CELL * 0.55}px serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("♛", crx, cry);
  ctx.restore();
}

function drawHomeBoxBracket(ctx: CanvasRenderingContext2D, r1: number, c1: number, r2: number, c2: number, neon: string) {
  const x1  = c1 * CELL;
  const y1  = r1 * CELL;
  const x2  = (c2 + 1) * CELL;
  const y2  = (r2 + 1) * CELL;
  const arm = CELL * 0.55;

  ctx.save();
  ctx.shadowColor = neon;
  ctx.shadowBlur  = 10;
  ctx.strokeStyle = neon;
  ctx.lineWidth   = 2;

  // Top-left bracket
  ctx.beginPath();
  ctx.moveTo(x1 + arm, y1);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1, y1 + arm);
  ctx.stroke();

  // Top-right bracket
  ctx.beginPath();
  ctx.moveTo(x2 - arm, y1);
  ctx.lineTo(x2, y1);
  ctx.lineTo(x2, y1 + arm);
  ctx.stroke();

  // Bottom-left bracket
  ctx.beginPath();
  ctx.moveTo(x1, y2 - arm);
  ctx.lineTo(x1, y2);
  ctx.lineTo(x1 + arm, y2);
  ctx.stroke();

  // Bottom-right bracket
  ctx.beginPath();
  ctx.moveTo(x2 - arm, y2);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2, y2 - arm);
  ctx.stroke();

  ctx.restore();
}

function drawAllHomeBoxes(ctx: CanvasRenderingContext2D) {
  drawHomeBoxBracket(ctx, 1, 1, 4, 4, "#ff2244");   // Red
  drawHomeBoxBracket(ctx, 1, 10, 4, 13, "#2288ff"); // Blue
  drawHomeBoxBracket(ctx, 10, 1, 13, 4, "#ffcc00"); // Yellow
  drawHomeBoxBracket(ctx, 10, 10, 13, 13, "#00ee77"); // Green
}

function drawHomeCircles(ctx: CanvasRenderingContext2D) {
  for (const color in HOME_CIRCLE_CELLS) {
    const neon = FACTION_NEON[color as keyof typeof FACTION_NEON];

    HOME_CIRCLE_CELLS[color as keyof typeof HOME_CIRCLE_CELLS].forEach(([row, col]) => {
      const { x, y } = cellCenter(row, col);
      const r = CELL * 0.38;

      ctx.save();
      ctx.shadowColor = neon;
      ctx.shadowBlur  = 14;

      // Dark fill
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#07051a";
      ctx.fill();

      // Neon ring
      ctx.strokeStyle = neon;
      ctx.lineWidth   = 2;
      ctx.stroke();

      // Inner dashed ring
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.strokeStyle = neon + "66";
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    });
  }
}

function drawSafeZones(ctx: CanvasRenderingContext2D) {
  SAFE_CELLS_ARRAY.forEach(([row, col]) => {
    const { x, y }      = cellOrigin(row, col);
    const { x:cx, y:cy } = cellCenter(row, col);
    const R = CELL * 0.4;

    // Gold tint background
    ctx.fillStyle = "rgba(255,194,0,0.08)";
    ctx.fillRect(x, y, CELL, CELL);

    // Hexagon outline
    ctx.save();
    ctx.shadowColor = "#ffc200";
    ctx.shadowBlur  = 10;
    ctx.strokeStyle = "#ffc200";
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a  = (Math.PI / 180) * (60 * i - 30);
      const hx = cx + R * Math.cos(a);
      const hy = cy + R * Math.sin(a);
      i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Star glow layer
    ctx.save();
    ctx.shadowColor  = "#ffc200";
    ctx.shadowBlur   = 14;
    ctx.fillStyle    = "#ffc200";
    ctx.font         = `bold ${CELL * 0.42}px serif`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", cx, cy);
    ctx.restore();

    // Star sharp layer
    ctx.fillStyle    = "#ffe033";
    ctx.font         = `bold ${CELL * 0.30}px serif`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", cx, cy);
  });
}

function drawEntryArrows(ctx: CanvasRenderingContext2D) {
  const arrowConfig = [
    { idx: 0, sym: "▶", neon: "#ff2244" }, // RED
    { idx: 13, sym: "▼", neon: "#2288ff" }, // BLUE
    { idx: 26, sym: "◀", neon: "#00ee77" }, // GREEN
    { idx: 39, sym: "▲", neon: "#ffcc00" }, // YELLOW
  ];

  arrowConfig.forEach(({ idx, sym, neon }) => {
    const [row, col] = RING[idx];
    const { x: cx, y: cy } = cellCenter(row, col);

    ctx.save();
    ctx.shadowColor = neon;
    ctx.shadowBlur = 12;
    ctx.fillStyle = neon;
    ctx.font = `bold ${CELL * 0.52}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sym, cx, cy);
    ctx.restore();
  });
}

function drawGridLines(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth   = 0.5;

  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL, 0);
    ctx.lineTo(i * CELL, BOARD_PX);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0,        i * CELL);
    ctx.lineTo(BOARD_PX, i * CELL);
    ctx.stroke();
  }
}

function validateSafeZones() {
  const forbidden = (row: number, col: number) => {
    // Quadrant zones
    if (row<=5 && col<=5)   return "RED base";
    if (row<=5 && col>=9)   return "BLUE base";
    if (row>=9 && col<=5)   return "YELLOW base";
    if (row>=9 && col>=9)   return "GREEN base";
    // Home lanes
    if (row===7 && col>=1 && col<=5)  return "RED lane";
    if (col===7 && row>=1 && row<=5)  return "BLUE lane";
    if (row===7 && col>=9 && col<=13) return "GREEN lane";
    if (col===7 && row>=9 && row<=13) return "YELLOW lane";
    // Center
    if (row>=6 && row<=8 && col>=6 && col<=8) return "CENTER";
    return null;
  };

  let valid = true;
  SAFE_INDICES.forEach(i => {
    const [r, c] = RING[i];
    const err = forbidden(r, c);
    if (err) {
      console.error(
        `❌ RING[${i}]=[${r},${c}] is inside ${err} — move it`
      );
      valid = false;
    } else {
      console.log(`✅ RING[${i}]=[${r},${c}] safe zone OK`);
    }
  });

  if (valid) console.log("✅ All 8 safe zones correctly placed");
}

validateSafeZones(); // call once on load

const ENTRY_OFFSETS = { red: 0, blue: 13, green: 26, yellow: 39 };

const HOME_LANES: Record<string, [number, number][]> = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  blue:   [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  green:  [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
};

const HOME_SLOTS: Record<string, [number, number][]> = {
  red:    [[1,1],[1,4],[4,1],[4,4]],
  blue:   [[1,10],[1,13],[4,10],[4,13]],
  yellow: [[10,1],[10,4],[13,1],[13,4]],
  green:  [[10,10],[10,13],[13,10],[13,13]]
};

const SAFE_ZONE_SET = SAFE_CELLS;

type Color = 'red' | 'blue' | 'yellow' | 'green';
type Screen = 'MENU' | 'GAME' | 'WIN';
type Phase = 'ROLL' | 'MOVE' | 'ANIMATING';

interface Piece {
  color: Color;
  id: number;
  steps: number; // -1: base, 0-51: ring, 52-57: lane, 58: home
}

interface Toast {
  id: string;
  message: string;
  color?: Color;
}

const MagicalParticles: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const particles: any[] = [];
    const colors = ['#ffc200', '#b44fff', '#00fff7']; // Gold, Purple, Cyan sparks

    for (let i = 0; i < 60; i++) {
        particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            size: Math.random() * 2 + 1,
            speedX: (Math.random() - 0.5) * 0.4,
            speedY: (Math.random() - 1.5) * 0.8, // Drift up
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: Math.random() * 0.5 + 0.1
        });
    }

    const animate = () => {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            if (p.y < -10) p.y = h + 10;
            if (p.x < -10) p.x = w + 10;
            if (p.x > w + 10) p.x = -10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        requestAnimationFrame(animate);
    };

    const handleResize = () => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    animate();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1] opacity-60" />;
};

const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<Screen>('MENU');
  const [numPlayers, setNumPlayers] = useState<number>(2);
  const [selectedColors, setSelectedColors] = useState<Color[]>(new Array(2).fill(''));
  const [turnIndex, setTurnIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ROLL');
  const [dice, setDice] = useState(0);
  const [isDiceAnimating, setIsDiceAnimating] = useState(false);
  const [sixStreak, setSixStreak] = useState(0);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [winners, setWinners] = useState<Color[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Computed active players list
  const activePlayers = selectedColors.filter(Boolean);

  // --- HELPERS ---
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const addToast = (message: string, color?: Color) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, color }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2500);
  };

  const cx = (col: number) => col * CELL + CELL/2;
  const cy = (row: number) => row * CELL + CELL/2;

  const getPieceDisplayCell = (p: Piece): [number, number] => {
    if (p.steps === -1) return HOME_SLOTS[p.color as keyof typeof HOME_SLOTS][p.id];
    if (p.steps >= 0 && p.steps <= 51) {
      return RING[(ENTRY_OFFSETS[p.color as keyof typeof ENTRY_OFFSETS] + p.steps) % 52];
    }
    if (p.steps >= 52 && p.steps <= 57) {
      return HOME_LANES[p.color as keyof typeof HOME_LANES][p.steps - 52];
    }
    const homes: Record<Color, [number, number]> = {
      red: [7,7], blue: [7,7], green: [7,7], yellow: [7,7]
    };
    return homes[p.color];
  };

  const getBlockades = () => {
    const counts: Record<string, Record<Color, number>> = {};
    pieces.forEach(p => {
      if (p.steps < 0 || p.steps > 51) return;
      const pos = getPieceDisplayCell(p).join(',');
      if (SAFE_ZONE_SET.has(pos)) return;
      if (!counts[pos]) counts[pos] = {} as Record<Color, number>;
      counts[pos][p.color] = (counts[pos][p.color] || 0) + 1;
    });
    const blockades: Record<string, Color> = {};
    Object.entries(counts).forEach(([pos, colorCounts]) => {
      Object.entries(colorCounts).forEach(([color, count]) => {
        if (count >= 2) blockades[pos] = color as Color;
      });
    });
    return blockades;
  };

  const getPossibleMoves = (color: Color, val: number): number[] => {
    const blockades = getBlockades();
    return pieces
      .filter(p => p.color === color)
      .filter(p => {
        if (p.steps === 58) return false;
        if (p.steps === -1) return val === 6;
        if (p.steps + val > 58) return false;

        // Blockade check path
        for (let i = 1; i <= val; i++) {
          const s = p.steps + i;
          if (s > 51) break;
          const pos = RING[(ENTRY_OFFSETS[p.color as keyof typeof ENTRY_OFFSETS] + s) % 52].join(',');
          if (blockades[pos] && blockades[pos] !== color) return false;
        }
        return true;
      })
      .map(p => pieces.indexOf(p));
  };

  // --- GAME LOGIC ---
  const initGame = () => {
    const newPieces: Piece[] = [];
    activePlayers.forEach(color => {
      for (let i = 0; i < 4; i++) newPieces.push({ color, id: i, steps: -1 });
    });
    setPieces(newPieces);
    setTurnIndex(0);
    setPhase('ROLL');
    setDice(0);
    setSixStreak(0);
    setWinners([]);
    setScreen('GAME');
  };

  const nextTurn = () => {
    let nextIdx = (turnIndex + 1) % activePlayers.length;
    let count = 0;
    while (winners.includes(activePlayers[nextIdx]) && count < 4) {
      nextIdx = (nextIdx + 1) % activePlayers.length;
      count++;
    }
    setTurnIndex(nextIdx);
    setPhase('ROLL');
    setDice(0);
    setSixStreak(0);
  };

  const rollDice = async () => {
    if (phase !== 'ROLL' || isDiceAnimating) return;
    
    setIsDiceAnimating(true);
    // CSS handles visual jitter/blur via .rolling class
    
    await sleep(600); // Animation duration
    
    const finalVal = Math.floor(Math.random() * 6) + 1;
    setDice(finalVal);
    setIsDiceAnimating(false);

    if (finalVal === 6) {
      const ns = sixStreak + 1;
      if (ns === 3) {
        addToast("⛔ FOUL — TURN FORFEITED", activePlayers[turnIndex]);
        await sleep(800);
        nextTurn();
        return;
      }
      setSixStreak(ns);
    } else {
      setSixStreak(0);
    }

    if (finalVal === 6) {
      addToast("⚡ SIX! EXTRA TURN", activePlayers[turnIndex]);
    }

    const moves = getPossibleMoves(activePlayers[turnIndex], finalVal);
    if (moves.length === 0) {
      addToast(`😕 No valid moves!`, activePlayers[turnIndex]);
      await sleep(1000);
      nextTurn();
    } else {
      setPhase('MOVE');
    }
  };

  const handleMove = async (pIdx: number, val: number) => {
    if (phase !== 'MOVE') return;
    setPhase('ANIMATING');
    const localPieces = [...pieces];
    const target = localPieces[pIdx];

    // Step-by-step movement (110ms per cell)
    for (let i = 0; i < val; i++) {
      if (target.steps === -1) {
        target.steps = 0;
      } else {
        target.steps++;
      }
      setPieces([...localPieces]);
      await sleep(110);
      if (target.steps === 58) break;
    }

    const [row, col] = getPieceDisplayCell(target);
    const isSafe = isSafeCell(row, col);
    let captured = false;

    if (!isSafe && target.steps < 52) {
      const activeColors = activePlayers;
      for (const color of activeColors) {
        if (color === target.color) continue;
        
        localPieces.forEach(p => {
          if (p.color === color && p.steps >= 0 && p.steps < 52) {
            const [er, ec] = getPieceDisplayCell(p);
            if (er === row && ec === col) {
              p.steps = -1;
              captured = true;
              addToast(`⚔ ${color.toUpperCase()} PIECE ELIMINATED`, target.color);
            }
          }
        });
      }
    }

    if (isSafe && target.steps <= 51) addToast(`🛡 SAFE ZONE — SECURED`, target.color);
    if (target.steps === 58) {
      addToast("✅ PIECE REACHED HOME", target.color);
      const done = localPieces.filter(p => p.color === target.color).every(p => p.steps === 58);
      if (done && !winners.includes(target.color)) {
        const nw = [...winners, target.color];
        setWinners(nw);
        if (nw.length >= activePlayers.length - 1) {
          setScreen('WIN');
          return;
        }
      }
    }

    setPieces([...localPieces]);

    if (dice === 6 || captured) {
      setPhase('ROLL');
      setDice(0);
    } else {
      nextTurn();
    }
  };

  // --- RENDERING ---
  const STACK_OFFSETS = [
    [-9, -9], [ 9, -9],
    [-9,  9], [ 9,  9]
  ];

  const drawOnePiece = (ctx: CanvasRenderingContext2D, x: number, y: number, piece: Piece, isActive: boolean) => {
    const neon     = FACTION_NEON[piece.color];
    
    ctx.save();

    // Movable piece outer pulse
    if (isActive) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
      ctx.shadowColor = "#ffe600";
      ctx.shadowBlur  = 16 + pulse * 10;
      ctx.beginPath();
      ctx.arc(x, y, 17 + pulse * 2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,230,0,${0.5 + pulse * 0.4})`;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    // Glow layer
    ctx.shadowColor = neon;
    ctx.shadowBlur  = isActive ? 20 : 10;

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.strokeStyle = neon + "55";
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Body gradient
    const grad = ctx.createRadialGradient(
      x, y, 1,
      x, y, 12
    );
    grad.addColorStop(0,   neon + "44");
    grad.addColorStop(0.4, "#12103a");
    grad.addColorStop(1,   "#05030f");

    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Neon border
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.strokeStyle = neon;
    ctx.lineWidth   = 2;
    ctx.stroke();

    ctx.restore();

    // Inner core dot
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = neon;
    ctx.fill();

    // Specular glint (Centered and reduced)
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fill();

    // Piece number
    ctx.fillStyle    = "#ffffff";
    ctx.font         = `bold 9px 'Share Tech Mono', monospace`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((piece.id + 1).toString(), x, y);
  };

  const renderAllPieces = (ctx: CanvasRenderingContext2D) => {
    const cellMap: Record<string, Piece[]> = {};
    const movableIndices = phase === 'MOVE' ? getPossibleMoves(activePlayers[turnIndex], dice) : [];

    pieces.forEach((p, idx) => {
      if (p.steps === 58) return;
      const key = getPieceDisplayCell(p).join(',');
      if (!cellMap[key]) cellMap[key] = [];
      cellMap[key].push(p);
    });

    for (const key in cellMap) {
      const [row, col] = key.split(",").map(Number);
      const { x, y }   = cellCenter(row, col);
      const group      = cellMap[key];

      group.forEach((piece, i) => {
        const [dx, dy] = group.length > 1
          ? STACK_OFFSETS[i] || [0, 0]
          : [0, 0];
        const isActive = movableIndices.some(idx => pieces[idx] === piece);
        drawOnePiece(ctx, x + dx, y + dy, piece, isActive);
      });
    }
  };

  const renderBoard = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, BOARD_PX, BOARD_PX);

    // 1. Void background
    ctx.fillStyle = "#05030f";
    ctx.fillRect(0, 0, BOARD_PX, BOARD_PX);

    // 2. Quadrant color fills
    drawQuadrants(ctx);

    // 3. Outer ring path cells
    drawPathCells(ctx);

    // 4. Colored home lane cells
    drawHomeLanes(ctx);

    // 5. Center triangles + crown
    drawCenterTriangles(ctx);

    // 6. Home box corner brackets
    drawAllHomeBoxes(ctx);

    // 7. Home base circles
    drawHomeCircles(ctx);

    // 8. Safe zone hexagons + stars
    drawSafeZones(ctx);

    // 9. Entry arrows
    drawEntryArrows(ctx);

    // 10. Subtle grid lines
    drawGridLines(ctx);

    // 11. All pieces (always on top)
    renderAllPieces(ctx);
  };

  useEffect(() => {
    let animationFrameId: number;
    
    const render = () => {
      if (screen === 'GAME' && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          renderBoard(ctx);
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [screen, pieces, phase, turnIndex, dice]);

  // --- UI COMPONENTS ---
  const ColorCircle: React.FC<{ color: Color, pIdx: number }> = ({ color, pIdx }) => {
    const isSelected = selectedColors[pIdx] === color;
    const isTaken = selectedColors.some((c, i) => c === color && i !== pIdx);
    const nc = NEON_COLORS[color];
    const pick = () => {
      if (isTaken) return;
      const next = [...selectedColors];
      next[pIdx] = color;
      if (numPlayers === 2) {
        const diag: Record<Color, Color> = { red:'green', green:'red', blue:'yellow', yellow:'blue' };
        next[1-pIdx] = diag[color];
      }
      setSelectedColors(next);
    };
    return (
      <button 
        onClick={pick} 
        disabled={isTaken && !isSelected}
        className={`w-[66px] h-[66px] rounded-full transition-all duration-300 relative flex flex-col items-center justify-center border-2 ${
          isSelected 
            ? 'scale-115 shadow-[0_0_30px_rgba(var(--f-color),0.5)] border-white' 
            : isTaken 
              ? 'opacity-10 grayscale border-white/5 cursor-not-allowed'
              : 'border-white/20 hover:border-white/40 hover:scale-110 hover:shadow-[0_0_20px_rgba(var(--f-color),0.3)]'
        }`} 
        style={{ 
          borderColor: isSelected ? nc : nc + '66',
          backgroundColor: isSelected ? nc + '22' : 'rgba(0,0,0,0.4)',
          // @ts-ignore
          '--f-color': hexToRgb(nc)
        } as React.CSSProperties}
      >
        <span className="text-2xl mb-1">{FACTION_SYMBOLS[color]}</span>
        <span className="text-[8px] font-cinzel font-bold tracking-[2px] uppercase" style={{ color: nc }}>
          {FACTION_NAMES[color]}
        </span>
        
        {isSelected && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--gold)] text-black flex items-center justify-center text-[10px] font-bold shadow-[0_0_8px_var(--gold)]">
            ✓
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="relative min-h-screen bg-[#04040d] text-[#e0e0ff] font-sans selection:bg-[#00fff7] selection:text-[#0a0a0f] overflow-hidden">
      {/* Background Layers */}
      <MagicalParticles />
      <div className="hex-grid opacity-30" />
      <div className="scan-line" />
      <div className="vignette z-20" />

      {/* Main Container */}
      <div className="relative z-30 min-h-screen flex flex-col items-center">
        
        {/* Universal HUD Overlays */}
        <div className="fixed inset-4 border border-white/5 pointer-events-none pointer-events-none z-50">
          <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-[#00fff7]/40" />
          <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-[#00fff7]/40" />
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-[#00fff7]/40" />
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-[#00fff7]/40" />
        </div>

        {/* Floating Notifications */}
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-3 pointer-events-none">
          {toasts.map(t => (
            <div 
              key={t.id} 
              className="px-6 py-2 bg-[#04040d]/95 border border-[#00fff7]/30 backdrop-blur-xl shape-corner font-mono text-[11px] tracking-widest uppercase flex items-center gap-3 drop-shadow-[0_0_15px_rgba(0,255,247,0.2)] animate-in fade-in slide-in-from-top-4"
              style={{ 
                color: t.color ? NEON_COLORS[t.color] : '#00fff7',
                borderLeft: `4px solid ${t.color ? NEON_COLORS[t.color] : '#00fff7'}`
              }}
            >
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: t.color ? NEON_COLORS[t.color] : '#00fff7' }} />
              {t.message}
            </div>
          ))}
        </div>

        {screen === 'MENU' && (
          <div 
            className="w-full max-w-lg flex flex-col items-center justify-center min-h-screen py-10 px-6 animate-in fade-in duration-500"
          >
            <div className="w-full bg-[var(--card)]/90 shape-corner border border-[var(--arcane)]/30 backdrop-blur-xl p-10 flex flex-col items-center relative overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]">
                {/* Corner Runes */}
                <div className="absolute top-4 left-4 font-mono text-[14px] text-[var(--arcane)]/40 pointer-events-none">ᚠ</div>
                <div className="absolute top-4 right-4 font-mono text-[14px] text-[var(--arcane)]/40 pointer-events-none">ᚢ</div>
                <div className="absolute bottom-4 left-4 font-mono text-[14px] text-[var(--arcane)]/40 pointer-events-none">ᚦ</div>
                <div className="absolute bottom-4 right-4 font-mono text-[14px] text-[var(--arcane)]/40 pointer-events-none">ᚨ</div>

                {/* Title Section */}
                <div className="text-center group select-none flex flex-col items-center mb-10">
                  <div className="text-4xl crown-float mb-[-4px] filter drop-shadow-[0_0_12px_#ffc200]">👑</div>
                  <h1 className="flex flex-col items-center">
                    <span className="font-display text-[18px] text-[var(--gold)] tracking-[14px] leading-none mb-1 drop-shadow-[0_0_10px_var(--gold)] uppercase">MR.</span>
                    <span className="font-display text-[56px] tracking-[8px] leading-tight title-glow bg-gradient-to-b from-white via-[var(--gold)] via-[30%] via-[var(--arcane)] via-[60%] to-[var(--neon-cyan)] bg-clip-text text-transparent uppercase">DICEKING</span>
                  </h1>
                  
                  <div className="flex items-center gap-4 my-2">
                     <div className="w-[80px] h-[1px] bg-gradient-to-r from-transparent to-[var(--gold)]" />
                     <span className="text-[var(--gold)] text-sm">✦</span>
                     <div className="w-[80px] h-[1px] bg-gradient-to-l from-transparent to-[var(--gold)]" />
                  </div>

                  <p className="font-cinzel text-[12px] text-[var(--text-parchment)] opacity-60 tracking-[5px] uppercase">
                    "ROLL YOUR FATE. RULE THE REALM."
                  </p>
                </div>

                {/* Assemble Section */}
                <div className="w-full space-y-6 mb-10">
                  <div className="section-label font-cinzel font-bold text-[11px] text-[var(--gold)] tracking-[7px] justify-center uppercase">
                    Assemble Your Party
                  </div>
                  <div className="flex justify-center gap-6">
                    {[2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => {
                          setNumPlayers(n);
                          setSelectedColors(new Array(n).fill(''));
                        }}
                        className={`w-[72px] h-[56px] shape-hex transition-all duration-300 font-cinzel font-bold text-lg border ${
                          numPlayers === n 
                            ? 'bg-gradient-to-br from-[var(--gold)]/15 to-[var(--arcane)]/10 border-[var(--gold)] text-[var(--text-bright)] shadow-[0_0_25px_rgba(255,194,0,0.3)] scale-110' 
                            : 'bg-[var(--panel)] border-[var(--arcane)]/20 text-[var(--text-dim)] hover:text-[var(--gold)] hover:border-[var(--gold)] hover:scale-105 shadow-lg'
                        }`}
                      >
                        {n === 2 ? 'II' : n === 3 ? 'III' : 'IIII'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Faction Sections */}
                <div className="w-full space-y-8 mb-12">
                  <div className="section-label font-cinzel font-bold text-[11px] text-[var(--gold)] tracking-[7px] justify-center uppercase">
                    Claim Your Faction
                  </div>
                  <div className="space-y-4 max-h-[280px] overflow-y-auto px-4 custom-scrollbar">
                    {Array.from({ length: numPlayers }).map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-4 bg-white/5 p-6 shape-corner border-l-2 border-[var(--arcane)]/20 backdrop-blur-sm">
                        <div className="font-mono text-[10px] text-[var(--arcane)]/40 uppercase tracking-widest">PROPRIETOR_0{i+1}</div>
                        <div className="flex gap-6 justify-center">
                          {(['red', 'blue', 'green', 'yellow'] as Color[]).map(c => (
                            <ColorCircle key={c} color={c} pIdx={i} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Begin Quest */}
                <button
                  onClick={initGame}
                  disabled={selectedColors.some(c => c === '')}
                  className="w-full h-[64px] shape-hex btn-shimmer group relative overflow-hidden transition-all disabled:opacity-20 disabled:scale-100 bg-gradient-to-r from-[#4a1a8a] via-[#7b2fff] via-[#b44fff] via-[#ffc200] via-[#b44fff] via-[#7b2fff] to-[#4a1a8a] text-white font-cinzel font-black text-px tracking-[6px] shadow-[0_0_30px_rgba(180,79,255,0.4)] active:scale-95"
                >
                   <div className="absolute inset-0 flex items-center justify-between px-10 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                      <span className="text-xl">⚔</span>
                      <span className="text-xl -scale-x-100">⚔</span>
                   </div>
                   <span className="relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">BEGIN THE QUEST</span>
                </button>
              </div>
            </div>
          )}

        {screen === 'GAME' && (
          <div 
            className="w-full max-w-7xl flex flex-col items-center py-6 px-6 min-h-screen animate-in fade-in duration-500"
          >
            {/* Top Bar Header */}
              <div className="w-full h-[58px] bg-[#05030f]/97 border-b border-[var(--arcane)]/25 backdrop-blur-md flex items-center justify-between px-6 mb-4 sticky top-0 z-[60]">
                <button 
                  onClick={() => setScreen('MENU')}
                  className="flex items-center gap-2 p-2 shape-hex border border-[var(--arcane)] text-[var(--arcane)] hover:bg-[var(--arcane)]/10 hover:text-[var(--gold)] hover:border-[var(--gold)] transition-all active:scale-95 px-5 font-cinzel text-[11px] font-bold"
                >
                  <ArrowLeft size={16} />
                  <span>◂ RETREAT</span>
                </button>
                <div className="text-center">
                  <h2 className="font-display text-lg text-[var(--gold)] tracking-[4px] drop-shadow-[0_0_12px_rgba(255,194,0,0.5)]">⚔ MR. DICEKING ⚔</h2>
                </div>
                <div className="flex items-center gap-4">
                   <button className="w-9 h-9 flex items-center justify-center border border-[var(--arcane)] text-[var(--arcane)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}>
                      <Users size={16} />
                   </button>
                </div>
              </div>

            {/* Realm Banner */}
            <div 
              key={turnIndex}
              className="w-full py-2 text-center border-b border-white/10 mb-6 bg-gradient-to-r from-transparent via-white/5 to-transparent flex items-center justify-center gap-4 animate-in slide-in-from-top-2"
              style={{ 
                color: NEON_COLORS[activePlayers[turnIndex]],
                borderColor: NEON_COLORS[activePlayers[turnIndex]] + '44'
              }}
            >
                <span className="text-sm">⚔</span>
                <span className="font-cinzel text-[11px] font-bold tracking-[5px] uppercase drop-shadow-[0_0_8px_currentColor]">
                  {FACTION_NAMES[activePlayers[turnIndex]]} FACTION — AWAITING YOUR COMMAND ⚔
                </span>
              </div>

              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 w-full justify-center">
                
                {/* Left Panel: Board & Controls */}
                <div className="flex flex-col gap-8">
                  {/* Canvas Board Container */}
                  <div className="relative p-1 bg-[var(--surface)] border border-[var(--arcane)]/40 shadow-[0_0_40px_rgba(180,79,255,0.2)]">
                    {/* HUD Corner Brackets */}
                    <div className="absolute -top-1 -left-1 w-7 h-7 border-t-2 border-l-2 border-[var(--gold)] z-40 animate-pulse shadow-[0_0_10px_var(--gold)]" />
                    <div className="absolute -top-1 -right-1 w-7 h-7 border-t-2 border-r-2 border-[var(--arcane)] z-40 animate-pulse shadow-[0_0_10px_var(--arcane)]" />
                    <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-2 border-l-2 border-[var(--arcane)] z-40 animate-pulse shadow-[0_0_10px_var(--arcane)]" />
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-2 border-r-2 border-[var(--gold)] z-40 animate-pulse shadow-[0_0_10px_var(--gold)]" />
                    
                    <div className="relative">
                      <canvas 
                        ref={canvasRef} width={BOARD_PX} height={BOARD_PX} 
                        className="cursor-crosshair max-w-full block"
                        onClick={(e) => {
                          if (phase !== 'MOVE') return;
                          const rect = canvasRef.current!.getBoundingClientRect();
                          const x = (e.clientX - rect.left) * (BOARD_PX / rect.width);
                          const y = (e.clientY - rect.top) * (BOARD_PX / rect.height);
                          const movables = getPossibleMoves(activePlayers[turnIndex], dice);
                          let picked = -1;
                          movables.forEach(idx => {
                            const [r, c] = getPieceDisplayCell(pieces[idx]);
                            if (Math.abs(x - cx(c)) < CELL * 0.5 && Math.abs(y - cy(r)) < CELL * 0.5) picked = idx;
                          });
                          if (picked !== -1) handleMove(picked, dice);
                        }}
                      />
                    </div>
                  </div>

                  {/* Dice + Control Strip */}
                  <div className="w-full bg-[#050315]/96 border-t border-[var(--arcane)]/20 p-5 flex items-center justify-between shape-corner shadow-2xl">
                      <div className="flex items-center gap-6">
                        <div 
                          id="dice-display"
                          className={`w-[74px] h-[74px] bg-gradient-to-br from-[#100d28] to-[#0a0720] border-2 border-[var(--arcane)] shape-octagon flex flex-col items-center justify-center relative shadow-[0_0_25px_rgba(180,79,255,0.35)] ${isDiceAnimating ? 'rolling' : ''}`}
                        >
                          <span 
                            className="text-[38px] font-mono font-bold text-[var(--gold)] drop-shadow-[0_0_15px_var(--gold)]"
                          >
                            {dice === 0 ? '--' : dice}
                          </span>
                          <div className="font-mono text-[8px] text-[var(--text-dim)] tracking-[3px] uppercase mt-[-4px]">THE DICE</div>
                        </div>

                        <div className="flex flex-col">
                         <span className="text-[10px] text-[var(--arcane)] font-mono animate-pulse uppercase tracking-widest">{phase === 'ROLL' ? ':: AWAITING_ROLL' : ':: SELECT_CHAMPION'}</span>
                         <span className="text-[var(--text-parchment)] font-cinzel text-xs opacity-40">Phase Sequence Opt: Alpha-7</span>
                      </div>
                    </div>

                    <button 
                      onClick={rollDice} 
                      disabled={phase !== 'ROLL' || isDiceAnimating} 
                      className="px-10 h-[60px] bg-transparent border-2 border-[var(--arcane)] shape-hex text-[var(--text-parchment)] font-cinzel font-bold text-[13px] tracking-[5px] uppercase relative overflow-hidden group hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all hover:shadow-[0_0_25px_rgba(255,194,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-20 sword-shine"
                    >
                      <div className="flex items-center justify-center gap-4">
                        <span className="text-xl text-[var(--gold)]">⚔</span>
                        <span>ROLL DICE</span>
                        <span className="text-xl text-[var(--gold)] -scale-x-100">⚔</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Right Panel: Faction Status & Events */}
                <div className="w-full lg:w-96 flex flex-col gap-6">
                  {/* Factions Panel */}
                  <div className="bg-[#0a0818]/90 border border-[var(--arcane)]/20 shape-cut overflow-hidden backdrop-blur-md">
                    <div className="py-3 text-center border-b border-[var(--gold)]/15 font-cinzel font-bold text-[10px] text-[var(--gold)] tracking-[7px] uppercase">
                      ⚔ FACTIONS ⚔
                    </div>
                    <div className="divide-y divide-[var(--arcane)]/10">
                      {activePlayers.map((c, i) => (
                        <div key={c} className={`relative p-4 flex items-center gap-4 transition-all ${turnIndex === i ? 'active-row-pulse' : ''}`}>
                          {turnIndex === i && (
                             <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-white shadow-[0_0_10px_white]" style={{ backgroundColor: NEON_COLORS[c], boxShadow: `0 0 10px ${NEON_COLORS[c]}` }} />
                          )}
                          <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs" style={{ borderColor: NEON_COLORS[c], color: NEON_COLORS[c], boxShadow: `inset 0 0 10px ${NEON_COLORS[c]}44, 0 0 10px ${NEON_COLORS[c]}44` }}>
                            {FACTION_SYMBOLS[c]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                               <span className="font-cinzel text-[12px] font-bold text-[var(--text-parchment)]">{FACTION_NAMES[c]}</span>
                               <span className="font-mono text-[10px] opacity-40">{pieces.filter(p=>p.color===c && p.steps === 58).length}/4</span>
                            </div>
                            <div className="flex gap-1.5">
                              {pieces.filter(p=>p.color===c).map((p, pi) => (
                                <div 
                                  key={pi} 
                                  className={`w-3.5 h-3.5 rounded-full transition-all duration-500 border ${
                                    p.steps === 58 ? 'bg-[var(--gold)] border-[var(--gold)] scale-110 shadow-[0_0_8px_var(--gold)]' : 
                                    p.steps === -1 ? 'bg-transparent border-white/10' : 
                                    'bg-current border-transparent'
                                  }`} 
                                  style={{ color: NEON_COLORS[c], boxShadow: p.steps !== -1 && p.steps !== 58 ? `0 0 6px currentColor` : undefined }} 
                                >
                                   {p.steps === 58 && <span className="text-[6px] text-black flex items-center justify-center h-full">✓</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Arcane Event Scroll */}
                  <div className="bg-[#080514]/97 border border-[var(--arcane)]/15 p-5 flex-1 flex flex-col gap-4 min-h-[300px] shape-cut shadow-inner">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                       <span className="font-mono text-[9px] uppercase tracking-[3px] text-[var(--arcane)]/60">Arcane_Scroll :: Events</span>
                       <div className="flex gap-1">
                         <div className="w-1 h-1 bg-[var(--gold)]/40 rounded-full animate-bounce" />
                         <div className="w-1 h-1 bg-[var(--gold)]/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                         <div className="w-1 h-1 bg-[var(--gold)]/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                       </div>
                    </div>
                    <div className="flex-1 font-mono text-[11px] space-y-3 overflow-y-auto custom-scrollbar pr-2">
                        {toasts.map(t => (
                          <div 
                            key={t.id} 
                            className="py-3 px-4 bg-[var(--deep)]/50 border-l-[3px] border-[var(--arcane)]/30 shape-cut leading-relaxed animate-in slide-in-from-left-2 duration-300"
                            style={{ 
                              borderColor: t.color ? NEON_COLORS[t.color] : 'var(--arcane)',
                              color: t.color ? NEON_COLORS[t.color] : 'var(--text-parchment)'
                            }}
                          >
                             {`> ${t.message}`}
                          </div>
                        ))}
                      {toasts.length === 0 && <div className="text-center py-10 opacity-10 italic font-cinzel tracking-widest">NO RECENT PROPHECIES</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {screen === 'WIN' && (
          <div 
            className="w-full max-w-lg flex flex-col items-center justify-center min-h-screen text-center px-8 animate-in zoom-in-95 duration-500"
          >
            <div className="w-full bg-[var(--card)]/90 shape-corner border-2 border-[var(--gold)] p-12 backdrop-blur-2xl relative shadow-[0_0_120px_rgba(255,194,0,0.25)]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[var(--gold)]/20 blur-[60px] rounded-full" />
                
                <h2 className="text-5xl mb-2 filter drop-shadow-[0_0_15px_#ffc200]">👑</h2>
                <h3 className="font-display text-[42px] text-white tracking-[8px] leading-tight title-glow mb-2 uppercase">VICTORIOUS</h3>
                
                <div className="flex items-center justify-center gap-4 my-6">
                   <div className="w-[60px] h-[1px] bg-gradient-to-r from-transparent to-[var(--gold)]" />
                   <div 
                    className="w-16 h-16 shape-hex flex items-center justify-center border-2 shadow-[0_0_20px_currentColor]" 
                    style={{ borderColor: NEON_COLORS[winners[0]], color: NEON_COLORS[winners[0]] }}
                   >
                     <span className="text-2xl font-bold">{FACTION_SYMBOLS[winners[0]]}</span>
                   </div>
                   <div className="w-[60px] h-[1px] bg-gradient-to-l from-transparent to-[var(--gold)]" />
                </div>

                <h4 className="font-display text-2xl tracking-[6px] mb-2 uppercase" style={{ color: NEON_COLORS[winners[0]] }}>
                  {FACTION_NAMES[winners[0]]} LEGION
                </h4>
                <p className="font-cinzel text-[10px] text-[var(--text-parchment)] opacity-50 tracking-[4px] uppercase mb-10">
                  "THE REALM BOWS TO YOUR DIGITAL MIGHT"
                </p>

                <div className="space-y-4">
                  <button 
                    onClick={() => setScreen('MENU')}
                    className="w-full h-[60px] shape-hex border-2 border-[var(--gold)] text-[var(--gold)] font-cinzel font-bold text-xs tracking-[5px] uppercase relative overflow-hidden group hover:bg-[var(--gold)] hover:text-black transition-all hover:shadow-[0_0_30px_rgba(255,194,0,0.4)]"
                  >
                    RETURN TO CITADEL
                  </button>
                </div>
              </div>
            </div>
          )}
        {/* Close of App container */}
      </div>
    </div>
  );
};

export default App;

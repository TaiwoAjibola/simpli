import React, { useMemo } from 'react';
import SimpliLogo from '../assets/Simpli.svg';

const BRICK_W = 34;
const BRICK_H = 16;
const MORTAR = 4;
const ROWS = 4;
const COLS = 5;

const PALETTE = ['#22C55E', '#10b981', '#00d5ef', '#8b5cf6'];

function buildBricks(): { x: number; y: number; color: string; delay: number }[] {
  const bricks: { x: number; y: number; color: string; delay: number }[] = [];
  let o = 0;
  for (let r = 0; r < ROWS; r++) {
    const offset = r % 2 === 1 ? (BRICK_W + MORTAR) / 2 : 0;
    for (let c = 0; c < COLS; c++) {
      bricks.push({
        x: offset + c * (BRICK_W + MORTAR),
        y: r * (BRICK_H + MORTAR),
        color: PALETTE[(r + c) % PALETTE.length],
        delay: o * 90
      });
      o++;
    }
  }
  return bricks;
}

export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  const bricks = useMemo(buildBricks, []);
  const wallW = (COLS - 1) * (BRICK_W + MORTAR) + BRICK_W + (BRICK_W + MORTAR) / 2;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617]">
      <div
        className="relative mb-8 loader-wall-glow rounded-sm"
        style={{ width: wallW, height: ROWS * (BRICK_H + MORTAR) - MORTAR, padding: 6 }}
      >
        {bricks.map((b, i) => (
          <div
            key={i}
            className="loader-brick absolute rounded-[3px]"
            style={{
              left: b.x,
              top: b.y,
              width: BRICK_W,
              height: BRICK_H,
              background: b.color,
              opacity: 0,
              animationDelay: `${b.delay}ms`,
              boxShadow: 'inset 0 -4px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.22)'
            }}
          />
        ))}
      </div>

      <img
        src={SimpliLogo}
        alt="Simpli"
        className="w-14 h-14 mb-4 opacity-0 animate-fade-up"
        style={{ animationDelay: `${bricks.length * 90 + 150}ms` }}
      />
      <p className="text-[#94A3B8] text-sm font-medium">{message}</p>
    </div>
  );
}
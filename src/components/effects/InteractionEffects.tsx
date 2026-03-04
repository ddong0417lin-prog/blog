'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

type BurstType = 'confetti' | 'flower' | 'firework';

type Particle = {
  id: string;
  dx: number;
  dy: number;
  rot: number;
  size: number;
  color: string;
  shape: 'rect' | 'petal' | 'dot';
  duration: number;
  delay: number;
};

type Burst = {
  id: string;
  x: number;
  y: number;
  type: BurstType;
  particles: Particle[];
};

const INTERACTIVE_SELECTOR =
  'a,button,input,textarea,select,label,[role="button"],[role="link"],[contenteditable="true"],[data-interactive="true"]';

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function buildParticles(type: BurstType): Particle[] {
  const count = type === 'confetti' ? 14 : type === 'flower' ? 10 : 26;

  const palette =
    type === 'confetti'
      ? ['#f43f5e', '#f59e0b', '#22c55e', '#38bdf8', '#a855f7', '#0f172a']
      : type === 'flower'
        ? ['#e11d48', '#f43f5e', '#fb7185', '#be123c', '#fecdd3']
        : ['#f97316', '#f43f5e', '#22d3ee', '#facc15', '#a78bfa', '#4ade80'];

  return Array.from({ length: count }).map((_, idx) => {
    const angle = (Math.PI * 2 * idx) / count + rand(-0.16, 0.16);
    const distance = type === 'firework' ? rand(56, 140) : rand(30, 90);
    return {
      id: `${type}-${idx}-${Date.now()}`,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      rot: rand(-220, 220),
      size: type === 'flower' ? rand(7, 12) : rand(5, 10),
      color: palette[Math.floor(rand(0, palette.length))],
      shape: type === 'flower' ? 'petal' : type === 'firework' ? 'dot' : 'rect',
      duration: rand(540, type === 'firework' ? 980 : 860),
      delay: rand(0, 90),
    };
  });
}

export function InteractionEffects() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const shouldReduceMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    if (shouldReduceMotion) return;

    const pushBurst = (x: number, y: number, type: BurstType) => {
      const id = `${type}-${Date.now()}-${Math.random()}`;
      const burst: Burst = { id, x, y, type, particles: buildParticles(type) };

      setBursts((prev) => [...prev, burst]);
      window.setTimeout(() => {
        setBursts((prev) => prev.filter((item) => item.id !== id));
      }, type === 'firework' ? 1400 : 1000);
    };

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(INTERACTIVE_SELECTOR)) return;
      pushBurst(event.clientX, event.clientY, 'confetti');
    };

    const onFlower = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; y: number }>).detail;
      if (!detail) return;
      pushBurst(detail.x, detail.y, 'flower');
    };

    const onFirework = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; y: number }>).detail;
      if (!detail) return;
      pushBurst(detail.x, detail.y, 'firework');
    };

    document.addEventListener('click', onDocumentClick);
    window.addEventListener('fx:flower', onFlower as EventListener);
    window.addEventListener('fx:firework', onFirework as EventListener);

    return () => {
      document.removeEventListener('click', onDocumentClick);
      window.removeEventListener('fx:flower', onFlower as EventListener);
      window.removeEventListener('fx:firework', onFirework as EventListener);
    };
  }, [shouldReduceMotion]);

  return (
    <div className="fx-layer" aria-hidden="true">
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className={`fx-burst fx-burst--${burst.type}`}
          style={{ left: `${burst.x}px`, top: `${burst.y}px` }}
        >
          {burst.particles.map((particle) => (
            <span
              key={particle.id}
              className={`fx-particle fx-particle--${particle.shape}`}
              style={
                {
                  '--fx-dx': `${particle.dx}px`,
                  '--fx-dy': `${particle.dy}px`,
                  '--fx-rot': `${particle.rot}deg`,
                  '--fx-size': `${particle.size}px`,
                  '--fx-color': particle.color,
                  '--fx-delay': `${particle.delay}ms`,
                  '--fx-duration': `${particle.duration}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

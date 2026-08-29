'use client';

import { useEffect, useRef } from 'react';

interface LivingFabricCanvasProps {
  mood?: 'soft' | 'bold';
  intensity?: number;
}

export default function LivingFabricCanvas({ mood = 'soft', intensity = 1 }: LivingFabricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    let pointer = {
      x: width * 0.5,
      y: height * 0.5,
      targetX: width * 0.5,
      targetY: height * 0.5,
    };

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      pointer.targetX = clientX - rect.left;
      pointer.targetY = clientY - rect.top;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    let t = 0;

    const render = () => {
      t += 0.008 * intensity;
      pointer.x += (pointer.targetX - pointer.x) * 0.05;
      pointer.y += (pointer.targetY - pointer.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Color palettes based on mood
      const isBold = mood === 'bold';
      const numLines = isBold ? 14 : 12;

      // Base gradient wash
      const bgGrad = ctx.createRadialGradient(
        pointer.x,
        pointer.y,
        50,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.85
      );

      if (isBold) {
        bgGrad.addColorStop(0, 'rgba(95, 18, 39, 0.28)');
        bgGrad.addColorStop(0.4, 'rgba(40, 10, 20, 0.18)');
        bgGrad.addColorStop(1, 'rgba(10, 8, 9, 0)');
      } else {
        bgGrad.addColorStop(0, 'rgba(215, 181, 168, 0.35)');
        bgGrad.addColorStop(0.5, 'rgba(235, 222, 212, 0.15)');
        bgGrad.addColorStop(1, 'rgba(241, 237, 228, 0)');
      }

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Living silk ribbons simulation
      for (let i = 0; i < numLines; i++) {
        ctx.beginPath();
        const progress = i / numLines;
        const offsetY = height * (0.15 + progress * 0.7);
        const waveAmp = (40 + Math.sin(t + progress * 3) * 20) * intensity;
        const waveFreq = 0.0022;

        ctx.moveTo(0, offsetY);

        for (let x = 0; x <= width; x += 18) {
          const distToMouse = Math.hypot(x - pointer.x, offsetY - pointer.y);
          const mouseInfluence = Math.max(0, 1 - distToMouse / 380) * 45;
          const y =
            offsetY +
            Math.sin(x * waveFreq + t + progress * 4.5) * waveAmp +
            Math.cos(x * waveFreq * 1.5 - t * 0.7) * (waveAmp * 0.6) +
            Math.sin((offsetY + t * 20) * 0.01) * 15 -
            mouseInfluence * Math.sin(t * 2 + progress);

          ctx.lineTo(x, y);
        }

        ctx.lineWidth = 1 + progress * 1.6;
        if (isBold) {
          const alpha = 0.08 + Math.sin(t + progress * 4) * 0.04;
          ctx.strokeStyle = i % 2 === 0 ? `rgba(215, 181, 168, ${alpha * 1.4})` : `rgba(180, 40, 70, ${alpha * 1.8})`;
        } else {
          const alpha = 0.09 + Math.cos(t + progress * 3) * 0.05;
          ctx.strokeStyle = i % 2 === 0 ? `rgba(95, 18, 39, ${alpha * 1.5})` : `rgba(17, 16, 15, ${alpha})`;
        }

        ctx.stroke();
      }

      // Soft light glimmers
      const glimmerX = width * 0.7 + Math.sin(t * 0.8) * (width * 0.15);
      const glimmerY = height * 0.35 + Math.cos(t * 0.6) * (height * 0.12);
      const glimmer = ctx.createRadialGradient(glimmerX, glimmerY, 0, glimmerX, glimmerY, 180);

      if (isBold) {
        glimmer.addColorStop(0, 'rgba(215, 181, 168, 0.12)');
        glimmer.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        glimmer.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        glimmer.addColorStop(1, 'rgba(241, 237, 228, 0)');
      }

      ctx.fillStyle = glimmer;
      ctx.beginPath();
      ctx.arc(glimmerX, glimmerY, 180, 0, Math.PI * 2);
      ctx.fill();

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
    };
  }, [mood, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="living-fabric-canvas"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}

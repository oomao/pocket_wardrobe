import { useEffect, useRef, useState } from 'react';
import { ClothingAnchors } from '../types';

interface Props {
  imageDataUrl: string;
  initialAnchors: ClothingAnchors;
  leftLabel: string;
  rightLabel: string;
  onChange: (next: ClothingAnchors) => void;
}

type Side = 'left' | 'right';

const DOT_SIZE = 22;

export default function AnchorPicker({
  imageDataUrl,
  initialAnchors,
  leftLabel,
  rightLabel,
  onChange,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [anchors, setAnchors] = useState<ClothingAnchors>(initialAnchors);
  const [dragging, setDragging] = useState<Side | null>(null);

  useEffect(() => {
    setAnchors(initialAnchors);
  }, [initialAnchors]);

  useEffect(() => {
    onChange(anchors);
  }, [anchors, onChange]);

  const updateFromPointer = (side: Side, clientX: number, clientY: number) => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    setAnchors((prev) => ({ ...prev, [side]: { x, y } }));
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      updateFromPointer(dragging, e.clientX, e.clientY);
    };
    const onUp = () => setDragging(null);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging]);

  const startDrag = (side: Side) => (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(side);
  };

  return (
    <div className="space-y-2">
      <div
        ref={wrapperRef}
        className="relative inline-block max-w-full bg-[conic-gradient(at_50%_50%,#f3f4f6_25%,#fff_0_50%,#f3f4f6_0_75%,#fff_0)] bg-[length:16px_16px] border border-gray-300 rounded select-none"
        style={{ touchAction: 'none' }}
      >
        <img
          src={imageDataUrl}
          alt="anchor target"
          className="block max-w-full max-h-[55vh] pointer-events-none"
          draggable={false}
        />
        {/* Connecting line */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <line
            x1={`${anchors.left.x * 100}%`}
            y1={`${anchors.left.y * 100}%`}
            x2={`${anchors.right.x * 100}%`}
            y2={`${anchors.right.y * 100}%`}
            stroke="#a21caf"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
        </svg>
        {(['left', 'right'] as Side[]).map((side) => {
          const a = anchors[side];
          const label = side === 'left' ? leftLabel : rightLabel;
          return (
            <div
              key={side}
              onPointerDown={startDrag(side)}
              className={`absolute flex items-center justify-center rounded-full text-[10px] font-bold text-white shadow-lg cursor-grab active:cursor-grabbing ${
                dragging === side ? 'ring-4 ring-brand-500/40' : ''
              }`}
              style={{
                left: `calc(${a.x * 100}% - ${DOT_SIZE / 2}px)`,
                top: `calc(${a.y * 100}% - ${DOT_SIZE / 2}px)`,
                width: DOT_SIZE,
                height: DOT_SIZE,
                background: side === 'left' ? '#0ea5e9' : '#f97316',
                touchAction: 'none',
              }}
              title={label}
            >
              {side === 'left' ? 'L' : 'R'}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-600">
        拖曳 <span className="inline-block w-3 h-3 rounded-full bg-sky-500 align-middle"></span>{' '}
        到 <strong>{leftLabel}</strong>，{' '}
        <span className="inline-block w-3 h-3 rounded-full bg-orange-500 align-middle"></span>{' '}
        到 <strong>{rightLabel}</strong>。試穿時系統會用這兩點對齊到您的身體。
      </p>
    </div>
  );
}

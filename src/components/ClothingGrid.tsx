import { Clothing } from '../types';

interface Props {
  items: Clothing[];
  onClick?: (c: Clothing) => void;
  onDelete?: (c: Clothing) => void;
  emptyHint?: string;
}

export default function ClothingGrid({ items, onClick, onDelete, emptyHint = '尚未新增衣物' }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-gray-400">
        <span className="text-5xl mb-3">👕</span>
        <p className="text-sm">{emptyHint}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {items.map((c) => (
        <div
          key={c.id}
          className="group relative bg-white rounded-2xl overflow-hidden shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] hover:shadow-[0_8px_24px_-6px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border border-gray-100"
          onClick={() => onClick?.(c)}
        >
          <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-3">
            <img
              src={c.imageBase64}
              alt={c.name}
              loading="lazy"
              className="max-w-full max-h-full object-contain transition-transform duration-200 group-hover:scale-105"
            />
          </div>
          <div className="px-3 py-2 border-t border-gray-50">
            <p className="text-sm font-medium text-gray-800 truncate">{c.name || '未命名'}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{c.category}</p>
          </div>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c);
              }}
              aria-label="刪除"
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 backdrop-blur shadow-md text-rose-500 hover:bg-rose-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center text-xs"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

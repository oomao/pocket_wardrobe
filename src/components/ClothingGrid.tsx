import { Clothing } from '../types';

interface Props {
  items: Clothing[];
  onClick?: (c: Clothing) => void;
  onDelete?: (c: Clothing) => void;
  emptyHint?: string;
}

export default function ClothingGrid({ items, onClick, onDelete, emptyHint = '尚未新增衣物' }: Props) {
  if (items.length === 0) {
    return <p className="text-gray-500 text-sm">{emptyHint}</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {items.map((c) => (
        <div key={c.id} className="relative group bg-white rounded-lg border border-gray-200 p-2 shadow-sm">
          <div
            className="w-full aspect-square bg-[conic-gradient(at_50%_50%,#f3f4f6_25%,#fff_0_50%,#f3f4f6_0_75%,#fff_0)] bg-[length:16px_16px] rounded cursor-pointer"
            onClick={() => onClick?.(c)}
          >
            <img src={c.imageBase64} alt={c.name} className="w-full h-full object-contain" />
          </div>
          <div className="mt-1 text-xs flex justify-between items-center">
            <span className="truncate" title={c.name}>{c.name || '未命名'}</span>
            <span className="text-gray-400">{c.category}</span>
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(c)}
              className="absolute top-1 right-1 hidden group-hover:block bg-red-500 text-white text-xs px-2 py-0.5 rounded"
            >
              刪除
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

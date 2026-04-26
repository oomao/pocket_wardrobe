import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clothing, Outfit } from '../types';
import { deleteOutfit, getAllClothing, getAllOutfits } from '../services/storage';

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [clothes, setClothes] = useState<Map<string, Clothing>>(new Map());

  const reload = async () => {
    const [list, all] = await Promise.all([getAllOutfits(), getAllClothing()]);
    list.sort((a, b) => b.createdAt - a.createdAt);
    setOutfits(list);
    setClothes(new Map(all.map((c) => [c.id, c])));
  };

  useEffect(() => {
    reload();
  }, []);

  const handleDelete = async (o: Outfit) => {
    if (!confirm(`刪除穿搭「${o.name}」?`)) return;
    await deleteOutfit(o.id);
    reload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold">穿搭日誌</h2>
        <span className="text-xs text-gray-400">{outfits.length} 套</span>
      </div>

      {outfits.length === 0 && (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <span className="text-5xl mb-3">📓</span>
          <p className="text-sm">還沒有任何穿搭紀錄。</p>
          <Link to="/tryon" className="mt-4 text-sm text-brand-500 underline">
            到試穿室開始搭配 →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {outfits.map((o) => (
          <OutfitCard key={o.id} outfit={o} clothes={clothes} onDelete={() => handleDelete(o)} />
        ))}
      </div>
    </div>
  );
}

function OutfitCard({
  outfit,
  clothes,
  onDelete,
}: {
  outfit: Outfit;
  clothes: Map<string, Clothing>;
  onDelete: () => void;
}) {
  const items = useMemo(() => {
    return [...outfit.items]
      .sort((a, b) => a.zIndex - b.zIndex)
      .slice(0, 4)
      .map((it) => clothes.get(it.clotheId))
      .filter((c): c is Clothing => !!c);
  }, [outfit.items, clothes]);

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      {/* Polaroid preview area */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
        {items.length === 0 ? (
          <span className="text-gray-300 text-4xl">👗</span>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-4 w-full h-full">
            {items.map((c, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm flex items-center justify-center p-1 overflow-hidden"
              >
                <img src={c.imageBase64} alt={c.name} className="max-w-full max-h-full object-contain" />
              </div>
            ))}
          </div>
        )}
        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur text-[11px] px-2 py-0.5 rounded-full text-gray-600 shadow-sm">
          {outfit.items.length} 件
        </span>
        <button
          onClick={onDelete}
          aria-label="刪除穿搭"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 backdrop-blur shadow-md text-rose-500 hover:bg-rose-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center text-xs"
        >
          ✕
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 truncate">{outfit.name}</h3>
        <p className="text-xs text-gray-400 mt-1">{new Date(outfit.createdAt).toLocaleDateString()}</p>
        <Link
          to={`/tryon/${outfit.id}`}
          className="mt-3 block text-center bg-gray-900 hover:bg-black text-white text-sm py-2 rounded-xl transition-colors"
        >
          一鍵還原
        </Link>
      </div>
    </div>
  );
}

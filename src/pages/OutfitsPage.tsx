import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Outfit } from '../types';
import { deleteOutfit, getAllOutfits } from '../services/storage';

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);

  const reload = async () => {
    const list = await getAllOutfits();
    list.sort((a, b) => b.createdAt - a.createdAt);
    setOutfits(list);
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
      <h2 className="text-2xl font-bold mb-4">穿搭日誌</h2>
      {outfits.length === 0 && <p className="text-gray-500 text-sm">還沒有任何穿搭紀錄。</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {outfits.map((o) => (
          <div key={o.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold">{o.name}</h3>
                <p className="text-xs text-gray-500">
                  {new Date(o.createdAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => handleDelete(o)} className="text-red-500 text-xs">
                刪除
              </button>
            </div>
            <p className="text-xs text-gray-600 mb-3">共 {o.items.length} 件衣物</p>
            <Link
              to={`/tryon/${o.id}`}
              className="block text-center bg-brand-500 hover:bg-brand-600 text-white text-sm py-2 rounded"
            >
              一鍵還原
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

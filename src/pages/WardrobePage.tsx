import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import { Clothing } from '../types';
import { deleteClothing, getAllClothing } from '../services/storage';
import CategoryTabs from '../components/CategoryTabs';
import ClothingGrid from '../components/ClothingGrid';

export default function WardrobePage() {
  const { categories } = useWardrobe();
  const [items, setItems] = useState<Clothing[]>([]);
  const [active, setActive] = useState('全部');
  const [detail, setDetail] = useState<Clothing | null>(null);

  const reload = async () => setItems(await getAllClothing());

  useEffect(() => {
    reload();
  }, []);

  const filtered = active === '全部' ? items : items.filter((i) => i.category === active);

  const handleDelete = async (c: Clothing) => {
    if (!confirm(`確定刪除「${c.name || '未命名'}」?`)) return;
    await deleteClothing(c.id);
    setDetail(null);
    reload();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">我的衣櫥</h2>
        <Link to="/add" className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">
          ➕ 新增衣物
        </Link>
      </div>
      <CategoryTabs categories={categories} active={active} onChange={setActive} />
      <ClothingGrid items={filtered} onClick={setDetail} onDelete={handleDelete} />

      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">{detail.name || '未命名'}</h3>
            <p className="text-sm text-gray-500 mb-3">分類：{detail.category}</p>
            <div className="bg-gray-100 rounded p-2 mb-3">
              <img src={detail.imageBase64} alt={detail.name} className="max-h-64 mx-auto" />
            </div>
            <p className="text-xs text-gray-400 mb-4">
              建立時間：{new Date(detail.createdAt).toLocaleString()}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDetail(null)} className="px-3 py-1.5 rounded border border-gray-300 text-sm">
                關閉
              </button>
              <button
                onClick={() => handleDelete(detail)}
                className="px-3 py-1.5 rounded bg-red-500 text-white text-sm"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

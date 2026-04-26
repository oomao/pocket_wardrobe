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
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setItems(await getAllClothing());
    setLoading(false);
  };

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

  // First-time welcoming state
  if (!loading && items.length === 0) {
    return (
      <div className="max-w-3xl">
        <h2 className="text-3xl font-bold text-walnut-700 mb-1">歡迎來到你的衣櫥</h2>
        <p className="text-sm text-walnut-500/70 mb-8">
          開始上傳你的衣物，建立屬於你的數位衣櫥。所有資料只存在這台裝置的瀏覽器，不會上傳。
        </p>

        <div className="wood-card p-8 text-center">
          <div className="text-6xl mb-3">👕</div>
          <h3 className="text-xl font-semibold text-walnut-700 mb-1">衣櫥還是空的</h3>
          <p className="text-sm text-stone-600 mb-6">先上傳第一件衣物，AI 會自動幫你去背。</p>
          <Link
            to="/add"
            className="inline-block bg-walnut-700 hover:bg-walnut-800 text-cream-50 px-6 py-3 rounded-xl text-sm font-medium shadow-sm"
          >
            ➕ 新增第一件衣物
          </Link>
        </div>

        <div className="mt-8 grid sm:grid-cols-3 gap-3">
          {[
            { icon: '📷', title: '拍 / 上傳', desc: 'AI 自動去背' },
            { icon: '🎨', title: '搭配試穿', desc: '模特兒 / AI / 平拍' },
            { icon: '📔', title: '存進收藏', desc: '記錄你的搭配' },
          ].map((step, i) => (
            <div key={i} className="wood-card p-4">
              <div className="text-2xl mb-1">{step.icon}</div>
              <p className="text-sm font-semibold text-walnut-700">{i + 1}. {step.title}</p>
              <p className="text-xs text-stone-500 mt-0.5">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-3xl font-bold text-walnut-700">衣櫥</h2>
          <p className="text-sm text-walnut-500/70 mt-1">
            {items.length} 件衣物 · {categories.length} 個分類
          </p>
        </div>
        <Link
          to="/add"
          className="bg-walnut-700 hover:bg-walnut-800 text-cream-50 px-4 py-2 rounded-xl text-sm shadow-sm transition-colors"
        >
          ➕ 新增衣物
        </Link>
      </div>

      <CategoryTabs categories={categories} active={active} onChange={setActive} />
      <ClothingGrid items={filtered} onClick={setDetail} onDelete={handleDelete} />

      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDetail(null)}>
          <div className="wood-card bg-white p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2 text-walnut-700">{detail.name || '未命名'}</h3>
            <p className="text-sm text-stone-500 mb-3">分類：{detail.category}</p>
            <div className="bg-cream-50 rounded-lg p-2 mb-3">
              <img src={detail.imageBase64} alt={detail.name} className="max-h-64 mx-auto" />
            </div>
            <p className="text-xs text-stone-400 mb-4">
              建立時間：{new Date(detail.createdAt).toLocaleString()}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDetail(null)} className="px-3 py-1.5 rounded border border-cream-200 text-sm">
                關閉
              </button>
              <button
                onClick={() => handleDelete(detail)}
                className="px-3 py-1.5 rounded bg-rose-500 hover:bg-rose-600 text-white text-sm"
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

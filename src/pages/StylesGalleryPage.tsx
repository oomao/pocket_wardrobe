import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Style } from '../types';
import { deleteStyle, getAllStyles } from '../services/storage';

export default function StylesGalleryPage() {
  const [styles, setStyles] = useState<Style[]>([]);

  const reload = async () => {
    const list = await getAllStyles();
    list.sort((a, b) => b.createdAt - a.createdAt);
    setStyles(list);
  };

  useEffect(() => {
    reload();
  }, []);

  const handleDelete = async (s: Style) => {
    if (!confirm(`刪除造型「${s.name}」?`)) return;
    await deleteStyle(s.id);
    reload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">造型收藏</h2>
          <p className="text-xs text-gray-400 mt-0.5">{styles.length} 套靈感</p>
        </div>
        <Link
          to="/style"
          className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-sm shadow-sm"
        >
          ➕ 新增造型
        </Link>
      </div>

      {styles.length === 0 && (
        <div className="flex flex-col items-center py-20 text-gray-400">
          <span className="text-5xl mb-3">🎨</span>
          <p className="text-sm">還沒有任何造型靈感。</p>
          <Link to="/style" className="mt-4 text-sm text-brand-500 underline">
            開始組第一個 look →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {styles.map((s) => (
          <StyleCard key={s.id} style={s} onDelete={() => handleDelete(s)} />
        ))}
      </div>
    </div>
  );
}

function StyleCard({ style, onDelete }: { style: Style; onDelete: () => void }) {
  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="relative aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {style.thumbnail ? (
          <img src={style.thumbnail} alt={style.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-5xl">🎨</div>
        )}
        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur text-[11px] px-2 py-0.5 rounded-full text-gray-600 shadow-sm">
          {style.items.length} 件
        </span>
        <button
          onClick={onDelete}
          aria-label="刪除造型"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 backdrop-blur shadow-md text-rose-500 hover:bg-rose-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center text-xs"
        >
          ✕
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 truncate">{style.name}</h3>
        <p className="text-xs text-gray-400 mt-1">{new Date(style.createdAt).toLocaleDateString()}</p>
        <Link
          to={`/style/${style.id}`}
          className="mt-3 block text-center bg-gray-900 hover:bg-black text-white text-sm py-2 rounded-xl transition-colors"
        >
          開啟編輯
        </Link>
      </div>
    </div>
  );
}

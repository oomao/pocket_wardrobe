import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import {
  Clothing,
  DEFAULT_OCCASIONS,
  DEFAULT_STYLES,
  Season,
  SEASONS,
  costPerWear,
} from '../types';
import { deleteClothing, getAllClothing } from '../services/storage';
import ClothingGrid from '../components/ClothingGrid';

const CATEGORY_ICONS: Record<string, string> = {
  上衣: '👕',
  外套: '🧥',
  下著: '👖',
  連身: '👗',
  鞋子: '👟',
  配件: '👜',
};

export default function WardrobePage() {
  const { categories } = useWardrobe();
  const [items, setItems] = useState<Clothing[]>([]);
  const [active, setActive] = useState('全部');
  const [detail, setDetail] = useState<Clothing | null>(null);
  const [loading, setLoading] = useState(true);

  const [seasonFilter, setSeasonFilter] = useState<Season[]>([]);
  const [occasionFilter, setOccasionFilter] = useState<string[]>([]);
  const [styleFilter, setStyleFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const reload = async () => {
    setItems(await getAllClothing());
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  // Item count per category for the drawer cards
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of items) m.set(c.category, (m.get(c.category) ?? 0) + 1);
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (active !== '全部' && c.category !== active) return false;
      if (seasonFilter.length && !c.seasons?.some((s) => seasonFilter.includes(s))) return false;
      if (occasionFilter.length && !c.occasions?.some((o) => occasionFilter.includes(o))) return false;
      if (styleFilter.length && !c.styles?.some((s) => styleFilter.includes(s))) return false;
      return true;
    });
  }, [items, active, seasonFilter, occasionFilter, styleFilter]);

  const handleDelete = async (c: Clothing) => {
    if (!confirm(`確定刪除「${c.name || '未命名'}」?`)) return;
    await deleteClothing(c.id);
    setDetail(null);
    reload();
  };

  const toggleSeason = (s: Season) =>
    setSeasonFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleOccasion = (o: string) =>
    setOccasionFilter((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  const toggleStyle = (s: string) =>
    setStyleFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const clearFilters = () => {
    setSeasonFilter([]);
    setOccasionFilter([]);
    setStyleFilter([]);
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
          <p className="text-sm text-stone-600 mb-6">先上傳第一件衣物，去背 / 還原原色都可選用。</p>
          <Link to="/add" className="inline-block bg-walnut-700 hover:bg-walnut-800 text-cream-50 px-6 py-3 rounded-xl text-sm font-medium shadow-sm">
            ➕ 新增第一件衣物
          </Link>
        </div>
        <div className="mt-8 grid sm:grid-cols-3 gap-3">
          {[
            { icon: '📷', title: '拍 / 上傳', desc: '可選 AI 去背 / 還原原色' },
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

  const hasFilters = seasonFilter.length + occasionFilter.length + styleFilter.length > 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
        <div>
          <h2 className="text-3xl font-bold text-walnut-700">衣櫥</h2>
          <p className="text-sm text-walnut-500/70 mt-1">
            {items.length} 件衣物 · 顯示 {filtered.length} 件
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`px-3 py-2 rounded-xl text-sm border ${
              hasFilters || showFilters
                ? 'bg-walnut-700 text-cream-50 border-walnut-700'
                : 'bg-white text-walnut-700 border-cream-200'
            }`}
          >
            🔍 篩選{hasFilters ? `（${seasonFilter.length + occasionFilter.length + styleFilter.length}）` : ''}
          </button>
          <Link to="/add" className="bg-walnut-700 hover:bg-walnut-800 text-cream-50 px-4 py-2 rounded-xl text-sm shadow-sm">
            ➕ 新增衣物
          </Link>
        </div>
      </div>

      {/* Visual category shelves */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-5">
        <button
          onClick={() => setActive('全部')}
          className={`wood-shelf p-3 text-center transition-transform hover:-translate-y-0.5 ${active === '全部' ? 'active' : ''}`}
          aria-label="全部"
        >
          <div className="text-2xl mb-0.5">🧺</div>
          <div className="text-xs font-semibold">全部</div>
          <div className="text-[10px] opacity-70">{items.length} 件</div>
        </button>
        {categories.map((cat) => {
          const n = counts.get(cat) ?? 0;
          return (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`wood-shelf p-3 text-center transition-transform hover:-translate-y-0.5 ${active === cat ? 'active' : ''}`}
              aria-label={cat}
            >
              <div className="text-2xl mb-0.5">{CATEGORY_ICONS[cat] ?? '👚'}</div>
              <div className="text-xs font-semibold">{cat}</div>
              <div className="text-[10px] opacity-70">{n} 件</div>
            </button>
          );
        })}
      </div>

      {showFilters && (
        <div className="wood-card p-4 mb-4 space-y-3">
          <ChipGroup
            label="季節"
            options={SEASONS.map((s) => ({ id: s.id, label: s.label }))}
            selected={seasonFilter}
            onToggle={(id) => toggleSeason(id as Season)}
          />
          <ChipGroup
            label="場合"
            options={DEFAULT_OCCASIONS.map((o) => ({ id: o, label: o }))}
            selected={occasionFilter}
            onToggle={toggleOccasion}
          />
          <ChipGroup
            label="風格"
            options={DEFAULT_STYLES.map((s) => ({ id: s, label: s }))}
            selected={styleFilter}
            onToggle={toggleStyle}
          />
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-stone-500 underline">
              清除所有篩選
            </button>
          )}
        </div>
      )}

      <ClothingGrid items={filtered} onClick={setDetail} onDelete={handleDelete} />

      {detail && <DetailModal item={detail} onClose={() => setDetail(null)} onDelete={() => handleDelete(detail)} />}
    </div>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  selected: T[];
  onToggle: (id: T) => void;
}) {
  return (
    <div>
      <p className="text-xs text-walnut-700 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onToggle(o.id)}
            className={`px-3 py-1 rounded-full text-sm border ${
              selected.includes(o.id)
                ? 'bg-walnut-700 text-cream-50 border-walnut-700'
                : 'bg-white text-walnut-700 border-cream-200'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailModal({
  item,
  onClose,
  onDelete,
}: {
  item: Clothing;
  onClose: () => void;
  onDelete: () => void;
}) {
  const cpw = costPerWear(item);
  const seasonsLabel = (item.seasons ?? [])
    .map((s) => SEASONS.find((x) => x.id === s)?.label)
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="wood-card bg-white p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-2 mb-3">
          {item.color && (
            <span className="inline-block w-5 h-5 rounded-full border border-cream-200 mt-1 shrink-0" style={{ background: item.color }} />
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-walnut-700">{item.name || '未命名'}</h3>
            <p className="text-sm text-stone-500">{item.category}{item.brand ? ` · ${item.brand}` : ''}</p>
          </div>
        </div>

        <div className="bg-cream-50 rounded-lg p-2 mb-4">
          <img src={item.imageBase64} alt={item.name} className="max-h-72 mx-auto" />
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
          {seasonsLabel && (
            <div>
              <dt className="text-xs text-stone-400">適用季節</dt>
              <dd className="text-walnut-700">{seasonsLabel}</dd>
            </div>
          )}
          {(item.occasions?.length ?? 0) > 0 && (
            <div>
              <dt className="text-xs text-stone-400">場合</dt>
              <dd className="text-walnut-700">{item.occasions!.join(' · ')}</dd>
            </div>
          )}
          {(item.styles?.length ?? 0) > 0 && (
            <div>
              <dt className="text-xs text-stone-400">風格</dt>
              <dd className="text-walnut-700">{item.styles!.join(' · ')}</dd>
            </div>
          )}
          {item.price !== undefined && (
            <div>
              <dt className="text-xs text-stone-400">價格</dt>
              <dd className="text-walnut-700">NT$ {item.price.toLocaleString()}</dd>
            </div>
          )}
          {item.purchaseDate && (
            <div>
              <dt className="text-xs text-stone-400">購買日期</dt>
              <dd className="text-walnut-700">{new Date(item.purchaseDate).toLocaleDateString()}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-stone-400">穿著次數</dt>
            <dd className="text-walnut-700">{item.wearCount ?? 0} 次</dd>
          </div>
          {cpw !== null && (
            <div>
              <dt className="text-xs text-stone-400">平均單次成本</dt>
              <dd className="text-walnut-700">NT$ {cpw.toFixed(0)}</dd>
            </div>
          )}
        </dl>

        {item.notes && (
          <div className="mb-4">
            <p className="text-xs text-stone-400">備註</p>
            <p className="text-sm text-walnut-700 whitespace-pre-line">{item.notes}</p>
          </div>
        )}

        <p className="text-xs text-stone-400 mb-4">
          建立時間：{new Date(item.createdAt).toLocaleString()}
        </p>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded border border-cream-200 text-sm">
            關閉
          </button>
          <button onClick={onDelete} className="px-3 py-1.5 rounded bg-rose-500 hover:bg-rose-600 text-white text-sm">
            刪除
          </button>
        </div>
      </div>
    </div>
  );
}

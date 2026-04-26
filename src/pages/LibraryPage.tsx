import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clothing, Outfit, Style } from '../types';
import {
  deleteOutfit,
  deleteStyle,
  getAllClothing,
  getAllOutfits,
  getAllStyles,
} from '../services/storage';

type Tab = 'outfits' | 'styles';

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>('outfits');
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [clothes, setClothes] = useState<Map<string, Clothing>>(new Map());

  const reload = async () => {
    const [o, s, c] = await Promise.all([getAllOutfits(), getAllStyles(), getAllClothing()]);
    o.sort((a, b) => b.createdAt - a.createdAt);
    s.sort((a, b) => b.createdAt - a.createdAt);
    setOutfits(o);
    setStyles(s);
    setClothes(new Map(c.map((x) => [x.id, x])));
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-walnut-700">收藏</h2>
        <p className="text-sm text-walnut-500/70 mt-1">所有儲存的搭配與造型靈感都在這裡。</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-cream-200">
        {[
          { id: 'outfits' as Tab, label: '🪞 模特兒穿搭', count: outfits.length },
          { id: 'styles' as Tab, label: '🪡 平拍造型', count: styles.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-brand-500 text-walnut-700'
                : 'border-transparent text-stone-500 hover:text-walnut-700'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-[11px] text-stone-400">({t.count})</span>
          </button>
        ))}
      </div>

      {tab === 'outfits' ? (
        <OutfitGrid outfits={outfits} clothes={clothes} onDelete={async (o) => {
          if (!confirm(`刪除穿搭「${o.name}」?`)) return;
          await deleteOutfit(o.id);
          reload();
        }} />
      ) : (
        <StyleGrid styles={styles} onDelete={async (s) => {
          if (!confirm(`刪除造型「${s.name}」?`)) return;
          await deleteStyle(s.id);
          reload();
        }} />
      )}
    </div>
  );
}

function OutfitGrid({
  outfits,
  clothes,
  onDelete,
}: {
  outfits: Outfit[];
  clothes: Map<string, Clothing>;
  onDelete: (o: Outfit) => void;
}) {
  if (outfits.length === 0) {
    return (
      <Empty
        icon="🪞"
        text="還沒儲存任何模特兒穿搭"
        actionTo="/tryon"
        actionLabel="到試穿室搭一套 →"
      />
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {outfits.map((o) => {
        const items = [...o.items]
          .sort((a, b) => a.zIndex - b.zIndex)
          .slice(0, 4)
          .map((it) => clothes.get(it.clotheId))
          .filter((c): c is Clothing => !!c);
        return (
          <div
            key={o.id}
            className="group wood-card overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all flex flex-col"
          >
            <div className="relative aspect-[4/3] bg-gradient-to-br from-cream-50 to-cream-100 flex items-center justify-center overflow-hidden">
              {items.length === 0 ? (
                <span className="text-cream-300 text-4xl">👗</span>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-4 w-full h-full">
                  {items.map((c, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm flex items-center justify-center p-1 overflow-hidden">
                      <img src={c.imageBase64} alt={c.name} className="max-w-full max-h-full object-contain" />
                    </div>
                  ))}
                </div>
              )}
              <CardBadge text={`${o.items.length} 件`} />
              <DeleteButton onClick={() => onDelete(o)} />
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-semibold text-walnut-700 truncate">{o.name}</h3>
              <p className="text-xs text-stone-400 mt-1">{new Date(o.createdAt).toLocaleDateString()}</p>
              <Link
                to={`/tryon/${o.id}`}
                className="mt-3 block text-center bg-walnut-700 hover:bg-walnut-800 text-cream-50 text-sm py-2 rounded-lg transition-colors"
              >
                一鍵還原
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StyleGrid({ styles, onDelete }: { styles: Style[]; onDelete: (s: Style) => void }) {
  if (styles.length === 0) {
    return (
      <Empty
        icon="🪡"
        text="還沒儲存任何平拍造型"
        actionTo="/style"
        actionLabel="開始組第一個 look →"
      />
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {styles.map((s) => (
        <div
          key={s.id}
          className="group wood-card overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all flex flex-col"
        >
          <div className="relative aspect-[3/4] bg-gradient-to-br from-cream-50 to-cream-200 overflow-hidden">
            {s.thumbnail ? (
              <img src={s.thumbnail} alt={s.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-cream-300 text-5xl">🎨</div>
            )}
            <CardBadge text={`${s.items.length} 件`} />
            <DeleteButton onClick={() => onDelete(s)} />
          </div>
          <div className="p-4 flex-1 flex flex-col">
            <h3 className="font-semibold text-walnut-700 truncate">{s.name}</h3>
            <p className="text-xs text-stone-400 mt-1">{new Date(s.createdAt).toLocaleDateString()}</p>
            <Link
              to={`/style/${s.id}`}
              className="mt-3 block text-center bg-walnut-700 hover:bg-walnut-800 text-cream-50 text-sm py-2 rounded-lg transition-colors"
            >
              開啟編輯
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function CardBadge({ text }: { text: string }) {
  return (
    <span className="absolute top-2 left-2 bg-white/90 backdrop-blur text-[11px] px-2 py-0.5 rounded-full text-stone-600 shadow-sm">
      {text}
    </span>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="刪除"
      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 backdrop-blur shadow-md text-rose-500 hover:bg-rose-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center text-xs"
    >
      ✕
    </button>
  );
}

function Empty({
  icon,
  text,
  actionTo,
  actionLabel,
}: {
  icon: string;
  text: string;
  actionTo: string;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col items-center py-20 text-stone-400">
      <span className="text-5xl mb-3">{icon}</span>
      <p className="text-sm">{text}</p>
      <Link to={actionTo} className="mt-4 text-sm text-brand-600 underline">
        {actionLabel}
      </Link>
    </div>
  );
}

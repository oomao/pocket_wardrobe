import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clothing, Season, SEASONS } from '../types';
import { getAllClothing, logWearToday, saveStyle } from '../services/storage';

// Slots that make a recognisable outfit. 連身 is a special case — when the
// shuffle picks a 連身 we skip the 上衣 + 下著 slots.
type SlotKey = 'top' | 'bottom' | 'dress' | 'shoes' | 'accessory';
const SLOT_LABEL: Record<SlotKey, string> = {
  top: '上衣 / 外套',
  bottom: '下著',
  dress: '連身',
  shoes: '鞋子',
  accessory: '配件',
};

interface Pick {
  slot: SlotKey;
  item: Clothing | null;
}

function categoryMatchesSlot(slot: SlotKey, category: string): boolean {
  if (slot === 'top') return category === '上衣' || category === '外套';
  if (slot === 'bottom') return category === '下著';
  if (slot === 'dress') return category === '連身';
  if (slot === 'shoes') return category === '鞋子';
  if (slot === 'accessory') return category === '配件';
  return false;
}

function pickRandom<T>(arr: T[]): T | null {
  return arr.length === 0 ? null : arr[Math.floor(Math.random() * arr.length)];
}

export default function ShufflePage() {
  const [all, setAll] = useState<Clothing[]>([]);
  const [seasonFilter, setSeasonFilter] = useState<Season | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getAllClothing().then(setAll);
  }, []);

  const pool = useMemo(
    () => (seasonFilter ? all.filter((c) => !c.seasons || c.seasons.includes(seasonFilter)) : all),
    [all, seasonFilter],
  );

  const shuffleAll = () => {
    const dress = pickRandom(pool.filter((c) => categoryMatchesSlot('dress', c.category)));
    const useDress = dress && Math.random() < 0.3; // 30% chance to use a 連身 if available
    const next: Pick[] = useDress
      ? [
          { slot: 'dress', item: dress },
          { slot: 'shoes', item: pickRandom(pool.filter((c) => categoryMatchesSlot('shoes', c.category))) },
          { slot: 'accessory', item: pickRandom(pool.filter((c) => categoryMatchesSlot('accessory', c.category))) },
        ]
      : [
          { slot: 'top', item: pickRandom(pool.filter((c) => categoryMatchesSlot('top', c.category))) },
          { slot: 'bottom', item: pickRandom(pool.filter((c) => categoryMatchesSlot('bottom', c.category))) },
          { slot: 'shoes', item: pickRandom(pool.filter((c) => categoryMatchesSlot('shoes', c.category))) },
          { slot: 'accessory', item: pickRandom(pool.filter((c) => categoryMatchesSlot('accessory', c.category))) },
        ];
    setPicks(next);
  };

  const reshuffleSlot = (slot: SlotKey) => {
    const candidates = pool.filter((c) => categoryMatchesSlot(slot, c.category));
    setPicks((prev) => prev.map((p) => (p.slot === slot ? { ...p, item: pickRandom(candidates) } : p)));
  };

  const usableItems = picks.filter((p) => p.item).map((p) => p.item!);

  const handleSaveAsStyle = async () => {
    if (usableItems.length === 0) return;
    const name = prompt('幫這套組合取個名字：', `隨機 ${new Date().toLocaleDateString()}`);
    if (!name) return;
    // Lay items out roughly like the StyleComposer's auto-placement does
    const items = usableItems.map((c, idx) => ({
      clotheId: c.id,
      x: 200 + (idx % 2) * 80,
      y: 100 + idx * 90,
      scaleX: 0.5,
      scaleY: 0.5,
      angle: 0,
      zIndex: idx,
    }));
    const saved = await saveStyle({ name, backgroundId: 'studio', items });
    await logWearToday(usableItems.map((c) => c.id), { styleId: saved.id });
    navigate('/library');
  };

  const handleTryOn = async () => {
    if (usableItems.length === 0) return;
    // Persist a temporary "shuffle" to /tryon by stashing in sessionStorage —
    // simpler: just navigate to /tryon, leave actual placement to user. They
    // already have access to wardrobe drawer; we can cue them via toast.
    sessionStorage.setItem('pw_shuffle_pick_ids', JSON.stringify(usableItems.map((c) => c.id)));
    navigate('/tryon');
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-5">
        <h2 className="text-3xl font-bold text-walnut-700">🎲 隨機抽搭</h2>
        <p className="text-sm text-walnut-500/70 mt-1">沒靈感時讓系統幫你抽一套，再決定要試穿或儲存。</p>
      </div>

      {all.length === 0 && (
        <div className="wood-card p-6 text-center">
          <p className="text-sm text-stone-600 mb-3">衣櫥還是空的，先上傳幾件衣物再來抽。</p>
          <Link to="/add" className="bg-walnut-700 text-cream-50 px-4 py-2 rounded text-sm">
            ➕ 新增衣物
          </Link>
        </div>
      )}

      {all.length > 0 && (
        <>
          <div className="wood-card p-4 mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-walnut-700">季節限定：</span>
            <button
              onClick={() => setSeasonFilter(null)}
              className={`px-3 py-1 rounded-full text-xs border ${seasonFilter === null ? 'bg-walnut-700 text-cream-50 border-walnut-700' : 'bg-white border-cream-200 text-walnut-700'}`}
            >
              全部
            </button>
            {SEASONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSeasonFilter(s.id)}
                className={`px-3 py-1 rounded-full text-xs border ${seasonFilter === s.id ? 'bg-walnut-700 text-cream-50 border-walnut-700' : 'bg-white border-cream-200 text-walnut-700'}`}
              >
                {s.label}
              </button>
            ))}
            <button
              onClick={shuffleAll}
              className="ml-auto bg-walnut-700 hover:bg-walnut-800 text-cream-50 px-4 py-2 rounded-lg text-sm"
            >
              🎲 抽一套
            </button>
          </div>

          {picks.length === 0 ? (
            <div className="wood-card p-10 text-center">
              <span className="text-5xl block mb-2">🎲</span>
              <p className="text-sm text-stone-500">點上方「抽一套」開始</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {picks.map((p) => (
                <div key={p.slot} className="wood-card p-3 flex flex-col">
                  <div className="text-xs text-stone-500 mb-1">{SLOT_LABEL[p.slot]}</div>
                  {p.item ? (
                    <>
                      <img src={p.item.imageBase64} alt={p.item.name} className="w-full aspect-square object-contain bg-cream-50 rounded mb-2" />
                      <p className="text-sm text-walnut-700 truncate">{p.item.name || '未命名'}</p>
                    </>
                  ) : (
                    <div className="aspect-square flex items-center justify-center text-stone-300 bg-cream-50 rounded mb-2">
                      無
                    </div>
                  )}
                  <button
                    onClick={() => reshuffleSlot(p.slot)}
                    className="mt-auto text-xs text-walnut-700 underline"
                  >
                    重抽這格
                  </button>
                </div>
              ))}
            </div>
          )}

          {picks.length > 0 && usableItems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button onClick={shuffleAll} className="bg-cream-100 text-walnut-700 px-4 py-2 rounded text-sm">
                🔁 全部重抽
              </button>
              <button onClick={handleSaveAsStyle} className="bg-walnut-700 hover:bg-walnut-800 text-cream-50 px-4 py-2 rounded text-sm">
                💾 存成造型
              </button>
              <button onClick={handleTryOn} className="ml-auto bg-walnut-700 hover:bg-walnut-800 text-cream-50 px-4 py-2 rounded text-sm">
                🪞 拿這組去試穿
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

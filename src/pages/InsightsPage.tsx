import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clothing,
  Outfit,
  Style,
  WearLog,
  costPerWear,
} from '../types';
import {
  getAllClothing,
  getAllOutfits,
  getAllStyles,
  getAllWearLogs,
} from '../services/storage';

type Tab = 'stats' | 'calendar';

export default function InsightsPage() {
  const [tab, setTab] = useState<Tab>('stats');
  const [clothes, setClothes] = useState<Clothing[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [styles, setStyles] = useState<Style[]>([]);
  const [logs, setLogs] = useState<WearLog[]>([]);

  useEffect(() => {
    Promise.all([getAllClothing(), getAllOutfits(), getAllStyles(), getAllWearLogs()])
      .then(([c, o, s, l]) => {
        setClothes(c);
        setOutfits(o);
        setStyles(s);
        setLogs(l);
      });
  }, []);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-3xl font-bold text-walnut-700">數據</h2>
        <p className="text-sm text-walnut-500/70 mt-1">看看你的衣櫥習慣與穿搭軌跡。</p>
      </div>

      <div className="flex gap-2 mb-5 border-b border-cream-200">
        {[
          { id: 'stats' as Tab, label: '📊 統計圖表' },
          { id: 'calendar' as Tab, label: '🗓 穿搭日曆' },
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
          </button>
        ))}
      </div>

      {tab === 'stats' ? (
        <Stats clothes={clothes} outfits={outfits} styles={styles} logs={logs} />
      ) : (
        <Calendar clothes={clothes} logs={logs} />
      )}
    </div>
  );
}

function Stats({
  clothes,
  outfits,
  styles,
  logs,
}: {
  clothes: Clothing[];
  outfits: Outfit[];
  styles: Style[];
  logs: WearLog[];
}) {
  const totalSpent = clothes.reduce((sum, c) => sum + (c.price ?? 0), 0);
  const totalWears = clothes.reduce((sum, c) => sum + (c.wearCount ?? 0), 0);

  // Items by category
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of clothes) m.set(c.category, (m.get(c.category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [clothes]);

  // Top worn / never worn
  const sortedByWear = useMemo(() => [...clothes].sort((a, b) => (b.wearCount ?? 0) - (a.wearCount ?? 0)), [clothes]);
  const topWorn = sortedByWear.slice(0, 5);
  const neverWorn = clothes.filter((c) => !c.wearCount);

  // Cost-per-wear leaderboard
  const cpwSorted = useMemo(() => {
    return clothes
      .map((c) => ({ c, cpw: costPerWear(c) }))
      .filter((x) => x.cpw !== null)
      .sort((a, b) => a.cpw! - b.cpw!) // lowest = best
      .slice(0, 5);
  }, [clothes]);

  // Color distribution by hue bucket (rough)
  const colorBuckets = useMemo(() => {
    const buckets: Record<string, { count: number; sample?: string }> = {
      紅: { count: 0 },
      橙黃: { count: 0 },
      綠: { count: 0 },
      藍: { count: 0 },
      紫粉: { count: 0 },
      黑灰: { count: 0 },
      白米: { count: 0 },
      其他: { count: 0 },
    };
    for (const c of clothes) {
      if (!c.color) continue;
      const bucket = colorBucket(c.color);
      buckets[bucket].count++;
      if (!buckets[bucket].sample) buckets[bucket].sample = c.color;
    }
    return buckets;
  }, [clothes]);

  const maxCat = Math.max(1, ...byCategory.map((b) => b[1]));

  return (
    <div className="space-y-5">
      {/* Top stats row */}
      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="總衣物" value={clothes.length} />
        <Stat label="儲存搭配" value={outfits.length + styles.length} />
        <Stat label="總穿搭次數" value={totalWears} />
        <Stat label="總花費" value={`NT$ ${totalSpent.toLocaleString()}`} />
      </div>

      {/* Category distribution */}
      <section className="wood-card p-5">
        <h3 className="text-base font-semibold text-walnut-700 mb-3">分類分布</h3>
        {byCategory.length === 0 && <p className="text-sm text-stone-500">還沒有衣物。</p>}
        <ul className="space-y-2">
          {byCategory.map(([cat, n]) => (
            <li key={cat} className="flex items-center gap-3 text-sm">
              <span className="w-12 text-walnut-700">{cat}</span>
              <div className="flex-1 h-3 bg-cream-100 rounded overflow-hidden">
                <div className="h-full bg-walnut-700" style={{ width: `${(n / maxCat) * 100}%` }} />
              </div>
              <span className="w-8 text-right text-stone-500">{n}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Color distribution */}
      <section className="wood-card p-5">
        <h3 className="text-base font-semibold text-walnut-700 mb-3">顏色分布</h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {Object.entries(colorBuckets).map(([name, b]) => (
            <div key={name} className="flex flex-col items-center text-xs">
              <span
                className="w-10 h-10 rounded-full border border-cream-200 mb-1"
                style={{ background: b.sample || '#e5e5e5' }}
              />
              <span className="text-walnut-700">{name}</span>
              <span className="text-stone-400">{b.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Most worn */}
      <section className="wood-card p-5">
        <h3 className="text-base font-semibold text-walnut-700 mb-3">最常穿 Top 5</h3>
        {topWorn.every((c) => !c.wearCount) ? (
          <p className="text-sm text-stone-500">還沒有任何穿著紀錄，去 <Link to="/compose" className="underline">搭配</Link> 試穿並儲存吧。</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {topWorn.map((c) => (
              <li key={c.id} className="flex flex-col items-center text-center text-xs">
                <img src={c.imageBase64} alt={c.name} className="w-full aspect-square object-contain bg-cream-50 rounded p-1" />
                <span className="mt-1 text-walnut-700 truncate w-full">{c.name || '未命名'}</span>
                <span className="text-stone-400">{c.wearCount ?? 0} 次</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Cost per wear */}
      {cpwSorted.length > 0 && (
        <section className="wood-card p-5">
          <h3 className="text-base font-semibold text-walnut-700 mb-3">最划算（每次穿的成本最低）</h3>
          <ul className="space-y-1.5 text-sm">
            {cpwSorted.map(({ c, cpw }) => (
              <li key={c.id} className="flex justify-between border-b border-cream-100 pb-1.5">
                <span className="text-walnut-700">{c.name || '未命名'}</span>
                <span className="text-stone-500">NT$ {cpw!.toFixed(0)} / 次（穿 {c.wearCount} 次）</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Never worn */}
      {neverWorn.length > 0 && (
        <section className="wood-card p-5">
          <h3 className="text-base font-semibold text-walnut-700 mb-3">
            從未穿過 <span className="text-xs text-stone-400">({neverWorn.length} 件)</span>
          </h3>
          <p className="text-xs text-stone-500 mb-2">考慮要不要做點什麼：搭配看看 / 整理出去 / 留著等季節。</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {neverWorn.slice(0, 12).map((c) => (
              <div key={c.id} className="flex flex-col items-center text-center text-xs">
                <img src={c.imageBase64} alt={c.name} className="w-full aspect-square object-contain bg-cream-50 rounded p-1" />
                <span className="mt-1 text-walnut-700 truncate w-full">{c.name || '未命名'}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {logs.length > 0 && (
        <p className="text-xs text-stone-400 text-center pt-2">
          共 {logs.length} 筆穿著紀錄
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="wood-card p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-2xl font-bold text-walnut-700 mt-1">{value}</p>
    </div>
  );
}

function colorBucket(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '其他';
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 510;        // 0..1
  const s = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
  if (s < 0.15) {
    if (l < 0.25) return '黑灰';
    if (l > 0.85) return '白米';
    return '黑灰';
  }
  // hue
  let h = 0;
  if (max === r) h = ((g - b) / (max - min)) * 60;
  else if (max === g) h = (2 + (b - r) / (max - min)) * 60;
  else h = (4 + (r - g) / (max - min)) * 60;
  if (h < 0) h += 360;
  if (h < 20 || h >= 330) return '紅';
  if (h < 70) return '橙黃';
  if (h < 170) return '綠';
  if (h < 250) return '藍';
  if (h < 330) return '紫粉';
  return '其他';
}

function Calendar({ clothes, logs }: { clothes: Clothing[]; logs: WearLog[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const clothMap = useMemo(() => new Map(clothes.map((c) => [c.id, c])), [clothes]);
  const logsByDate = useMemo(() => {
    const m = new Map<string, WearLog[]>();
    for (const l of logs) {
      if (!m.has(l.date)) m.set(l.date, []);
      m.get(l.date)!.push(l);
    }
    return m;
  }, [logs]);

  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ date?: string; day?: number }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({});
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ date: ds, day: d });
  }
  while (cells.length % 7 !== 0) cells.push({});

  const goPrev = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
    setSelectedDate(null);
  };
  const goNext = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
    setSelectedDate(null);
  };

  const selectedLogs = selectedDate ? logsByDate.get(selectedDate) ?? [] : [];

  return (
    <div className="space-y-4">
      <div className="wood-card p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={goPrev} className="px-3 py-1 rounded bg-cream-100 text-walnut-700 text-sm">‹ 上個月</button>
          <h3 className="font-semibold text-walnut-700 text-lg">{year} 年 {month + 1} 月</h3>
          <button onClick={goNext} className="px-3 py-1 rounded bg-cream-100 text-walnut-700 text-sm">下個月 ›</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-400 mb-1">
          {['日', '一', '二', '三', '四', '五', '六'].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c.date) return <div key={i} className="aspect-square" />;
            const dayLogs = logsByDate.get(c.date) ?? [];
            const sample = dayLogs[0]?.clotheIds.map((id) => clothMap.get(id)).find((x) => x);
            const isToday = c.date === todayStr();
            const selected = c.date === selectedDate;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(c.date!)}
                className={`aspect-square rounded-md border text-xs flex flex-col p-1 relative transition-colors ${
                  selected
                    ? 'border-brand-500 ring-2 ring-brand-500/30 bg-cream-50'
                    : isToday
                    ? 'border-walnut-500 bg-cream-50'
                    : 'border-cream-200 bg-white hover:border-brand-400'
                }`}
              >
                <span className={`text-left ${isToday ? 'font-bold text-walnut-700' : 'text-stone-600'}`}>{c.day}</span>
                {sample && (
                  <img src={sample.imageBase64} alt="" className="flex-1 min-h-0 object-contain" />
                )}
                {dayLogs.length > 0 && !sample && <span className="text-stone-400">·</span>}
                {dayLogs.length > 1 && (
                  <span className="absolute bottom-0.5 right-1 text-[9px] text-walnut-700">+{dayLogs.length - 1}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="wood-card p-4">
          <h4 className="font-semibold text-walnut-700 mb-2">{selectedDate}</h4>
          {selectedLogs.length === 0 ? (
            <p className="text-sm text-stone-500">這天沒有穿著紀錄。</p>
          ) : (
            <ul className="space-y-3">
              {selectedLogs.map((l) => (
                <li key={l.id}>
                  <div className="flex flex-wrap gap-2">
                    {l.clotheIds.map((id) => {
                      const c = clothMap.get(id);
                      if (!c) return null;
                      return (
                        <div key={id} className="w-16 text-center">
                          <img src={c.imageBase64} alt={c.name} className="w-full aspect-square object-contain bg-cream-50 rounded p-1" />
                          <p className="text-[10px] text-walnut-700 truncate">{c.name || '未命名'}</p>
                        </div>
                      );
                    })}
                  </div>
                  {l.note && <p className="text-xs text-stone-500 mt-1">📝 {l.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

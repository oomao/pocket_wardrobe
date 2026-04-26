import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import {
  CANVAS_BACKGROUNDS,
  Clothing,
  DEFAULT_BACKGROUND_ID,
} from '../types';
import {
  getAllClothing,
  getClothingById,
  getStyleById,
  saveStyle,
  updateStyle,
} from '../services/storage';
import { TryOnController } from '../services/canvasController';
import CategoryTabs from '../components/CategoryTabs';

const ASPECT = 3 / 4;
const MAX_W_DESKTOP = 540;
const MAX_W_MOBILE = 400;

export default function StyleComposerPage() {
  const { categories } = useWardrobe();
  const { styleId } = useParams();
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctrlRef = useRef<TryOnController | null>(null);

  const [clothes, setClothes] = useState<Clothing[]>([]);
  const [active, setActive] = useState('全部');
  const [hasSelection, setHasSelection] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [clothingCount, setClothingCount] = useState(0);
  const [savedId, setSavedId] = useState<string | null>(styleId ?? null);
  const [styleName, setStyleName] = useState('');

  const [bgId, setBgId] = useState<string>(
    () => localStorage.getItem('pw_style_bg') || DEFAULT_BACKGROUND_ID,
  );
  useEffect(() => {
    localStorage.setItem('pw_style_bg', bgId);
  }, [bgId]);
  const bg = CANVAS_BACKGROUNDS.find((b) => b.id === bgId) ?? CANVAS_BACKGROUNDS[0];

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const containerW = entries[0].contentRect.width;
      const isMobile = window.innerWidth < 1024;
      const maxW = isMobile ? MAX_W_MOBILE : MAX_W_DESKTOP;
      const heightCap = window.innerHeight * 0.6;
      const widthFromHeight = heightCap * ASPECT;
      const w = Math.max(240, Math.min(maxW, containerW, widthFromHeight));
      const h = Math.round(w / ASPECT);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || size.w === 0) return;
    const ctrl = new TryOnController(canvasRef.current, size.w, size.h);
    ctrlRef.current = ctrl;
    ctrl.setOnClothingCountChange(setClothingCount);

    const onSelect = () => setHasSelection(!!ctrl.canvas.getActiveObject());
    ctrl.canvas.on('selection:created', onSelect);
    ctrl.canvas.on('selection:updated', onSelect);
    ctrl.canvas.on('selection:cleared', () => setHasSelection(false));

    (async () => {
      const all = await getAllClothing();
      setClothes(all);

      if (styleId) {
        const style = await getStyleById(styleId);
        if (style) {
          setStyleName(style.name);
          setBgId(style.backgroundId);
          await ctrl.restoreState(style.items, getClothingById);
        }
      }
    })();

    return () => {
      ctrl.dispose();
      ctrlRef.current = null;
    };
  }, [styleId, size.w, size.h]);

  const filtered = active === '全部' ? clothes : clothes.filter((c) => c.category === active);

  const addToCanvas = async (c: Clothing) => {
    await ctrlRef.current?.addClothing(c);
    setHasSelection(true);
    setDrawerOpen(false);
  };

  const captureThumbnail = (): string | undefined => {
    try {
      // Compose the bg + canvas into a single thumbnail data URL
      const cnv = ctrlRef.current?.canvas;
      if (!cnv) return undefined;
      const w = cnv.getWidth();
      const h = cnv.getHeight();
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const ctx = out.getContext('2d');
      if (!ctx) return undefined;
      // Background gradient: simple top→bottom linear from gradient endpoints
      // Quick implementation: parse first/last color stops from preset name
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      const m = bg.css.match(/#[0-9a-f]{6}/gi);
      if (m && m.length >= 2) {
        grad.addColorStop(0, m[0]);
        grad.addColorStop(1, m[m.length - 1]);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillRect(0, 0, w, h);
      const fabricEl = (cnv as any).lowerCanvasEl as HTMLCanvasElement;
      ctx.drawImage(fabricEl, 0, 0, w, h);
      return out.toDataURL('image/jpeg', 0.85);
    } catch (err) {
      console.error('snapshot failed', err);
      return undefined;
    }
  };

  const handleSave = async () => {
    if (!ctrlRef.current) return;
    const items = ctrlRef.current.getState();
    if (items.length === 0) {
      alert('畫布上還沒有衣物');
      return;
    }
    const name =
      styleName.trim() ||
      prompt('幫這組造型取個名字：', `造型 ${new Date().toLocaleDateString()}`);
    if (!name) return;
    const thumbnail = captureThumbnail();
    if (savedId) {
      await updateStyle(savedId, { name, backgroundId: bgId, items, thumbnail });
      alert('造型已更新');
    } else {
      const newStyle = await saveStyle({ name, backgroundId: bgId, items, thumbnail });
      setSavedId(newStyle.id);
      alert('造型已儲存');
    }
    navigate('/styles');
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-4">
      <div>
        <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold">🎨 風格搭配</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              自由擺放衣物，組合成一個 look，存成造型收藏。
            </p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden bg-gray-900 text-white px-3 py-1.5 rounded text-sm"
          >
            👕 選衣物
          </button>
        </div>

        <input
          value={styleName}
          onChange={(e) => setStyleName(e.target.value)}
          placeholder="幫造型取個名字（選填，例如：週末咖啡、約會穿搭）"
          className="w-full mb-3 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
        />

        {/* Background picker */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {CANVAS_BACKGROUNDS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBgId(b.id)}
              className={`shrink-0 flex flex-col items-center gap-1 ${
                bgId === b.id ? 'opacity-100' : 'opacity-65 hover:opacity-100'
              }`}
              title={b.label}
            >
              <span
                className={`block w-8 h-8 rounded-full border-2 ${
                  bgId === b.id ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-white shadow'
                }`}
                style={{ background: b.css }}
              />
              <span className="text-[10px] text-gray-500">{b.label}</span>
            </button>
          ))}
        </div>

        <div className="relative inline-block max-w-full">
          <div ref={wrapperRef} className="tryon-frame" style={{ background: bg.css }}>
            <canvas ref={canvasRef} className="block max-w-full" style={{ touchAction: 'none' }} />
          </div>
          {clothingCount === 0 && size.w > 0 && (
            <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none">
              <span className="bg-white/90 backdrop-blur px-4 py-1.5 rounded-full text-xs text-gray-600 shadow-sm border border-gray-200">
                👇 點選右側衣物，自由組合一個 look
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 pb-24 lg:pb-0">
          <button
            disabled={!hasSelection}
            onClick={() => ctrlRef.current?.bringForward()}
            className="px-3 py-1.5 rounded bg-white border border-gray-200 hover:border-brand-500 text-sm disabled:opacity-40 transition-colors"
          >
            ⬆ 上移
          </button>
          <button
            disabled={!hasSelection}
            onClick={() => ctrlRef.current?.sendBackwards()}
            className="px-3 py-1.5 rounded bg-white border border-gray-200 hover:border-brand-500 text-sm disabled:opacity-40 transition-colors"
          >
            ⬇ 下移
          </button>
          <button
            disabled={!hasSelection}
            onClick={() => {
              ctrlRef.current?.removeActive();
              setHasSelection(false);
            }}
            className="px-3 py-1.5 rounded bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm disabled:opacity-40 transition-colors"
          >
            🗑 移除
          </button>
          <button
            onClick={handleSave}
            disabled={clothingCount === 0}
            className="ml-auto px-4 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-sm shadow-sm disabled:bg-gray-300 disabled:shadow-none"
          >
            💾 {savedId ? '更新造型' : '儲存造型'}
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <h3 className="font-semibold mb-2">衣物列表</h3>
        <CategoryTabs categories={categories} active={active} onChange={setActive} />
        <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {filtered.length === 0 && <p className="text-sm text-gray-500 col-span-full">沒有衣物，請先到「新增衣物」上傳。</p>}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => addToCanvas(c)}
              className="bg-white border border-gray-200 rounded-lg p-1.5 hover:border-brand-500 hover:shadow transition-all"
              title={c.name}
            >
              <img src={c.imageBase64} alt={c.name} className="w-full h-24 object-contain" />
              <div className="text-[11px] text-gray-600 truncate mt-1">{c.name || '未命名'}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* Mobile bottom drawer */}
      {drawerOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setDrawerOpen(false)} />
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[75vh] flex flex-col">
            <div className="p-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold">選擇衣物</h3>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-500 text-2xl leading-none px-2">×</button>
            </div>
            <div className="px-3 pt-3">
              <CategoryTabs categories={categories} active={active} onChange={setActive} />
            </div>
            <div className="px-3 pb-4 grid grid-cols-3 sm:grid-cols-4 gap-2 overflow-y-auto">
              {filtered.length === 0 && <p className="text-sm text-gray-500 col-span-full">沒有衣物，請先到「新增衣物」上傳。</p>}
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => addToCanvas(c)}
                  className="bg-white border border-gray-200 rounded p-1 active:border-brand-500"
                  title={c.name}
                >
                  <img src={c.imageBase64} alt={c.name} className="w-full h-20 object-contain" />
                  <div className="text-[11px] text-gray-600 truncate">{c.name || '未命名'}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

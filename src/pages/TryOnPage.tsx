import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import { CANVAS_BACKGROUNDS, Clothing, DEFAULT_BACKGROUND_ID } from '../types';
import {
  getAllClothing,
  getClothingById,
  getOutfitById,
  incrementWearCounts,
  saveOutfit,
} from '../services/storage';
import { TryOnController } from '../services/canvasController';
import { detectPose } from '../services/poseDetection';
import CategoryTabs from '../components/CategoryTabs';

const ASPECT = 3 / 4;
const MAX_W_DESKTOP = 520;
const MAX_W_MOBILE = 400;

export default function TryOnPage() {
  const { profile, categories } = useWardrobe();
  const { outfitId } = useParams();
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctrlRef = useRef<TryOnController | null>(null);

  const [clothes, setClothes] = useState<Clothing[]>([]);
  const [active, setActive] = useState('全部');
  const [hasSelection, setHasSelection] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [poseStatus, setPoseStatus] = useState<'idle' | 'detecting' | 'ready' | 'failed'>('idle');
  const [clothingCount, setClothingCount] = useState(0);
  const [bgId, setBgId] = useState<string>(
    () => localStorage.getItem('pw_canvas_bg') || DEFAULT_BACKGROUND_ID,
  );
  useEffect(() => {
    localStorage.setItem('pw_canvas_bg', bgId);
  }, [bgId]);
  const bg = CANVAS_BACKGROUNDS.find((b) => b.id === bgId) ?? CANVAS_BACKGROUNDS[0];

  useLayoutEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const containerW = entries[0].contentRect.width;
      const isMobile = window.innerWidth < 1024;
      const maxW = isMobile ? MAX_W_MOBILE : MAX_W_DESKTOP;
      // height-bounded so canvas never exceeds 55vh
      const heightCap = window.innerHeight * 0.55;
      const widthFromHeight = heightCap * ASPECT;
      const w = Math.max(240, Math.min(maxW, containerW, widthFromHeight));
      const h = Math.round(w / ASPECT);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(wrapperRef.current);
    const onResize = () => {
      if (wrapperRef.current) ro.unobserve(wrapperRef.current);
      if (wrapperRef.current) ro.observe(wrapperRef.current);
    };
    window.addEventListener('resize', onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
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
      const url = `${import.meta.env.BASE_URL}avatars/${profile.gender}.svg`;
      await ctrl.setAvatar(profile, url);
      const all = await getAllClothing();
      setClothes(all);

      // Detect body landmarks if avatar is a user photo
      if (profile.avatarMode === 'photo' && profile.photoBase64) {
        setPoseStatus('detecting');
        try {
          const lm = await detectPose(profile.photoBase64);
          ctrl.setBodyLandmarks(lm);
          setPoseStatus(lm ? 'ready' : 'failed');
        } catch (err) {
          console.error('pose detect failed', err);
          setPoseStatus('failed');
        }
      } else {
        setPoseStatus('idle');
      }

      if (outfitId) {
        const outfit = await getOutfitById(outfitId);
        if (outfit) await ctrl.restoreState(outfit.items, getClothingById);
      }
    })();

    return () => {
      ctrl.dispose();
      ctrlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.gender, profile.heightCm, profile.weightKg, outfitId, size.w, size.h]);

  const filtered = active === '全部' ? clothes : clothes.filter((c) => c.category === active);

  const addToCanvas = async (c: Clothing) => {
    await ctrlRef.current?.addClothing(c);
    setHasSelection(true);
    setDrawerOpen(false);
  };

  const handleSave = async () => {
    if (!ctrlRef.current) return;
    const items = ctrlRef.current.getState();
    if (items.length === 0) {
      alert('畫布上還沒有衣物');
      return;
    }
    const name = prompt('幫這次穿搭取個名字：', `穿搭 ${new Date().toLocaleDateString()}`);
    if (!name) return;
    await saveOutfit({ name, items });
    await incrementWearCounts(items.map((i) => i.clotheId));
    alert('已儲存到穿搭日誌');
    navigate('/library');
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-4">
      <div>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">試穿室</h2>
            {poseStatus === 'detecting' && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">🤖 偵測身體中…</span>
            )}
            {poseStatus === 'ready' && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">✓ 智慧對齊已啟用</span>
            )}
            {poseStatus === 'failed' && (
              <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded" title="自動對齊失敗，已改用基本定位。請確認照片為全身正面。">⚠ 對齊失敗</span>
            )}
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden bg-brand-500 text-white px-3 py-1.5 rounded text-sm"
          >
            👕 選衣物
          </button>
        </div>

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
                👇 點選右側衣物開始試穿
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 pb-24 lg:pb-0">
          <button
            disabled={!hasSelection}
            onClick={() => ctrlRef.current?.bringForward()}
            className="px-3 py-1.5 rounded bg-white border border-gray-200 hover:border-brand-500 text-sm disabled:opacity-40 transition-colors"
            title="把選中的衣服往上一層"
          >
            ⬆ 上移
          </button>
          <button
            disabled={!hasSelection}
            onClick={() => ctrlRef.current?.sendBackwards()}
            className="px-3 py-1.5 rounded bg-white border border-gray-200 hover:border-brand-500 text-sm disabled:opacity-40 transition-colors"
            title="把選中的衣服往下一層"
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
            className="ml-auto px-4 py-1.5 rounded bg-brand-500 hover:bg-brand-600 text-white text-sm shadow-sm disabled:bg-gray-300 disabled:shadow-none"
          >
            💾 儲存穿搭
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
              className="bg-white border border-gray-200 rounded p-1 hover:border-brand-500"
              title={c.name}
            >
              <img src={c.imageBase64} alt={c.name} className="w-full h-24 object-contain" />
              <div className="text-[11px] text-gray-600 truncate">{c.name || '未命名'}</div>
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

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import { Clothing } from '../types';
import {
  getAllClothing,
  getClothingById,
  getOutfitById,
  saveOutfit,
} from '../services/storage';
import { TryOnController } from '../services/canvasController';
import CategoryTabs from '../components/CategoryTabs';

const ASPECT = 3 / 4; // width / height
const MAX_W = 520;

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

  // measure container width once mounted; observe resize
  useLayoutEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cw = Math.min(MAX_W, entries[0].contentRect.width);
      const w = Math.max(240, cw);
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
    const onSelect = () => setHasSelection(!!ctrl.canvas.getActiveObject());
    ctrl.canvas.on('selection:created', onSelect);
    ctrl.canvas.on('selection:updated', onSelect);
    ctrl.canvas.on('selection:cleared', () => setHasSelection(false));

    (async () => {
      const url = `${import.meta.env.BASE_URL}avatars/${profile.gender}.svg`;
      await ctrl.setAvatar(profile, url);
      const all = await getAllClothing();
      setClothes(all);
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
    alert('已儲存到穿搭日誌');
    navigate('/outfits');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">試穿室</h2>
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div>
          <div ref={wrapperRef} className="bg-white p-2 rounded-lg border border-gray-200 max-w-[520px] mx-auto lg:mx-0">
            <canvas ref={canvasRef} className="block max-w-full" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={!hasSelection}
              onClick={() => ctrlRef.current?.bringForward()}
              className="px-3 py-1.5 rounded bg-gray-100 text-sm disabled:opacity-50"
            >
              ⬆ 上移一層
            </button>
            <button
              disabled={!hasSelection}
              onClick={() => ctrlRef.current?.sendBackwards()}
              className="px-3 py-1.5 rounded bg-gray-100 text-sm disabled:opacity-50"
            >
              ⬇ 下移一層
            </button>
            <button
              disabled={!hasSelection}
              onClick={() => {
                ctrlRef.current?.removeActive();
                setHasSelection(false);
              }}
              className="px-3 py-1.5 rounded bg-red-500 text-white text-sm disabled:opacity-50"
            >
              🗑 從畫布移除
            </button>
            <button
              onClick={handleSave}
              className="ml-auto px-4 py-1.5 rounded bg-brand-500 text-white text-sm"
            >
              💾 儲存穿搭
            </button>
          </div>
        </div>

        <aside>
          <h3 className="font-semibold mb-2">衣物列表</h3>
          <CategoryTabs categories={categories} active={active} onChange={setActive} />
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.length === 0 && <p className="text-sm text-gray-500 col-span-full">沒有衣物，請先到「新增衣物」上傳。</p>}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => addToCanvas(c)}
                className="bg-white border border-gray-200 rounded p-1 hover:border-brand-500"
                title={c.name}
              >
                <img src={c.imageBase64} alt={c.name} className="w-full h-20 lg:h-24 object-contain" />
                <div className="text-[11px] text-gray-600 truncate">{c.name || '未命名'}</div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

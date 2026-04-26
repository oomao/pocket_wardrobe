import { ChangeEvent, ReactNode, RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import {
  blobToDataURL,
  cropTransparent,
  extractDominantColor,
  removeBackground,
} from '../services/imageProcessing';
import { saveClothing } from '../services/storage';
import { EditorCanvas } from '../services/editorCanvas';
import {
  CLEANUP_PRESETS,
  DEFAULT_CLEANUP_PROMPT,
  aiCleanupCanvas,
  aiCleanupViaHFSpace,
  aiCleanupViaPuter,
} from '../services/aiCleanup';
import { loadAIConfig } from '../services/aiTryOn';
import AnchorPicker from '../components/AnchorPicker';
import {
  ANCHORS_USED_BY_CATEGORY,
  ClothingAnchors,
  DEFAULT_OCCASIONS,
  DEFAULT_STYLES,
  Season,
  SEASONS,
  defaultAnchorsForCategory,
} from '../types';

type Step = 'idle' | 'editing' | 'anchors' | 'meta' | 'saving';

function PinchZoomWrapper({
  children,
  zoom,
  zoomTo,
  pannable,
  wrapperRef,
}: {
  children: ReactNode;
  zoom: number;
  /** Sets a new zoom level while keeping the given (focal) wrapper-local point fixed under the pointer. */
  zoomTo: (newZoom: number, focalX?: number, focalY?: number) => void;
  pannable: boolean;
  wrapperRef: RefObject<HTMLDivElement>;
}) {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onDown = (e: PointerEvent) => {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        const pts = [...pointers.current.values()];
        pinchStart.current = {
          dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y),
          zoom,
        };
        panStart.current = null;
      } else if (pointers.current.size === 1 && pannable) {
        panStart.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size >= 2 && pinchStart.current) {
        const pts = [...pointers.current.values()];
        const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const ratio = d / pinchStart.current.dist;
        const next = Math.max(25, Math.min(300, Math.round(pinchStart.current.zoom * ratio)));
        const rect = el.getBoundingClientRect();
        const focalX = (pts[0].x + pts[1].x) / 2 - rect.left;
        const focalY = (pts[0].y + pts[1].y) / 2 - rect.top;
        zoomTo(next, focalX, focalY);
        e.preventDefault();
      } else if (pointers.current.size === 1 && pannable && panStart.current) {
        el.scrollLeft = panStart.current.sl - (e.clientX - panStart.current.x);
        el.scrollTop = panStart.current.st - (e.clientY - panStart.current.y);
        e.preventDefault();
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinchStart.current = null;
      if (pointers.current.size === 0) panStart.current = null;
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const next = Math.max(25, Math.min(300, Math.round(zoom * (e.deltaY < 0 ? 1.1 : 0.9))));
      const rect = el.getBoundingClientRect();
      zoomTo(next, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove, { passive: false });
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, [zoom, zoomTo, pannable, wrapperRef]);

  return (
    <div
      ref={wrapperRef}
      className="canvas-wrapper overflow-auto bg-[conic-gradient(at_50%_50%,#f3f4f6_25%,#fff_0_50%,#f3f4f6_0_75%,#fff_0)] bg-[length:16px_16px]"
      style={{ maxHeight: '55vh', touchAction: 'none' }}
    >
      {children}
    </div>
  );
}

function anchorLabels(category: string) {
  if (category === '下著') return { left: '左腰（圖片左側）', right: '右腰（圖片右側）' };
  if (category === '鞋子') return { left: '左鞋上緣（圖片左側）', right: '右鞋上緣（圖片右側）' };
  return { left: '左肩（圖片左側）', right: '右肩（圖片右側）' };
}

export default function AddClothingPage() {
  const { categories } = useWardrobe();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const editorRef = useRef<EditorCanvas | null>(null);

  const [step, setStep] = useState<Step>('idle');
  const [progress, setProgress] = useState<{ key: string; current: number; total: number } | null>(null);

  // basic meta
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] ?? '');

  // editor state
  const [eraserOn, setEraserOn] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [zoom, setZoom] = useState(100);
  const [canUndo, setCanUndo] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(100);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Zoom that keeps the focal point (default = wrapper centre) fixed under
  // the user's pointer instead of always anchoring to the top-left corner.
  const zoomTo = useCallback((newZoom: number, focalX?: number, focalY?: number) => {
    const el = wrapperRef.current;
    const prev = zoomRef.current;
    if (!el || prev <= 0) {
      setZoom(newZoom);
      return;
    }
    const rect = el.getBoundingClientRect();
    const fx = focalX ?? rect.width / 2;
    const fy = focalY ?? rect.height / 2;
    const contentX = el.scrollLeft + fx;
    const contentY = el.scrollTop + fy;
    const ratio = newZoom / prev;
    setZoom(newZoom);
    requestAnimationFrame(() => {
      el.scrollLeft = contentX * ratio - fx;
      el.scrollTop = contentY * ratio - fy;
    });
  }, []);

  // pipeline state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [bgBusy, setBgBusy] = useState(false);
  const [cleanupBusy, setCleanupBusy] = useState<null | string>(null);
  // Default to Puter — most reliable at producing an actual cleaned image
  // out-of-box (when Puter quota isn't exhausted). OOT/IDM are listed first
  // in the picker for users who want anonymous-only and are willing to
  // experiment, but we don't make them the default.
  const [cleanupModelId, setCleanupModelId] = useState<string>(
    () => localStorage.getItem('pw_cleanup_model') || 'puter',
  );
  useEffect(() => {
    localStorage.setItem('pw_cleanup_model', cleanupModelId);
  }, [cleanupModelId]);
  const [showCleanupPicker, setShowCleanupPicker] = useState(false);
  const [cleanupPrompt, setCleanupPrompt] = useState<string>(
    () => localStorage.getItem('pw_cleanup_prompt') || DEFAULT_CLEANUP_PROMPT,
  );
  useEffect(() => {
    localStorage.setItem('pw_cleanup_prompt', cleanupPrompt);
  }, [cleanupPrompt]);

  type CleanupOption = {
    id: string;
    label: string;
    icon: string;
    description: string;
    needsToken?: boolean;
    experimental?: boolean;
  };
  // Order: anonymous-OK first (experimental but free + zero-setup),
  // then Puter (free with daily quota), then ZeroGPU options needing token.
  const cleanupOptions: CleanupOption[] = [
    ...CLEANUP_PRESETS.filter((p) => p.experimental).map((p) => ({
      id: p.id,
      label: p.label,
      icon: '🧪',
      description: p.description,
      experimental: p.experimental,
    })),
    {
      id: 'puter',
      label: 'Google Nano Banana (Puter)',
      icon: '🍌',
      description: 'Puter 代理 Gemini 影像模型。免費但每日有限額（10–20 次後 rate-limit）。首次需登入 Puter 帳號。',
    },
    ...CLEANUP_PRESETS.filter((p) => p.needsToken).map((p) => ({
      id: p.id,
      label: p.label,
      icon: '🔒',
      description: p.description,
      needsToken: p.needsToken,
    })),
  ];
  const currentCleanupOption = cleanupOptions.find((o) => o.id === cleanupModelId) ?? cleanupOptions[0];
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // anchors
  const [editedDataUrl, setEditedDataUrl] = useState<string | null>(null);
  const [anchors, setAnchors] = useState<ClothingAnchors>(defaultAnchorsForCategory('上衣'));

  // rich attributes (first-wave)
  const [color, setColor] = useState<string>('#8b5a2b');
  const [brand, setBrand] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [styles, setStyles] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!category && categories.length) setCategory(categories[0]);
  }, [categories, category]);

  useEffect(() => {
    return () => editorRef.current?.dispose();
  }, []);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg(null);
    setBgRemoved(false);
    setStatusMsg(null);
    try {
      const dataUrl = await blobToDataURL(file);
      if (!canvasRef.current) return;
      const ed = new EditorCanvas(canvasRef.current);
      ed.setOnChange(() => setCanUndo(ed.canUndo()));
      editorRef.current = ed;
      await ed.loadImage(dataUrl);
      ed.setBrushSize(brushSize);
      setZoom(100);
      setStep('editing');
    } catch (err) {
      console.error(err);
      setErrorMsg('載入圖片失敗，請改用其他檔案再試。');
    }
  };

  const runBgRemoval = async () => {
    const ed = editorRef.current;
    if (!ed) return;
    setBgBusy(true);
    setProgress(null);
    setStatusMsg('AI 去背中…');
    setErrorMsg(null);
    try {
      const current = ed.exportDataURL();
      const blob = await fetch(current).then((r) => r.blob());
      const removed = await removeBackground(blob, (key, currentP, total) =>
        setProgress({ key, current: currentP, total }),
      );
      let next = await blobToDataURL(removed);
      next = await cropTransparent(next, 12);
      await ed.replaceImage(next);
      setCanUndo(false);
      setBgRemoved(true);
      setStatusMsg('AI 去背完成 ✅');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`去背失敗：${err?.message || String(err)}`);
      setStatusMsg(null);
    } finally {
      setBgBusy(false);
    }
  };

  const runCleanup = async (kind: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    setCleanupBusy(kind);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const current = ed.exportDataURL();
      let next: string;
      let isAI = false;
      if (kind === 'canvas') {
        next = await aiCleanupCanvas(current);
      } else if (kind === 'puter') {
        next = await aiCleanupViaPuter(current, (m) => setStatusMsg(m), cleanupPrompt);
        isAI = true;
      } else {
        // HF Space preset id — reuse the same HF token the AI 試穿頁存了
        const preset = CLEANUP_PRESETS.find((p) => p.id === kind);
        if (!preset) throw new Error(`未知的清理選項：${kind}`);
        const hfToken = loadAIConfig().hfToken;
        if (preset.needsToken && !hfToken) {
          throw new Error(
            `${preset.label} 需要 HuggingFace Token。請先到「✨ AI 試穿」頁面右上「⚙️ 模型」chip 貼上 token，再回來重試（同一個 token 兩個地方共用）。`,
          );
        }
        next = await aiCleanupViaHFSpace(
          current,
          preset.preset,
          (m) => setStatusMsg(m),
          hfToken,
          cleanupPrompt,
        );
        isAI = true;
      }

      if (isAI) {
        setStatusMsg('AI 完成，重新去背中…');
        const blob = await fetch(next).then((r) => r.blob());
        const cleaned = await removeBackground(blob);
        next = await blobToDataURL(cleaned);
        next = await cropTransparent(next, 12);
        setBgRemoved(true);
      }
      await ed.replaceImage(next);
      setCanUndo(false);
      setStatusMsg(isAI ? 'AI 還原完成 ✅' : '自動調色完成 ✅');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`處理失敗：${err?.message || String(err)}`);
      setStatusMsg(null);
    } finally {
      setCleanupBusy(null);
    }
  };

  const toggleEraser = () => {
    const next = !eraserOn;
    setEraserOn(next);
    editorRef.current?.enableEraser(next);
  };
  const onBrushChange = (n: number) => {
    setBrushSize(n);
    editorRef.current?.setBrushSize(n);
  };
  const handleUndo = () => editorRef.current?.undo();

  const goToAnchorStep = async () => {
    if (!editorRef.current) return;
    const raw = editorRef.current.exportDataURL();
    const dataUrl = bgRemoved ? await cropTransparent(raw, 12) : raw;
    setEditedDataUrl(dataUrl);
    setAnchors(defaultAnchorsForCategory(category));
    // Auto extract dominant colour for the picker
    try {
      const c = await extractDominantColor(dataUrl);
      setColor(c);
    } catch {
      /* ignore */
    }
    if (ANCHORS_USED_BY_CATEGORY[category]) setStep('anchors');
    else setStep('meta');
  };

  const toggleSeason = (s: Season) =>
    setSeasons((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleOccasion = (o: string) =>
    setOccasions((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));
  const toggleStyle = (s: string) =>
    setStyles((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const handleSave = async () => {
    if (!editedDataUrl) return;
    if (!category) return alert('請選擇分類');
    setStep('saving');
    await saveClothing({
      name: name.trim(),
      imageBase64: editedDataUrl,
      category,
      anchors: ANCHORS_USED_BY_CATEGORY[category] ? anchors : undefined,
      color,
      brand: brand.trim() || undefined,
      seasons: seasons.length ? seasons : undefined,
      occasions: occasions.length ? occasions : undefined,
      styles: styles.length ? styles : undefined,
      price: price ? Number(price) : undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate).getTime() : undefined,
      notes: notes.trim() || undefined,
      wearCount: 0,
    });
    navigate('/');
  };

  const labels = anchorLabels(category);
  const editorBusy = bgBusy || cleanupBusy !== null;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-3xl font-bold text-walnut-700">新增衣物</h2>
        <p className="text-sm text-walnut-500/70 mt-1">
          上傳照片 → 編輯（去背 / 還原原色 / 微調，皆為選用）→ 標對齊點 → 命名儲存
        </p>
      </div>

      {/* Step indicator */}
      {step !== 'idle' && (
        <ol className="flex flex-wrap gap-2 mb-4 text-xs">
          {[
            { k: 'editing', label: '1. 處理圖片' },
            { k: 'anchors', label: '2. 對齊點' },
            { k: 'meta', label: '3. 命名儲存' },
          ].map((s) => (
            <li
              key={s.k}
              className={`px-3 py-1 rounded-full ${
                step === s.k
                  ? 'bg-walnut-700 text-cream-50 shadow-sm'
                  : 'bg-cream-100 text-stone-500'
              }`}
            >
              {s.label}
            </li>
          ))}
        </ol>
      )}

      {step === 'idle' && (
        <div className="wood-card p-6">
          <p className="text-sm text-stone-600 mb-4">
            選一張衣服照片開始。<strong>去背 / AI 還原原色 / 自動調色</strong> 都是進到編輯後可選用的工具，預設不會自動跑。
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-cream-200 rounded-lg cursor-pointer hover:border-brand-400 hover:bg-cream-50 transition">
              <span className="text-4xl">📷</span>
              <span className="font-medium text-walnut-700">拍照</span>
              <span className="text-xs text-stone-500">使用手機 / 裝置相機拍攝</span>
              <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
            </label>
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-cream-200 rounded-lg cursor-pointer hover:border-brand-400 hover:bg-cream-50 transition">
              <span className="text-4xl">🖼️</span>
              <span className="font-medium text-walnut-700">從相簿 / 檔案上傳</span>
              <span className="text-xs text-stone-500">選擇已存在的圖片檔</span>
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
          </div>
          {errorMsg && <p className="text-rose-600 text-sm mt-3">{errorMsg}</p>}
        </div>
      )}

      {/* Step 1: editor */}
      <div className={step === 'editing' ? 'block' : 'hidden'}>
        {/* Pipeline buttons (all opt-in) */}
        <div className="wood-card p-3 mb-3 space-y-2">
          <p className="text-xs text-stone-500">圖片處理（可任意組合 / 跳過）：</p>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={runBgRemoval}
              disabled={editorBusy}
              className={`px-3 py-1.5 rounded text-xs disabled:opacity-50 ${
                bgRemoved ? 'bg-emerald-100 text-emerald-700' : 'bg-walnut-700 text-cream-50 hover:bg-walnut-800'
              }`}
              title="呼叫 imgly 去背模型（首次 ~24MB）。"
            >
              {bgBusy ? '處理中…' : bgRemoved ? '✓ 已去背' : '🪄 AI 去背'}
            </button>

            {/* AI cleanup — model chip + action button (mirrors AI 試穿 UX) */}
            <button
              onClick={() => runCleanup(cleanupModelId)}
              disabled={editorBusy}
              className="px-3 py-1.5 rounded bg-walnut-700 hover:bg-walnut-800 text-cream-50 text-xs disabled:opacity-50"
              title={`使用 ${currentCleanupOption.label} 重繪商品圖`}
            >
              {cleanupBusy && cleanupBusy !== 'canvas' ? '處理中…' : '✨ AI 還原原色'}
            </button>
            <button
              onClick={() => setShowCleanupPicker(true)}
              disabled={editorBusy}
              className="px-2.5 py-1.5 rounded bg-cream-100 text-walnut-700 text-xs hover:bg-cream-200 inline-flex items-center gap-1"
              title="切換 AI 還原使用的模型"
            >
              <span>{currentCleanupOption.icon}</span>
              <span className="hidden sm:inline">{currentCleanupOption.label.replace(/ \(.*\)$/, '')}</span>
              <span className="text-[10px]">▾</span>
            </button>

            <button
              onClick={() => runCleanup('canvas')}
              disabled={editorBusy}
              className="px-3 py-1.5 rounded bg-white border border-cream-200 hover:border-brand-400 text-xs disabled:opacity-50"
              title="本機微調白平衡 + 對比 / 飽和度。瞬間完成。"
            >
              {cleanupBusy === 'canvas' ? '處理中…' : '🎨 本機調色'}
            </button>
            {statusMsg && <span className="text-xs text-emerald-600">{statusMsg}</span>}
          </div>
          {progress && bgBusy && (
            <div className="h-1.5 bg-cream-100 rounded overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="wood-card p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center mb-3">
            <button
              onClick={toggleEraser}
              disabled={editorBusy}
              className={`px-3 py-1.5 rounded text-sm ${
                eraserOn ? 'bg-walnut-700 text-cream-50' : 'bg-cream-100 text-walnut-700'
              }`}
            >
              {eraserOn ? '✓ 橡皮擦啟用中' : '🧽 啟用橡皮擦'}
            </button>
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="px-3 py-1.5 rounded bg-cream-100 text-walnut-700 text-sm disabled:opacity-40"
            >
              ↶ 復原
            </button>
            <label className="flex items-center gap-2 text-sm">
              筆刷
              <input type="range" min={4} max={120} value={brushSize} onChange={(e) => onBrushChange(Number(e.target.value))} className="w-24 sm:w-32" />
              <span className="text-stone-500 w-8 text-right">{brushSize}</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              縮放
              <input
                type="range"
                min={25}
                max={300}
                step={5}
                value={zoom}
                onChange={(e) => zoomTo(Number(e.target.value))}
                className="w-24 sm:w-32"
              />
              <span className="text-stone-500 w-12 text-right">{zoom}%</span>
            </label>
          </div>

          <PinchZoomWrapper zoom={zoom} zoomTo={zoomTo} pannable={!eraserOn} wrapperRef={wrapperRef}>
            <canvas ref={canvasRef} style={{ display: 'block', width: `${zoom}%`, height: 'auto', maxWidth: 'none' }} />
          </PinchZoomWrapper>
          <p className="text-xs text-stone-400 mt-2">
            💡 雙指 / Ctrl+滾輪縮放；單指（橡皮擦關閉時）平移。
          </p>
        </div>

        <div className="flex justify-end mb-8 gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-cream-200 rounded px-3 py-1.5 text-sm">
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button onClick={goToAnchorStep} disabled={editorBusy} className="bg-walnut-700 hover:bg-walnut-800 text-cream-50 px-4 py-2 rounded text-sm disabled:opacity-50">
            下一步 →
          </button>
        </div>

        {errorMsg && <p className="text-rose-600 text-sm">{errorMsg}</p>}
      </div>

      {/* Step 2: anchors */}
      {step === 'anchors' && editedDataUrl && (
        <div className="wood-card p-4 mb-4">
          <p className="text-sm text-walnut-700 mb-3">
            將兩個圓點分別拖到衣物的 <strong>{labels.left}</strong> 與 <strong>{labels.right}</strong>。試穿時系統會把這條對齊線旋轉、縮放，貼合您身體上對應的位置。
          </p>
          <AnchorPicker imageDataUrl={editedDataUrl} anchors={anchors} leftLabel={labels.left} rightLabel={labels.right} onChange={setAnchors} />
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep('editing')} className="text-sm text-stone-500">
              ← 回去編輯
            </button>
            <button onClick={() => setStep('meta')} className="bg-walnut-700 hover:bg-walnut-800 text-cream-50 px-4 py-2 rounded text-sm">
              下一步 →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: meta + save */}
      {(step === 'meta' || step === 'saving') && editedDataUrl && (
        <div className="grid lg:grid-cols-[260px_1fr] gap-4">
          <div className="wood-card p-3">
            <p className="text-xs text-stone-500 mb-2">預覽</p>
            <img src={editedDataUrl} alt="" className="w-full max-h-72 object-contain bg-cream-50 rounded" />
            <button
              onClick={() => setStep(ANCHORS_USED_BY_CATEGORY[category] ? 'anchors' : 'editing')}
              className="mt-3 text-xs text-stone-500 underline"
            >
              ← 返回上一步
            </button>
          </div>

          <div className="wood-card p-5 space-y-4">
            {/* Basic */}
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm text-walnut-700">
                衣物名稱（選填）
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 border border-cream-200 rounded px-2 py-1.5 bg-white" placeholder="例如：白色素T" />
              </label>
              <label className="text-sm text-walnut-700">
                分類（必填）
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1 border border-cream-200 rounded px-2 py-1.5 bg-white">
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>

            {/* Color + Brand */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-walnut-700 mb-1">主色</p>
                <div className="flex items-center gap-2">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-14 rounded cursor-pointer border border-cream-200" />
                  <input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 border border-cream-200 rounded px-2 py-1.5 text-sm font-mono bg-white" />
                  <button
                    onClick={async () => {
                      try {
                        const c = await extractDominantColor(editedDataUrl);
                        setColor(c);
                      } catch {/* */}
                    }}
                    className="px-2 py-1.5 rounded bg-cream-100 text-walnut-700 text-xs whitespace-nowrap"
                    title="從圖片自動偵測主色"
                  >
                    🪄 自動偵測
                  </button>
                </div>
              </div>
              <label className="text-sm text-walnut-700">
                品牌（選填）
                <input value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full mt-1 border border-cream-200 rounded px-2 py-1.5 bg-white" placeholder="例如：Uniqlo" />
              </label>
            </div>

            {/* Seasons */}
            <div>
              <p className="text-sm text-walnut-700 mb-1.5">適用季節</p>
              <div className="flex flex-wrap gap-2">
                {SEASONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleSeason(s.id)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      seasons.includes(s.id)
                        ? 'bg-walnut-700 text-cream-50 border-walnut-700'
                        : 'bg-white text-walnut-700 border-cream-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Occasions */}
            <div>
              <p className="text-sm text-walnut-700 mb-1.5">場合</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_OCCASIONS.map((o) => (
                  <button
                    key={o}
                    onClick={() => toggleOccasion(o)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      occasions.includes(o)
                        ? 'bg-walnut-700 text-cream-50 border-walnut-700'
                        : 'bg-white text-walnut-700 border-cream-200'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            {/* Styles */}
            <div>
              <p className="text-sm text-walnut-700 mb-1.5">風格</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_STYLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleStyle(s)}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      styles.includes(s)
                        ? 'bg-walnut-700 text-cream-50 border-walnut-700'
                        : 'bg-white text-walnut-700 border-cream-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Price + purchase date */}
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm text-walnut-700">
                價格（NTD，選填）
                <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full mt-1 border border-cream-200 rounded px-2 py-1.5 bg-white" placeholder="例如：590" />
                <span className="text-[11px] text-stone-400">填了之後可看「平均單次穿著成本」</span>
              </label>
              <label className="text-sm text-walnut-700">
                購買日期（選填）
                <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-full mt-1 border border-cream-200 rounded px-2 py-1.5 bg-white" />
              </label>
            </div>

            {/* Notes */}
            <label className="text-sm text-walnut-700 block">
              備註（選填）
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full mt-1 border border-cream-200 rounded px-2 py-1.5 bg-white" rows={2} placeholder="任何要記下來的事，例如剪標 / 打折買、配什麼好看..." />
            </label>

            <button
              onClick={handleSave}
              disabled={step === 'saving'}
              className="w-full bg-walnut-700 hover:bg-walnut-800 disabled:bg-stone-300 text-cream-50 py-2.5 rounded-lg font-medium"
            >
              {step === 'saving' ? '儲存中…' : '儲存到衣櫥'}
            </button>
          </div>
        </div>
      )}

      {/* Cleanup model picker modal */}
      {showCleanupPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="wood-card max-w-lg w-full p-5 space-y-4 bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-walnut-700">✨ AI 還原原色 — 選擇模型</h3>
                <p className="text-xs text-stone-500 mt-1">
                  把衣物照重繪成商品圖等級的乾淨平拍。完成後會自動再去背一次。
                </p>
              </div>
              <button
                onClick={() => setShowCleanupPicker(false)}
                className="text-2xl leading-none text-stone-400 hover:text-walnut-700"
                aria-label="關閉"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {cleanupOptions.map((o) => {
                const isSelected = cleanupModelId === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => {
                      setCleanupModelId(o.id);
                      setShowCleanupPicker(false);
                    }}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-walnut-700 bg-cream-50 ring-2 ring-walnut-700/30'
                        : 'border-cream-200 bg-white hover:border-brand-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-walnut-700">
                          {o.icon} {o.label}
                        </p>
                        <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{o.description}</p>
                      </div>
                      {o.experimental && (
                        <span className="shrink-0 text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                          匿名 / 實驗性
                        </span>
                      )}
                      {o.needsToken && (
                        <span className="shrink-0 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          需 Token
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              💡 標 🧪 的兩個 try-on 模型匿名可用、無須 token，但我們把它們「拿去 cleanup 用」是非典型用法（把衣物同時當 person + garment 送），效果視衣物而定。
              標 🔒 的需 HF Token（兩處共用，於 AI 試穿頁面設定）。
              不想設定的話用「🎨 本機調色」按鈕。
            </p>

            <details>
              <summary className="text-xs text-stone-500 cursor-pointer">✏️ 自訂 prompt（進階，僅 Puter / Qwen / FLUX 採用）</summary>
              <div className="mt-2 space-y-2">
                <p className="text-[10px] text-stone-500">
                  OOT / IDM 是 try-on 模型沒有 prompt 入口（送出時忽略此欄位）。
                  Puter / Qwen / FLUX 才會用這個 prompt 來重繪你的衣物。
                </p>
                <textarea
                  value={cleanupPrompt}
                  onChange={(e) => setCleanupPrompt(e.target.value)}
                  rows={6}
                  className="w-full border border-cream-200 rounded px-2 py-1.5 text-[11px] font-mono bg-white"
                />
                <button
                  onClick={() => setCleanupPrompt(DEFAULT_CLEANUP_PROMPT)}
                  className="text-[11px] text-walnut-700 underline"
                >
                  回復預設 prompt
                </button>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

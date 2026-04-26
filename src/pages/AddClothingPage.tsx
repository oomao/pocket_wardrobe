import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import { blobToDataURL, removeBackground } from '../services/imageProcessing';
import { saveClothing } from '../services/storage';
import { EditorCanvas } from '../services/editorCanvas';
import AnchorPicker from '../components/AnchorPicker';
import {
  ANCHORS_USED_BY_CATEGORY,
  ClothingAnchors,
  defaultAnchorsForCategory,
} from '../types';

type Step = 'idle' | 'removing' | 'editing' | 'anchors' | 'meta' | 'saving';

function anchorLabels(category: string) {
  if (category === '下著') return { left: '左腰側', right: '右腰側' };
  if (category === '鞋子') return { left: '左鞋上緣', right: '右鞋上緣' };
  return { left: '左肩', right: '右肩' };
}

export default function AddClothingPage() {
  const { categories } = useWardrobe();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const editorRef = useRef<EditorCanvas | null>(null);

  const [step, setStep] = useState<Step>('idle');
  const [progress, setProgress] = useState<{ key: string; current: number; total: number } | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0] ?? '');
  const [eraserOn, setEraserOn] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [zoom, setZoom] = useState(100);
  const [canUndo, setCanUndo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editedDataUrl, setEditedDataUrl] = useState<string | null>(null);
  const [anchors, setAnchors] = useState<ClothingAnchors>(defaultAnchorsForCategory('上衣'));

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
    setStep('removing');
    setProgress(null);
    try {
      const blob = await removeBackground(file, (key, current, total) =>
        setProgress({ key, current, total }),
      );
      const dataUrl = await blobToDataURL(blob);
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
      setErrorMsg('去背失敗，請改用其他圖片再試。');
      setStep('idle');
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

  const goToAnchorStep = () => {
    if (!editorRef.current) return;
    const dataUrl = editorRef.current.exportDataURL();
    setEditedDataUrl(dataUrl);
    setAnchors(defaultAnchorsForCategory(category));
    if (ANCHORS_USED_BY_CATEGORY[category]) {
      setStep('anchors');
    } else {
      setStep('meta');
    }
  };

  const handleSave = async () => {
    if (!editedDataUrl) return;
    if (!category) return alert('請選擇分類');
    setStep('saving');
    await saveClothing({
      name: name.trim(),
      imageBase64: editedDataUrl,
      category,
      anchors: ANCHORS_USED_BY_CATEGORY[category] ? anchors : undefined,
    });
    navigate('/');
  };

  const labels = anchorLabels(category);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">新增衣物</h2>

      {/* Step indicator */}
      {step !== 'idle' && step !== 'removing' && (
        <ol className="flex flex-wrap gap-2 mb-4 text-xs">
          {[
            { k: 'editing', label: '1. 微調' },
            { k: 'anchors', label: '2. 對齊點' },
            { k: 'meta', label: '3. 命名儲存' },
          ].map((s) => (
            <li
              key={s.k}
              className={`px-2 py-1 rounded ${
                step === s.k ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {s.label}
            </li>
          ))}
        </ol>
      )}

      {step === 'idle' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-4">
            請選擇一張衣服照片，系統會自動進行 AI 去背（首次載入需下載模型約 24MB）。
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition">
              <span className="text-4xl">📷</span>
              <span className="font-medium">拍照</span>
              <span className="text-xs text-gray-500">使用手機/裝置相機拍攝</span>
              <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
            </label>
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition">
              <span className="text-4xl">🖼️</span>
              <span className="font-medium">從相簿/檔案上傳</span>
              <span className="text-xs text-gray-500">選擇已存在的圖片檔</span>
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
          </div>
          {errorMsg && <p className="text-red-500 text-sm mt-3">{errorMsg}</p>}
        </div>
      )}

      {step === 'removing' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <p className="font-medium">AI 去背處理中…</p>
          {progress && (
            <p className="text-xs text-gray-500 mt-1">
              {progress.key}: {progress.current} / {progress.total}
            </p>
          )}
          <div className="mt-3 h-2 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: progress ? `${(progress.current / Math.max(progress.total, 1)) * 100}%` : '20%' }}
            />
          </div>
        </div>
      )}

      {/* Step 1: editor */}
      <div className={step === 'editing' ? 'block' : 'hidden'}>
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
          <div className="flex flex-wrap gap-3 items-center mb-3">
            <button
              onClick={toggleEraser}
              className={`px-3 py-1.5 rounded text-sm ${
                eraserOn ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {eraserOn ? '✓ 橡皮擦啟用中' : '🧽 啟用橡皮擦'}
            </button>
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="px-3 py-1.5 rounded bg-gray-100 text-sm disabled:opacity-40"
            >
              ↶ 復原
            </button>
            <label className="flex items-center gap-2 text-sm">
              筆刷
              <input
                type="range"
                min={4}
                max={120}
                value={brushSize}
                onChange={(e) => onBrushChange(Number(e.target.value))}
                className="w-24 sm:w-32"
              />
              <span className="text-gray-500 w-8 text-right">{brushSize}</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              縮放
              <input
                type="range"
                min={25}
                max={300}
                step={5}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-24 sm:w-32"
              />
              <span className="text-gray-500 w-12 text-right">{zoom}%</span>
            </label>
          </div>
          <div
            className="canvas-wrapper overflow-auto bg-[conic-gradient(at_50%_50%,#f3f4f6_25%,#fff_0_50%,#f3f4f6_0_75%,#fff_0)] bg-[length:16px_16px]"
            style={{ maxHeight: '55vh', touchAction: zoom > 100 ? 'auto' : 'none' }}
          >
            <canvas
              ref={canvasRef}
              style={{ display: 'block', width: `${zoom}%`, height: 'auto', maxWidth: 'none' }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            💡 微調完成後點「下一步：標對齊點」。如果分類是「配件」會跳過此步驟。
          </p>
        </div>
        <div className="flex justify-end mb-8">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm mr-2"
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={goToAnchorStep}
            className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded text-sm"
          >
            下一步 →
          </button>
        </div>
      </div>

      {/* Step 2: anchors */}
      {step === 'anchors' && editedDataUrl && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
          <p className="text-sm text-gray-700 mb-3">
            將兩個圓點分別拖到衣物的 <strong>{labels.left}</strong> 與 <strong>{labels.right}</strong>。試穿時系統會把這條對齊線旋轉、縮放，貼合您身體上對應的位置。
          </p>
          <AnchorPicker
            imageDataUrl={editedDataUrl}
            initialAnchors={anchors}
            leftLabel={labels.left}
            rightLabel={labels.right}
            onChange={setAnchors}
          />
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep('editing')} className="text-sm text-gray-500">
              ← 回去微調
            </button>
            <button
              onClick={() => setStep('meta')}
              className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded text-sm"
            >
              下一步 →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: meta + save */}
      {(step === 'meta' || step === 'saving') && editedDataUrl && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 grid gap-3 sm:grid-cols-3 items-end">
          <div className="sm:col-span-1">
            <p className="text-xs text-gray-500 mb-1">預覽</p>
            <img src={editedDataUrl} alt="" className="max-h-40 mx-auto" />
          </div>
          <label className="text-sm sm:col-span-1">
            衣物名稱（選填）
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 border border-gray-300 rounded px-2 py-1.5"
              placeholder="例如：白色素T"
            />
          </label>
          <div className="sm:col-span-1 flex flex-col gap-2">
            <label className="text-sm">
              分類
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded px-2 py-1.5"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <button
              onClick={handleSave}
              disabled={step === 'saving'}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 text-white py-2 rounded"
            >
              {step === 'saving' ? '儲存中…' : '儲存到衣櫥'}
            </button>
          </div>
          {step === 'meta' && (
            <button
              onClick={() => setStep(ANCHORS_USED_BY_CATEGORY[category] ? 'anchors' : 'editing')}
              className="sm:col-span-3 text-xs text-gray-500 text-left"
            >
              ← 返回上一步
            </button>
          )}
        </div>
      )}
    </div>
  );
}

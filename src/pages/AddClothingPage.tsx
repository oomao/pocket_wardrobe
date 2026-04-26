import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import { blobToDataURL, removeBackground } from '../services/imageProcessing';
import { saveClothing } from '../services/storage';
import { EditorCanvas } from '../services/editorCanvas';

type Step = 'idle' | 'removing' | 'editing' | 'saving';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!category && categories.length) setCategory(categories[0]);
  }, [categories, category]);

  useEffect(() => {
    return () => editorRef.current?.dispose();
  }, []);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
      editorRef.current = ed;
      await ed.loadImage(dataUrl);
      ed.setBrushSize(brushSize);
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

  const handleSave = async () => {
    if (!editorRef.current) return;
    if (!category) {
      alert('請選擇分類');
      return;
    }
    setStep('saving');
    const dataUrl = editorRef.current.exportDataURL();
    await saveClothing({ name: name.trim(), imageBase64: dataUrl, category });
    navigate('/');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">新增衣物</h2>

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
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                className="hidden"
              />
            </label>
            <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition">
              <span className="text-4xl">🖼️</span>
              <span className="font-medium">從相簿/檔案上傳</span>
              <span className="text-xs text-gray-500">選擇已存在的圖片檔</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
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

      <div className={step === 'editing' || step === 'saving' ? 'block' : 'hidden'}>
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
            <label className="flex items-center gap-2 text-sm">
              筆刷大小
              <input
                type="range"
                min={4}
                max={120}
                value={brushSize}
                onChange={(e) => onBrushChange(Number(e.target.value))}
              />
              <span className="text-gray-500 w-8">{brushSize}</span>
            </label>
          </div>
          <div className="canvas-wrapper" style={{ touchAction: 'none' }}>
            <canvas ref={canvasRef} style={{ maxWidth: '100%' }} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 grid gap-3 sm:grid-cols-3">
          <label className="text-sm sm:col-span-1">
            衣物名稱（選填）
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 border border-gray-300 rounded px-2 py-1.5"
              placeholder="例如：白色素T"
            />
          </label>
          <label className="text-sm sm:col-span-1">
            分類（必填）
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
          <div className="sm:col-span-1 flex items-end">
            <button
              onClick={handleSave}
              disabled={step === 'saving'}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 text-white py-2 rounded"
            >
              {step === 'saving' ? '儲存中…' : '儲存到衣櫥'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

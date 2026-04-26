import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import { Clothing } from '../types';
import { getAllClothing } from '../services/storage';
import {
  AITryOnConfig,
  DEFAULT_CONFIG,
  ProgressStage,
  grantConsent,
  hasConsent,
  loadAIConfig,
  runVirtualTryOn,
  saveAIConfig,
} from '../services/aiTryOn';
import { loadGeminiKey, runGeminiTryOn, saveGeminiKey } from '../services/geminiTryOn';
import CategoryTabs from '../components/CategoryTabs';

type Provider = 'gemini' | 'hf';

const PROVIDER_KEY = 'pw_ai_provider';

export default function AITryOnPage() {
  const { profile, categories } = useWardrobe();
  const [clothes, setClothes] = useState<Clothing[]>([]);
  const [active, setActive] = useState('全部');
  const [picked, setPicked] = useState<Clothing | null>(null);
  const [running, setRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [provider, setProvider] = useState<Provider>(
    (localStorage.getItem(PROVIDER_KEY) as Provider) || 'gemini',
  );
  const [geminiKey, setGeminiKey] = useState(loadGeminiKey());
  const [showSettings, setShowSettings] = useState(false);
  const [hfConfig, setHfConfig] = useState<AITryOnConfig>(loadAIConfig());

  useEffect(() => {
    getAllClothing().then(setClothes);
  }, []);

  useEffect(() => {
    localStorage.setItem(PROVIDER_KEY, provider);
  }, [provider]);

  const ready = profile.avatarMode === 'photo' && !!profile.photoBase64;
  const filtered = useMemo(
    () => (active === '全部' ? clothes : clothes.filter((c) => c.category === active)),
    [active, clothes],
  );

  const start = async () => {
    if (!ready || !picked || !profile.photoBase64) return;
    if (provider === 'gemini' && !geminiKey) {
      setShowSettings(true);
      return;
    }
    if (provider === 'hf' && !hasConsent()) {
      grantConsent();
    }
    setRunning(true);
    setErrorMsg(null);
    setResultUrl(null);
    setStatusMsg('');
    try {
      if (provider === 'gemini') {
        const res = await runGeminiTryOn({
          apiKey: geminiKey,
          personImageDataUrl: profile.photoBase64,
          garmentImageDataUrl: picked.imageBase64,
          garmentCategory: picked.category,
          garmentName: picked.name,
          onStatus: setStatusMsg,
        });
        setResultUrl(res.imageDataUrl);
      } else {
        const res = await runVirtualTryOn(profile.photoBase64, picked.imageBase64, {
          ...hfConfig,
          category: picked.category,
          onStatus: (_s: ProgressStage, m: string) => setStatusMsg(m),
        });
        setResultUrl(res.imageUrl);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || String(err);
      setErrorMsg(msg);
    } finally {
      setRunning(false);
    }
  };

  const saveSettings = () => {
    saveGeminiKey(geminiKey);
    saveAIConfig(hfConfig);
    setShowSettings(false);
  };

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-2 mb-4">
        <div>
          <h2 className="text-2xl font-bold">✨ AI 真實試穿</h2>
          <p className="text-xs text-gray-500 mt-1">
            使用 AI 把衣物實際合成到你的照片上，效果接近 Google Shopping 的試穿體驗。
          </p>
        </div>
        <button onClick={() => setShowSettings(true)} className="text-xs text-gray-500 underline">
          ⚙️ AI 設定
        </button>
      </div>

      {/* Provider selector */}
      <div className="grid sm:grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setProvider('gemini')}
          className={`text-left p-3 rounded-lg border ${
            provider === 'gemini' ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500' : 'border-gray-300 bg-white'
          }`}
        >
          <div className="font-semibold text-sm">🍌 Google Gemini 2.5 Flash Image (推薦)</div>
          <div className="text-xs text-gray-600 mt-1">
            Google 自家「Nano Banana」模型，跟 Google Shopping 試穿同級。免費（需自行申請 Google AI Studio API key）。
            速度 5–15 秒，品質最高。
          </div>
        </button>
        <button
          onClick={() => setProvider('hf')}
          className={`text-left p-3 rounded-lg border ${
            provider === 'hf' ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500' : 'border-gray-300 bg-white'
          }`}
        >
          <div className="font-semibold text-sm">🤗 HuggingFace 開源 Space</div>
          <div className="text-xs text-gray-600 mt-1">
            CatVTON / Kolors-VTON 等開源模型，零設定但速度較慢、有時排隊。當作備援使用。
          </div>
        </button>
      </div>

      {!ready && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-sm">
          <p className="font-semibold mb-1">⚠ 需先在「設定」上傳一張全身照片</p>
          <p>AI 試穿需要使用者照片作為輸入。請先到 <Link to="/settings" className="underline">⚙️ 設定</Link> 完成上傳。</p>
        </div>
      )}

      {ready && provider === 'gemini' && !geminiKey && (
        <div className="bg-sky-50 border border-sky-200 text-sky-800 rounded-lg p-4 text-sm mb-4">
          <p className="font-semibold mb-1">🔑 第一次使用需要設定 Gemini API Key（免費）</p>
          <ol className="list-decimal pl-5 space-y-1 text-xs">
            <li>到 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline font-semibold">aistudio.google.com/apikey</a> 用 Google 帳號登入</li>
            <li>點 「Create API key」→ 複製出來</li>
            <li>回來這頁點右上「⚙️ AI 設定」貼上即可</li>
          </ol>
          <p className="text-xs text-gray-600 mt-2">
            Token 只儲存在你的瀏覽器，不會上傳。免費額度約每分鐘 60 次、每日 1500 次。
          </p>
          <button onClick={() => setShowSettings(true)} className="mt-3 bg-brand-500 text-white px-3 py-1.5 rounded text-sm">
            開啟設定貼 Key
          </button>
        </div>
      )}

      {ready && (
        <div className="grid lg:grid-cols-[320px_1fr] gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 mb-1">您的照片</p>
            <img src={profile.photoBase64} alt="me" className="w-full max-h-80 object-contain bg-gray-50 rounded" />
            <p className="text-[11px] text-gray-400 mt-2">
              要更換照片請到 <Link to="/settings" className="underline">設定頁</Link>
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">選一件衣物</p>
                {picked && (
                  <span className="text-xs text-gray-500">
                    已選：<strong>{picked.name || '未命名'}</strong> ({picked.category})
                  </span>
                )}
              </div>
              <CategoryTabs categories={categories} active={active} onChange={setActive} />
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-80 overflow-y-auto pr-1">
                {filtered.length === 0 && <p className="text-sm text-gray-500 col-span-full">衣櫥沒有此分類的衣物。</p>}
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setPicked(c)}
                    className={`bg-white border rounded p-1 ${
                      picked?.id === c.id ? 'border-brand-500 ring-2 ring-brand-500' : 'border-gray-200 hover:border-brand-500'
                    }`}
                    title={c.name}
                  >
                    <img src={c.imageBase64} alt={c.name} className="w-full h-16 object-contain" />
                    <div className="text-[10px] text-gray-600 truncate">{c.name || '未命名'}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <button
                onClick={start}
                disabled={!picked || running || (provider === 'gemini' && !geminiKey)}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white py-3 rounded font-semibold"
              >
                {running
                  ? '處理中…'
                  : picked
                  ? `✨ 用 ${provider === 'gemini' ? 'Gemini' : 'HF Space'} 試穿`
                  : '請先選一件衣物'}
              </button>
              {running && (
                <div className="mt-3">
                  <p className="text-sm">{statusMsg}</p>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded overflow-hidden">
                    <div className="h-full bg-brand-500 animate-pulse w-2/3" />
                  </div>
                </div>
              )}
              {errorMsg && (
                <div className="mt-3 text-sm bg-red-50 border border-red-200 rounded p-3 text-red-700 whitespace-pre-line">
                  ❌ {errorMsg}
                </div>
              )}
            </div>

            {resultUrl && (
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="text-sm font-semibold mb-2">🎉 結果</p>
                <img src={resultUrl} alt="AI try-on result" className="w-full max-h-[60vh] object-contain bg-gray-50 rounded" />
                <div className="flex gap-2 mt-3">
                  <a href={resultUrl} download="ai-try-on.png" className="bg-brand-500 text-white px-3 py-1.5 rounded text-sm">
                    💾 下載
                  </a>
                  <button onClick={start} disabled={running} className="bg-gray-100 px-3 py-1.5 rounded text-sm">
                    🔁 重試
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold">⚙️ AI 試穿設定</h3>

            <section className="border-b pb-4">
              <h4 className="font-semibold text-sm mb-2">🍌 Gemini API Key（推薦）</h4>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
                placeholder="AIza..."
              />
              <p className="text-[11px] text-gray-500 mt-2">
                免費取得：<a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline text-sky-600">aistudio.google.com/apikey</a>。
                Key 僅儲存在你的瀏覽器，不會上傳到任何地方。
              </p>
            </section>

            <section>
              <h4 className="font-semibold text-sm mb-2">🤗 HF Space（備援）</h4>
              <label className="block text-sm">
                Space ID
                <input
                  value={hfConfig.spaceId}
                  onChange={(e) => setHfConfig({ ...hfConfig, spaceId: e.target.value })}
                  className="w-full mt-1 border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
                  placeholder="user/space-name"
                />
                <span className="text-[11px] text-gray-500 block mt-1">
                  範例：Kwai-Kolors/Kolors-Virtual-Try-On、zhengchong/CatVTON
                </span>
              </label>
              <label className="block text-sm mt-2">
                Endpoint
                <input
                  value={hfConfig.endpoint || ''}
                  onChange={(e) => setHfConfig({ ...hfConfig, endpoint: e.target.value })}
                  className="w-full mt-1 border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
                  placeholder="/tryon"
                />
              </label>
            </section>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setHfConfig(DEFAULT_CONFIG);
                  setGeminiKey('');
                }}
                className="px-3 py-1.5 rounded bg-gray-100 text-sm"
              >
                清除
              </button>
              <button onClick={() => setShowSettings(false)} className="px-3 py-1.5 rounded bg-gray-100 text-sm">
                取消
              </button>
              <button onClick={saveSettings} className="px-3 py-1.5 rounded bg-brand-500 text-white text-sm">
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

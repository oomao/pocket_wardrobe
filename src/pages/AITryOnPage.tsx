import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import { Clothing } from '../types';
import { getAllClothing } from '../services/storage';
import {
  AITryOnConfig,
  DEFAULT_CONFIG,
  ProgressStage,
  loadAIConfig,
  runVirtualTryOn,
  saveAIConfig,
} from '../services/aiTryOn';
import { runPuterTryOn } from '../services/puterTryOn';
import CategoryTabs from '../components/CategoryTabs';

type Provider = 'puter' | 'hf';

const PROVIDER_KEY = 'pw_ai_provider';
const CONSENT_KEY = 'pw_ai_consent_v2';

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
    () => (localStorage.getItem(PROVIDER_KEY) as Provider) || 'puter',
  );
  const [showConsent, setShowConsent] = useState(false);
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

  const consented = () => localStorage.getItem(CONSENT_KEY) === '1';
  const grantConsent = () => localStorage.setItem(CONSENT_KEY, '1');

  const start = async () => {
    if (!ready || !picked || !profile.photoBase64) return;
    if (!consented()) {
      setShowConsent(true);
      return;
    }
    setRunning(true);
    setErrorMsg(null);
    setResultUrl(null);
    setStatusMsg('');
    try {
      if (provider === 'puter') {
        const res = await runPuterTryOn({
          personImageDataUrl: profile.photoBase64,
          garmentImageDataUrl: picked.imageBase64,
          category: picked.category,
          garmentName: picked.name,
          onStatus: (_s, m) => setStatusMsg(m),
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
      setErrorMsg(err?.message || String(err));
    } finally {
      setRunning(false);
    }
  };

  const onConsent = () => {
    grantConsent();
    setShowConsent(false);
    start();
  };

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-2 mb-5">
        <div>
          <h2 className="text-3xl font-bold text-walnut-700">AI 真實試穿</h2>
          <p className="text-sm text-walnut-500/70 mt-1">
            用 AI 把衣物實際合成到你的照片上，效果接近 Google Shopping 的試穿。
          </p>
        </div>
        {provider === 'hf' && (
          <button
            onClick={() => setShowSettings(true)}
            className="text-xs text-stone-500 underline"
          >
            ⚙️ HF Space 設定
          </button>
        )}
      </div>

      {/* Provider selector */}
      <div className="grid sm:grid-cols-2 gap-2 mb-5">
        <button
          onClick={() => setProvider('puter')}
          className={`text-left p-4 rounded-xl border transition-all ${
            provider === 'puter'
              ? 'border-brand-500 bg-cream-50 ring-2 ring-brand-500/30'
              : 'border-cream-200 bg-white hover:border-brand-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm text-walnut-700">🍌 Google Nano Banana（推薦）</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">免費</span>
          </div>
          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
            透過 Puter.js 呼叫 Google 自家的 Gemini 影像模型，跟 Google Shopping 試穿同等級。
            首次使用需登入 Puter（30 秒、不用信用卡），之後無限免費。
          </p>
        </button>
        <button
          onClick={() => setProvider('hf')}
          className={`text-left p-4 rounded-xl border transition-all ${
            provider === 'hf'
              ? 'border-brand-500 bg-cream-50 ring-2 ring-brand-500/30'
              : 'border-cream-200 bg-white hover:border-brand-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm text-walnut-700">🤗 HuggingFace 開源 Space</span>
            <span className="text-[10px] bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">備援</span>
          </div>
          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
            CatVTON / Kolors-VTON 等開源模型，零設定但速度較慢、有時排隊。當主方案壞掉時用。
          </p>
        </button>
      </div>

      {!ready && (
        <div className="bg-cream-50 border border-cream-200 text-walnut-700 rounded-xl p-4 text-sm">
          <p className="font-semibold mb-1">⚠ 需先在「設定」上傳一張全身照片</p>
          <p>AI 試穿需要使用者照片作為輸入。請先到 <Link to="/settings" className="underline">⚙️ 設定</Link> 完成上傳。</p>
        </div>
      )}

      {ready && (
        <div className="grid lg:grid-cols-[320px_1fr] gap-4">
          <div className="wood-card p-3">
            <p className="text-xs text-stone-500 mb-2">您的照片</p>
            <img src={profile.photoBase64} alt="me" className="w-full max-h-80 object-contain bg-cream-50 rounded-lg" />
            <p className="text-[11px] text-stone-400 mt-2">
              要更換照片請到 <Link to="/settings" className="underline">設定頁</Link>
            </p>
          </div>

          <div className="space-y-4">
            <div className="wood-card p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-walnut-700">選一件衣物</p>
                {picked && (
                  <span className="text-xs text-stone-500">
                    已選：<strong>{picked.name || '未命名'}</strong> ({picked.category})
                  </span>
                )}
              </div>
              <CategoryTabs categories={categories} active={active} onChange={setActive} />
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-80 overflow-y-auto pr-1">
                {filtered.length === 0 && <p className="text-sm text-stone-500 col-span-full">衣櫥沒有此分類的衣物。</p>}
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setPicked(c)}
                    className={`bg-white border rounded-lg p-1 transition-all ${
                      picked?.id === c.id
                        ? 'border-brand-500 ring-2 ring-brand-500/40'
                        : 'border-cream-200 hover:border-brand-400 hover:shadow'
                    }`}
                    title={c.name}
                  >
                    <img src={c.imageBase64} alt={c.name} className="w-full h-16 object-contain" />
                    <div className="text-[10px] text-stone-600 truncate mt-1">{c.name || '未命名'}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="wood-card p-4">
              <button
                onClick={start}
                disabled={!picked || running}
                className="w-full bg-walnut-700 hover:bg-walnut-800 disabled:bg-stone-300 text-cream-50 py-3 rounded-lg font-semibold transition-colors"
              >
                {running
                  ? '處理中…'
                  : picked
                  ? `✨ 用 ${provider === 'puter' ? 'Nano Banana' : 'HF Space'} 試穿`
                  : '請先選一件衣物'}
              </button>
              {running && (
                <div className="mt-3">
                  <p className="text-sm text-stone-700">{statusMsg}</p>
                  <div className="mt-2 h-1.5 bg-cream-100 rounded overflow-hidden">
                    <div className="h-full bg-brand-500 animate-pulse w-2/3" />
                  </div>
                </div>
              )}
              {errorMsg && (
                <div className="mt-3 text-sm bg-rose-50 border border-rose-200 rounded p-3 text-rose-700 whitespace-pre-line">
                  ❌ {errorMsg}
                </div>
              )}
            </div>

            {resultUrl && (
              <div className="wood-card p-4">
                <p className="text-sm font-semibold text-walnut-700 mb-2">🎉 結果</p>
                <img src={resultUrl} alt="AI try-on result" className="w-full max-h-[60vh] object-contain bg-cream-50 rounded-lg" />
                <div className="flex gap-2 mt-3">
                  <a href={resultUrl} download="ai-try-on.png" className="bg-walnut-700 text-cream-50 px-3 py-1.5 rounded text-sm">
                    💾 下載
                  </a>
                  <button onClick={start} disabled={running} className="bg-cream-100 text-walnut-700 px-3 py-1.5 rounded text-sm">
                    🔁 重試
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Consent modal */}
      {showConsent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="wood-card max-w-lg w-full p-5 space-y-3 bg-white">
            <h3 className="text-lg font-bold text-walnut-700">使用 AI 試穿前請知悉</h3>
            <ul className="text-sm text-stone-700 list-disc pl-5 space-y-1">
              <li>您的<strong>照片與衣物影像</strong>會以 HTTPS 傳送到第三方 AI 服務（{provider === 'puter' ? 'Puter → Google' : 'HuggingFace Space'}）。</li>
              <li>本應用無法保證第三方的資料保留政策。</li>
              <li>處理需要 5–60 秒，公共服務可能排隊。</li>
              <li>結果僅儲存在你的瀏覽器，不會上傳到任何伺服器。</li>
              {provider === 'puter' && <li>首次使用會跳出 Puter 註冊視窗（免費、不用信用卡）。</li>}
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowConsent(false)} className="px-3 py-1.5 rounded bg-cream-100 text-walnut-700 text-sm">
                取消
              </button>
              <button onClick={onConsent} className="px-3 py-1.5 rounded bg-walnut-700 text-cream-50 text-sm">
                我同意，開始試穿
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HF Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="wood-card max-w-lg w-full p-5 space-y-4 bg-white">
            <h3 className="text-lg font-bold text-walnut-700">⚙️ HF Space 設定</h3>
            <label className="block text-sm">
              Space ID
              <input
                value={hfConfig.spaceId}
                onChange={(e) => setHfConfig({ ...hfConfig, spaceId: e.target.value })}
                className="w-full mt-1 border border-cream-200 rounded px-2 py-1.5 text-sm font-mono"
                placeholder="user/space-name"
              />
              <span className="text-[11px] text-stone-500 block mt-1">
                範例：Kwai-Kolors/Kolors-Virtual-Try-On、zhengchong/CatVTON
              </span>
            </label>
            <label className="block text-sm">
              Endpoint
              <input
                value={hfConfig.endpoint || ''}
                onChange={(e) => setHfConfig({ ...hfConfig, endpoint: e.target.value })}
                className="w-full mt-1 border border-cream-200 rounded px-2 py-1.5 text-sm font-mono"
                placeholder="/tryon"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setHfConfig(DEFAULT_CONFIG)} className="px-3 py-1.5 rounded bg-cream-100 text-walnut-700 text-sm">
                回復預設
              </button>
              <button onClick={() => setShowSettings(false)} className="px-3 py-1.5 rounded bg-cream-100 text-walnut-700 text-sm">
                取消
              </button>
              <button
                onClick={() => {
                  saveAIConfig(hfConfig);
                  setShowSettings(false);
                }}
                className="px-3 py-1.5 rounded bg-walnut-700 text-cream-50 text-sm"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

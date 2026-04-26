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
import CategoryTabs from '../components/CategoryTabs';

export default function AITryOnPage() {
  const { profile, categories } = useWardrobe();
  const [clothes, setClothes] = useState<Clothing[]>([]);
  const [active, setActive] = useState('全部');
  const [picked, setPicked] = useState<Clothing | null>(null);
  const [running, setRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [stage, setStage] = useState<ProgressStage | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showConsent, setShowConsent] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<AITryOnConfig>(loadAIConfig());

  useEffect(() => {
    getAllClothing().then(setClothes);
  }, []);

  const ready = profile.avatarMode === 'photo' && !!profile.photoBase64;

  const filtered = useMemo(
    () => (active === '全部' ? clothes : clothes.filter((c) => c.category === active)),
    [active, clothes],
  );

  const start = async () => {
    if (!ready || !picked || !profile.photoBase64) return;
    if (!hasConsent()) {
      setShowConsent(true);
      return;
    }
    setRunning(true);
    setErrorMsg(null);
    setResultUrl(null);
    try {
      const res = await runVirtualTryOn(profile.photoBase64, picked.imageBase64, {
        ...config,
        category: picked.category,
        onStatus: (s, m) => {
          setStage(s);
          setStatusMsg(m);
        },
      });
      setResultUrl(res.imageUrl);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || String(err);
      setErrorMsg(
        `AI 試穿失敗：${msg}\n\n可能原因：Space 在睡眠 / 排隊太久 / 該 Space 的 API 與本應用不相容。\n你可以點「⚙️ 進階設定」改用其他 Space。`,
      );
    } finally {
      setRunning(false);
      setStage(null);
    }
  };

  const onConsent = () => {
    grantConsent();
    setShowConsent(false);
    start();
  };

  const saveConfig = () => {
    saveAIConfig(config);
    setShowConfig(false);
  };

  return (
    <div>
      <div className="flex justify-between items-start flex-wrap gap-2 mb-4">
        <div>
          <h2 className="text-2xl font-bold">✨ AI 真實試穿</h2>
          <p className="text-xs text-gray-500 mt-1">
            使用開源 Virtual Try-On 模型（HuggingFace Space），把衣物真正合成到你的照片上。
          </p>
        </div>
        <button
          onClick={() => setShowConfig(true)}
          className="text-xs text-gray-500 underline"
        >
          ⚙️ 進階設定
        </button>
      </div>

      {!ready && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-sm">
          <p className="font-semibold mb-1">⚠ 需先在「設定」上傳一張全身照片</p>
          <p>AI 試穿需要使用者照片作為輸入。請先到 <Link to="/settings" className="underline">⚙️ 設定</Link> 完成上傳。</p>
        </div>
      )}

      {ready && (
        <div className="grid lg:grid-cols-[320px_1fr] gap-4">
          {/* Left: photo */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 mb-1">您的照片</p>
            <img
              src={profile.photoBase64}
              alt="me"
              className="w-full max-h-80 object-contain bg-gray-50 rounded"
            />
            <p className="text-[11px] text-gray-400 mt-2">
              要更換照片請到 <Link to="/settings" className="underline">設定頁</Link>
            </p>
          </div>

          {/* Right: clothing picker + run + result */}
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
                disabled={!picked || running}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white py-3 rounded font-semibold"
              >
                {running ? '處理中…' : picked ? '✨ 開始 AI 試穿' : '請先選一件衣物'}
              </button>
              {running && stage && (
                <div className="mt-3">
                  <p className="text-sm">{statusMsg}</p>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded overflow-hidden">
                    <div
                      className="h-full bg-brand-500 animate-pulse"
                      style={{
                        width:
                          stage === 'connect' ? '20%' :
                          stage === 'queue' ? '45%' :
                          stage === 'processing' ? '80%' :
                          '100%',
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    公共 Space 第一次連線可能要等候排隊；如果太久請試其他 Space。
                  </p>
                </div>
              )}
              {errorMsg && (
                <div className="mt-3 text-sm bg-red-50 border border-red-200 rounded p-3 text-red-700 whitespace-pre-line">
                  {errorMsg}
                </div>
              )}
            </div>

            {resultUrl && (
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <p className="text-sm font-semibold mb-2">🎉 結果</p>
                <img src={resultUrl} alt="AI try-on result" className="w-full max-h-[60vh] object-contain bg-gray-50 rounded" />
                <div className="flex gap-2 mt-3">
                  <a
                    href={resultUrl}
                    download="ai-try-on.png"
                    className="bg-brand-500 text-white px-3 py-1.5 rounded text-sm"
                  >
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

      {/* Consent modal */}
      {showConsent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-5 space-y-3">
            <h3 className="text-lg font-bold">使用 AI 試穿前請知悉</h3>
            <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
              <li>您的<strong>照片與衣物影像</strong>會以 HTTPS 傳送到第三方 HuggingFace Space ({config.spaceId})。</li>
              <li>該 Space 由開源社群提供，本應用無法保證其資料保留政策。</li>
              <li>處理需要 30–90 秒，公共 Space 可能排隊或暫停服務。</li>
              <li>結果僅儲存在你的瀏覽器，不會上傳到任何伺服器。</li>
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowConsent(false)} className="px-3 py-1.5 rounded bg-gray-100 text-sm">
                取消
              </button>
              <button onClick={onConsent} className="px-3 py-1.5 rounded bg-brand-500 text-white text-sm">
                我同意，開始試穿
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-5 space-y-3">
            <h3 className="text-lg font-bold">⚙️ AI 試穿進階設定</h3>
            <p className="text-xs text-gray-500">
              如預設 Space 失效或想換更穩的服務，可在這裡指定其他 HuggingFace Space。
            </p>
            <label className="block text-sm">
              Space ID
              <input
                value={config.spaceId}
                onChange={(e) => setConfig({ ...config, spaceId: e.target.value })}
                className="w-full mt-1 border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
                placeholder="user/space-name"
              />
              <span className="text-[11px] text-gray-500 block mt-1">
                範例：Kwai-Kolors/Kolors-Virtual-Try-On、zhengchong/CatVTON、yisol/IDM-VTON
              </span>
            </label>
            <label className="block text-sm">
              Endpoint
              <input
                value={config.endpoint || ''}
                onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                className="w-full mt-1 border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
                placeholder="/tryon"
              />
              <span className="text-[11px] text-gray-500 block mt-1">通常是 /tryon、/predict 或 /process</span>
            </label>
            <label className="block text-sm">
              HuggingFace Token（選填，可提高配額）
              <input
                type="password"
                value={config.hfToken || ''}
                onChange={(e) => setConfig({ ...config, hfToken: e.target.value })}
                className="w-full mt-1 border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
                placeholder="hf_..."
              />
              <span className="text-[11px] text-gray-500 block mt-1">
                註冊免費 HF 帳號 → Settings → Access Tokens 取得。Token 只存在你的瀏覽器。
              </span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfig(DEFAULT_CONFIG)} className="px-3 py-1.5 rounded bg-gray-100 text-sm">
                回復預設
              </button>
              <button onClick={() => setShowConfig(false)} className="px-3 py-1.5 rounded bg-gray-100 text-sm">
                取消
              </button>
              <button onClick={saveConfig} className="px-3 py-1.5 rounded bg-brand-500 text-white text-sm">
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

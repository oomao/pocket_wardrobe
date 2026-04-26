import { ChangeEvent, useState } from 'react';
import { useWardrobe } from '../context/WardrobeContext';
import AvatarPreview from '../components/AvatarPreview';
import { countClothingByCategory } from '../services/storage';
import { blobToDataURL, cropTransparent, removeBackground } from '../services/imageProcessing';
import { AvatarMode, Gender, HEIGHT_RANGE, WEIGHT_RANGE } from '../types';

type PhotoStep = 'idle' | 'processing' | 'error';

export default function SettingsPage() {
  const { categories, setCategories, profile, setProfile } = useWardrobe();
  const [newCat, setNewCat] = useState('');
  const [draftProfile, setDraftProfile] = useState(profile);
  const [busy, setBusy] = useState(false);
  const [photoStep, setPhotoStep] = useState<PhotoStep>('idle');
  const [photoProgress, setPhotoProgress] = useState<{ current: number; total: number } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [autoRemoveBg, setAutoRemoveBg] = useState(true);

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    if (categories.includes(name)) return alert('分類已存在');
    await setCategories([...categories, name]);
    setNewCat('');
  };

  const removeCategory = async (c: string) => {
    const count = await countClothingByCategory(c);
    if (count > 0) return alert(`請先移除該分類下的衣物（共 ${count} 件）`);
    if (!confirm(`確定刪除分類「${c}」?`)) return;
    await setCategories(categories.filter((x) => x !== c));
  };

  const saveProfile = async () => {
    setBusy(true);
    await setProfile(draftProfile);
    setBusy(false);
    alert('已儲存');
  };

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-pick same file
    if (!file) return;
    setPhotoError(null);
    setPhotoStep('processing');
    setPhotoProgress(null);
    try {
      let dataUrl: string;
      if (autoRemoveBg) {
        const blob = await removeBackground(file, (_k, current, total) =>
          setPhotoProgress({ current, total }),
        );
        dataUrl = await blobToDataURL(blob);
        // Trim transparent borders so the person fills the canvas later.
        dataUrl = await cropTransparent(dataUrl, 16);
      } else {
        dataUrl = await blobToDataURL(file);
      }
      setDraftProfile((p) => ({ ...p, photoBase64: dataUrl, avatarMode: 'photo' }));
      setPhotoStep('idle');
    } catch (err) {
      console.error(err);
      setPhotoError('處理失敗，請改用其他照片再試。');
      setPhotoStep('error');
    }
  };

  const removePhoto = () =>
    setDraftProfile({ ...draftProfile, photoBase64: undefined, avatarMode: 'default' });

  const setMode = (m: AvatarMode) => setDraftProfile({ ...draftProfile, avatarMode: m });
  const setHeight = (h: number) => setDraftProfile({ ...draftProfile, heightCm: h });
  const setWeight = (w: number) => setDraftProfile({ ...draftProfile, weightKg: w });

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="mb-2">
        <h2 className="text-3xl font-bold text-walnut-700">設定</h2>
        <p className="text-sm text-walnut-500/70 mt-1">分類、虛擬人物、個人照片管理。</p>
      </div>

      <section>
        <h3 className="text-lg font-semibold text-walnut-700 mb-3">📁 分類管理</h3>
        <div className="wood-card p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 bg-cream-100 text-walnut-700 px-3 py-1 rounded-full text-sm">
                {c}
                <button onClick={() => removeCategory(c)} className="text-red-500 hover:text-red-700" aria-label={`刪除 ${c}`}>×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="新增分類名稱"
              className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
            <button onClick={addCategory} className="bg-walnut-700 hover:bg-walnut-800 text-cream-50 px-4 py-1.5 rounded-lg text-sm">
              新增
            </button>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-walnut-700 mb-3">🧍 虛擬人物 / 個人照片</h3>
        <div className="wood-card p-5">
          {/* Avatar mode chooser */}
          <div className="mb-5">
            <p className="text-sm font-medium mb-2">底圖樣式</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('default')}
                className={`p-3 rounded border text-sm text-left ${
                  draftProfile.avatarMode === 'default'
                    ? 'border-brand-500 bg-cream-50 ring-2 ring-brand-500/40'
                    : 'border-gray-300 bg-white'
                }`}
              >
                <div className="font-medium">🧍 預設模特兒</div>
                <div className="text-xs text-gray-500 mt-1">
                  自動依分類把衣服放到肩、腰、腳的位置
                </div>
              </button>
              <button
                onClick={() => setMode('photo')}
                disabled={!draftProfile.photoBase64}
                className={`p-3 rounded border text-sm text-left disabled:opacity-50 ${
                  draftProfile.avatarMode === 'photo'
                    ? 'border-brand-500 bg-cream-50 ring-2 ring-brand-500/40'
                    : 'border-gray-300 bg-white'
                }`}
              >
                <div className="font-medium">📸 我的照片</div>
                <div className="text-xs text-gray-500 mt-1">
                  {draftProfile.photoBase64 ? '使用下方上傳的照片當底圖' : '需先上傳一張照片'}
                </div>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-5">
              {draftProfile.avatarMode === 'default' && (
                <>
                  <div>
                    <p className="text-sm font-medium mb-1">性別</p>
                    <div className="flex gap-2">
                      {(['male', 'female'] as Gender[]).map((g) => (
                        <button
                          key={g}
                          onClick={() => setDraftProfile({ ...draftProfile, gender: g })}
                          className={`px-4 py-1.5 rounded border text-sm ${
                            draftProfile.gender === g
                              ? 'bg-walnut-700 text-cream-50 border-walnut-700'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          {g === 'male' ? '男性' : '女性'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="height-input" className="text-sm font-medium">身高</label>
                      <div className="flex items-center gap-1 text-sm">
                        <input
                          id="height-input"
                          type="number"
                          inputMode="numeric"
                          min={HEIGHT_RANGE.min}
                          max={HEIGHT_RANGE.max}
                          value={draftProfile.heightCm}
                          onChange={(e) => setHeight(Number(e.target.value) || 0)}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-right"
                        />
                        <span className="text-gray-500">cm</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={HEIGHT_RANGE.min}
                      max={HEIGHT_RANGE.max}
                      step={HEIGHT_RANGE.step}
                      value={draftProfile.heightCm}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="weight-input" className="text-sm font-medium">體重</label>
                      <div className="flex items-center gap-1 text-sm">
                        <input
                          id="weight-input"
                          type="number"
                          inputMode="numeric"
                          min={WEIGHT_RANGE.min}
                          max={WEIGHT_RANGE.max}
                          value={draftProfile.weightKg}
                          onChange={(e) => setWeight(Number(e.target.value) || 0)}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-right"
                        />
                        <span className="text-gray-500">kg</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={WEIGHT_RANGE.min}
                      max={WEIGHT_RANGE.max}
                      step={WEIGHT_RANGE.step}
                      value={draftProfile.weightKg}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {/* Photo upload */}
              <div>
                <p className="text-sm font-medium mb-2">我的照片（選填）</p>

                {/* Guide card */}
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 mb-3 text-xs leading-relaxed">
                  <p className="font-semibold text-gray-700 mb-2">📋 拍照建議</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-emerald-700 font-medium mb-1">✅ 適合</p>
                      <ul className="space-y-0.5 text-gray-600 list-disc pl-4">
                        <li>全身入鏡（頭到腳）</li>
                        <li>正面、雙手自然放下</li>
                        <li>單一純色背景（白牆/淺色牆）</li>
                        <li>光線充足、不逆光</li>
                        <li>身穿貼身或簡單衣物</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-rose-700 font-medium mb-1">❌ 避免</p>
                      <ul className="space-y-0.5 text-gray-600 list-disc pl-4">
                        <li>半身、側身、坐姿</li>
                        <li>多人或背景人物</li>
                        <li>雜亂背景、反光鏡面</li>
                        <li>陰影過深或逆光</li>
                        <li>遮擋身體輪廓的寬鬆衣物</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 mb-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={autoRemoveBg}
                    onChange={(e) => setAutoRemoveBg(e.target.checked)}
                  />
                  上傳後自動 AI 去背（建議開啟，背景變透明後可乾淨疊上衣物）
                </label>

                <div className="flex flex-wrap gap-2">
                  <label className={`cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded text-sm ${photoStep === 'processing' ? 'opacity-50 pointer-events-none' : ''}`}>
                    📷 拍照
                    <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
                  </label>
                  <label className={`cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded text-sm ${photoStep === 'processing' ? 'opacity-50 pointer-events-none' : ''}`}>
                    🖼️ 選擇照片
                    <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
                  </label>
                  {draftProfile.photoBase64 && photoStep !== 'processing' && (
                    <button onClick={removePhoto} className="bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm">
                      移除照片
                    </button>
                  )}
                </div>

                {photoStep === 'processing' && (
                  <div className="mt-3 p-3 bg-brand-50 rounded">
                    <p className="text-sm font-medium text-brand-700">
                      {autoRemoveBg ? '🤖 AI 去背處理中…' : '🖼️ 載入照片中…'}
                    </p>
                    {photoProgress && (
                      <p className="text-xs text-gray-600 mt-1">
                        {photoProgress.current} / {photoProgress.total}
                      </p>
                    )}
                    <div className="mt-2 h-1.5 bg-white rounded overflow-hidden">
                      <div
                        className="h-full bg-brand-500 transition-all"
                        style={{ width: photoProgress ? `${(photoProgress.current / Math.max(photoProgress.total, 1)) * 100}%` : '20%' }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-2">
                      首次使用需下載 AI 模型（約 24MB），請稍候。
                    </p>
                  </div>
                )}

                {photoError && (
                  <p className="text-red-500 text-xs mt-2">{photoError}</p>
                )}
              </div>

              <button
                onClick={saveProfile}
                disabled={busy}
                className="bg-walnut-700 hover:bg-walnut-800 disabled:bg-stone-300 text-cream-50 px-4 py-2 rounded-lg text-sm"
              >
                {busy ? '儲存中…' : '儲存設定'}
              </button>
            </div>

            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-500 text-center mb-2">預覽</p>
              <AvatarPreview profile={draftProfile} height={300} />
              <p className="text-xs text-gray-500 text-center mt-2">
                {draftProfile.avatarMode === 'default'
                  ? `${draftProfile.heightCm} cm / ${draftProfile.weightKg} kg`
                  : '使用個人照片'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

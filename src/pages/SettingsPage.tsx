import { ChangeEvent, useState } from 'react';
import { useWardrobe } from '../context/WardrobeContext';
import AvatarPreview from '../components/AvatarPreview';
import { countClothingByCategory } from '../services/storage';
import { AvatarMode, Gender, HEIGHT_RANGE, WEIGHT_RANGE } from '../types';

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const { categories, setCategories, profile, setProfile } = useWardrobe();
  const [newCat, setNewCat] = useState('');
  const [draftProfile, setDraftProfile] = useState(profile);
  const [busy, setBusy] = useState(false);

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
    if (!file) return;
    const url = await fileToDataURL(file);
    setDraftProfile({ ...draftProfile, photoBase64: url, avatarMode: 'photo' });
  };

  const removePhoto = () =>
    setDraftProfile({ ...draftProfile, photoBase64: undefined, avatarMode: 'default' });

  const setMode = (m: AvatarMode) => setDraftProfile({ ...draftProfile, avatarMode: m });
  const setHeight = (h: number) => setDraftProfile({ ...draftProfile, heightCm: h });
  const setWeight = (w: number) => setDraftProfile({ ...draftProfile, weightKg: w });

  return (
    <div className="space-y-8 max-w-3xl">
      <section>
        <h2 className="text-2xl font-bold mb-4">分類管理</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-sm">
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
            <button onClick={addCategory} className="bg-brand-500 text-white px-4 py-1.5 rounded text-sm">
              新增
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">虛擬人物設定</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {/* Avatar mode chooser */}
          <div className="mb-5">
            <p className="text-sm font-medium mb-2">底圖樣式</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('default')}
                className={`p-3 rounded border text-sm text-left ${
                  draftProfile.avatarMode === 'default'
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500'
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
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500'
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
                              ? 'bg-brand-500 text-white border-brand-500'
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

              {/* Photo upload — always visible */}
              <div>
                <p className="text-sm font-medium mb-1">我的照片（選填）</p>
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded text-sm">
                    📷 拍照
                    <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
                  </label>
                  <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded text-sm">
                    🖼️ 選擇照片
                    <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
                  </label>
                  {draftProfile.photoBase64 && (
                    <button onClick={removePhoto} className="bg-red-100 text-red-700 px-3 py-1.5 rounded text-sm">
                      移除照片
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 建議拍攝<strong>全身正面</strong>、<strong>雙手放下</strong>、<strong>單一背景</strong>，後續對齊衣服效果更好。
                </p>
              </div>

              <button
                onClick={saveProfile}
                disabled={busy}
                className="bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
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

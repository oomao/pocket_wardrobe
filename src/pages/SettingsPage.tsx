import { useState } from 'react';
import { useWardrobe } from '../context/WardrobeContext';
import AvatarPreview from '../components/AvatarPreview';
import { countClothingByCategory } from '../services/storage';
import { Gender, HEIGHT_RANGE, WEIGHT_RANGE } from '../types';

export default function SettingsPage() {
  const { categories, setCategories, profile, setProfile } = useWardrobe();
  const [newCat, setNewCat] = useState('');
  const [draftProfile, setDraftProfile] = useState(profile);

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    if (categories.includes(name)) {
      alert('分類已存在');
      return;
    }
    await setCategories([...categories, name]);
    setNewCat('');
  };

  const removeCategory = async (c: string) => {
    const count = await countClothingByCategory(c);
    if (count > 0) {
      alert(`請先移除該分類下的衣物（共 ${count} 件）`);
      return;
    }
    if (!confirm(`確定刪除分類「${c}」?`)) return;
    await setCategories(categories.filter((x) => x !== c));
  };

  const saveProfile = async () => {
    await setProfile(draftProfile);
    alert('已儲存');
  };

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
        <div className="bg-white rounded-lg border border-gray-200 p-4 grid md:grid-cols-2 gap-6">
          <div className="space-y-5">
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

            <button onClick={saveProfile} className="bg-brand-500 text-white px-4 py-2 rounded text-sm">
              儲存設定
            </button>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-xs text-gray-500 text-center mb-2">預覽</p>
            <AvatarPreview profile={draftProfile} height={280} />
            <p className="text-xs text-gray-500 text-center mt-2">
              {draftProfile.heightCm} cm / {draftProfile.weightKg} kg
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

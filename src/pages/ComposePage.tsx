import { Link } from 'react-router-dom';

interface ModeCard {
  to: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
}

const MODES: ModeCard[] = [
  {
    to: '/tryon',
    icon: '🪞',
    title: '模特兒試穿',
    subtitle: '快速預覽',
    description: '把衣物拖曳到虛擬模特兒或自己的照片上，自由拼貼搭配。智慧對齊會自動把上衣放到肩膀、褲子放到腰，立刻看到搭配的樣子。',
  },
  {
    to: '/ai-tryon',
    icon: '✨',
    title: 'AI 真實試穿',
    subtitle: '擬真合成',
    badge: '需 Google AI Studio Key',
    description: '用 Google Gemini Nano Banana 合成「你穿上這件衣服」的真實照片。效果接近 Google Shopping 商品試穿。',
  },
  {
    to: '/style',
    icon: '🪡',
    title: '平拍造型',
    subtitle: 'Flat-lay',
    description: '不放在身體上，把衣物平面組合成像 Pinterest / 雜誌的搭配卡。適合存「靈感組合」（這三件穿一起的感覺）。',
  },
];

export default function ComposePage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-walnut-700">搭配</h2>
        <p className="text-sm text-walnut-500/70 mt-1">
          選擇一種方式來組合你的衣物。三種模式互補，可以隨時切換。
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODES.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="wood-card p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all flex flex-col group"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-4xl">{m.icon}</span>
              {m.badge && (
                <span className="text-[10px] bg-oak-100 text-walnut-700 px-2 py-0.5 rounded-full">
                  {m.badge}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-walnut-700 mt-2">{m.title}</h3>
            <p className="text-[11px] text-walnut-500/70 uppercase tracking-wider mt-0.5">{m.subtitle}</p>
            <p className="text-sm text-stone-600 mt-3 leading-relaxed flex-1">{m.description}</p>
            <div className="mt-4 text-sm font-medium text-brand-600 group-hover:text-brand-700 transition-colors">
              開始 →
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 wood-card p-5">
        <h3 className="text-base font-semibold text-walnut-700 mb-2">不知道從哪開始？</h3>
        <ol className="text-sm text-stone-600 space-y-1.5 list-decimal pl-5">
          <li>先到 <Link to="/" className="underline">🪵 衣櫥</Link> 上傳幾件衣物</li>
          <li>到 <Link to="/settings" className="underline">⚙️ 設定</Link> 上傳一張全身照（讓模特兒變成你自己）</li>
          <li>回來這裡選一種模式試穿</li>
          <li>滿意的搭配按「儲存」，會出現在 <Link to="/library" className="underline">📔 收藏</Link></li>
        </ol>
      </div>
    </div>
  );
}

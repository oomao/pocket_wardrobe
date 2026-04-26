import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  /** Match these path prefixes to keep the parent active on sub-pages. */
  matches?: string[];
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', label: '衣櫥', icon: '🪵', end: true },
  {
    to: '/compose',
    label: '搭配',
    icon: '🎨',
    matches: ['/compose', '/tryon', '/ai-tryon', '/style'],
  },
  {
    to: '/library',
    label: '收藏',
    icon: '📔',
    matches: ['/library', '/styles', '/outfits'],
  },
  { to: '/insights', label: '數據', icon: '📊' },
  { to: '/settings', label: '設定', icon: '⚙️' },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to;
  if (item.matches) return item.matches.some((p) => pathname.startsWith(p));
  return pathname.startsWith(item.to);
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const close = () => setOpen(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-full md:flex">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 wood-sidebar px-4 h-14 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-wide">🪵 智慧衣櫥</h1>
        <button
          onClick={() => setOpen((s) => !s)}
          aria-label="開啟選單"
          className="p-2 rounded hover:bg-white/10"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {open && <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={close} />}

      <aside
        className={`wood-sidebar p-5 z-50
          md:w-60 md:min-h-screen md:sticky md:top-0
          fixed md:static top-14 left-0 bottom-0 w-64 transform transition-transform
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <h1 className="hidden md:flex items-center gap-2 text-xl font-semibold mb-1 tracking-wide">
          🪵 智慧衣櫥
        </h1>
        <p className="hidden md:block text-[11px] text-cream-200/60 mb-7">Pocket Wardrobe</p>

        <nav className="flex flex-col gap-1.5">
          {navItems.map((it) => {
            const active = isActive(it, location.pathname);
            return (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={close}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-cream-50 text-walnut-700 shadow-sm'
                    : 'text-cream-100/85 hover:bg-white/10'
                }`}
              >
                <span className="text-lg">{it.icon}</span>
                <span className="font-medium">{it.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="hidden md:block mt-auto pt-8 text-[10px] text-cream-200/40">
          資料儲存於本機瀏覽器
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 min-w-0 bg-cream-50">
        <Outlet />
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: '👕 衣櫥', end: true },
  { to: '/add', label: '➕ 新增衣物' },
  { to: '/tryon', label: '🪞 試穿室' },
  { to: '/ai-tryon', label: '✨ AI 試穿' },
  { to: '/outfits', label: '📓 穿搭日誌' },
  { to: '/settings', label: '⚙️ 設定' },
];

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
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
        <h1 className="text-lg font-bold text-brand-700">智慧衣櫥</h1>
        <button
          onClick={() => setOpen((s) => !s)}
          aria-label="開啟選單"
          className="p-2 rounded hover:bg-gray-100"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {open && <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={close} />}

      <aside
        className={`bg-white border-r border-gray-200 p-4 z-50
          md:w-56 md:min-h-screen md:sticky md:top-0
          fixed md:static top-14 left-0 bottom-0 w-64 transform transition-transform
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <h1 className="hidden md:block text-xl font-bold mb-6 text-brand-700">智慧衣櫥</h1>
        <nav className="flex flex-col gap-2">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={close}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                  isActive ? 'bg-brand-500 text-white' : 'text-gray-700 hover:bg-brand-50'
                }`
              }
            >
              {it.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

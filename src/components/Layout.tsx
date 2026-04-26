import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: '👕 衣櫥', end: true },
  { to: '/add', label: '➕ 新增衣物' },
  { to: '/tryon', label: '🪞 試穿室' },
  { to: '/outfits', label: '📓 穿搭日誌' },
  { to: '/settings', label: '⚙️ 設定' },
];

export default function Layout() {
  return (
    <div className="min-h-full flex flex-col md:flex-row">
      <aside className="bg-white md:w-56 md:min-h-screen border-r border-gray-200 p-4">
        <h1 className="text-xl font-bold mb-6 text-brand-700">智慧衣櫥</h1>
        <nav className="flex md:flex-col gap-2 overflow-x-auto">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
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
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

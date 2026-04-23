import { NavLink } from './NavLink'

const navItems = [
  { href: '/overview',  icon: '📊', label: 'Overview' },
  { href: '/runs',      icon: '🏃', label: 'Runs' },
  { href: '/training',  icon: '📈', label: 'Training Load' },
  { href: '/monthly',   icon: '📅', label: 'Monthly' },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-gray-200 bg-white px-3 py-6 min-h-screen">
      <div className="mb-8 px-3">
        <h1 className="text-lg font-bold text-gray-900">Running</h1>
        <p className="text-xs text-gray-400">Analytics</p>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>
    </aside>
  )
}

// client/src/components/Navbar.jsx
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Plus, BookOpen, Activity } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/incidents/new', icon: Plus, label: 'New Incident' },
    { to: '/knowledge', icon: BookOpen, label: 'Knowledge Base' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/25 group-hover:shadow-blue-500/40 transition-shadow">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm leading-none">DigiPlus</span>
              <span className="text-slate-400 text-xs leading-none">Service Desk</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, icon: Icon, label }) => {
              const isActive = to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(to);

              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:block">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

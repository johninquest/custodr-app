import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../ui/Icon';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { path: '/dashboard', label: 'Dashboard', icon: 'home' as const },
    { path: '/commitments', label: 'Commitments', icon: 'list' as const },
    { path: '/profile', label: 'Profile', icon: 'user' as const },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text">Custodr</h1>
          <div className="w-10 h-10 rounded-full bg-primary-subtle flex items-center justify-center text-primary font-semibold">
            M
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around items-center h-16">
            {tabs.map((tab) => {
              const isActive = currentPath === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className="flex flex-col items-center justify-center flex-1 h-full min-w-[44px] min-h-[44px]"
                >
                  <Icon
                    name={tab.icon}
                    size={24}
                    className={isActive ? 'text-primary' : 'text-muted'}
                  />
                  <span
                    className={`text-xs mt-1 ${
                      isActive ? 'text-primary font-semibold' : 'text-muted'
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

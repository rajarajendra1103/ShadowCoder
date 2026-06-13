// Prompt 16 — shared/Navbar.jsx
// Navigation bar for Shadow Coder recruiter pages
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/problems', label: 'Problems' },
  { href: '/invite', label: 'Invite' },
  { href: '/compare', label: 'Compare' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <nav className="bg-[#111827] border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo + nav links */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Shadow Coder Logo" className="w-8 h-8 rounded-lg object-contain" />
              <span className="text-white font-semibold text-lg tracking-tight group-hover:text-blue-400 transition-colors">
                Shadow Coder
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                      isActive
                        ? 'text-white bg-gray-800 font-medium'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <div className="h-0.5 bg-blue-500 rounded-full mt-0.5" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: User + Logout */}
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-gray-400 hidden sm:block">
                {user.name || user.email}
              </span>
            )}
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-gray-800/50 transition-all flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

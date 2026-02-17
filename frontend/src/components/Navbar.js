import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Music2, Menu, X, User, LogOut, Settings, Users, Shield, Globe } from 'lucide-react';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/', label: t('home') },
    { path: '/catalog', label: t('catalog') },
    { path: '/library', label: t('library'), auth: true },
    { path: '/playlists', label: t('playlists'), auth: true },
    { path: '/pricing', label: t('pricing') },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center">
              <Music2 className="w-5 h-5 text-black" />
            </div>
            <span className="font-semibold text-lg hidden sm:block">Kantik Tracks</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              if (link.auth && !user) return null;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nav-link text-sm font-medium ${isActive(link.path) ? 'active' : ''}`}
                  data-testid={`nav-${link.path.replace('/', '') || 'home'}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="text-white/60 hover:text-white"
              data-testid="language-toggle"
            >
              <Globe className="w-4 h-4 mr-1" />
              {language.toUpperCase()}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-trigger">
                    <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <span className="hidden sm:block text-sm">{user.displayName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#0F0F10] border-white/10">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user.displayName}</p>
                    <p className="text-xs text-white/50">{user.email}</p>
                    <div className="mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        user.plan === 'TEAM' ? 'badge-team' :
                        user.plan === 'STANDARD' ? 'badge-standard' :
                        'bg-white/10 text-white/60'
                      }`}>
                        {user.plan}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="flex items-center gap-2 cursor-pointer" data-testid="nav-account-dropdown">
                      <Settings className="w-4 h-4" />
                      {t('account')}
                    </Link>
                  </DropdownMenuItem>
                  {user.plan === 'TEAM' && (
                    <DropdownMenuItem asChild>
                      <Link to="/team" className="flex items-center gap-2 cursor-pointer" data-testid="nav-team-dropdown">
                        <Users className="w-4 h-4" />
                        {t('team')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer" data-testid="nav-admin-dropdown">
                        <Shield className="w-4 h-4" />
                        {t('admin')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    onClick={logout} 
                    className="text-red-400 cursor-pointer"
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/auth?mode=login">
                  <Button variant="ghost" className="text-white/80 hover:text-white" data-testid="nav-login">
                    {t('login')}
                  </Button>
                </Link>
                <Link to="/auth?mode=register">
                  <Button className="btn-primary text-sm px-4 py-2" data-testid="nav-register">
                    {t('register')}
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10" data-testid="mobile-menu">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => {
                if (link.auth && !user) return null;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-4 py-2 rounded-lg ${isActive(link.path) ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

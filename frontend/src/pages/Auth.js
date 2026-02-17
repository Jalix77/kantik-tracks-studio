import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Music2, Mail, Lock, User, ArrowRight } from 'lucide-react';

export const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { t } = useLanguage();
  
  const [mode, setMode] = useState(searchParams.get('mode') || 'login');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        if (!formData.displayName.trim()) {
          toast.error('Please enter your name');
          setLoading(false);
          return;
        }
        await register(formData.email, formData.password, formData.displayName);
        toast.success('Account created!');
      }
      navigate('/');
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24" data-testid="auth-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#D4AF37] flex items-center justify-center">
              <Music2 className="w-6 h-6 text-black" />
            </div>
            <span className="text-xl font-semibold">Kantik Tracks</span>
          </Link>
        </div>

        {/* Form Card */}
        <div className="surface-card rounded-2xl p-8">
          <h1 className="text-2xl font-semibold text-center mb-8">
            {mode === 'login' ? t('loginTitle') : t('registerTitle')}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'register' && (
              <div>
                <label className="text-sm text-white/50 mb-2 block">{t('displayName')}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <Input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Your name"
                    className="pl-12 input-dark h-12"
                    required={mode === 'register'}
                    data-testid="displayname-input"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-white/50 mb-2 block">{t('email')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="pl-12 input-dark h-12"
                  required
                  data-testid="email-input"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-white/50 mb-2 block">{t('password')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="pl-12 input-dark h-12"
                  required
                  minLength={6}
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="btn-primary w-full h-12"
              disabled={loading}
              data-testid="auth-submit-btn"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? t('login') : t('register')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            {mode === 'login' ? (
              <p className="text-white/50">
                {t('dontHaveAccount')}{' '}
                <button
                  onClick={() => setMode('register')}
                  className="text-[#D4AF37] hover:underline"
                  data-testid="switch-to-register"
                >
                  {t('registerHere')}
                </button>
              </p>
            ) : (
              <p className="text-white/50">
                {t('alreadyHaveAccount')}{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-[#D4AF37] hover:underline"
                  data-testid="switch-to-login"
                >
                  {t('loginHere')}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

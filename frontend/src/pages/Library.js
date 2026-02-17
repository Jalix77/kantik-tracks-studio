import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Library as LibraryIcon, Download, Music2, ArrowRight, Lock } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Library = () => {
  const { user, isPlanActive } = useAuth();
  const { t } = useLanguage();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLibrary();
  }, []);

  const fetchLibrary = async () => {
    try {
      const response = await axios.get(`${API}/library`);
      setSongs(response.data);
    } catch (error) {
      console.error('Failed to fetch library:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!user || user.plan === 'FREE') {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="library-page">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-24">
            <div className="w-24 h-24 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-12 h-12 text-[#D4AF37]/60" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">{t('emptyLibrary')}</h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              Upgrade to Standard or Team plan to download songs and build your personal library.
            </p>
            <Link to="/pricing">
              <Button className="btn-primary" data-testid="upgrade-btn">
                {t('upgrade')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="library-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-2">
            <LibraryIcon className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-sm text-[#D4AF37] uppercase tracking-wider">{t('myLibrary')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold">{t('myLibrary')}</h1>
          <p className="text-white/50 mt-2">Your downloaded chord charts and resources</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="surface-card rounded-lg p-4 flex items-center gap-4">
                <div className="skeleton w-16 h-16 rounded" />
                <div className="flex-1">
                  <div className="skeleton h-5 w-1/2 mb-2" />
                  <div className="skeleton h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
              <Music2 className="w-12 h-12 text-white/20" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">{t('emptyLibrary')}</h2>
            <p className="text-white/50 mb-8">{t('emptyLibraryDesc')}</p>
            <Link to="/catalog">
              <Button className="btn-primary" data-testid="browse-catalog-btn">
                {t('browseCatalog')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {songs.map((song) => (
              <Link
                key={song.id}
                to={`/song/${song.id}`}
                className="surface-card rounded-lg p-4 flex items-center gap-4 hover:border-[#D4AF37]/30 transition-colors block"
                data-testid={`library-song-${song.id}`}
              >
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#2E0249]/30 to-[#0F0F10] flex items-center justify-center flex-shrink-0">
                  <Music2 className="w-8 h-8 text-[#D4AF37]/60" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-[#D4AF37]/50">
                      #{song.number.toString().padStart(2, '0')}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={song.accessTier === 'PREMIUM' ? 'badge-premium' : 'badge-standard'}
                    >
                      {song.accessTier}
                    </Badge>
                  </div>
                  <h3 className="font-semibold truncate">{song.title}</h3>
                  {song.downloadedAt && (
                    <p className="text-sm text-white/40">
                      {t('downloadedOn')} {formatDate(song.downloadedAt)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-white/40">
                  <Download className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

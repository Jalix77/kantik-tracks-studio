import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Badge } from './ui/badge';
import { Music2, Download } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const SongCard = ({ song }) => {
  const { t } = useLanguage();
  const [imageError, setImageError] = useState(false);
  
  // Check if song has a preview image resource
  const hasPreview = song.resources?.some(r => r.type === 'PREVIEW_IMAGE');
  const previewUrl = hasPreview ? `${API}/songs/${song.id}/preview` : null;

  return (
    <Link 
      to={`/song/${song.id}`} 
      className="song-card group block"
      data-testid={`song-card-${song.id}`}
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-[#2E0249]/30 to-[#0F0F10] overflow-hidden">
        {/* Preview image or placeholder */}
        {previewUrl && !imageError ? (
          <img
            src={previewUrl}
            alt={song.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Music2 className="w-10 h-10 text-[#D4AF37]/60" />
            </div>
          </div>
        )}
        
        {/* Number badge */}
        <div className="absolute top-3 left-3">
          <span className="font-mono text-2xl font-bold text-white/20 drop-shadow-lg">
            #{song.number.toString().padStart(2, '0')}
          </span>
        </div>
        
        {/* Access tier badge */}
        <div className="absolute top-3 right-3">
          <Badge 
            variant="outline" 
            className={song.accessTier === 'PREMIUM' ? 'badge-premium' : 'badge-standard'}
          >
            {song.accessTier === 'PREMIUM' ? t('premium') : t('standard')}
          </Badge>
        </div>
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span className="text-white font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            {t('downloadChords')}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1">
          {song.title}
        </h3>
        <div className="flex items-center gap-3 mt-2 text-sm text-white/50">
          {song.keyOriginal && (
            <span>{t('key')}: {song.keyOriginal}</span>
          )}
          {song.language && (
            <span className="uppercase">{song.language}</span>
          )}
        </div>
        {song.tags && song.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {song.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { Music2, Download, Plus, ArrowLeft, Key, Clock, Tag, FileText, Lock, LogIn } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const SongDetail = () => {
  const { id } = useParams();
  const { user, canDownload, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [song, setSong] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [relatedSongs, setRelatedSongs] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);

  const fetchSong = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/songs/${id}`);
      setSong(response.data);
      
      // Fetch related songs (same tags)
      if (response.data.tags && response.data.tags.length > 0) {
        const relatedResponse = await axios.get(`${API}/songs?tags=${response.data.tags[0]}`);
        setRelatedSongs(relatedResponse.data.filter(s => s.id !== id).slice(0, 3));
      }
    } catch (error) {
      console.error('Failed to fetch song:', error);
      toast.error('Failed to load song');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const checkPreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewError(false);
    try {
      const response = await axios.get(`${API}/songs/${id}/preview/status`);
      if (response.data.hasPreview) {
        // Set the preview URL - this is a public endpoint
        setPreviewUrl(`${API}/songs/${id}/preview`);
      } else {
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Failed to check preview:', error);
      setPreviewUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSong();
  }, [fetchSong]);

  useEffect(() => {
    if (song) {
      checkPreview();
    }
  }, [song, checkPreview]);

  const fetchPlaylists
    if (!isAuthenticated) return;
    try {
      const response = await axios.get(`${API}/playlists`);
      setPlaylists(response.data);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  };

  const handleDownload = async (resourceType) => {
    if (!isAuthenticated) {
      toast.error(t('loginToDownload'));
      return;
    }

    if (!canDownload(song.accessTier)) {
      toast.error(t('upgradeToDownload'));
      return;
    }

    setDownloading(true);
    try {
      const response = await axios.get(`${API}/songs/${id}/download/${resourceType}`);
      
      // Decode base64 and download
      const byteCharacters = atob(response.data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: response.data.contentType });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Download started!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(error.response?.data?.detail || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    try {
      await axios.post(`${API}/playlists/${playlistId}/songs/${id}`);
      toast.success('Song added to playlist!');
      setPlaylistDialogOpen(false);
    } catch (error) {
      console.error('Failed to add to playlist:', error);
      toast.error('Failed to add song to playlist');
    }
  };

  const hasChordsPdf = song?.resources?.some(r => r.type === 'CHORDS_PDF');
  const hasLyricsPdf = song?.resources?.some(r => r.type === 'LYRICS_PDF');

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="skeleton h-8 w-32 mb-8" />
          <div className="skeleton h-12 w-3/4 mb-4" />
          <div className="skeleton h-6 w-1/2 mb-8" />
          <div className="skeleton h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <Music2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-medium">Song not found</h2>
          <Link to="/catalog">
            <Button className="btn-secondary mt-4">Back to Catalog</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="song-detail-page">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Link to="/catalog" className="inline-flex items-center text-white/50 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back')} {t('catalog')}
        </Link>

        {/* Song Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-4xl font-bold text-[#D4AF37]/30">
              #{song.number.toString().padStart(2, '0')}
            </span>
            <Badge 
              variant="outline" 
              className={song.accessTier === 'PREMIUM' ? 'badge-premium' : 'badge-standard'}
            >
              {song.accessTier === 'PREMIUM' ? t('premium') : t('standard')}
            </Badge>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-semibold mb-4" data-testid="song-title">
            {song.title}
          </h1>
          
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-6 text-white/50">
            {song.keyOriginal && (
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                <span>{t('key')}: <span className="text-white">{song.keyOriginal}</span></span>
              </div>
            )}
            {song.tempo && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{t('tempo')}: <span className="text-white">{song.tempo} BPM</span></span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="uppercase text-white">{song.language === 'fr' ? t('french') : t('creole')}</span>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="surface-card rounded-2xl p-8 mb-8">
          {/* Preview Image */}
          <div className="aspect-video bg-gradient-to-br from-[#2E0249]/30 to-[#0F0F10] rounded-xl overflow-hidden flex items-center justify-center mb-8 relative">
            {previewLoading ? (
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white/40">Loading preview...</p>
              </div>
            ) : previewUrl && !previewError ? (
              <img 
                src={previewUrl}
                alt={`Preview of ${song.title}`}
                className="w-full h-full object-contain"
                onError={() => setPreviewError(true)}
                data-testid="song-preview-image"
              />
            ) : (
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4">
                  <Music2 className="w-12 h-12 text-[#D4AF37]/60" />
                </div>
                <p className="text-white/40">Preview coming soon</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            {hasChordsPdf ? (
              <Button 
                className="btn-primary flex-1 sm:flex-none"
                onClick={() => handleDownload('CHORDS_PDF')}
                disabled={downloading || (!isAuthenticated || !canDownload(song.accessTier))}
                data-testid="download-chords-btn"
              >
                {!isAuthenticated ? (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    {t('loginToDownload')}
                  </>
                ) : !canDownload(song.accessTier) ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    {t('upgradeToDownload')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t('downloadChords')}
                  </>
                )}
              </Button>
            ) : (
              <Button className="btn-secondary flex-1 sm:flex-none" disabled>
                <FileText className="w-4 h-4 mr-2" />
                Chords PDF not available
              </Button>
            )}

            {hasLyricsPdf && (
              <Button 
                className="btn-secondary flex-1 sm:flex-none"
                onClick={() => handleDownload('LYRICS_PDF')}
                disabled={downloading || (!isAuthenticated || !canDownload(song.accessTier))}
                data-testid="download-lyrics-btn"
              >
                <FileText className="w-4 h-4 mr-2" />
                {t('downloadLyrics')}
              </Button>
            )}

            {isAuthenticated && (
              <Dialog open={playlistDialogOpen} onOpenChange={(open) => {
                setPlaylistDialogOpen(open);
                if (open) fetchPlaylists();
              }}>
                <DialogTrigger asChild>
                  <Button className="btn-secondary" data-testid="add-to-playlist-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('addToPlaylist')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0F0F10] border-white/10">
                  <DialogHeader>
                    <DialogTitle>{t('addToPlaylist')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 mt-4">
                    {playlists.length === 0 ? (
                      <div className="text-center py-8 text-white/50">
                        <p>{t('noPlaylists')}</p>
                        <Link to="/playlists">
                          <Button className="btn-primary mt-4">{t('createPlaylist')}</Button>
                        </Link>
                      </div>
                    ) : (
                      playlists.map((playlist) => (
                        <button
                          key={playlist.id}
                          onClick={() => handleAddToPlaylist(playlist.id)}
                          className="w-full p-4 text-left rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          data-testid={`playlist-option-${playlist.id}`}
                        >
                          <p className="font-medium">{playlist.name}</p>
                          <p className="text-sm text-white/50">
                            {playlist.songIds.length} {t('songs')}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Tags */}
        {song.tags && song.tags.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-sm text-white/50">{t('tags')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {song.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-4 py-2 rounded-full bg-white/5 text-white/60 text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Songs */}
        {relatedSongs.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-6">{t('relatedSongs')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedSongs.map((relatedSong) => (
                <Link 
                  key={relatedSong.id}
                  to={`/song/${relatedSong.id}`}
                  className="surface-card rounded-lg p-4 hover:border-[#D4AF37]/30 transition-colors"
                >
                  <span className="font-mono text-sm text-[#D4AF37]/50">
                    #{relatedSong.number.toString().padStart(2, '0')}
                  </span>
                  <h4 className="font-medium mt-1">{relatedSong.title}</h4>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { SongCard } from '../components/SongCard';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Search, Filter, Music2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Catalog = () => {
  const { t } = useLanguage();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [accessTier, setAccessTier] = useState('');
  const [sort, setSort] = useState('number');

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (language) params.append('language', language);
      if (accessTier) params.append('accessTier', accessTier);
      if (sort) params.append('sort', sort);

      const response = await axios.get(`${API}/songs?${params.toString()}`);
      setSongs(response.data);
    } catch (error) {
      console.error('Failed to fetch songs:', error);
    } finally {
      setLoading(false);
    }
  }, [language, accessTier, sort, search]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const handleSearch
    e.preventDefault();
    fetchSongs();
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="catalog-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-2">
            <Music2 className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-sm text-[#D4AF37] uppercase tracking-wider">{t('catalog')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold">Chants d'Espérance</h1>
          <p className="text-white/50 mt-2">Browse and download chord charts for your worship</p>
        </div>

        {/* Search and Filters */}
        <div className="surface-card rounded-xl p-6 mb-8">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <Input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 input-dark h-12"
                data-testid="search-input"
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Select value={language || "all"} onValueChange={(v) => setLanguage(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px] input-dark" data-testid="language-filter">
                  <SelectValue placeholder={t('allLanguages')} />
                </SelectTrigger>
                <SelectContent className="bg-[#0F0F10] border-white/10">
                  <SelectItem value="all">{t('allLanguages')}</SelectItem>
                  <SelectItem value="fr">{t('french')}</SelectItem>
                  <SelectItem value="ht">{t('creole')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={accessTier || "all"} onValueChange={(v) => setAccessTier(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px] input-dark" data-testid="tier-filter">
                  <SelectValue placeholder={t('allTiers')} />
                </SelectTrigger>
                <SelectContent className="bg-[#0F0F10] border-white/10">
                  <SelectItem value="all">{t('allTiers')}</SelectItem>
                  <SelectItem value="STANDARD">{t('standard')}</SelectItem>
                  <SelectItem value="PREMIUM">{t('premium')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[140px] input-dark" data-testid="sort-filter">
                  <SelectValue placeholder={t('sortBy')} />
                </SelectTrigger>
                <SelectContent className="bg-[#0F0F10] border-white/10">
                  <SelectItem value="number">{t('number')}</SelectItem>
                  <SelectItem value="popular">{t('popular')}</SelectItem>
                  <SelectItem value="newest">{t('newest')}</SelectItem>
                </SelectContent>
              </Select>

              <Button type="submit" className="btn-primary h-10" data-testid="search-btn">
                <Filter className="w-4 h-4 mr-2" />
                {t('search')}
              </Button>
            </div>
          </form>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="surface-card rounded-lg overflow-hidden">
                <div className="aspect-[4/3] skeleton" />
                <div className="p-4">
                  <div className="h-5 skeleton mb-2 w-3/4" />
                  <div className="h-4 skeleton w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-24">
            <Music2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white/60">{t('noSongsFound')}</h3>
            <p className="text-white/40 mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <p className="text-white/50 mb-6">{songs.length} {t('songs')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {songs.map((song) => (
                <SongCard key={song.id} song={song} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

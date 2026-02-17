import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { SongCard } from '../components/SongCard';
import { Button } from '../components/ui/button';
import { Music2, Download, ListMusic, Users, ArrowRight, Sparkles } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Home = () => {
  const { t } = useLanguage();
  const [featuredSongs, setFeaturedSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await axios.get(`${API}/songs/featured`);
        setFeaturedSongs(response.data);
      } catch (error) {
        console.error('Failed to fetch featured songs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const features = [
    {
      icon: Download,
      title: 'PDF Chord Charts',
      description: 'Download professional chord charts for Haitian hymns'
    },
    {
      icon: ListMusic,
      title: 'Playlists & Setlists',
      description: 'Organize your worship service with drag-and-drop playlists'
    },
    {
      icon: Users,
      title: 'Team Sharing',
      description: 'Share resources with your worship team (up to 7 members)'
    }
  ];

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center hero-gradient">
        {/* Background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1484584343816-b22e89904ab2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzV8MHwxfHNlYXJjaHwzfHx3b3JzaGlwJTIwbGVhZGVyJTIwc3RhZ2UlMjBzaWxob3VldHRlJTIwZGFyayUyMG1vb2R5fGVufDB8fHx8MTc3MTI5MzQ2NHww&ixlib=rb-4.1.0&q=85')`
          }}
        />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37] flex items-center justify-center">
                <Music2 className="w-6 h-6 text-black" />
              </div>
              <span className="text-[#D4AF37] font-medium">Kantik Tracks Studio</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-6 animate-fade-in">
              {t('heroTitle')}
            </h1>
            
            <p className="text-xl md:text-2xl text-white/60 font-light mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              {t('heroSubtitle')}
            </p>
            
            <p className="text-base text-white/40 mb-10 max-w-2xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {t('heroDescription')}
            </p>
            
            <div className="flex flex-wrap gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Link to="/catalog">
                <Button className="btn-primary group" data-testid="browse-catalog-btn">
                  {t('browseCatalog')}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button className="btn-secondary" data-testid="learn-more-btn">
                  {t('learnMore')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050505] to-transparent" />
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="feature-card group hover:border-[#D4AF37]/30 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-6 group-hover:bg-[#D4AF37]/20 transition-colors">
                <feature.icon className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-white/50">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Songs Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-sm text-[#D4AF37] uppercase tracking-wider">{t('featuredSongs')}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold">{t('featuredSongs')}</h2>
          </div>
          <Link to="/catalog">
            <Button variant="ghost" className="text-white/60 hover:text-white group" data-testid="view-all-btn">
              {t('viewAll')}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="surface-card rounded-lg overflow-hidden">
                <div className="aspect-[4/3] skeleton" />
                <div className="p-4">
                  <div className="h-5 skeleton mb-2 w-3/4" />
                  <div className="h-4 skeleton w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredSongs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div 
            className="surface-card rounded-2xl p-12 border border-[#D4AF37]/20"
            style={{ boxShadow: '0 0 60px -20px rgba(212, 175, 55, 0.2)' }}
          >
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">
              Ready to enhance your worship?
            </h2>
            <p className="text-white/50 mb-8 max-w-xl mx-auto">
              Join thousands of worship leaders accessing quality chord charts for Chants d'Espérance.
            </p>
            <Link to="/pricing">
              <Button className="btn-primary" data-testid="get-started-btn">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center">
              <Music2 className="w-4 h-4 text-black" />
            </div>
            <span className="font-semibold">Kantik Tracks Studio</span>
          </div>
          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} Kantik Tracks Studio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

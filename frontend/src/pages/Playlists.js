import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { ListMusic, Plus, Music2, Trash2, GripVertical, Users, User } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SortableSongItem = ({ song, playlistId, onRemove }) => {
  const { t } = useLanguage();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="surface-card rounded-lg p-4 flex items-center gap-4"
      data-testid={`playlist-song-${song.id}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-white/30 hover:text-white/60">
        <GripVertical className="w-5 h-5" />
      </button>
      
      <div className="w-12 h-12 rounded bg-gradient-to-br from-[#2E0249]/30 to-[#0F0F10] flex items-center justify-center flex-shrink-0">
        <Music2 className="w-6 h-6 text-[#D4AF37]/60" />
      </div>
      
      <div className="flex-1 min-w-0">
        <span className="font-mono text-xs text-[#D4AF37]/50">
          #{song.number?.toString().padStart(2, '0')}
        </span>
        <h4 className="font-medium truncate">{song.title}</h4>
      </div>
      
      <Link to={`/song/${song.id}`}>
        <Button variant="ghost" size="sm" className="text-white/50 hover:text-white">
          View
        </Button>
      </Link>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className="text-red-400/50 hover:text-red-400"
        onClick={() => onRemove(song.id)}
        data-testid={`remove-song-${song.id}`}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export const Playlists = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistType, setNewPlaylistType] = useState('USER');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const response = await axios.get(`${API}/playlists`);
      setPlaylists(response.data);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylistDetail = async (playlistId) => {
    try {
      const response = await axios.get(`${API}/playlists/${playlistId}`);
      setSelectedPlaylist(response.data);
    } catch (error) {
      console.error('Failed to fetch playlist:', error);
      toast.error('Failed to load playlist');
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    try {
      const response = await axios.post(`${API}/playlists`, {
        name: newPlaylistName,
        ownerType: newPlaylistType
      });
      setPlaylists([...playlists, response.data]);
      setNewPlaylistName('');
      setCreateDialogOpen(false);
      toast.success('Playlist created!');
    } catch (error) {
      console.error('Failed to create playlist:', error);
      toast.error(error.response?.data?.detail || 'Failed to create playlist');
    }
  };

  const deletePlaylist = async (playlistId) => {
    if (!window.confirm('Are you sure you want to delete this playlist?')) return;
    
    try {
      await axios.delete(`${API}/playlists/${playlistId}`);
      setPlaylists(playlists.filter(p => p.id !== playlistId));
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
      }
      toast.success('Playlist deleted');
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      toast.error('Failed to delete playlist');
    }
  };

  const removeSongFromPlaylist = async (songId) => {
    if (!selectedPlaylist) return;
    
    try {
      await axios.delete(`${API}/playlists/${selectedPlaylist.id}/songs/${songId}`);
      setSelectedPlaylist({
        ...selectedPlaylist,
        songs: selectedPlaylist.songs.filter(s => s.id !== songId),
        songIds: selectedPlaylist.songIds.filter(id => id !== songId)
      });
      toast.success('Song removed');
    } catch (error) {
      console.error('Failed to remove song:', error);
      toast.error('Failed to remove song');
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id && selectedPlaylist) {
      const oldIndex = selectedPlaylist.songs.findIndex(s => s.id === active.id);
      const newIndex = selectedPlaylist.songs.findIndex(s => s.id === over.id);
      
      const newSongs = arrayMove(selectedPlaylist.songs, oldIndex, newIndex);
      const newSongIds = newSongs.map(s => s.id);
      
      setSelectedPlaylist({
        ...selectedPlaylist,
        songs: newSongs,
        songIds: newSongIds
      });
      
      // Update on server
      try {
        await axios.put(`${API}/playlists/${selectedPlaylist.id}`, {
          songIds: newSongIds
        });
      } catch (error) {
        console.error('Failed to reorder:', error);
        toast.error('Failed to save order');
      }
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="playlists-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ListMusic className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-sm text-[#D4AF37] uppercase tracking-wider">{t('playlists')}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold">{t('myPlaylists')}</h1>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary" data-testid="create-playlist-btn">
                <Plus className="w-4 h-4 mr-2" />
                {t('createPlaylist')}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0F0F10] border-white/10">
              <DialogHeader>
                <DialogTitle>{t('createPlaylist')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm text-white/50 mb-2 block">{t('playlistName')}</label>
                  <Input
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="My Worship Set"
                    className="input-dark"
                    data-testid="playlist-name-input"
                  />
                </div>
                
                {user?.teamId && (
                  <div>
                    <label className="text-sm text-white/50 mb-2 block">Type</label>
                    <Select value={newPlaylistType} onValueChange={setNewPlaylistType}>
                      <SelectTrigger className="input-dark" data-testid="playlist-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F0F10] border-white/10">
                        <SelectItem value="USER">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {t('personalPlaylist')}
                          </div>
                        </SelectItem>
                        <SelectItem value="TEAM">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {t('teamPlaylist')}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <Button 
                  className="btn-primary w-full" 
                  onClick={createPlaylist}
                  disabled={!newPlaylistName.trim()}
                  data-testid="confirm-create-playlist"
                >
                  {t('createPlaylist')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Playlists List */}
          <div className="lg:col-span-1">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton h-20 rounded-lg" />
                ))}
              </div>
            ) : playlists.length === 0 ? (
              <div className="text-center py-12">
                <ListMusic className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/50">{t('noPlaylists')}</p>
                <p className="text-sm text-white/30 mt-1">{t('createFirstPlaylist')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => fetchPlaylistDetail(playlist.id)}
                    className={`w-full text-left surface-card rounded-lg p-4 transition-colors ${
                      selectedPlaylist?.id === playlist.id ? 'border-[#D4AF37]/50' : 'hover:border-white/20'
                    }`}
                    data-testid={`playlist-${playlist.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {playlist.ownerType === 'TEAM' ? (
                            <Users className="w-4 h-4 text-purple-400" />
                          ) : (
                            <User className="w-4 h-4 text-white/40" />
                          )}
                          <h3 className="font-medium">{playlist.name}</h3>
                        </div>
                        <p className="text-sm text-white/40">
                          {playlist.songIds?.length || 0} {t('songs')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400/50 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlaylist(playlist.id);
                        }}
                        data-testid={`delete-playlist-${playlist.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Playlist Detail */}
          <div className="lg:col-span-2">
            {selectedPlaylist ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">{selectedPlaylist.name}</h2>
                    <p className="text-white/50">
                      {selectedPlaylist.songs?.length || 0} {t('songs')}
                    </p>
                  </div>
                </div>

                {selectedPlaylist.songs && selectedPlaylist.songs.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={selectedPlaylist.songs.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {selectedPlaylist.songs.map((song) => (
                          <SortableSongItem
                            key={song.id}
                            song={song}
                            playlistId={selectedPlaylist.id}
                            onRemove={removeSongFromPlaylist}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="text-center py-16 surface-card rounded-xl">
                    <Music2 className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/50">No songs in this playlist</p>
                    <Link to="/catalog">
                      <Button className="btn-secondary mt-4">
                        {t('browseCatalog')}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-24 surface-card rounded-xl">
                <ListMusic className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/50">Select a playlist to view songs</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

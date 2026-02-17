import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Shield, Music2, Plus, Edit, Trash2, Upload, FileText, Image, 
  ArrowLeft, Check, X
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AdminSongs = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [songDialogOpen, setSongDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [deletingSong, setDeletingSong] = useState(null);
  const [uploadingSongId, setUploadingSongId] = useState(null);
  
  const [songForm, setSongForm] = useState({
    number: '',
    title: '',
    language: 'fr',
    keyOriginal: '',
    tempo: '',
    tags: '',
    accessTier: 'STANDARD',
    active: true
  });

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const response = await axios.get(`${API}/admin/songs`);
      setSongs(response.data);
    } catch (error) {
      console.error('Failed to fetch songs:', error);
      toast.error('Failed to load songs');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSongForm({
      number: '',
      title: '',
      language: 'fr',
      keyOriginal: '',
      tempo: '',
      tags: '',
      accessTier: 'STANDARD',
      active: true
    });
    setEditingSong(null);
  };

  const handleEditSong = (song) => {
    setEditingSong(song);
    setSongForm({
      number: song.number.toString(),
      title: song.title,
      language: song.language,
      keyOriginal: song.keyOriginal || '',
      tempo: song.tempo?.toString() || '',
      tags: song.tags?.join(', ') || '',
      accessTier: song.accessTier,
      active: song.active
    });
    setSongDialogOpen(true);
  };

  const handleSongSubmit = async () => {
    try {
      const data = {
        number: parseInt(songForm.number),
        title: songForm.title,
        language: songForm.language,
        keyOriginal: songForm.keyOriginal || null,
        tempo: songForm.tempo ? parseInt(songForm.tempo) : null,
        tags: songForm.tags ? songForm.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        accessTier: songForm.accessTier,
        active: songForm.active
      };

      if (editingSong) {
        await axios.put(`${API}/songs/${editingSong.id}`, data);
        toast.success('Song updated!');
      } else {
        await axios.post(`${API}/songs`, data);
        toast.success('Song created!');
      }
      
      setSongDialogOpen(false);
      resetForm();
      fetchSongs();
    } catch (error) {
      console.error('Failed to save song:', error);
      toast.error(error.response?.data?.detail || 'Failed to save song');
    }
  };

  const handleDeleteSong = async () => {
    if (!deletingSong) return;
    
    try {
      await axios.delete(`${API}/songs/${deletingSong.id}`);
      toast.success('Song disabled');
      setDeleteDialogOpen(false);
      setDeletingSong(null);
      fetchSongs();
    } catch (error) {
      console.error('Failed to delete song:', error);
      toast.error('Failed to delete song');
    }
  };

  const handleToggleActive = async (song) => {
    try {
      await axios.put(`${API}/songs/${song.id}`, { active: !song.active });
      toast.success(song.active ? 'Song disabled' : 'Song enabled');
      fetchSongs();
    } catch (error) {
      console.error('Failed to toggle song:', error);
      toast.error('Failed to update song');
    }
  };

  const handleUploadResource = async (songId, resourceType, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('resourceType', resourceType);
    
    // Show loading toast for PDF uploads (preview generation)
    let loadingToast;
    if (resourceType === 'CHORDS_PDF') {
      loadingToast = toast.loading('Uploading PDF and generating preview...');
    }
    
    try {
      const response = await axios.post(`${API}/songs/${songId}/resources`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      
      if (response.data.previewGenerated) {
        toast.success('PDF uploaded and preview generated!');
      } else {
        toast.success(`${resourceType.replace('_', ' ')} uploaded!`);
      }
      fetchSongs();
    } catch (error) {
      if (loadingToast) {
        toast.dismiss(loadingToast);
      }
      console.error('Failed to upload resource:', error);
      toast.error('Failed to upload resource');
    }
  };

  const hasResource = (song, type) => {
    return song.resources?.some(r => r.type === type);
  };

  if (!user?.isAdmin && user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-medium">Admin access required</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="admin-songs-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <Link to="/admin" className="inline-flex items-center text-white/50 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-2 mb-2">
              <Music2 className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-sm text-[#D4AF37] uppercase tracking-wider">Admin</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold">Manage Songs</h1>
            <p className="text-white/50 mt-2">{songs.length} songs total</p>
          </div>

          <Dialog open={songDialogOpen} onOpenChange={(open) => {
            setSongDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="btn-primary" data-testid="add-song-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Song
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0F0F10] border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSong ? 'Edit Song' : 'Add New Song'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/50 mb-2 block">Number *</label>
                    <Input
                      type="number"
                      value={songForm.number}
                      onChange={(e) => setSongForm({ ...songForm, number: e.target.value })}
                      className="input-dark"
                      required
                      data-testid="song-number-input"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/50 mb-2 block">Language</label>
                    <Select value={songForm.language} onValueChange={(v) => setSongForm({ ...songForm, language: v })}>
                      <SelectTrigger className="input-dark">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F0F10] border-white/10">
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="ht">Haitian Creole</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-white/50 mb-2 block">Title *</label>
                  <Input
                    value={songForm.title}
                    onChange={(e) => setSongForm({ ...songForm, title: e.target.value })}
                    className="input-dark"
                    required
                    data-testid="song-title-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/50 mb-2 block">Key</label>
                    <Input
                      value={songForm.keyOriginal}
                      onChange={(e) => setSongForm({ ...songForm, keyOriginal: e.target.value })}
                      placeholder="G, Am, etc."
                      className="input-dark"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/50 mb-2 block">Tempo (BPM)</label>
                    <Input
                      type="number"
                      value={songForm.tempo}
                      onChange={(e) => setSongForm({ ...songForm, tempo: e.target.value })}
                      placeholder="120"
                      className="input-dark"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-white/50 mb-2 block">Access Tier</label>
                  <Select value={songForm.accessTier} onValueChange={(v) => setSongForm({ ...songForm, accessTier: v })}>
                    <SelectTrigger className="input-dark">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0F0F10] border-white/10">
                      <SelectItem value="STANDARD">Standard</SelectItem>
                      <SelectItem value="PREMIUM">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-white/50 mb-2 block">Tags (comma separated)</label>
                  <Input
                    value={songForm.tags}
                    onChange={(e) => setSongForm({ ...songForm, tags: e.target.value })}
                    placeholder="louange, adoration, prière"
                    className="input-dark"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-white/50">Active</label>
                  <Switch
                    checked={songForm.active}
                    onCheckedChange={(checked) => setSongForm({ ...songForm, active: checked })}
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button variant="ghost" onClick={() => setSongDialogOpen(false)}>Cancel</Button>
                <Button 
                  className="btn-primary"
                  onClick={handleSongSubmit}
                  disabled={!songForm.number || !songForm.title}
                  data-testid="save-song-btn"
                >
                  {editingSong ? 'Update Song' : 'Create Song'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Songs Table */}
        <div className="surface-card rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-16 mb-4 rounded" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">#</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Title</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Tier</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Status</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Resources</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {songs.map((song) => (
                    <tr key={song.id} className="border-b border-white/5 hover:bg-white/5" data-testid={`admin-song-row-${song.id}`}>
                      <td className="py-4 px-6 font-mono text-[#D4AF37]">{song.number.toString().padStart(2, '0')}</td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium">{song.title}</p>
                          <p className="text-sm text-white/40">{song.language === 'fr' ? 'French' : 'Creole'} • Key: {song.keyOriginal || '-'}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge className={song.accessTier === 'PREMIUM' ? 'badge-premium' : 'badge-standard'}>
                          {song.accessTier}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {song.active ? (
                            <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400">Inactive</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleUploadResource(song.id, 'CHORDS_PDF', e.target.files[0]);
                                }
                              }}
                            />
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
                              hasResource(song, 'CHORDS_PDF') 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-white/10 text-white/40 hover:bg-white/20'
                            }`}>
                              <FileText className="w-3 h-3" />
                              Chords {hasResource(song, 'CHORDS_PDF') ? '✓' : ''}
                            </span>
                          </label>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleUploadResource(song.id, 'LYRICS_PDF', e.target.files[0]);
                                }
                              }}
                            />
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
                              hasResource(song, 'LYRICS_PDF') 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-white/10 text-white/40 hover:bg-white/20'
                            }`}>
                              <FileText className="w-3 h-3" />
                              Lyrics {hasResource(song, 'LYRICS_PDF') ? '✓' : ''}
                            </span>
                          </label>
                          {/* Preview is auto-generated from Chords PDF */}
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            hasResource(song, 'PREVIEW_IMAGE') 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : 'bg-white/5 text-white/30'
                          }`} title="Preview is auto-generated when you upload Chords PDF">
                            <Image className="w-3 h-3" />
                            Preview {hasResource(song, 'PREVIEW_IMAGE') ? '(auto)' : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSong(song)}
                            data-testid={`edit-song-${song.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(song)}
                            className={song.active ? 'text-red-400/50 hover:text-red-400' : 'text-green-400/50 hover:text-green-400'}
                          >
                            {song.active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-[#0F0F10] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle>Disable Song?</AlertDialogTitle>
              <AlertDialogDescription>
                This will hide "{deletingSong?.title}" from the catalog. You can re-enable it later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDeleteSong}
              >
                Disable
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

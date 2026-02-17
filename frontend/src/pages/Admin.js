import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { 
  Shield, Music2, CreditCard, Users, Plus, Edit, Trash2, Upload, 
  Check, X, Clock, BarChart3, Download, UserCheck
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Admin = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [songs, setSongs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Song form state
  const [songDialogOpen, setSongDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [songForm, setSongForm] = useState({
    number: '',
    title: '',
    language: 'fr',
    keyOriginal: '',
    tempo: '',
    tags: '',
    accessTier: 'STANDARD'
  });

  // Payment review state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingPayment, setReviewingPayment] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, songsRes, paymentsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/songs`),
        axios.get(`${API}/admin/payments`),
        axios.get(`${API}/admin/users`)
      ]);
      setStats(statsRes.data);
      setSongs(songsRes.data);
      setPayments(paymentsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleSongSubmit = async () => {
    try {
      const data = {
        number: parseInt(songForm.number),
        title: songForm.title,
        language: songForm.language,
        keyOriginal: songForm.keyOriginal || null,
        tempo: songForm.tempo ? parseInt(songForm.tempo) : null,
        tags: songForm.tags ? songForm.tags.split(',').map(t => t.trim()) : [],
        accessTier: songForm.accessTier
      };

      if (editingSong) {
        await axios.put(`${API}/songs/${editingSong.id}`, data);
        toast.success('Song updated!');
      } else {
        await axios.post(`${API}/songs`, data);
        toast.success('Song created!');
      }
      
      setSongDialogOpen(false);
      setEditingSong(null);
      setSongForm({
        number: '',
        title: '',
        language: 'fr',
        keyOriginal: '',
        tempo: '',
        tags: '',
        accessTier: 'STANDARD'
      });
      fetchData();
    } catch (error) {
      console.error('Failed to save song:', error);
      toast.error(error.response?.data?.detail || 'Failed to save song');
    }
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
      accessTier: song.accessTier
    });
    setSongDialogOpen(true);
  };

  const handleDeleteSong = async (songId) => {
    if (!window.confirm('Are you sure you want to delete this song?')) return;
    
    try {
      await axios.delete(`${API}/songs/${songId}`);
      toast.success('Song deleted');
      fetchData();
    } catch (error) {
      console.error('Failed to delete song:', error);
      toast.error('Failed to delete song');
    }
  };

  const handleUploadResource = async (songId, resourceType, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('resourceType', resourceType);
    
    try {
      await axios.post(`${API}/songs/${songId}/resources`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${resourceType} uploaded!`);
      fetchData();
    } catch (error) {
      console.error('Failed to upload resource:', error);
      toast.error('Failed to upload resource');
    }
  };

  const handleReviewPayment = async (decision) => {
    if (!reviewingPayment) return;
    
    try {
      await axios.post(`${API}/admin/payments/${reviewingPayment.id}/review`, {
        decision,
        note: reviewNote
      });
      toast.success(`Payment ${decision.toLowerCase()}`);
      setReviewDialogOpen(false);
      setReviewingPayment(null);
      setReviewNote('');
      fetchData();
    } catch (error) {
      console.error('Failed to review payment:', error);
      toast.error('Failed to review payment');
    }
  };

  const handleMakeAdmin = async (userId) => {
    if (!window.confirm('Make this user an admin?')) return;
    
    try {
      await axios.post(`${API}/admin/users/${userId}/make-admin`);
      toast.success('User is now an admin');
      fetchData();
    } catch (error) {
      console.error('Failed to make admin:', error);
      toast.error('Failed to make admin');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'REJECTED':
        return <X className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  if (!user?.isAdmin) {
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
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="admin-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-sm text-[#D4AF37] uppercase tracking-wider">{t('admin')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold">{t('adminDashboard')}</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-[#0F0F10] border border-white/10 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black" data-testid="admin-tab-overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="songs" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black" data-testid="admin-tab-songs">
              <Music2 className="w-4 h-4 mr-2" />
              {t('manageSongs')}
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black" data-testid="admin-tab-payments">
              <CreditCard className="w-4 h-4 mr-2" />
              {t('managePayments')}
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black" data-testid="admin-tab-users">
              <Users className="w-4 h-4 mr-2" />
              {t('manageUsers')}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="surface-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-white/50">{t('totalUsers')}</span>
                </div>
                <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
              </div>
              <div className="surface-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                    <Music2 className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <span className="text-white/50">{t('totalSongs')}</span>
                </div>
                <p className="text-3xl font-bold">{stats?.totalSongs || 0}</p>
              </div>
              <div className="surface-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Download className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-white/50">{t('totalDownloads')}</span>
                </div>
                <p className="text-3xl font-bold">{stats?.totalDownloads || 0}</p>
              </div>
              <div className="surface-card rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-white/50">{t('pendingPayments')}</span>
                </div>
                <p className="text-3xl font-bold">{stats?.pendingPayments || 0}</p>
              </div>
            </div>
          </TabsContent>

          {/* Songs Tab */}
          <TabsContent value="songs">
            <div className="surface-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{t('manageSongs')}</h2>
                <Dialog open={songDialogOpen} onOpenChange={(open) => {
                  setSongDialogOpen(open);
                  if (!open) {
                    setEditingSong(null);
                    setSongForm({
                      number: '',
                      title: '',
                      language: 'fr',
                      keyOriginal: '',
                      tempo: '',
                      tags: '',
                      accessTier: 'STANDARD'
                    });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="btn-primary" data-testid="add-song-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('addSong')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0F0F10] border-white/10 max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingSong ? t('editSong') : t('addSong')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-white/50 mb-2 block">{t('number')}</label>
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
                              <SelectItem value="fr">{t('french')}</SelectItem>
                              <SelectItem value="ht">{t('creole')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-white/50 mb-2 block">Title</label>
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
                          <label className="text-sm text-white/50 mb-2 block">{t('key')}</label>
                          <Input
                            value={songForm.keyOriginal}
                            onChange={(e) => setSongForm({ ...songForm, keyOriginal: e.target.value })}
                            placeholder="G, Am, etc."
                            className="input-dark"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-white/50 mb-2 block">{t('tempo')}</label>
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
                            <SelectItem value="STANDARD">{t('standard')}</SelectItem>
                            <SelectItem value="PREMIUM">{t('premium')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm text-white/50 mb-2 block">{t('tags')} (comma separated)</label>
                        <Input
                          value={songForm.tags}
                          onChange={(e) => setSongForm({ ...songForm, tags: e.target.value })}
                          placeholder="louange, adoration"
                          className="input-dark"
                        />
                      </div>
                      <Button 
                        className="btn-primary w-full"
                        onClick={handleSongSubmit}
                        data-testid="save-song-btn"
                      >
                        {t('save')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Title</th>
                      <th>Tier</th>
                      <th>Resources</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {songs.map((song) => (
                      <tr key={song.id} data-testid={`admin-song-${song.id}`}>
                        <td className="font-mono">{song.number}</td>
                        <td>{song.title}</td>
                        <td>
                          <Badge className={song.accessTier === 'PREMIUM' ? 'badge-premium' : 'badge-standard'}>
                            {song.accessTier}
                          </Badge>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
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
                              <span className={`text-xs px-2 py-1 rounded ${
                                song.resources?.some(r => r.type === 'CHORDS_PDF') 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-white/10 text-white/40'
                              }`}>
                                Chords
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
                              <span className={`text-xs px-2 py-1 rounded ${
                                song.resources?.some(r => r.type === 'LYRICS_PDF') 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-white/10 text-white/40'
                              }`}>
                                Lyrics
                              </span>
                            </label>
                          </div>
                        </td>
                        <td>
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
                              className="text-red-400/50 hover:text-red-400"
                              onClick={() => handleDeleteSong(song.id)}
                              data-testid={`delete-song-${song.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="surface-card rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6">{t('managePayments')}</h2>
              
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Provider</th>
                      <th>Month</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} data-testid={`admin-payment-${payment.id}`}>
                        <td>{payment.userEmail}</td>
                        <td>
                          <Badge className={payment.planRequested === 'TEAM' ? 'badge-team' : 'badge-standard'}>
                            {payment.planRequested}
                          </Badge>
                        </td>
                        <td>{payment.amount} {payment.currency}</td>
                        <td>{payment.provider}</td>
                        <td>{payment.billingMonth}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(payment.status)}
                            <span className={`status-${payment.status.toLowerCase()}`}>
                              {payment.status}
                            </span>
                          </div>
                        </td>
                        <td>
                          {payment.status === 'PENDING' && (
                            <Dialog open={reviewDialogOpen && reviewingPayment?.id === payment.id} onOpenChange={(open) => {
                              setReviewDialogOpen(open);
                              if (!open) {
                                setReviewingPayment(null);
                                setReviewNote('');
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setReviewingPayment(payment)}
                                  data-testid={`review-payment-${payment.id}`}
                                >
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-[#0F0F10] border-white/10">
                                <DialogHeader>
                                  <DialogTitle>Review Payment</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 mt-4">
                                  <div className="p-4 bg-white/5 rounded-lg">
                                    <p><strong>User:</strong> {payment.userEmail}</p>
                                    <p><strong>Plan:</strong> {payment.planRequested}</p>
                                    <p><strong>Amount:</strong> {payment.amount} {payment.currency}</p>
                                    <p><strong>Reference:</strong> {payment.reference}</p>
                                    <p><strong>Provider:</strong> {payment.provider} {payment.bankName ? `(${payment.bankName})` : ''}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm text-white/50 mb-2 block">{t('reviewNote')}</label>
                                    <Textarea
                                      value={reviewNote}
                                      onChange={(e) => setReviewNote(e.target.value)}
                                      placeholder="Optional note..."
                                      className="input-dark"
                                    />
                                  </div>
                                  <div className="flex gap-3">
                                    <Button
                                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => handleReviewPayment('APPROVED')}
                                      data-testid="approve-payment-btn"
                                    >
                                      <Check className="w-4 h-4 mr-2" />
                                      {t('approve')}
                                    </Button>
                                    <Button
                                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                      onClick={() => handleReviewPayment('REJECTED')}
                                      data-testid="reject-payment-btn"
                                    >
                                      <X className="w-4 h-4 mr-2" />
                                      {t('reject')}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="surface-card rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6">{t('manageUsers')}</h2>
              
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Plan</th>
                      <th>Expires</th>
                      <th>Admin</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} data-testid={`admin-user-${u.id}`}>
                        <td>{u.displayName}</td>
                        <td>{u.email}</td>
                        <td>
                          <Badge className={
                            u.plan === 'TEAM' ? 'badge-team' :
                            u.plan === 'STANDARD' ? 'badge-standard' :
                            'bg-white/10 text-white/60'
                          }>
                            {u.plan}
                          </Badge>
                        </td>
                        <td>{u.planExpiresAt ? new Date(u.planExpiresAt).toLocaleDateString() : '-'}</td>
                        <td>
                          {u.isAdmin ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <X className="w-4 h-4 text-white/20" />
                          )}
                        </td>
                        <td>
                          {!u.isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMakeAdmin(u.id)}
                              data-testid={`make-admin-${u.id}`}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Make Admin
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

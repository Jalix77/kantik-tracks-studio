import { useState, useEffect } from 'react';
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
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Users, Plus, UserPlus, Crown, Shield, User, Trash2, Mail, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Team = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const response = await axios.get(`${API}/teams/my-team`);
      setTeam(response.data);
    } catch (error) {
      console.error('Failed to fetch team:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async () => {
    if (!teamName.trim()) return;
    
    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/teams`, { name: teamName });
      setTeam(response.data);
      setCreateDialogOpen(false);
      setTeamName('');
      await refreshUser();
      toast.success('Team created!');
    } catch (error) {
      console.error('Failed to create team:', error);
      toast.error(error.response?.data?.detail || 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/teams/${team.id}/invite`, {
        email: inviteEmail,
        role: inviteRole
      });
      setInviteDialogOpen(false);
      setInviteEmail('');
      toast.success(`Invitation sent to ${inviteEmail}`);
    } catch (error) {
      console.error('Failed to invite member:', error);
      toast.error(error.response?.data?.detail || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const removeMember = async (memberUid, memberEmail) => {
    if (!window.confirm(`Are you sure you want to remove ${memberEmail} from the team?`)) return;
    
    try {
      await axios.delete(`${API}/teams/${team.id}/members/${memberUid}`);
      setTeam({
        ...team,
        members: team.members.filter(m => m.uid !== memberUid)
      });
      toast.success('Member removed');
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error(error.response?.data?.detail || 'Failed to remove member');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="w-4 h-4 text-[#D4AF37]" />;
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-purple-400" />;
      default:
        return <User className="w-4 h-4 text-white/40" />;
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'OWNER':
        return <Badge className="badge-premium">{t('owner')}</Badge>;
      case 'ADMIN':
        return <Badge className="badge-team">{t('adminRole')}</Badge>;
      default:
        return <Badge className="bg-white/10 text-white/60">{t('member')}</Badge>;
    }
  };

  // Not on team plan
  if (user?.plan !== 'TEAM') {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="team-page">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-24">
            <div className="w-24 h-24 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-12 h-12 text-[#D4AF37]/60" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">{t('teamRequired')}</h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              Upgrade to the Team plan to create a team and invite up to 7 members.
            </p>
            <Link to="/pricing">
              <Button className="btn-primary" data-testid="upgrade-to-team-btn">
                {t('upgrade')} Team
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No team yet
  if (!loading && !team) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="team-page">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-24">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-white/20" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">{t('noTeam')}</h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">{t('createTeamDesc')}</p>
            
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary" data-testid="create-team-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('createTeam')}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0F0F10] border-white/10">
                <DialogHeader>
                  <DialogTitle>{t('createTeam')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm text-white/50 mb-2 block">{t('teamName')}</label>
                    <Input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="My Worship Team"
                      className="input-dark"
                      data-testid="team-name-input"
                    />
                  </div>
                  <Button 
                    className="btn-primary w-full"
                    onClick={createTeam}
                    disabled={submitting || !teamName.trim()}
                    data-testid="confirm-create-team-btn"
                  >
                    {submitting ? 'Creating...' : t('createTeam')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="team-page">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-sm text-[#D4AF37] uppercase tracking-wider">{t('team')}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold">{team?.name || t('myTeam')}</h1>
            <p className="text-white/50 mt-2">
              {team?.members?.length || 0} / {team?.maxMembers || 7} {t('members')}
            </p>
          </div>

          {(user?.roleInTeam === 'OWNER' || user?.roleInTeam === 'ADMIN') && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary" data-testid="invite-member-btn">
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('inviteMember')}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0F0F10] border-white/10">
                <DialogHeader>
                  <DialogTitle>{t('inviteMember')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm text-white/50 mb-2 block">{t('email')}</label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="member@email.com"
                      className="input-dark"
                      data-testid="invite-email-input"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/50 mb-2 block">Role</label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger className="input-dark" data-testid="invite-role-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F0F10] border-white/10">
                        <SelectItem value="MEMBER">{t('member')}</SelectItem>
                        <SelectItem value="ADMIN">{t('adminRole')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="btn-primary w-full"
                    onClick={inviteMember}
                    disabled={submitting || !inviteEmail.trim()}
                    data-testid="confirm-invite-btn"
                  >
                    {submitting ? 'Sending...' : t('inviteMember')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Members List */}
        <div className="surface-card rounded-xl p-8">
          <h2 className="text-xl font-semibold mb-6">{t('members')}</h2>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {team?.members?.map((member) => (
                <div
                  key={member.uid}
                  className="p-4 bg-white/5 rounded-lg flex items-center justify-between"
                  data-testid={`member-${member.uid}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                      {getRoleIcon(member.role)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.email}</p>
                        {getRoleBadge(member.role)}
                      </div>
                      <p className="text-sm text-white/40">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {(user?.roleInTeam === 'OWNER' || user?.roleInTeam === 'ADMIN') && 
                   member.role !== 'OWNER' && 
                   member.uid !== user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400/50 hover:text-red-400"
                      onClick={() => removeMember(member.uid, member.email)}
                      data-testid={`remove-member-${member.uid}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Shield, Users, ArrowLeft, Eye, Crown, UserCheck, UserMinus, 
  Calendar, CreditCard, RefreshCw, Search
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, planFilter]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(query) ||
        u.displayName.toLowerCase().includes(query)
      );
    }
    
    if (planFilter && planFilter !== 'all') {
      filtered = filtered.filter(u => u.plan === planFilter);
    }
    
    setFilteredUsers(filtered);
  };

  const viewUserDetails = async (user) => {
    try {
      const response = await axios.get(`${API}/admin/users/${user.id}`);
      setSelectedUser(response.data);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      toast.error('Failed to load user details');
    }
  };

  const handlePromoteAdmin = async () => {
    if (!selectedUser) return;
    
    try {
      await axios.post(`${API}/admin/users/${selectedUser.id}/promote-admin`);
      toast.success(`${selectedUser.displayName} is now an admin`);
      setConfirmDialogOpen(false);
      fetchUsers();
      viewUserDetails(selectedUser);
    } catch (error) {
      console.error('Failed to promote user:', error);
      toast.error(error.response?.data?.detail || 'Failed to promote user');
    }
  };

  const handleDemoteAdmin = async () => {
    if (!selectedUser) return;
    
    try {
      await axios.post(`${API}/admin/users/${selectedUser.id}/demote-admin`);
      toast.success(`${selectedUser.displayName} is no longer an admin`);
      setConfirmDialogOpen(false);
      fetchUsers();
      viewUserDetails(selectedUser);
    } catch (error) {
      console.error('Failed to demote user:', error);
      toast.error(error.response?.data?.detail || 'Failed to demote user');
    }
  };

  const handleResetPlan = async () => {
    if (!selectedUser) return;
    
    try {
      await axios.post(`${API}/admin/users/${selectedUser.id}/reset-plan`);
      toast.success(`${selectedUser.displayName}'s plan reset to FREE`);
      setConfirmDialogOpen(false);
      fetchUsers();
      viewUserDetails(selectedUser);
    } catch (error) {
      console.error('Failed to reset plan:', error);
      toast.error(error.response?.data?.detail || 'Failed to reset plan');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isPlanExpired = (user) => {
    if (user.plan === 'FREE') return false;
    if (!user.planExpiresAt) return true;
    return new Date(user.planExpiresAt) < new Date();
  };

  const isInGracePeriod = (user) => {
    if (user.plan === 'FREE') return false;
    if (!user.graceUntil) return false;
    const now = new Date();
    const expires = user.planExpiresAt ? new Date(user.planExpiresAt) : null;
    const grace = new Date(user.graceUntil);
    return expires && expires < now && grace >= now;
  };

  if (!currentUser?.isAdmin && currentUser?.role !== 'ADMIN') {
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
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="admin-users-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/admin" className="inline-flex items-center text-white/50 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-sm text-[#D4AF37] uppercase tracking-wider">Admin</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold">Manage Users</h1>
          <p className="text-white/50 mt-2">{users.length} users total</p>
        </div>

        {/* Filters */}
        <div className="surface-card rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 input-dark"
                data-testid="user-search-input"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[160px] input-dark">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent className="bg-[#0F0F10] border-white/10">
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="FREE">Free</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="TEAM">Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Users Table */}
        <div className="surface-card rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-16 mb-4 rounded" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">User</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Plan</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Expires</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Team</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Role</th>
                    <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5" data-testid={`user-row-${user.id}`}>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {user.displayName}
                            {(user.isAdmin || user.role === 'ADMIN') && (
                              <Crown className="w-4 h-4 text-[#D4AF37]" />
                            )}
                          </p>
                          <p className="text-sm text-white/40">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge className={
                          user.plan === 'TEAM' ? 'badge-team' :
                          user.plan === 'STANDARD' ? 'badge-standard' :
                          'bg-white/10 text-white/60'
                        }>
                          {user.plan}
                        </Badge>
                        {isPlanExpired(user) && !isInGracePeriod(user) && user.plan !== 'FREE' && (
                          <Badge className="ml-2 bg-red-500/20 text-red-400">Expired</Badge>
                        )}
                        {isInGracePeriod(user) && (
                          <Badge className="ml-2 bg-yellow-500/20 text-yellow-400">Grace</Badge>
                        )}
                      </td>
                      <td className="py-4 px-6 text-white/60">
                        {formatDate(user.planExpiresAt)}
                      </td>
                      <td className="py-4 px-6">
                        {user.teamId ? (
                          <span className="text-white/60">
                            {user.teamMemberCount || 0} members
                          </span>
                        ) : (
                          <span className="text-white/30">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {user.isAdmin || user.role === 'ADMIN' ? (
                          <Badge className="bg-[#D4AF37]/20 text-[#D4AF37]">Admin</Badge>
                        ) : (
                          <Badge className="bg-white/10 text-white/60">User</Badge>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewUserDetails(user)}
                          data-testid={`view-user-${user.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="bg-[#0F0F10] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-6 mt-4">
                {/* User Info */}
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                      <Users className="w-8 h-8 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        {selectedUser.displayName}
                        {(selectedUser.isAdmin || selectedUser.role === 'ADMIN') && (
                          <Crown className="w-5 h-5 text-[#D4AF37]" />
                        )}
                      </h3>
                      <p className="text-white/50">{selectedUser.email}</p>
                      <p className="text-sm text-white/40">Joined {formatDate(selectedUser.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Subscription Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-white/50" />
                      <span className="text-sm text-white/50">Plan</span>
                    </div>
                    <Badge className={
                      selectedUser.plan === 'TEAM' ? 'badge-team' :
                      selectedUser.plan === 'STANDARD' ? 'badge-standard' :
                      'bg-white/10 text-white/60'
                    }>
                      {selectedUser.plan}
                    </Badge>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-white/50" />
                      <span className="text-sm text-white/50">Expires</span>
                    </div>
                    <p className={isPlanExpired(selectedUser) && selectedUser.plan !== 'FREE' ? 'text-red-400' : ''}>
                      {formatDate(selectedUser.planExpiresAt)}
                    </p>
                    {selectedUser.graceUntil && (
                      <p className="text-sm text-white/40">Grace until: {formatDate(selectedUser.graceUntil)}</p>
                    )}
                  </div>
                </div>

                {/* Team Info */}
                {selectedUser.teamId && selectedUser.team && (
                  <div className="p-4 bg-white/5 rounded-lg">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#D4AF37]" />
                      Team: {selectedUser.team.name}
                    </h4>
                    <p className="text-sm text-white/50 mb-2">
                      Role: {selectedUser.roleInTeam} • {selectedUser.teamMembers?.length || 0} members
                    </p>
                    {selectedUser.teamMembers && selectedUser.teamMembers.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedUser.teamMembers.map((member) => (
                          <div key={member.uid} className="flex items-center justify-between text-sm">
                            <span>{member.email}</span>
                            <Badge className="text-xs">{member.role}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Payment History */}
                {selectedUser.payments && selectedUser.payments.length > 0 && (
                  <div className="p-4 bg-white/5 rounded-lg">
                    <h4 className="font-medium mb-3">Recent Payments</h4>
                    <div className="space-y-2">
                      {selectedUser.payments.slice(0, 5).map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between text-sm">
                          <span>{payment.billingMonth} - {payment.amount} {payment.currency}</span>
                          <Badge className={
                            payment.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                            payment.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }>
                            {payment.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="flex flex-wrap gap-3">
                  {selectedUser.isAdmin || selectedUser.role === 'ADMIN' ? (
                    <Button
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                      onClick={() => {
                        setConfirmAction('demote');
                        setConfirmDialogOpen(true);
                      }}
                      disabled={selectedUser.id === currentUser.id}
                      data-testid="demote-admin-btn"
                    >
                      <UserMinus className="w-4 h-4 mr-2" />
                      Demote from Admin
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/20"
                      onClick={() => {
                        setConfirmAction('promote');
                        setConfirmDialogOpen(true);
                      }}
                      data-testid="promote-admin-btn"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Promote to Admin
                    </Button>
                  )}
                  
                  {selectedUser.plan !== 'FREE' && (
                    <Button
                      variant="outline"
                      className="border-white/20 text-white/60 hover:bg-white/10"
                      onClick={() => {
                        setConfirmAction('reset');
                        setConfirmDialogOpen(true);
                      }}
                      data-testid="reset-plan-btn"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset to FREE
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirm Dialog */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent className="bg-[#0F0F10] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction === 'promote' && 'Promote to Admin?'}
                {confirmAction === 'demote' && 'Demote from Admin?'}
                {confirmAction === 'reset' && 'Reset Plan to FREE?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction === 'promote' && `This will give ${selectedUser?.displayName} full admin access to manage songs, payments, and users.`}
                {confirmAction === 'demote' && `This will remove admin access from ${selectedUser?.displayName}. They will only have regular user privileges.`}
                {confirmAction === 'reset' && `This will downgrade ${selectedUser?.displayName} to the FREE plan. They will lose access to downloads and premium features.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                className={
                  confirmAction === 'promote' ? 'bg-[#D4AF37] hover:bg-[#E5C558] text-black' :
                  confirmAction === 'demote' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-white/20 hover:bg-white/30'
                }
                onClick={() => {
                  if (confirmAction === 'promote') handlePromoteAdmin();
                  else if (confirmAction === 'demote') handleDemoteAdmin();
                  else if (confirmAction === 'reset') handleResetPlan();
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

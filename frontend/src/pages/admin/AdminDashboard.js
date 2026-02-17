import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../../components/ui/button';
import { 
  Shield, Music2, CreditCard, Users, BarChart3, Download, 
  ArrowRight, Clock, CheckCircle, AlertCircle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.isAdmin && user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-medium">Admin access required</h2>
          <p className="text-white/50 mt-2">You don't have permission to view this page.</p>
          <Link to="/">
            <Button className="btn-secondary mt-4">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statCards = [
    { 
      label: 'Total Users', 
      value: stats?.totalUsers || 0, 
      icon: Users, 
      color: 'blue',
      link: '/admin/users'
    },
    { 
      label: 'Active Standard', 
      value: stats?.activeStandard || 0, 
      icon: CheckCircle, 
      color: 'emerald',
      sublabel: `${stats?.standardUsers || 0} total`
    },
    { 
      label: 'Active Team', 
      value: stats?.activeTeam || 0, 
      icon: Users, 
      color: 'purple',
      sublabel: `${stats?.teamUsers || 0} total`
    },
    { 
      label: 'Pending Payments', 
      value: stats?.pendingPayments || 0, 
      icon: Clock, 
      color: 'yellow',
      link: '/admin/payments',
      alert: stats?.pendingPayments > 0
    },
    { 
      label: 'Total Songs', 
      value: stats?.totalSongs || 0, 
      icon: Music2, 
      color: 'gold',
      link: '/admin/songs',
      sublabel: stats?.inactiveSongs ? `${stats.inactiveSongs} inactive` : null
    },
    { 
      label: 'Total Downloads', 
      value: stats?.totalDownloads || 0, 
      icon: Download, 
      color: 'green'
    },
  ];

  const getColorClass = (color) => {
    const colors = {
      blue: 'bg-blue-500/20 text-blue-400',
      emerald: 'bg-emerald-500/20 text-emerald-400',
      purple: 'bg-purple-500/20 text-purple-400',
      yellow: 'bg-yellow-500/20 text-yellow-400',
      gold: 'bg-[#D4AF37]/20 text-[#D4AF37]',
      green: 'bg-green-500/20 text-green-400',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="admin-dashboard-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-sm text-[#D4AF37] uppercase tracking-wider">Admin</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold">Dashboard</h1>
          <p className="text-white/50 mt-2">Overview of your Kantik Tracks Studio</p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {statCards.map((stat, index) => (
              <div 
                key={index}
                className={`surface-card rounded-xl p-6 relative ${stat.alert ? 'border-yellow-500/50' : ''}`}
              >
                {stat.alert && (
                  <div className="absolute top-4 right-4">
                    <AlertCircle className="w-5 h-5 text-yellow-400 animate-pulse" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getColorClass(stat.color)}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className="text-white/50">{stat.label}</span>
                </div>
                <p className="text-3xl font-bold">{stat.value}</p>
                {stat.sublabel && (
                  <p className="text-sm text-white/40 mt-1">{stat.sublabel}</p>
                )}
                {stat.link && (
                  <Link to={stat.link}>
                    <Button variant="ghost" size="sm" className="mt-4 text-[#D4AF37] hover:text-[#E5C558] p-0">
                      View Details <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <h2 className="text-2xl font-semibold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/admin/songs" className="surface-card rounded-xl p-6 hover:border-[#D4AF37]/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                <Music2 className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="font-semibold">Manage Songs</h3>
                <p className="text-sm text-white/50">Add, edit, or upload resources</p>
              </div>
            </div>
          </Link>
          
          <Link to="/admin/payments" className="surface-card rounded-xl p-6 hover:border-[#D4AF37]/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold">Review Payments</h3>
                <p className="text-sm text-white/50">
                  {stats?.pendingPayments > 0 
                    ? `${stats.pendingPayments} pending approval`
                    : 'No pending payments'
                  }
                </p>
              </div>
            </div>
          </Link>
          
          <Link to="/admin/users" className="surface-card rounded-xl p-6 hover:border-[#D4AF37]/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Manage Users</h3>
                <p className="text-sm text-white/50">View and manage user accounts</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
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
  Shield, CreditCard, ArrowLeft, Check, X, Clock, Eye, 
  User, Calendar, FileText, ExternalLink
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AdminPayments = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [receiptData, setReceiptData] = useState(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const status = activeTab === 'pending' ? 'PENDING' : activeTab === 'approved' ? 'APPROVED' : activeTab === 'rejected' ? 'REJECTED' : '';
      const response = await axios.get(`${API}/admin/payments${status ? `?status=${status}` : ''}`);
      setPayments(response.data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const viewPaymentDetails
    setSelectedPayment(payment);
    setDetailDialogOpen(true);
    setReceiptData(null);
    
    // Fetch receipt if exists
    if (payment.receiptPath) {
      try {
        const response = await axios.get(`${API}/admin/payments/${payment.id}/receipt`);
        setReceiptData(response.data);
      } catch (error) {
        console.error('Failed to fetch receipt:', error);
      }
    }
  };

  const handleReview = async (decision) => {
    if (!selectedPayment) return;
    
    try {
      await axios.post(`${API}/admin/payments/${selectedPayment.id}/review`, {
        decision,
        note: reviewNote
      });
      toast.success(`Payment ${decision.toLowerCase()}!`);
      setDetailDialogOpen(false);
      setConfirmDialogOpen(false);
      setSelectedPayment(null);
      setReviewNote('');
      fetchPayments();
    } catch (error) {
      console.error('Failed to review payment:', error);
      toast.error(error.response?.data?.detail || 'Failed to review payment');
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-500/20 text-green-400';
      case 'REJECTED':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const pendingCount = payments.filter(p => p.status === 'PENDING').length;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="admin-payments-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/admin" className="inline-flex items-center text-white/50 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-sm text-[#D4AF37] uppercase tracking-wider">Admin</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold">Payment Review</h1>
          <p className="text-white/50 mt-2">Review and approve subscription payments</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#0F0F10] border border-white/10 p-1">
            <TabsTrigger 
              value="pending" 
              className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black relative"
            >
              Pending
              {activeTab !== 'pending' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-black text-xs rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
              Rejected
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <div className="surface-card rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-8">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="skeleton h-16 mb-4 rounded" />
                  ))}
                </div>
              ) : payments.length === 0 ? (
                <div className="p-12 text-center">
                  <CreditCard className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">No {activeTab} payments</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">User</th>
                        <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Plan</th>
                        <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Amount</th>
                        <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Provider</th>
                        <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Month</th>
                        <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Status</th>
                        <th className="text-left text-xs uppercase tracking-wider text-white/50 font-medium py-4 px-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-white/5 hover:bg-white/5" data-testid={`payment-row-${payment.id}`}>
                          <td className="py-4 px-6">
                            <p className="font-medium">{payment.userEmail}</p>
                            <p className="text-sm text-white/40">{formatDate(payment.createdAt)}</p>
                          </td>
                          <td className="py-4 px-6">
                            <Badge className={payment.planRequested === 'TEAM' ? 'badge-team' : 'badge-standard'}>
                              {payment.planRequested}
                            </Badge>
                          </td>
                          <td className="py-4 px-6 font-mono">
                            {payment.amount} {payment.currency}
                          </td>
                          <td className="py-4 px-6">
                            <p>{payment.provider === 'MONCASH' ? 'MonCash' : 'Bank Transfer'}</p>
                            {payment.bankName && <p className="text-sm text-white/40">{payment.bankName}</p>}
                          </td>
                          <td className="py-4 px-6">{payment.billingMonth}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(payment.status)}
                              <Badge className={getStatusBadgeClass(payment.status)}>
                                {payment.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewPaymentDetails(payment)}
                              data-testid={`view-payment-${payment.id}`}
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
          </TabsContent>
        </Tabs>

        {/* Payment Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="bg-[#0F0F10] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
            </DialogHeader>
            
            {selectedPayment && (
              <div className="space-y-6 mt-4">
                {/* User Info */}
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <User className="w-5 h-5 text-[#D4AF37]" />
                    <span className="font-medium">User Information</span>
                  </div>
                  <p><span className="text-white/50">Email:</span> {selectedPayment.userEmail}</p>
                </div>

                {/* Payment Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-sm text-white/50 mb-1">Plan Requested</p>
                    <Badge className={selectedPayment.planRequested === 'TEAM' ? 'badge-team' : 'badge-standard'}>
                      {selectedPayment.planRequested}
                    </Badge>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-sm text-white/50 mb-1">Amount</p>
                    <p className="font-mono text-lg">{selectedPayment.amount} {selectedPayment.currency}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-sm text-white/50 mb-1">Provider</p>
                    <p>{selectedPayment.provider === 'MONCASH' ? 'MonCash' : 'Bank Transfer'}</p>
                    {selectedPayment.bankName && <p className="text-sm text-white/40">{selectedPayment.bankName}</p>}
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <p className="text-sm text-white/50 mb-1">Billing Month</p>
                    <p>{selectedPayment.billingMonth}</p>
                  </div>
                </div>

                {/* Reference */}
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-white/50 mb-1">Reference Number</p>
                  <p className="font-mono">{selectedPayment.reference}</p>
                </div>

                {/* Receipt */}
                {receiptData && (
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-[#D4AF37]" />
                      <span className="font-medium">Receipt</span>
                    </div>
                    {receiptData.contentType?.startsWith('image/') ? (
                      <img 
                        src={`data:${receiptData.contentType};base64,${receiptData.data}`}
                        alt="Receipt"
                        className="max-w-full max-h-64 rounded-lg"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <FileText className="w-8 h-8 text-white/40" />
                        <div>
                          <p>{receiptData.filename}</p>
                          <a 
                            href={`data:${receiptData.contentType};base64,${receiptData.data}`}
                            download={receiptData.filename}
                            className="text-[#D4AF37] text-sm hover:underline"
                          >
                            Download Receipt
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Status & Review Note */}
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-white/50">Status:</span>
                    <Badge className={getStatusBadgeClass(selectedPayment.status)}>
                      {selectedPayment.status}
                    </Badge>
                  </div>
                  {selectedPayment.reviewedAt && (
                    <p className="text-sm text-white/40">
                      Reviewed on {formatDate(selectedPayment.reviewedAt)}
                    </p>
                  )}
                  {selectedPayment.note && (
                    <p className="text-sm mt-2">Note: {selectedPayment.note}</p>
                  )}
                </div>

                {/* Review Actions */}
                {selectedPayment.status === 'PENDING' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-white/50 mb-2 block">Review Note (optional)</label>
                      <Textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="Add a note for this review..."
                        className="input-dark"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          setConfirmAction('APPROVED');
                          setConfirmDialogOpen(true);
                        }}
                        data-testid="approve-payment-btn"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve Payment
                      </Button>
                      <Button
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => {
                          setConfirmAction('REJECTED');
                          setConfirmDialogOpen(true);
                        }}
                        data-testid="reject-payment-btn"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject Payment
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirm Dialog */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent className="bg-[#0F0F10] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction === 'APPROVED' ? 'Approve Payment?' : 'Reject Payment?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction === 'APPROVED' 
                  ? `This will activate the ${selectedPayment?.planRequested} plan for ${selectedPayment?.userEmail} and extend their subscription by 30 days.`
                  : `This will reject the payment from ${selectedPayment?.userEmail}. They will need to submit a new payment.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                className={confirmAction === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                onClick={() => handleReview(confirmAction)}
              >
                {confirmAction === 'APPROVED' ? 'Approve' : 'Reject'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AdminPayments;

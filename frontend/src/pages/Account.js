import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { User, CreditCard, History, Upload, Check, Clock, X, AlertCircle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Account = () => {
  const [searchParams] = useSearchParams();
  const { user, refreshUser, isPlanActive } = useAuth();
  const { t } = useLanguage();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    planRequested: 'STANDARD',
    provider: 'MONCASH',
    bankName: '',
    amount: '',
    currency: 'HTG',
    billingMonth: new Date().toISOString().slice(0, 7),
    reference: ''
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${API}/payments`);
      setPayments(response.data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.reference || !paymentForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Create payment
      const response = await axios.post(`${API}/payments`, {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount)
      });

      // Upload receipt if provided
      if (receiptFile) {
        const formData = new FormData();
        formData.append('file', receiptFile);
        await axios.post(`${API}/payments/${response.data.id}/receipt`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      toast.success('Payment submitted for review!');
      fetchPayments();
      setPaymentForm({
        ...paymentForm,
        reference: '',
        amount: ''
      });
      setReceiptFile(null);
    } catch (error) {
      console.error('Failed to submit payment:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
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

  const banks = ['Sogebank', 'Unibank', 'BUH', 'BNC', 'Capital Bank'];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="account-page">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-sm text-[#D4AF37] uppercase tracking-wider">{t('account')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold">{t('myAccount')}</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-[#0F0F10] border border-white/10 p-1">
            <TabsTrigger value="profile" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black" data-testid="tab-profile">
              <User className="w-4 h-4 mr-2" />
              {t('profile')}
            </TabsTrigger>
            <TabsTrigger value="subscription" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black" data-testid="tab-subscription">
              <CreditCard className="w-4 h-4 mr-2" />
              {t('subscription')}
            </TabsTrigger>
            <TabsTrigger value="payment" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black" data-testid="tab-payment">
              {t('submitPayment')}
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black" data-testid="tab-history">
              <History className="w-4 h-4 mr-2" />
              {t('paymentHistory')}
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="surface-card rounded-xl p-8">
              <h2 className="text-xl font-semibold mb-6">{t('profile')}</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-sm text-white/50 mb-2 block">{t('displayName')}</label>
                  <Input
                    value={user?.displayName || ''}
                    disabled
                    className="input-dark"
                    data-testid="display-name-input"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/50 mb-2 block">{t('email')}</label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="input-dark"
                    data-testid="email-input"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <div className="surface-card rounded-xl p-8">
              <h2 className="text-xl font-semibold mb-6">{t('currentSubscription')}</h2>
              
              <div className="flex items-center gap-4 mb-6">
                <Badge 
                  className={`text-lg px-4 py-2 ${
                    user?.plan === 'TEAM' ? 'badge-team' :
                    user?.plan === 'STANDARD' ? 'badge-standard' :
                    'bg-white/10 text-white/60'
                  }`}
                  data-testid="current-plan-badge"
                >
                  {user?.plan || 'FREE'}
                </Badge>
                {isPlanActive() ? (
                  <span className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-yellow-400">
                    <AlertCircle className="w-4 h-4" />
                    Expired
                  </span>
                )}
              </div>

              {user?.plan !== 'FREE' && (
                <div className="space-y-4 text-white/60">
                  <p>
                    <span className="text-white/40">{t('expiresOn')}:</span>{' '}
                    <span className="text-white">{formatDate(user?.planExpiresAt)}</span>
                  </p>
                  {user?.graceUntil && (
                    <p>
                      <span className="text-white/40">{t('graceUntil')}:</span>{' '}
                      <span className="text-white">{formatDate(user?.graceUntil)}</span>
                    </p>
                  )}
                </div>
              )}

              {user?.plan === 'FREE' && (
                <div className="mt-6 p-4 bg-[#D4AF37]/10 rounded-lg border border-[#D4AF37]/20">
                  <p className="text-sm">
                    Upgrade to Standard or Team to download chord charts and access all features.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Submit Payment Tab */}
          <TabsContent value="payment">
            <div className="surface-card rounded-xl p-8">
              <h2 className="text-xl font-semibold mb-6">{t('submitMonthlyPayment')}</h2>
              
              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-white/50 mb-2 block">{t('selectPlan')}</label>
                    <Select
                      value={paymentForm.planRequested}
                      onValueChange={(value) => setPaymentForm({ ...paymentForm, planRequested: value })}
                    >
                      <SelectTrigger className="input-dark" data-testid="plan-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F0F10] border-white/10">
                        <SelectItem value="STANDARD">{t('standardPlan')} - 500 HTG</SelectItem>
                        <SelectItem value="TEAM">{t('teamPlan')} - 2,000 HTG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-white/50 mb-2 block">{t('paymentMethod')}</label>
                    <Select
                      value={paymentForm.provider}
                      onValueChange={(value) => setPaymentForm({ ...paymentForm, provider: value })}
                    >
                      <SelectTrigger className="input-dark" data-testid="provider-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F0F10] border-white/10">
                        <SelectItem value="MONCASH">{t('moncash')}</SelectItem>
                        <SelectItem value="BANK_TRANSFER">{t('bankTransfer')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentForm.provider === 'BANK_TRANSFER' && (
                    <div>
                      <label className="text-sm text-white/50 mb-2 block">{t('selectBank')}</label>
                      <Select
                        value={paymentForm.bankName}
                        onValueChange={(value) => setPaymentForm({ ...paymentForm, bankName: value })}
                      >
                        <SelectTrigger className="input-dark" data-testid="bank-select">
                          <SelectValue placeholder={t('selectBank')} />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0F0F10] border-white/10">
                          {banks.map((bank) => (
                            <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-white/50 mb-2 block">{t('billingMonth')}</label>
                    <Input
                      type="month"
                      value={paymentForm.billingMonth}
                      onChange={(e) => setPaymentForm({ ...paymentForm, billingMonth: e.target.value })}
                      className="input-dark"
                      data-testid="billing-month-input"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-white/50 mb-2 block">{t('amount')}</label>
                    <Input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      placeholder="500"
                      className="input-dark"
                      required
                      data-testid="amount-input"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-white/50 mb-2 block">{t('currency')}</label>
                    <Select
                      value={paymentForm.currency}
                      onValueChange={(value) => setPaymentForm({ ...paymentForm, currency: value })}
                    >
                      <SelectTrigger className="input-dark" data-testid="currency-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F0F10] border-white/10">
                        <SelectItem value="HTG">HTG (Gourde)</SelectItem>
                        <SelectItem value="USD">USD (Dollar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm text-white/50 mb-2 block">{t('referenceNumber')}</label>
                    <Input
                      value={paymentForm.reference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                      placeholder="Transaction reference number"
                      className="input-dark"
                      required
                      data-testid="reference-input"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm text-white/50 mb-2 block">{t('uploadReceipt')}</label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        className="input-dark"
                        data-testid="receipt-input"
                      />
                      {receiptFile && (
                        <span className="text-sm text-white/50">{receiptFile.name}</span>
                      )}
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="btn-primary w-full"
                  disabled={submitting}
                  data-testid="submit-payment-btn"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {t('submit')}
                    </>
                  )}
                </Button>
              </form>
            </div>
          </TabsContent>

          {/* Payment History Tab */}
          <TabsContent value="history">
            <div className="surface-card rounded-xl p-8">
              <h2 className="text-xl font-semibold mb-6">{t('paymentHistory')}</h2>
              
              {payments.length === 0 ? (
                <div className="text-center py-12 text-white/50">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('noPayments')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="p-4 bg-white/5 rounded-lg flex items-center justify-between"
                      data-testid={`payment-${payment.id}`}
                    >
                      <div className="flex items-center gap-4">
                        {getStatusIcon(payment.status)}
                        <div>
                          <p className="font-medium">
                            {payment.planRequested} - {payment.amount} {payment.currency}
                          </p>
                          <p className="text-sm text-white/50">
                            {payment.provider} • {payment.billingMonth}
                          </p>
                        </div>
                      </div>
                      <Badge className={`status-${payment.status.toLowerCase()}`}>
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

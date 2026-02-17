import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/button';
import { Check, X, Crown, Users, User, ArrowRight } from 'lucide-react';

export const Pricing = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const plans = [
    {
      id: 'FREE',
      name: t('freePlan'),
      price: '0',
      currency: 'HTG',
      description: 'For exploring the catalog',
      features: [
        { text: t('browseCatalogFeature'), included: true },
        { text: t('previewSongs'), included: true },
        { text: t('downloadStandard'), included: false },
        { text: t('personalLibrary'), included: false },
        { text: t('createPlaylists'), included: false },
      ],
      cta: t('currentPlan'),
      disabled: true
    },
    {
      id: 'STANDARD',
      name: t('standardPlan'),
      price: '500',
      currency: 'HTG',
      description: 'For individual worship leaders',
      features: [
        { text: t('browseCatalogFeature'), included: true },
        { text: t('previewSongs'), included: true },
        { text: t('downloadStandard'), included: true },
        { text: t('personalLibrary'), included: true },
        { text: t('createPlaylists'), included: true },
        { text: t('downloadPremium'), included: false },
      ],
      cta: t('subscribe'),
      featured: false
    },
    {
      id: 'TEAM',
      name: t('teamPlan'),
      price: '2,000',
      currency: 'HTG',
      description: 'For worship teams',
      features: [
        { text: t('browseCatalogFeature'), included: true },
        { text: t('downloadStandard'), included: true },
        { text: t('downloadPremium'), included: true },
        { text: t('personalLibrary'), included: true },
        { text: t('createPlaylists'), included: true },
        { text: t('teamMembers'), included: true },
        { text: t('sharedLibrary'), included: true },
        { text: t('sharedPlaylists'), included: true },
      ],
      cta: t('subscribe'),
      featured: true
    }
  ];

  const isCurrentPlan = (planId) => user?.plan === planId;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="pricing-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-semibold mb-4">{t('choosePlan')}</h1>
          <p className="text-xl text-white/50">{t('pricingSubtitle')}</p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`plan-card ${plan.featured ? 'featured' : ''} ${isCurrentPlan(plan.id) ? 'border-emerald-500/50' : ''}`}
              data-testid={`plan-${plan.id.toLowerCase()}`}
            >
              {plan.featured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-[#D4AF37] text-black text-xs font-semibold px-4 py-1 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    POPULAR
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  {plan.id === 'TEAM' ? (
                    <Users className="w-5 h-5 text-[#D4AF37]" />
                  ) : plan.id === 'STANDARD' ? (
                    <User className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <User className="w-5 h-5 text-white/40" />
                  )}
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                </div>
                <p className="text-white/50 text-sm">{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-white/50">{plan.currency}</span>
                  {plan.price !== '0' && <span className="text-white/50">{t('perMonth')}</span>}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-white/20 flex-shrink-0" />
                    )}
                    <span className={feature.included ? 'text-white/80' : 'text-white/30'}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {isCurrentPlan(plan.id) ? (
                <Button 
                  className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default"
                  disabled
                  data-testid={`current-plan-btn-${plan.id.toLowerCase()}`}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {t('currentPlan')}
                </Button>
              ) : plan.id === 'FREE' ? (
                <Button 
                  className="w-full btn-secondary" 
                  disabled
                  data-testid="free-plan-btn"
                >
                  {t('free')}
                </Button>
              ) : (
                <Link to={user ? '/account?tab=payment' : '/auth?mode=register'}>
                  <Button 
                    className={`w-full ${plan.featured ? 'btn-primary' : 'btn-secondary'}`}
                    data-testid={`subscribe-btn-${plan.id.toLowerCase()}`}
                  >
                    {user ? t('subscribe') : t('register')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Payment Methods Info */}
        <div className="mt-16 text-center">
          <h3 className="text-xl font-semibold mb-4">Payment Methods</h3>
          <p className="text-white/50 max-w-2xl mx-auto">
            We accept MonCash and bank transfers (Sogebank, Unibank, BUH, BNC, Capital Bank).
            Submit your payment proof and we'll activate your subscription within 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
};

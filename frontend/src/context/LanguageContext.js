import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

const translations = {
  fr: {
    // Navigation
    home: 'Accueil',
    catalog: 'Catalogue',
    library: 'Bibliothèque',
    playlists: 'Playlists',
    pricing: 'Tarifs',
    account: 'Compte',
    team: 'Équipe',
    admin: 'Admin',
    login: 'Connexion',
    register: "S'inscrire",
    logout: 'Déconnexion',
    
    // Home
    heroTitle: 'Chants d\'Espérance',
    heroSubtitle: 'Accords et paroles pour votre culte',
    heroDescription: 'Accédez à des partitions de qualité pour les Chants d\'Espérance haïtiens. Téléchargez des PDF d\'accords, créez des playlists et partagez avec votre équipe.',
    browseCatalog: 'Parcourir le Catalogue',
    learnMore: 'En Savoir Plus',
    featuredSongs: 'Chants Populaires',
    viewAll: 'Voir Tout',
    
    // Catalog
    searchPlaceholder: 'Rechercher par titre ou numéro...',
    allLanguages: 'Toutes les langues',
    allTiers: 'Tous les niveaux',
    french: 'Français',
    creole: 'Créole',
    standard: 'Standard',
    premium: 'Premium',
    sortBy: 'Trier par',
    number: 'Numéro',
    popular: 'Populaire',
    newest: 'Récent',
    noSongsFound: 'Aucun chant trouvé',
    
    // Song
    downloadChords: 'Télécharger Accords PDF',
    downloadLyrics: 'Télécharger Paroles PDF',
    addToPlaylist: 'Ajouter à une Playlist',
    key: 'Tonalité',
    tempo: 'Tempo',
    tags: 'Tags',
    relatedSongs: 'Chants Similaires',
    upgradeToDownload: 'Passez à un forfait supérieur pour télécharger',
    loginToDownload: 'Connectez-vous pour télécharger',
    
    // Library
    myLibrary: 'Ma Bibliothèque',
    emptyLibrary: 'Votre bibliothèque est vide',
    emptyLibraryDesc: 'Téléchargez des chants pour les voir ici',
    downloadedOn: 'Téléchargé le',
    
    // Playlists
    myPlaylists: 'Mes Playlists',
    createPlaylist: 'Créer une Playlist',
    playlistName: 'Nom de la playlist',
    personalPlaylist: 'Playlist personnelle',
    teamPlaylist: 'Playlist d\'équipe',
    songs: 'chants',
    noPlaylists: 'Aucune playlist',
    createFirstPlaylist: 'Créez votre première playlist',
    deletePlaylist: 'Supprimer la playlist',
    exportSetlist: 'Exporter la Setlist',
    
    // Pricing
    choosePlan: 'Choisissez Votre Forfait',
    pricingSubtitle: 'Accédez aux partitions de qualité pour votre culte',
    free: 'Gratuit',
    freePlan: 'Forfait Gratuit',
    standardPlan: 'Forfait Standard',
    teamPlan: 'Forfait Équipe',
    perMonth: '/mois',
    features: 'Fonctionnalités',
    browseCatalogFeature: 'Parcourir le catalogue',
    previewSongs: 'Aperçu des chants',
    downloadStandard: 'Télécharger les chants Standard',
    personalLibrary: 'Bibliothèque personnelle',
    createPlaylists: 'Créer des playlists',
    downloadPremium: 'Télécharger les chants Premium',
    teamMembers: 'Jusqu\'à 7 membres',
    sharedLibrary: 'Bibliothèque partagée',
    sharedPlaylists: 'Playlists partagées',
    currentPlan: 'Forfait actuel',
    upgrade: 'Passer à',
    subscribe: 'S\'abonner',
    
    // Account
    myAccount: 'Mon Compte',
    profile: 'Profil',
    subscription: 'Abonnement',
    paymentHistory: 'Historique des paiements',
    displayName: 'Nom d\'affichage',
    email: 'Email',
    currentSubscription: 'Abonnement actuel',
    expiresOn: 'Expire le',
    graceUntil: 'Période de grâce jusqu\'au',
    submitPayment: 'Soumettre un paiement',
    noPayments: 'Aucun paiement',
    
    // Payment
    submitMonthlyPayment: 'Soumettre le paiement mensuel',
    selectPlan: 'Sélectionner un forfait',
    paymentMethod: 'Méthode de paiement',
    moncash: 'MonCash',
    bankTransfer: 'Virement bancaire',
    selectBank: 'Sélectionner une banque',
    amount: 'Montant',
    currency: 'Devise',
    billingMonth: 'Mois de facturation',
    referenceNumber: 'Numéro de référence',
    uploadReceipt: 'Télécharger le reçu',
    submit: 'Soumettre',
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    
    // Team
    myTeam: 'Mon Équipe',
    createTeam: 'Créer une équipe',
    teamName: 'Nom de l\'équipe',
    members: 'Membres',
    inviteMember: 'Inviter un membre',
    owner: 'Propriétaire',
    adminRole: 'Admin',
    member: 'Membre',
    removeMember: 'Retirer',
    pendingInvites: 'Invitations en attente',
    noTeam: 'Vous n\'avez pas d\'équipe',
    createTeamDesc: 'Créez une équipe pour partager des playlists et des téléchargements',
    teamRequired: 'Forfait Équipe requis',
    
    // Admin
    adminDashboard: 'Tableau de bord Admin',
    manageSongs: 'Gérer les chants',
    managePayments: 'Gérer les paiements',
    manageUsers: 'Gérer les utilisateurs',
    addSong: 'Ajouter un chant',
    editSong: 'Modifier le chant',
    uploadResources: 'Télécharger des ressources',
    pendingPayments: 'Paiements en attente',
    allPayments: 'Tous les paiements',
    approve: 'Approuver',
    reject: 'Rejeter',
    reviewNote: 'Note de révision',
    totalUsers: 'Total utilisateurs',
    totalSongs: 'Total chants',
    totalDownloads: 'Total téléchargements',
    
    // Common
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    confirm: 'Confirmer',
    back: 'Retour',
    next: 'Suivant',
    search: 'Rechercher',
    filter: 'Filtrer',
    close: 'Fermer',
    
    // Auth
    loginTitle: 'Connexion',
    registerTitle: 'Créer un compte',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    alreadyHaveAccount: 'Déjà un compte?',
    dontHaveAccount: 'Pas de compte?',
    loginHere: 'Connectez-vous ici',
    registerHere: 'Inscrivez-vous ici'
  },
  en: {
    // Navigation
    home: 'Home',
    catalog: 'Catalog',
    library: 'Library',
    playlists: 'Playlists',
    pricing: 'Pricing',
    account: 'Account',
    team: 'Team',
    admin: 'Admin',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    
    // Home
    heroTitle: 'Chants d\'Espérance',
    heroSubtitle: 'Chords and lyrics for your worship',
    heroDescription: 'Access quality sheet music for Haitian Chants d\'Espérance. Download chord PDFs, create playlists, and share with your team.',
    browseCatalog: 'Browse Catalog',
    learnMore: 'Learn More',
    featuredSongs: 'Featured Songs',
    viewAll: 'View All',
    
    // Catalog
    searchPlaceholder: 'Search by title or number...',
    allLanguages: 'All languages',
    allTiers: 'All tiers',
    french: 'French',
    creole: 'Creole',
    standard: 'Standard',
    premium: 'Premium',
    sortBy: 'Sort by',
    number: 'Number',
    popular: 'Popular',
    newest: 'Newest',
    noSongsFound: 'No songs found',
    
    // Song
    downloadChords: 'Download Chords PDF',
    downloadLyrics: 'Download Lyrics PDF',
    addToPlaylist: 'Add to Playlist',
    key: 'Key',
    tempo: 'Tempo',
    tags: 'Tags',
    relatedSongs: 'Related Songs',
    upgradeToDownload: 'Upgrade your plan to download',
    loginToDownload: 'Login to download',
    
    // Library
    myLibrary: 'My Library',
    emptyLibrary: 'Your library is empty',
    emptyLibraryDesc: 'Download songs to see them here',
    downloadedOn: 'Downloaded on',
    
    // Playlists
    myPlaylists: 'My Playlists',
    createPlaylist: 'Create Playlist',
    playlistName: 'Playlist name',
    personalPlaylist: 'Personal playlist',
    teamPlaylist: 'Team playlist',
    songs: 'songs',
    noPlaylists: 'No playlists',
    createFirstPlaylist: 'Create your first playlist',
    deletePlaylist: 'Delete playlist',
    exportSetlist: 'Export Setlist',
    
    // Pricing
    choosePlan: 'Choose Your Plan',
    pricingSubtitle: 'Access quality sheet music for your worship',
    free: 'Free',
    freePlan: 'Free Plan',
    standardPlan: 'Standard Plan',
    teamPlan: 'Team Plan',
    perMonth: '/month',
    features: 'Features',
    browseCatalogFeature: 'Browse catalog',
    previewSongs: 'Preview songs',
    downloadStandard: 'Download Standard songs',
    personalLibrary: 'Personal library',
    createPlaylists: 'Create playlists',
    downloadPremium: 'Download Premium songs',
    teamMembers: 'Up to 7 members',
    sharedLibrary: 'Shared library',
    sharedPlaylists: 'Shared playlists',
    currentPlan: 'Current plan',
    upgrade: 'Upgrade to',
    subscribe: 'Subscribe',
    
    // Account
    myAccount: 'My Account',
    profile: 'Profile',
    subscription: 'Subscription',
    paymentHistory: 'Payment History',
    displayName: 'Display Name',
    email: 'Email',
    currentSubscription: 'Current Subscription',
    expiresOn: 'Expires on',
    graceUntil: 'Grace period until',
    submitPayment: 'Submit Payment',
    noPayments: 'No payments',
    
    // Payment
    submitMonthlyPayment: 'Submit Monthly Payment',
    selectPlan: 'Select a plan',
    paymentMethod: 'Payment Method',
    moncash: 'MonCash',
    bankTransfer: 'Bank Transfer',
    selectBank: 'Select a bank',
    amount: 'Amount',
    currency: 'Currency',
    billingMonth: 'Billing Month',
    referenceNumber: 'Reference Number',
    uploadReceipt: 'Upload Receipt',
    submit: 'Submit',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    
    // Team
    myTeam: 'My Team',
    createTeam: 'Create Team',
    teamName: 'Team Name',
    members: 'Members',
    inviteMember: 'Invite Member',
    owner: 'Owner',
    adminRole: 'Admin',
    member: 'Member',
    removeMember: 'Remove',
    pendingInvites: 'Pending Invites',
    noTeam: 'You don\'t have a team',
    createTeamDesc: 'Create a team to share playlists and downloads',
    teamRequired: 'Team plan required',
    
    // Admin
    adminDashboard: 'Admin Dashboard',
    manageSongs: 'Manage Songs',
    managePayments: 'Manage Payments',
    manageUsers: 'Manage Users',
    addSong: 'Add Song',
    editSong: 'Edit Song',
    uploadResources: 'Upload Resources',
    pendingPayments: 'Pending Payments',
    allPayments: 'All Payments',
    approve: 'Approve',
    reject: 'Reject',
    reviewNote: 'Review Note',
    totalUsers: 'Total Users',
    totalSongs: 'Total Songs',
    totalDownloads: 'Total Downloads',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    search: 'Search',
    filter: 'Filter',
    close: 'Close',
    
    // Auth
    loginTitle: 'Login',
    registerTitle: 'Create Account',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: 'Don\'t have an account?',
    loginHere: 'Login here',
    registerHere: 'Register here'
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('kantik_language') || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('kantik_language', language);
  }, [language]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'fr' ? 'en' : 'fr');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

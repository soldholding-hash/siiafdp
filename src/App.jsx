import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { loadAll, syncTable, supabase, chargerMonProfil } from "./lib/db";
import Comptes from "./Comptes";
import MonPortefeuille from "./MonPortefeuille";
import MesAgents from "./MesAgents";
import { poserGageSQL, leverGageSQL, enregistrerConsultation, chargerGagesActifs, prolongerGageSQL, realiserGageSQL, chargerAlertesEcheance } from "./lib/gages";
import {
  LayoutDashboard, Map, FileStack, Inbox, GitBranch, ShieldCheck,
  Users, BarChart3, Plus, AlertTriangle, CheckCircle2, Clock,
  ChevronRight, X, Landmark, Banknote, Building2, QrCode, Bell, Eye,
  CreditCard, Lock, Send, ArrowLeftRight, Globe, Layers, MapPin, ArrowLeft,
  Sparkles, Bot, Search, Scale, Loader2, Lightbulb, TrendingUp, Compass, Mic, Wallet
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend, AreaChart, Area
} from "recharts";

// ---------- données initiales ----------

const INITIAL_PARCELLES = [
  { id: "P-04128", proprietaire: "Ets. Moukala & Fils", commune: "Bacongo", superficie: 1250, statut: "titre", x: 40, y: 40, w: 90, h: 70, validationTechnique: "validé", hypotheque: true },
  { id: "P-04129", proprietaire: "SCI Malanda", commune: "Bacongo", superficie: 980, statut: "litige", x: 110, y: 60, w: 90, h: 70, validationTechnique: "en attente" },
  { id: "P-04130", proprietaire: "État congolais", commune: "Poto-Poto", superficie: 3400, statut: "domaine", x: 260, y: 40, w: 110, h: 90, validationTechnique: "validé" },
  { id: "P-04131", proprietaire: "Mme Nkounkou A.", commune: "Ouenzé", superficie: 620, statut: "titre", x: 40, y: 160, w: 70, h: 60, validationTechnique: "validé" },
  { id: "P-04132", proprietaire: "Non affecté", commune: "Ouenzé", superficie: 800, statut: "libre", x: 150, y: 190, w: 80, h: 60, validationTechnique: "en attente" },
];

const INITIAL_BAUX = [
  { id: "B-2026-01", type: "Bail emphytéotique", beneficiaire: "Total Congo SA", parcelleId: "P-04130", dateDebut: "2024-01-01", dureeAns: 30, redevanceAnnuelle: 4500000, statutPaiement: "à jour" },
  { id: "B-2026-02", type: "Occupation temporaire (OTP)", beneficiaire: "Marché de Bacongo", parcelleId: "P-04128", dateDebut: "2025-03-01", dureeAns: 2, redevanceAnnuelle: 800000, statutPaiement: "en retard" },
  { id: "B-2026-03", type: "Concession", beneficiaire: "SNPC", parcelleId: "P-04130", dateDebut: "2023-06-01", dureeAns: 15, redevanceAnnuelle: 12000000, statutPaiement: "à jour" },
];

const INITIAL_ENCAISSEMENTS = [
  { id: "Q-2026-0451", dossierId: "D-2026-0091", type: "Droits d'enregistrement", montant: 150000, date: "2026-06-10" },
  { id: "Q-2026-0452", dossierId: "D-2026-0122", type: "Extrait cadastral", montant: 15000, date: "2026-07-30" },
];

// Cartes foncières numériques — chaque carte appartient à un citoyen et
// regroupe l'ensemble de ses titres fonciers. L'accès se fait par numéro
// de carte + code PIN, indépendamment des comptes agents.
const INITIAL_CARTES = [
  { id: "CF-1001", nom: "Nkounkou", prenom: "Antoinette", titulaire: "Mme Nkounkou A.", nin: "CG197804120017", dateNaissance: "1978-04-12", lieuNaissance: "Brazzaville", dateEmission: "2026-01-15", dateExpiration: "2036-01-15", pin: "1234", parcelleIds: ["P-04131"], version: 1, revoquee: false },
  { id: "CF-1002", nom: "Ets. Moukala & Fils", prenom: "", titulaire: "Ets. Moukala & Fils", nin: null, dateNaissance: null, lieuNaissance: null, dateEmission: "2025-11-02", dateExpiration: "2035-11-02", pin: "5678", parcelleIds: ["P-04128"], version: 1, revoquee: false },
  { id: "CF-1003", nom: "SCI Malanda", prenom: "", titulaire: "SCI Malanda", nin: null, dateNaissance: null, lieuNaissance: null, dateEmission: "2026-02-20", dateExpiration: "2036-02-20", pin: "2468", parcelleIds: ["P-04129"], version: 1, revoquee: false },
];

// Carte nationale — positionnement schématique (non géodésique) des
// départements de la République du Congo. Seul Brazzaville dispose de
// données cadastrales numérisées à ce stade de la démonstration ; les
// autres départements apparaissent en gris avec la mention correspondante.
const DEPARTEMENTS = [
  { id: "kouilou", nom: "Kouilou", x: 40, y: 240, hasData: false },
  { id: "pointe-noire", nom: "Pointe-Noire", x: 65, y: 265, hasData: false },
  { id: "niari", nom: "Niari", x: 105, y: 215, hasData: false },
  { id: "bouenza", nom: "Bouenza", x: 155, y: 195, hasData: false },
  { id: "lekoumou", nom: "Lékoumou", x: 110, y: 165, hasData: false },
  { id: "pool", nom: "Pool", x: 205, y: 175, hasData: false },
  { id: "brazzaville", nom: "Brazzaville", x: 245, y: 205, hasData: true },
  { id: "plateaux", nom: "Plateaux", x: 245, y: 130, hasData: false },
  { id: "cuvette-ouest", nom: "Cuvette-Ouest", x: 195, y: 85, hasData: false },
  { id: "cuvette", nom: "Cuvette", x: 275, y: 90, hasData: false },
  { id: "sangha", nom: "Sangha", x: 285, y: 30, hasData: false },
  { id: "likouala", nom: "Likouala", x: 350, y: 45, hasData: false },
];

const INITIAL_DOSSIERS = [
  { id: "D-2026-0091", demandeur: "Mme Nkounkou A.", type: "Demande de titre foncier", parcelleId: "P-04131", statut: "Délivré", dateDepot: "2026-06-02" },
  { id: "D-2026-0114", demandeur: "SCI Malanda", type: "Opposition / bornage", parcelleId: "P-04129", statut: "En instruction", dateDepot: "2026-07-14" },
  { id: "D-2026-0122", demandeur: "Ets. Moukala & Fils", type: "Extrait cadastral", parcelleId: "P-04128", statut: "Validé", dateDepot: "2026-07-29" },
  { id: "D-2026-0130", demandeur: "M. Ibara P.", type: "Demande de titre foncier", parcelleId: "P-04132", statut: "Reçu", dateDepot: "2026-08-10" },
];

const INITIAL_AGENTS = [
  { id: 1, nom: "R. Ondongo", poste: "Conservateur foncier", direction: "Conservation", dossiersTraites: 34, delaiMoyen: 12 },
  { id: 2, nom: "F. Ngoma", poste: "Géomètre", direction: "Cadastre", dossiersTraites: 21, delaiMoyen: 18 },
  { id: 3, nom: "S. Bakala", poste: "Agent guichet", direction: "Guichet unique", dossiersTraites: 58, delaiMoyen: 5 },
  { id: 4, nom: "T. Milandou", poste: "Juriste", direction: "Contentieux", dossiersTraites: 15, delaiMoyen: 27 },
];

const ETAPES = ["Reçu", "En instruction", "Validé", "Délivré", "Rejeté"];

const STATUT_STYLE = {
  titre: { label: "Titré", bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-600" },
  litige: { label: "En litige", bg: "bg-red-100", text: "text-red-800", dot: "bg-red-600" },
  domaine: { label: "Domaine public", bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-600" },
  libre: { label: "Libre", bg: "bg-stone-200", text: "text-stone-700", dot: "bg-stone-500" },
  gage: { label: "Sous hypothèque", bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-600" },
  gel_judiciaire: { label: "Gel judiciaire", bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-600" },
};

const NAV = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "cadastre", label: "Cadastre / SIG", icon: Map },
  { id: "brigade_dashboard", label: "Pilotage Brigade", icon: Compass },
  { id: "titres", label: "Titres fonciers", icon: FileStack },
  { id: "cartes", label: "Cartes foncières", icon: CreditCard },
  { id: "domaine", label: "Domaine public", icon: Landmark },
  { id: "guichet", label: "Guichet unique", icon: Inbox },
  { id: "guichet_externe", label: "Guichet externe", icon: Building2 },
  { id: "workflow", label: "Workflow", icon: GitBranch },
  { id: "tresor", label: "Trésor / Régie", icon: Banknote },
  { id: "comptes", label: "Comptes partenaires", icon: Wallet },
  { id: "portefeuille", label: "Mon portefeuille", icon: Wallet },
  { id: "mes_agents", label: "Mes agents", icon: Users },
  { id: "audit", label: "Journal d'audit", icon: ShieldCheck },
  { id: "rh", label: "Ressources humaines", icon: Users },
  { id: "rapports", label: "Rapports (BI)", icon: BarChart3 },
  { id: "carte_nationale", label: "Carte nationale", icon: Globe },
  { id: "assistant_ia", label: "Assistant IA", icon: Sparkles },
  { id: "laboratoire", label: "Laboratoire d'Anticipation", icon: Lightbulb },
  { id: "securigage", label: "Sécuri-Gage Foncier", icon: Lock },
  { id: "judiciaire", label: "Connexion Judiciaire", icon: Scale },
  { id: "aml", label: "Conformité AML", icon: AlertTriangle },
];

// ---------- comptes de service & droits d'accès ----------
// Chaque compte n'a accès qu'aux modules de son service. La Direction a une
// vue d'ensemble (tableau de bord, rapports, audit) mais pas aux écrans de
// saisie opérationnelle des autres services.

const USERS = [
  { username: "topographie", password: "topo2026", nom: "F. Ngoma", service: "Brigade Topographique (Cadastre)", views: ["brigade_dashboard", "cadastre"] },
  { username: "conservation", password: "titres2026", nom: "R. Ondongo", service: "Conservation foncière", views: ["titres", "cartes"] },
  { username: "domaine", password: "domaine2026", nom: "P. Massamba", service: "Direction du Domaine Public", views: ["domaine"] },
  { username: "guichet", password: "guichet2026", nom: "S. Bakala", service: "Guichet unique", views: ["guichet"] },
  { username: "notaire", password: "notaire2026", nom: "Me Kimbembe", service: "Guichet externe (Notaire agréé)", views: ["mes_agents", "portefeuille", "guichet_externe"], compteId: "CPT-NOTAIRE" },
  { username: "contentieux", password: "contentieux2026", nom: "T. Milandou", service: "Contentieux", views: ["workflow"] },
  { username: "tresor", password: "tresor2026", nom: "C. Ganga", service: "Trésor / DAF (Régie)", views: ["tresor"] },
  { username: "inspection", password: "inspection2026", nom: "Inspecteur Général", service: "Inspection Générale des Services", views: ["audit"], readOnly: true },
  { username: "rh", password: "rh2026", nom: "A. Loubaki", service: "DGRH", views: ["rh"] },
  { username: "direction", password: "direction2026", nom: "Directeur Général", service: "Direction", views: ["dashboard", "comptes", "audit", "rapports"] },
  { username: "mucodec", password: "mucodec2026", nom: "Agent MUCODEC", service: "MUCODEC — Partenaire bancaire (Sécuri-Gage)", views: ["mes_agents", "portefeuille", "securigage"], banque: "MUCODEC", compteId: "CPT-MUCODEC" },
  { username: "cofina", password: "cofina2026", nom: "Agent COFINA", service: "COFINA — Partenaire bancaire (Sécuri-Gage)", views: ["mes_agents", "portefeuille", "securigage"], banque: "COFINA", compteId: "CPT-COFINA" },
  { username: "tribunal", password: "tribunal2026", nom: "Juge — Chambre civile", service: "Tribunal de Grande Instance (Chambre civile)", views: ["mes_agents", "portefeuille", "judiciaire"], compteId: "CPT-TGI" },
  { username: "ministre", password: "ministre2026", nom: "Le Ministre", service: "Cabinet du Ministre", views: ["dashboard", "cadastre", "titres", "cartes", "domaine", "guichet", "guichet_externe", "workflow", "tresor", "comptes", "audit", "rh", "rapports", "carte_nationale", "assistant_ia", "laboratoire", "securigage", "judiciaire", "aml"], readOnly: true },
];

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function nowStamp() {
  const d = new Date();
  return d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function blocageMutation(bien) {
  if (!bien) return null;
  if (bien.statut === "gel_judiciaire") {
    return {
      source: "Système — Connexion Judiciaire",
      message: `Transaction rejetée. Bien immobilier sous gel judiciaire (dossier ${bien.gelInfo?.dossierJudiciaire}, ${bien.gelInfo?.tribunal}). Toute mutation est interdite jusqu'à décision de justice.`,
    };
  }
  if (bien.statut === "gage") {
    return {
      source: "Système — Sécuri-Gage",
      message: `Transaction rejetée. Bien immobilier sous hypothèque active auprès de ${bien.gageInfo?.banque}. Toute mutation est interdite jusqu'à mainlevée.`,
    };
  }
  return null;
}

export default function SigefApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState(null);
  const [parcelles, setParcelles] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [agents] = useState(INITIAL_AGENTS);
  const [audit, setAudit] = useState([]);
  const [selectedParcelle, setSelectedParcelle] = useState(null);
  const [showAddParcelle, setShowAddParcelle] = useState(false);
  const [showAddDossier, setShowAddDossier] = useState(false);
  const [baux, setBaux] = useState([]);
  const [showAddBail, setShowAddBail] = useState(false);
  const [encaissements, setEncaissements] = useState([]);
  const [showAddEncaissement, setShowAddEncaissement] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, ts: "22/08/2026 08:12", destinataire: "Mme Nkounkou A.", canal: "SMS", message: "Votre titre foncier P-04131 est disponible au retrait." },
  ]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [cartes, setCartes] = useState([]);
  const [showAddCarte, setShowAddCarte] = useState(false);
  const [showCreerTitre, setShowCreerTitre] = useState(false);
  const [citizenCard, setCitizenCard] = useState(null);
  const [citizenError, setCitizenError] = useState(null);
  const [dataReady, setDataReady] = useState(false);
  const hydrated = useRef(false);

  // Chargement initial depuis Supabase (ou amorçage si la base est vide).
  useEffect(() => {
    const auditSeed = (() => {
      const raw = [
        { id: 1, ts: "22/08/2026 08:12", user: "R. Ondongo", action: "Délivrance du titre foncier pour la parcelle P-04131" },
        { id: 2, ts: "22/08/2026 09:03", user: "Système", action: "Détection automatique : chevauchement P-04129 / P-04128" },
      ];
      let prevHash = "GENESIS";
      const chained = [];
      for (let i = raw.length - 1; i >= 0; i--) {
        const e = raw[i];
        const hash = hashString(prevHash + e.ts + e.user + e.action).toString(16).toUpperCase();
        chained[i] = { ...e, hash, prevHash };
        prevHash = hash;
      }
      return chained;
    })();

    loadAll({
      parcelles: INITIAL_PARCELLES,
      cartes: INITIAL_CARTES,
      dossiers: INITIAL_DOSSIERS,
      baux: INITIAL_BAUX,
      encaissements: INITIAL_ENCAISSEMENTS,
      audit: auditSeed,
    }).then((data) => {
      setParcelles(data.parcelles);
      setCartes(data.cartes);
      setDossiers(data.dossiers);
      setBaux(data.baux);
      setEncaissements(data.encaissements);
      setAudit(data.audit);
      hydrated.current = true;
      setDataReady(true);
    });
  }, []);

  // Synchronisation automatique : toute modification de ces collections
  // est répercutée vers Supabase, best-effort, sans bloquer l'interface.
  useEffect(() => { if (hydrated.current) syncTable("parcelles", parcelles); }, [parcelles]);
  useEffect(() => { if (hydrated.current) syncTable("cartes", cartes); }, [cartes]);
  useEffect(() => { if (hydrated.current) syncTable("dossiers", dossiers); }, [dossiers]);
  useEffect(() => { if (hydrated.current) syncTable("baux", baux); }, [baux]);
  useEffect(() => { if (hydrated.current) syncTable("encaissements", encaissements); }, [encaissements]);
  useEffect(() => { if (hydrated.current) syncTable("audit", audit); }, [audit]);

  function notify(destinataire, message, canal = "SMS") {
    setNotifications((n) => [{ id: n.length + 1, ts: nowStamp(), destinataire, canal, message }, ...n]);
  }

  function log(user, action) {
    setAudit((a) => {
      const ts = nowStamp();
      const prevHash = a[0]?.hash || "GENESIS";
      const hash = hashString(prevHash + ts + user + action).toString(16).toUpperCase();
      return [{ id: a.length + 1, ts, user, action, hash, prevHash }, ...a];
    });
  }

  async function handleLogin(username, password) {
    const email = username.includes("@") ? username : `${username}@siiafdp.cg`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return "Identifiant ou mot de passe incorrect.";
    const user = USERS.find((u) => u.username === username);
    if (!user) { await supabase.auth.signOut(); return "Compte non reconnu."; }
    // Charger le profil Supabase
    let profil = null;
    try { profil = await chargerMonProfil(); } catch (e) { console.error(e); }

    // Si le user n'est pas dans USERS, c'est un agent — construire dynamiquement
    if (!user && profil && profil.parent_id) {
      const { data: parent } = await supabase
        .from("profiles").select("compte_id, role").eq("id", profil.parent_id).single();
      if (!parent) {
        await supabase.auth.signOut();
        return "Configuration parente introuvable.";
      }
      const parentUser = USERS.find((u) => u.compteId === parent.compte_id);
      if (!parentUser) {
        await supabase.auth.signOut();
        return "Compte parent inconnu.";
      }
      const isGestion = profil.role === "agent_gestion";
      user = {
        username: username,
        nom: profil.nom_complet || username,
        service: parentUser.service + " — " + (isGestion ? "Agent gestion" : "Lecture seule"),
        views: isGestion
          ? ["portefeuille", "securigage"]
          : ["portefeuille"],
        banque: parentUser.banque,
        compteId: parent.compte_id,
        banqueRole: profil.role,
        isAgent: true,
      };
    }

    if (!user) {
      await supabase.auth.signOut();
      return "Compte non reconnu.";
    }

    if (profil) {
      user.banqueRole = profil.role;
      if (profil.compte_id) user.compteId = profil.compte_id;
    }

    setCurrentUser(user);
    setView(user.views[0]);
    setAudit((a) => [{ id: a.length + 1, ts: nowStamp(), user: user.nom, action: `Connexion au système (service : ${user.service})` }, ...a]);
    return null;
  }

  function handleLogout() {
    if (currentUser) {
      setAudit((a) => [{ id: a.length + 1, ts: nowStamp(), user: currentUser.nom, action: "Déconnexion du système" }, ...a]);
    }
    setCurrentUser(null);
    setView(null);
  }

  function handleCardLogin(cardId, pin) {
    const card = cartes.find((c) => c.id.toLowerCase() === cardId.trim().toLowerCase());
    if (!card || card.pin !== pin) {
      setCitizenError("Numéro de carte ou code PIN incorrect.");
      return;
    }
    if (card.revoquee) {
      setCitizenError("Cette carte a été déclarée perdue et révoquée. Contactez la Conservation foncière pour votre nouvelle carte.");
      return;
    }
    setCitizenError(null);
    setCitizenCard(card.id);
    setAudit((a) => [{ id: a.length + 1, ts: nowStamp(), user: card.titulaire, action: `Connexion au portail Carte foncière (${card.id})` }, ...a]);
  }

  function handleCardLogout() {
    const card = cartes.find((c) => c.id === citizenCard);
    if (card) setAudit((a) => [{ id: a.length + 1, ts: nowStamp(), user: card.titulaire, action: `Déconnexion du portail Carte foncière (${card.id})` }, ...a]);
    setCitizenCard(null);
  }

  function createCarte(form) {
    const id = `CF-10${cartes.length + 4}`;
    const titulaire = form.prenom ? `${form.prenom} ${form.nom}` : form.nom;
    setCartes((c) => [
      ...c,
      {
        id, nom: form.nom, prenom: form.prenom, titulaire,
        dateNaissance: form.dateNaissance || null, lieuNaissance: form.lieuNaissance || null,
        dateEmission: form.dateEmission, dateExpiration: form.dateExpiration,
        pin: form.pin, parcelleIds: form.parcelleIds, version: 1, revoquee: false,
      },
    ]);
    log("Conservation foncière", `Création de la carte foncière ${id} pour ${titulaire}`);
    setShowAddCarte(false);
  }

  function renouvelerCarte(cardId) {
    const ancienne = cartes.find((c) => c.id === cardId);
    if (!ancienne) return;
    const version = (ancienne.version || 1) + 1;
    const nouvelId = `${cardId.split("-v")[0]}-v${version}`;
    const emission = new Date().toISOString().slice(0, 10);
    const expiration = `${new Date().getFullYear() + 10}-${emission.slice(5)}`;
    setCartes((cs) => [
      ...cs.map((c) => (c.id === cardId ? { ...c, revoquee: true } : c)),
      { ...ancienne, id: nouvelId, dateEmission: emission, dateExpiration: expiration, version, revoquee: false, ancienneCarte: cardId },
    ]);
    log("Conservation foncière", `Carte ${cardId} déclarée perdue et révoquée — nouvelle carte ${nouvelId} émise pour ${ancienne.titulaire}`);
  }

  function creerTitreLie(form) {
    // form.mode = "existante" | "nouvelle"
    const candidate = {
      id: `P-0${4133 + parcelles.length}`,
      proprietaire: "", commune: form.commune,
      x: Number(form.x), y: Number(form.y), w: Number(form.w), h: Number(form.h),
      superficie: (Number(form.w) * Number(form.h) * 2.5) | 0,
      validationTechnique: "en attente",
    };
    const conflit = parcelles.find((p) => rectsOverlap(p, candidate));
    if (conflit) {
      log("Système — Moteur anti-superposition", `Création de titre REFUSÉE : chevauchement avec ${conflit.id}. Aucun titre ni carte créés.`);
      return { ok: false, conflitId: conflit.id };
    }

    let carteId, titulaire;
    if (form.mode === "existante") {
      const carte = cartes.find((c) => c.id.toLowerCase() === form.carteId.trim().toLowerCase());
      if (!carte || carte.revoquee) return { ok: false, error: "Carte introuvable ou révoquée." };
      carteId = carte.id;
      titulaire = carte.titulaire;
      candidate.proprietaire = titulaire;
      setParcelles((ps) => [...ps, { ...candidate, statut: "titre" }]);
      setCartes((cs) => cs.map((c) => (c.id === carteId ? { ...c, parcelleIds: [...c.parcelleIds, candidate.id] } : c)));
    } else {
      const nouvelleId = `CF-10${cartes.length + 4}`;
      titulaire = form.prenom ? `${form.prenom} ${form.nom}` : form.nom;
      candidate.proprietaire = titulaire;
      setParcelles((ps) => [...ps, { ...candidate, statut: "titre" }]);
      setCartes((cs) => [
        ...cs,
        {
          id: nouvelleId, nom: form.nom, prenom: form.prenom, titulaire,
          dateNaissance: form.dateNaissance || null, lieuNaissance: form.lieuNaissance || null,
          dateEmission: new Date().toISOString().slice(0, 10),
          dateExpiration: `${new Date().getFullYear() + 10}-${new Date().toISOString().slice(5, 10)}`,
          pin: form.pin, parcelleIds: [candidate.id], version: 1, revoquee: false,
        },
      ]);
      carteId = nouvelleId;
    }

    const dossierId = `D-2026-0${140 + dossiers.length}`;
    setDossiers((d) => [
      { id: dossierId, demandeur: titulaire, type: "Demande de titre foncier", parcelleId: candidate.id, statut: "Délivré", dateDepot: new Date().toISOString().slice(0, 10), origine: "conservation" },
      ...d,
    ]);
    log("Conservation foncière", `Titre foncier ${candidate.id} créé et rattaché à la carte ${carteId} (${titulaire}) — dématérialisation immédiate.`);
    notify(titulaire, `Votre titre foncier ${candidate.id} a été créé et enregistré sur votre carte foncière ${carteId}.`, "SMS");
    setShowCreerTitre(false);
    return { ok: true, id: candidate.id, carteId };
  }

  function transferProperty(sourceCardId, parcelleId, destCardId, pin) {
    const source = cartes.find((c) => c.id === sourceCardId);
    if (!source || source.pin !== pin) return { ok: false, error: "Code PIN incorrect." };
    const dest = cartes.find((c) => c.id.toLowerCase() === destCardId.trim().toLowerCase());
    if (!dest) return { ok: false, error: "Carte destinataire introuvable." };
    if (dest.id === source.id) return { ok: false, error: "Impossible de transférer vers votre propre carte." };
    if (!source.parcelleIds.includes(parcelleId)) return { ok: false, error: "Ce titre n'appartient pas à cette carte." };
    const bien = parcelles.find((p) => p.id === parcelleId);
    const blocage = blocageMutation(bien);
    if (blocage) {
      log(blocage.source, `Tentative de transfert REFUSÉE : ${parcelleId} — ${blocage.message}`);
      return { ok: false, error: blocage.message };
    }

    const code = `TXN-${hashString(parcelleId + source.id + dest.id + nowStamp()).toString(16).toUpperCase()}`;

    setCartes((cs) =>
      cs.map((c) => {
        if (c.id === source.id) return { ...c, parcelleIds: c.parcelleIds.filter((id) => id !== parcelleId) };
        if (c.id === dest.id) return { ...c, parcelleIds: [...c.parcelleIds, parcelleId] };
        return c;
      })
    );
    setParcelles((ps) => ps.map((p) => (p.id === parcelleId ? { ...p, proprietaire: dest.titulaire } : p)));

    const mutationId = `D-2026-0${140 + dossiers.length}`;
    setDossiers((d) => [
      { id: mutationId, demandeur: dest.titulaire, type: "Mutation (vente, succession)", parcelleId, statut: "En instruction", dateDepot: new Date().toISOString().slice(0, 10), origine: "carte" },
      ...d,
    ]);

    log("Système — Carte foncière", `Transfert de propriété ${parcelleId} : ${source.titulaire} (${source.id}) → ${dest.titulaire} (${dest.id}) — code ${code}`);
    notify(source.titulaire, `Transfert confirmé pour ${parcelleId}. Code de transaction : ${code}.`, "SMS");
    notify(dest.titulaire, `Vous avez reçu la propriété de ${parcelleId}. Code de transaction : ${code}. Un dossier de mutation ${mutationId} a été ouvert pour officialisation.`, "SMS");

    return { ok: true, code, mutationId };
  }

  const allowedNav = currentUser ? NAV.filter((n) => currentUser.views.includes(n.id)) : [];

  function addParcelle(form) {
    const candidate = { ...form, id: `P-0${4133 + parcelles.length}`, x: Number(form.x), y: Number(form.y), w: Number(form.w), h: Number(form.h), superficie: Number(form.w) * Number(form.h) * 2.5 | 0 };
    const conflit = parcelles.find((p) => rectsOverlap(p, candidate));
    if (conflit) {
      log("Système — Moteur anti-superposition", `Enregistrement REFUSÉ : la parcelle proposée par ${candidate.proprietaire} chevauche ${conflit.id} (déjà ${conflit.statut === "titre" ? "titrée" : conflit.statut}). Aucune donnée créée.`);
      return { ok: false, conflitId: conflit.id };
    }
    candidate.statut = "libre";
    setParcelles((p) => [...p, candidate]);
    log("Agent cadastre", `Création de la parcelle ${candidate.id} (${candidate.proprietaire}) — superficie calculée automatiquement : ${candidate.superficie} m²`);
    setShowAddParcelle(false);
    return { ok: true, id: candidate.id };
  }

  function validerTechnique(parcelleId) {
    setParcelles((ps) => ps.map((p) => (p.id === parcelleId ? { ...p, validationTechnique: "validé" } : p)));
    log("Brigade Topographique", `Validation technique du bornage — parcelle ${parcelleId}`);
  }

  function validerUrgence(id) {
    const d = dossiers.find((x) => x.id === id);
    setDossiers((ds) => ds.map((x) => (x.id === id ? { ...x, statut: "Délivré" } : x)));
    log("Cabinet du Ministre", `Signature électronique — visa d'urgence et délivrance du dossier ${id}`);
    if (d) notify(d.demandeur, `Votre dossier ${id} a été visé et délivré en urgence par le Cabinet du Ministre.`, "SMS");
  }

  function addDossier(form) {
    if (form.type === "Mutation (vente, succession)") {
      const bien = parcelles.find((p) => p.id === form.parcelleId);
      const blocage = blocageMutation(bien);
      if (blocage) {
        log(form.origine === "notaire" ? "Guichet externe (Notaire)" : "Guichet", `Dépôt REFUSÉ : mutation sur ${form.parcelleId} — ${blocage.message}`);
        return { ok: false, error: blocage.message };
      }
    }
    const id = `D-2026-0${140 + dossiers.length}`;
    const newDossier = { id, demandeur: form.demandeur, type: form.type, parcelleId: form.parcelleId, statut: "Reçu", dateDepot: new Date().toISOString().slice(0, 10), origine: form.origine || "guichet" };
    setDossiers((d) => [newDossier, ...d]);
    log(form.origine === "notaire" ? "Guichet externe (Notaire)" : "Guichet", `Nouveau dossier ${id} déposé par ${form.demandeur}`);
    notify(form.demandeur, `Votre dossier ${id} a bien été reçu et sera instruit prochainement.`, "Email");
    setShowAddDossier(false);
    return { ok: true, id };
  }

  async function poserGage(parcelleId, banque, form) {
    const bien = parcelles.find((p) => p.id === parcelleId);
    if (!bien) return { ok: false, error: "Parcelle introuvable." };
    if (bien.statut === "gage") {
      return { ok: false, error: `Ce bien est déjà grevé d'une hypothèque active auprès de ${bien.gageInfo.banque}. Double gage impossible.` };
    }
    if (bien.statut !== "titre") {
      return { ok: false, error: `Ce bien n'est pas dans un état permettant une hypothèque (statut actuel : ${STATUT_STYLE[bien.statut]?.label || bien.statut}).` };
    }
    const compteId = currentUser.compteId;
    if (compteId) {
      try {
        const dureeMois = Number(form.dureeAns) * 12 || 60;
        const res = await poserGageSQL(parcelleId, compteId, banque, form.montant, form.dossierCredit, dureeMois);
        if (!res.ok) {
          const m = res.raison === "double_gage"
            ? `Ce bien est déjà grevé au profit de ${res.banque}. Enregistrement impossible.`
            : `Refus du registre central : ${res.raison}.`;
          return { ok: false, error: m };
        }
      } catch (e) {
        return { ok: false, error: "Erreur de connexion au registre central : " + e.message };
      }
    }
    const gageInfo = { banque, dossierCredit: form.dossierCredit, montant: Number(form.montant), dureeAns: Number(form.dureeAns), dateDebut: new Date().toISOString().slice(0, 10) };
    setParcelles((ps) => ps.map((p) => (p.id === parcelleId ? { ...p, statutAvantGage: p.statut, statut: "gage", gageInfo } : p)));
    log(`${banque} — Sécuri-Gage`, `Pose de gage sur ${parcelleId} — dossier crédit ${form.dossierCredit}, ${Number(form.montant).toLocaleString("fr-FR")} FCFA sur ${form.dureeAns} ans. Verrou de mutation activé.`);
    notify(bien.proprietaire, `Votre bien ${parcelleId} est désormais sous hypothèque auprès de ${banque} (dossier ${form.dossierCredit}). Toute mutation est bloquée jusqu'à mainlevée.`, "SMS");
    return { ok: true };
  }

  async function leverGage(parcelleId, banque) {
    const bien = parcelles.find((p) => p.id === parcelleId);
    if (!bien || bien.statut !== "gage") return { ok: false, error: "Aucun gage actif sur ce bien." };
    if (bien.gageInfo.banque !== banque) return { ok: false, error: "Seule la banque ayant posé le gage peut émettre la mainlevée." };
    const compteId = currentUser.compteId;
    if (compteId) {
      try {
        const res = await leverGageSQL(parcelleId, compteId);
        if (!res.ok) return { ok: false, error: `Refus : ${res.raison}` };
      } catch (e) {
        return { ok: false, error: "Erreur de connexion : " + e.message };
      }
    }
    setParcelles((ps) => ps.map((p) => (p.id === parcelleId ? { ...p, statut: p.statutAvantGage || "titre", gageInfo: null, statutAvantGage: null } : p)));
    log(`${banque} — Sécuri-Gage`, `Mainlevée émise sur ${parcelleId} — dossier crédit ${bien.gageInfo.dossierCredit} soldé. Bien redevenu sain et disponible.`);
    notify(bien.proprietaire, `Mainlevée reçue de ${banque} — votre bien ${parcelleId} est de nouveau sain et disponible pour toute transaction.`, "SMS");
    return { ok: true };
  }

  function poserGelJudiciaire(parcelleId, form) {
    const bien = parcelles.find((p) => p.id === parcelleId);
    if (!bien) return { ok: false, error: "Parcelle introuvable." };
    if (bien.statut === "gel_judiciaire") {
      return { ok: false, error: `Ce bien est déjà sous gel judiciaire (dossier ${bien.gelInfo.dossierJudiciaire}, ${bien.gelInfo.tribunal}).` };
    }
    const gelInfo = {
      tribunal: "Tribunal de Grande Instance (Chambre civile)",
      dossierJudiciaire: form.dossierJudiciaire,
      motif: form.motif,
      magistrat: form.magistrat,
      dateEffet: form.dateEffet || new Date().toISOString().slice(0, 10),
      dateGel: new Date().toISOString().slice(0, 10),
    };
    setParcelles((ps) => ps.map((p) => (p.id === parcelleId ? { ...p, statutAvantGel: p.statut, statut: "gel_judiciaire", gelInfo } : p)));
    log(`Tribunal — ${form.magistrat}`, `Gel judiciaire posé sur ${parcelleId} — dossier ${form.dossierJudiciaire} (${form.motif}), effet au ${gelInfo.dateEffet}. Vente et crédit bloqués immédiatement.`);
    notify(bien.proprietaire, `Votre bien ${parcelleId} fait l'objet d'un gel judiciaire (dossier ${form.dossierJudiciaire}). Toute mutation ou hypothèque est bloquée jusqu'à décision de justice.`, "SMS");
    return { ok: true };
  }

  function leverGelJudiciaire(parcelleId, magistrat) {
    const bien = parcelles.find((p) => p.id === parcelleId);
    if (!bien || bien.statut !== "gel_judiciaire") return { ok: false, error: "Aucun gel judiciaire actif sur ce bien." };
    setParcelles((ps) => ps.map((p) => (p.id === parcelleId ? { ...p, statut: p.statutAvantGel || "titre", gelInfo: null, statutAvantGel: null } : p)));
    log(`Tribunal — ${magistrat || "Greffe"}`, `Levée du gel judiciaire sur ${parcelleId} — dossier ${bien.gelInfo.dossierJudiciaire} classé sans transfert de propriété.`);
    notify(bien.proprietaire, `Le gel judiciaire sur votre bien ${parcelleId} a été levé. Le bien retrouve son statut antérieur.`, "SMS");
    return { ok: true };
  }

  function executerDecisionJustice(parcelleId, form) {
    const bien = parcelles.find((p) => p.id === parcelleId);
    if (!bien) return { ok: false, error: "Parcelle introuvable." };
    if (bien.statut !== "gel_judiciaire") return { ok: false, error: "Une décision ne peut être exécutée que sur un bien actuellement sous gel judiciaire." };
    const magistratLog = `Tribunal — ${form.magistrat || "Greffe"}`;

    if (form.decision === "annulation") {
      setCartes((cs) => cs.map((c) => ({ ...c, parcelleIds: c.parcelleIds.filter((id) => id !== parcelleId) })));
      setParcelles((ps) => ps.map((p) => (p.id === parcelleId ? { ...p, statut: "libre", proprietaire: "Non affecté", gelInfo: null, statutAvantGel: null } : p)));
      log(magistratLog, `Exécution de jugement — dossier ${form.jugementRef} : ANNULATION du titre ${parcelleId}. Le bien redevient libre.`);
      notify(bien.proprietaire, `Le tribunal a ordonné l'annulation de votre titre ${parcelleId} (dossier ${form.jugementRef}).`, "SMS");
      return { ok: true };
    }

    if (form.decision === "transfert") {
      if (!form.nouveauProprietaire) return { ok: false, error: "Nom du nouveau propriétaire requis." };
      setCartes((cs) => cs.map((c) => ({ ...c, parcelleIds: c.parcelleIds.filter((id) => id !== parcelleId) })));
      if (form.carteDestinataire) {
        const dest = cartes.find((c) => c.id.toLowerCase() === form.carteDestinataire.trim().toLowerCase());
        if (dest) setCartes((cs) => cs.map((c) => (c.id === dest.id ? { ...c, parcelleIds: [...c.parcelleIds.filter((id) => id !== parcelleId), parcelleId] } : c)));
      }
      setParcelles((ps) => ps.map((p) => (p.id === parcelleId ? { ...p, statut: "titre", proprietaire: form.nouveauProprietaire, gelInfo: null, statutAvantGel: null } : p)));
      log(magistratLog, `Exécution de jugement — dossier ${form.jugementRef} : TRANSFERT du titre ${parcelleId} vers ${form.nouveauProprietaire}.`);
      notify(form.nouveauProprietaire, `Le tribunal vous a attribué le titre ${parcelleId} par décision de justice (dossier ${form.jugementRef}).`, "SMS");
      notify(bien.proprietaire, `Le tribunal a ordonné le transfert de votre bien ${parcelleId} vers ${form.nouveauProprietaire} (dossier ${form.jugementRef}).`, "SMS");
      return { ok: true };
    }

    if (form.decision === "expulsion") {
      setParcelles((ps) => ps.map((p) => (p.id === parcelleId ? { ...p, statut: p.statutAvantGel || "titre", gelInfo: null, statutAvantGel: null } : p)));
      log(magistratLog, `Exécution de jugement — dossier ${form.jugementRef} : EXPULSION ordonnée sur ${parcelleId}. Propriété inchangée, gel levé — exécution matérielle à la charge de l'huissier.`);
      notify(bien.proprietaire, `Le tribunal a ordonné une mesure d'expulsion concernant ${parcelleId} (dossier ${form.jugementRef}).`, "SMS");
      return { ok: true };
    }

    return { ok: false, error: "Type de décision non reconnu." };
  }

  function executerActeNotarie(form) {
    const bien = parcelles.find((p) => p.id === form.parcelleId);
    if (!bien) return { ok: false, error: "Parcelle introuvable." };
    const blocage = blocageMutation(bien);
    if (blocage) {
      log("Notaire — Acte authentique", `Acte REFUSÉ sur ${form.parcelleId} — ${blocage.message}`);
      return { ok: false, error: blocage.message };
    }
    if (!["titre"].includes(bien.statut)) {
      return { ok: false, error: `Ce bien n'est pas dans un état permettant une vente (statut actuel : ${STATUT_STYLE[bien.statut]?.label || bien.statut}).` };
    }

    let carteId = form.carteAcquereurId;
    let acquereurNom = form.acquereurNom;

    setCartes((cs) => cs.map((c) => ({ ...c, parcelleIds: c.parcelleIds.filter((id) => id !== form.parcelleId) })));

    if (form.creerCarte) {
      carteId = `CF-10${cartes.length + 4}`;
      setCartes((cs) => [
        ...cs,
        {
          id: carteId, nom: form.acquereurNom, prenom: "", titulaire: form.acquereurNom,
          dateNaissance: null, lieuNaissance: null,
          dateEmission: new Date().toISOString().slice(0, 10),
          dateExpiration: `${new Date().getFullYear() + 10}-${new Date().toISOString().slice(5, 10)}`,
          pin: form.pin || "0000", parcelleIds: [form.parcelleId], version: 1, revoquee: false,
        },
      ]);
    } else if (carteId) {
      const dest = cartes.find((c) => c.id.toLowerCase() === carteId.trim().toLowerCase());
      if (!dest) return { ok: false, error: "Carte de l'acquéreur introuvable." };
      acquereurNom = dest.titulaire;
      setCartes((cs) => cs.map((c) => (c.id === dest.id ? { ...c, parcelleIds: [...c.parcelleIds.filter((id) => id !== form.parcelleId), form.parcelleId] } : c)));
    }

    setParcelles((ps) => ps.map((p) => (p.id === form.parcelleId ? { ...p, proprietaire: acquereurNom } : p)));

    const droitsMutation = Math.round(Number(form.montantVente) * 0.05);
    const quittanceId = `Q-2026-0${450 + encaissements.length + 1}`;
    setEncaissements((e) => [{ id: quittanceId, dossierId: form.parcelleId, type: "Frais de mutation", montant: droitsMutation, mode: "Virement bancaire", date: new Date().toISOString().slice(0, 10) }, ...e]);

    const dossierId = `D-2026-0${140 + dossiers.length}`;
    setDossiers((d) => [
      { id: dossierId, demandeur: acquereurNom, type: "Mutation (vente, succession)", parcelleId: form.parcelleId, statut: "Délivré", dateDepot: new Date().toISOString().slice(0, 10), origine: "notaire" },
      ...d,
    ]);

    log("Notaire — Acte authentique", `Acte de vente ${form.parcelleId} : ${bien.proprietaire} → ${acquereurNom}. Droits de mutation ${droitsMutation.toLocaleString("fr-FR")} FCFA encaissés (quittance ${quittanceId}). Carte foncière mise à jour.`);
    notify(acquereurNom, `Acte notarié signé — vous êtes désormais propriétaire de ${form.parcelleId}. Carte foncière ${carteId} mise à jour.`, "SMS");
    notify(bien.proprietaire, `Votre bien ${form.parcelleId} a été vendu par acte notarié à ${acquereurNom}.`, "SMS");

    return { ok: true, carteId, quittanceId, droitsMutation };
  }

  function signalerANIF(alerte) {
    log("Cabinet du Ministre — Conformité AML", `Signalement transmis à l'ANIF : ${alerte}`);
  }

  function advanceDossier(id) {
    setDossiers((ds) =>
      ds.map((d) => {
        if (d.id !== id) return d;
        const idx = ETAPES.indexOf(d.statut);
        const next = ETAPES[Math.min(idx + 1, 3)];
        log("Agent instructeur", `Dossier ${id} : ${d.statut} → ${next}`);
        notify(d.demandeur, `Dossier ${id} : étape « ${next} ».`, next === "Délivré" ? "SMS" : "Email");
        return { ...d, statut: next };
      })
    );
  }

  function rejectDossier(id) {
    setDossiers((ds) => ds.map((d) => (d.id === id ? { ...d, statut: "Rejeté" } : d)));
    log("Agent instructeur", `Dossier ${id} rejeté`);
  }

  function addBail(form) {
    const id = `B-2026-0${baux.length + 4}`;
    setBaux((b) => [{ ...form, id, redevanceAnnuelle: Number(form.redevanceAnnuelle), statutPaiement: "à jour" }, ...b]);
    log("Direction du Domaine Public", `Création ${form.type.toLowerCase()} ${id} — ${form.beneficiaire}`);
    setShowAddBail(false);
  }

  function markPaiement(bailId) {
    setBaux((b) => b.map((x) => (x.id === bailId ? { ...x, statutPaiement: "à jour" } : x)));
    log("Direction du Domaine Public", `Redevance régularisée pour ${bailId}`);
  }

  function addEncaissement(form) {
    const id = `Q-2026-0${450 + encaissements.length + 1}`;
    const dossier = dossiers.find((d) => d.id === form.dossierId);
    setEncaissements((e) => [{ id, dossierId: form.dossierId, type: form.type, montant: Number(form.montant), mode: form.mode, date: new Date().toISOString().slice(0, 10) }, ...e]);
    log("Trésor / DAF", `Quittance ${id} émise — ${form.type} (${Number(form.montant).toLocaleString("fr-FR")} FCFA, ${form.mode})`);
    if (dossier) notify(dossier.demandeur, `Paiement reçu — quittance ${id} générée.`, "SMS");
    setShowAddEncaissement(false);
  }

  const kpi = useMemo(() => {
    const litiges = parcelles.filter((p) => p.statut === "litige").length;
    const enCours = dossiers.filter((d) => !["Délivré", "Rejeté"].includes(d.statut)).length;
    const delaiMoyen = Math.round(agents.reduce((s, a) => s + a.delaiMoyen, 0) / agents.length);
    return { total: parcelles.length, litiges, enCours, delaiMoyen };
  }, [parcelles, dossiers, agents]);

  const statutData = useMemo(() => {
    const counts = {};
    ETAPES.forEach((e) => (counts[e] = 0));
    dossiers.forEach((d) => (counts[d.statut] = (counts[d.statut] || 0) + 1));
    return ETAPES.map((e) => ({ name: e, value: counts[e] }));
  }, [dossiers]);

  const parcelleData = useMemo(() => {
    const counts = {};
    parcelles.forEach((p) => (counts[p.statut] = (counts[p.statut] || 0) + 1));
    return Object.entries(counts).map(([k, v]) => ({ name: STATUT_STYLE[k]?.label || k, value: v, key: k }));
  }, [parcelles]);

  const recettesData = useMemo(() => {
    const domaine = baux.reduce((s, b) => s + b.redevanceAnnuelle, 0);
    const tresor = encaissements.reduce((s, e) => s + e.montant, 0);
    return [
      { name: "Redevances domaniales (annuel)", value: domaine },
      { name: "Encaissements trésor", value: tresor },
    ];
  }, [baux, encaissements]);

  const activiteData = useMemo(() => {
    const jours = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    const base = dossiers.length + parcelles.length;
    return jours.map((j, i) => ({
      name: j,
      valeur: Math.max(1, Math.round(base * 0.6 + Math.sin(i * 1.1) * base * 0.35 + i)),
    }));
  }, [dossiers, parcelles]);

  const tensionData = useMemo(() => {
    const counts = {};
    parcelles.forEach((p) => {
      if (!counts[p.commune]) counts[p.commune] = { commune: p.commune, litiges: 0, total: 0 };
      counts[p.commune].total += 1;
      if (p.statut === "litige") counts[p.commune].litiges += 1;
    });
    return Object.values(counts).sort((a, b) => b.litiges - a.litiges);
  }, [parcelles]);

  const tauxRecouvrement = useMemo(() => {
    const du = baux.reduce((s, b) => s + b.redevanceAnnuelle, 0);
    const recouvre = baux.filter((b) => b.statutPaiement === "à jour").reduce((s, b) => s + b.redevanceAnnuelle, 0);
    return du > 0 ? Math.round((recouvre / du) * 100) : 100;
  }, [baux]);

  const missionsVol = useMemo(() => [
    { zone: "Bacongo", planifiees: 4, executees: 4 },
    { zone: "Poto-Poto", planifiees: 3, executees: 2 },
    { zone: "Ouenzé", planifiees: 3, executees: 3 },
    { zone: "Talangaï (extension)", planifiees: 2, executees: 0 },
  ], []);

  const brigadeStats = useMemo(() => {
    const total = parcelles.length;
    const valides = parcelles.filter((p) => p.validationTechnique === "validé").length;
    const enAttente = total - valides;
    const superficieTotaleKm2 = (parcelles.reduce((s, p) => s + p.superficie, 0) / 1_000_000).toFixed(3);
    const tauxValidation = total > 0 ? Math.round((valides / total) * 100) : 0;
    const missionsPlanifiees = missionsVol.reduce((s, m) => s + m.planifiees, 0);
    const missionsExecutees = missionsVol.reduce((s, m) => s + m.executees, 0);
    return { total, valides, enAttente, superficieTotaleKm2, tauxValidation, missionsPlanifiees, missionsExecutees };
  }, [parcelles, missionsVol]);

  const scanChronologique = useMemo(() => {
    const semaines = ["S-6", "S-5", "S-4", "S-3", "S-2", "S-1"];
    const base = Math.max(1, parcelles.length);
    return semaines.map((s, i) => ({
      name: s,
      km2: Number((base * 0.03 + i * base * 0.01).toFixed(2)),
      pv: Math.max(0, Math.round(i * (base / 12))),
    }));
  }, [parcelles]);

  const goulotsData = useMemo(() => ([
    { name: "Levés bruts", value: brigadeStats.total },
    { name: "En attente de contrôle", value: brigadeStats.enAttente },
    { name: "Validés (PV généré)", value: brigadeStats.valides },
  ]), [brigadeStats]);

  const dossiersPrioritaires = useMemo(() => {
    return dossiers
      .map((d) => {
        const parcelle = parcelles.find((p) => p.id === d.parcelleId);
        const ageJours = Math.max(0, Math.floor((new Date("2026-08-22") - new Date(d.dateDepot)) / 86400000));
        const bloque = ageJours > 30 && !["Délivré", "Rejeté"].includes(d.statut);
        const contentieuxEtat = parcelle?.proprietaire === "État congolais" && d.type === "Opposition / bornage";
        const strategique = baux.some((b) => b.beneficiaire === d.demandeur);
        const tags = [
          bloque && `Bloqué ${ageJours} j`,
          contentieuxEtat && "Contentieux impliquant l'État",
          strategique && "Investisseur stratégique",
        ].filter(Boolean);
        return { ...d, ageJours, tags };
      })
      .filter((d) => d.tags.length > 0);
  }, [dossiers, parcelles, baux]);

  const hautsRisques = useMemo(() => {
    return audit.filter((a) => /litige|chevauchement|transfert de propriété|rejeté|validation technique|urgence/i.test(a.action)).slice(0, 6);
  }, [audit]);

  const PIE_COLORS = { titre: "#059669", litige: "#dc2626", domaine: "#d97706", libre: "#78716c", gage: "#7c3aed", gel_judiciaire: "#4338ca" };

  if (!dataReady) {
    return (
      <div className="min-h-screen w-full bg-stone-900 flex items-center justify-center">
        <div className="text-stone-400 text-sm font-mono">Chargement du registre…</div>
      </div>
    );
  }

  if (citizenCard) {
    const card = cartes.find((c) => c.id === citizenCard);
    return (
      <CitizenPortal
        card={card}
        parcelles={parcelles}
        cartes={cartes}
        dossiers={dossiers}
        encaissements={encaissements}
        onTransfer={transferProperty}
        onLogout={handleCardLogout}
      />
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} onCardLogin={handleCardLogin} citizenError={citizenError} parcelles={parcelles} cartes={cartes} />;
  }

  return (
    <div className="flex h-screen w-full bg-stone-100 text-stone-900" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-stone-900 text-stone-200 flex flex-col">
        <div className="px-5 py-6 border-b border-stone-700 flex items-center gap-3">
          <BlasonCongo size={44} />
          <div>
            <div className="text-amber-500 text-xs tracking-widest uppercase font-mono">République du Congo</div>
            <div className="text-xl font-semibold text-stone-50 mt-1" style={{ fontFamily: "Georgia, serif" }}>sigef-v1</div>
            <div className="text-stone-400 text-xs mt-0.5">Gestion &amp; enregistrement foncier</div>
          </div>
        </div>
        <nav className="flex-1 py-3">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                  active ? "bg-stone-800 text-amber-400 border-r-2 border-amber-500" : "text-stone-300 hover:bg-stone-800/60"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-stone-700 text-xs">
          <div className="text-stone-200 font-medium">{currentUser.nom}</div>
          <div className="text-stone-500 font-mono mt-0.5">{currentUser.service}</div>
          <button onClick={handleLogout} className="mt-3 text-amber-500 hover:text-amber-400 text-xs">Se déconnecter</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-stone-200 px-8 py-5 flex items-center justify-between relative">
          <h1 className="text-xl font-semibold">{NAV.find((n) => n.id === view)?.label}</h1>
          <div className="flex items-center gap-4">
            <div className="text-xs text-stone-500 font-mono">{nowStamp()}</div>
            <button onClick={() => setShowNotifs((s) => !s)} className="relative text-stone-500 hover:text-stone-800">
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{notifications.length}</span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute top-14 right-8 w-80 bg-white border border-stone-200 rounded-sm shadow-lg z-40 max-h-80 overflow-y-auto">
                <div className="px-4 py-2.5 border-b border-stone-200 text-xs font-semibold text-stone-600">Notifications envoyées (SMS / Email)</div>
                {notifications.map((n) => (
                  <div key={n.id} className="px-4 py-2.5 border-b border-stone-100 text-xs">
                    <div className="flex justify-between text-stone-400 font-mono"><span>{n.canal}</span><span>{n.ts}</span></div>
                    <div className="text-stone-700 mt-0.5">{n.destinataire} — {n.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="p-8">
          {!currentUser.views.includes(view) && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-sm p-4">
              Accès refusé — votre compte ({currentUser.service}) n'est pas autorisé à consulter ce module.
            </div>
          )}
          {view === "dashboard" && currentUser.views.includes("dashboard") && (
            <Dashboard
              kpi={kpi}
              statutData={statutData}
              parcelleData={parcelleData}
              colors={PIE_COLORS}
              dossiers={dossiers}
              extended={currentUser.username === "ministre"}
              recettesData={recettesData}
              agents={agents}
              cartesCount={cartes.length}
              baux={baux}
              activiteData={activiteData}
              tensionData={tensionData}
              tauxRecouvrement={tauxRecouvrement}
              dossiersPrioritaires={dossiersPrioritaires}
              hautsRisques={hautsRisques}
              onValiderUrgence={validerUrgence}
            />
          )}

          {view === "brigade_dashboard" && (
            <BrigadeDashboard
              brigadeStats={brigadeStats}
              parcelleData={parcelleData}
              colors={PIE_COLORS}
              scanChronologique={scanChronologique}
              goulotsData={goulotsData}
              missionsVol={missionsVol}
              tensionData={tensionData}
            />
          )}

          {view === "cadastre" && (
            <Cadastre
              parcelles={parcelles}
              selected={selectedParcelle}
              onSelect={setSelectedParcelle}
              onAdd={() => setShowAddParcelle(true)}
              onValiderTechnique={validerTechnique}
              canValider={currentUser.username === "topographie"}
              readOnly={currentUser.readOnly}
              dossiers={dossiers}
            />
          )}

          {view === "titres" && <Titres parcelles={parcelles} dossiers={dossiers} />}

          {view === "cartes" && (
            <CartesFoncieres
              cartes={cartes} parcelles={parcelles} onAdd={() => setShowAddCarte(true)}
              onRenouveler={renouvelerCarte} readOnly={currentUser.readOnly}
              onCreerTitre={currentUser.username === "conservation" ? () => setShowCreerTitre(true) : null}
              dossiers={dossiers}
            />
          )}

          {view === "domaine" && (
            <Domaine baux={baux} parcelles={parcelles} onAdd={() => setShowAddBail(true)} onMarkPaiement={markPaiement} readOnly={currentUser.readOnly} />
          )}

          {view === "guichet" && (
            <Guichet dossiers={dossiers} onAdvance={advanceDossier} onReject={rejectDossier} onNew={() => setShowAddDossier(true)} readOnly={currentUser.readOnly} />
          )}

          {view === "guichet_externe" && (
            <GuichetExterne
              dossiers={dossiers.filter((d) => d.origine === "notaire")}
              parcelles={parcelles}
              cartes={cartes}
              onNew={(form) => addDossier({ ...form, origine: "notaire" })}
              onActeNotarie={executerActeNotarie}
              readOnly={currentUser.readOnly}
            />
          )}

          {view === "workflow" && <Workflow dossiers={dossiers} onAdvance={advanceDossier} onReject={rejectDossier} readOnly={currentUser.readOnly} />}

          {view === "tresor" && (
            <Tresor encaissements={encaissements} dossiers={dossiers} parcelles={parcelles} onAdd={() => setShowAddEncaissement(true)} readOnly={currentUser.readOnly} />
          )}

          {view === "comptes" && <Comptes />}
          {view === "portefeuille" && currentUser.compteId && <MonPortefeuille compteId={currentUser.compteId} />}
          {view === "mes_agents" && <MesAgents />}

          {view === "audit" && <Audit audit={audit} readOnly={currentUser.readOnly} service={currentUser.service} />}

          {view === "rh" && <RH agents={agents} />}

          {view === "rapports" && <Rapports statutData={statutData} parcelleData={parcelleData} colors={PIE_COLORS} agents={agents} recettesData={recettesData} />}

          {view === "carte_nationale" && (
            <CarteNationale parcelles={parcelles} dossiers={dossiers} baux={baux} />
          )}

          {view === "assistant_ia" && (
            <AssistantIA
              parcelles={parcelles}
              dossiers={dossiers}
              audit={audit}
              agents={agents}
              baux={baux}
              encaissements={encaissements}
              tensionData={tensionData}
              tauxRecouvrement={tauxRecouvrement}
              dossiersPrioritaires={dossiersPrioritaires}
            />
          )}

          {view === "laboratoire" && (
            <LaboratoireAnticipation
              parcelles={parcelles}
              dossiers={dossiers}
              baux={baux}
              encaissements={encaissements}
              tensionData={tensionData}
              tauxRecouvrement={tauxRecouvrement}
            />
          )}

          {view === "securigage" && (
            <SecuriGage
              parcelles={parcelles}
              cartes={cartes}
              banque={currentUser.banque}
              compteId={currentUser.compteId}
              readOnly={currentUser.readOnly}
              onPoserGage={poserGage}
              onLeverGage={leverGage}
            />
          )}

          {view === "judiciaire" && (
            <ConnexionJudiciaire
              parcelles={parcelles}
              cartes={cartes}
              dossiers={dossiers}
              audit={audit}
              readOnly={currentUser.readOnly}
              onPoserGel={poserGelJudiciaire}
              onLeverGel={leverGelJudiciaire}
              onExecuterDecision={executerDecisionJustice}
            />
          )}

          {view === "aml" && (
            <ConformiteAML dossiers={dossiers} encaissements={encaissements} audit={audit} onSignaler={signalerANIF} />
          )}
        </div>
      </main>

      {showAddParcelle && (
        <AddParcelleModal onClose={() => setShowAddParcelle(false)} onSubmit={addParcelle} />
      )}
      {showAddDossier && (
        <AddDossierModal parcelles={parcelles} onClose={() => setShowAddDossier(false)} onSubmit={addDossier} />
      )}
      {showAddBail && (
        <AddBailModal parcelles={parcelles} onClose={() => setShowAddBail(false)} onSubmit={addBail} />
      )}
      {showAddEncaissement && (
        <AddEncaissementModal dossiers={dossiers} onClose={() => setShowAddEncaissement(false)} onSubmit={addEncaissement} />
      )}
      {showAddCarte && (
        <AddCarteModal parcelles={parcelles} cartes={cartes} onClose={() => setShowAddCarte(false)} onSubmit={createCarte} />
      )}
      {showCreerTitre && (
        <CreerTitreModal cartes={cartes} onClose={() => setShowCreerTitre(false)} onSubmit={creerTitreLie} />
      )}
    </div>
  );
}

// ---------- Connexion ----------

function LoginScreen({ onLogin, onCardLogin, citizenError, parcelles, cartes }) {
  const [mode, setMode] = useState("agent");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showDemo, setShowDemo] = useState(false);
  const [cardId, setCardId] = useState("");
  const [pin, setPin] = useState("");

  async function submit() {
    setError("Vérification en cours...");
    const err = await onLogin(username.trim(), password);
    setError(err);
  }

  function submitCard() {
    onCardLogin(cardId, pin);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") mode === "agent" ? submit() : submitCard();
  }

  return (
    <div className="min-h-screen w-full bg-stone-900 flex items-center justify-center p-6" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <BlasonCongo size={80} />
          </div>
          <div className="text-amber-500 text-xs tracking-widest uppercase font-mono mb-2">République du Congo</div>
          <div className="text-3xl font-semibold text-stone-50" style={{ fontFamily: "Georgia, serif" }}>sigef-v1</div>
          <div className="text-stone-400 text-sm mt-1">Accès par service, ou par carte foncière citoyenne</div>
          <div className="text-stone-500 text-xs mt-2 font-mono">Cartes foncières · Cabinet du Ministre · Carte nationale · Assistant IA · Laboratoire d'Anticipation · Sécuri-Gage · Connexion Judiciaire · Notaire Connecté · Conformité AML</div>
        </div>

        <div className="flex bg-stone-800 rounded-sm p-1 mb-4">
          <button onClick={() => setMode("agent")} className={`flex-1 text-xs py-2 rounded-sm transition-colors ${mode === "agent" ? "bg-white text-stone-900 font-medium" : "text-stone-400"}`}>
            Connexion agent
          </button>
          <button onClick={() => setMode("citoyen")} className={`flex-1 text-xs py-2 rounded-sm transition-colors flex items-center justify-center gap-1.5 ${mode === "citoyen" ? "bg-white text-stone-900 font-medium" : "text-stone-400"}`}>
            <CreditCard size={13} /> Ma carte foncière
          </button>
          <button onClick={() => setMode("verification")} className={`flex-1 text-xs py-2 rounded-sm transition-colors flex items-center justify-center gap-1.5 ${mode === "verification" ? "bg-white text-stone-900 font-medium" : "text-stone-400"}`}>
            <Search size={13} /> Vérification tiers
          </button>
        </div>

        {mode === "agent" && (
          <>
            <div className="bg-white rounded-sm p-6 space-y-4">
              <Field label="Identifiant">
                <input
                  className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              </Field>
              <Field label="Mot de passe">
                <input
                  type="password"
                  className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </Field>
              {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2.5">{error}</div>}
              <button type="button" onClick={submit} className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm py-2.5 rounded-sm font-medium">
                Se connecter
              </button>
            </div>

            <button onClick={() => setShowDemo((s) => !s)} className="w-full text-center text-stone-400 hover:text-stone-200 text-xs mt-4 font-mono">
              {showDemo ? "Masquer" : "Afficher"} les comptes de démonstration
            </button>

            {showDemo && (
              <div className="mt-3 bg-stone-800 rounded-sm p-4 text-xs text-stone-300 space-y-2 font-mono">
                {USERS.map((u) => (
                  <div key={u.username} className="flex justify-between border-b border-stone-700 pb-2 last:border-0 last:pb-0">
                    <span className="text-stone-400">{u.service}</span>
                    <span>{u.username} / {u.password}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {mode === "citoyen" && (
          <>
            <div className="bg-white rounded-sm p-6 space-y-4">
              <Field label="Numéro de carte foncière">
                <input
                  className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  placeholder="CF-1001"
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              </Field>
              <Field label="Code PIN">
                <input
                  type="password"
                  inputMode="numeric"
                  className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </Field>
              {citizenError && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2.5">{citizenError}</div>}
              <button type="button" onClick={submitCard} className="w-full flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm py-2.5 rounded-sm font-medium">
                <Lock size={14} /> Ouvrir ma carte
              </button>
            </div>
            <button onClick={() => setShowDemo((s) => !s)} className="w-full text-center text-stone-400 hover:text-stone-200 text-xs mt-4 font-mono">
              {showDemo ? "Masquer" : "Afficher"} les cartes de démonstration
            </button>
            {showDemo && (
              <div className="mt-3 bg-stone-800 rounded-sm p-4 text-xs text-stone-300 space-y-2 font-mono">
                {INITIAL_CARTES.map((c) => (
                  <div key={c.id} className="flex justify-between border-b border-stone-700 pb-2 last:border-0 last:pb-0">
                    <span className="text-stone-400">{c.titulaire}</span>
                    <span>{c.id} / {c.pin}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {mode === "verification" && <VerificationTiers parcelles={parcelles} cartes={cartes} />}
      </div>
    </div>
  );
}

// ---------- Portail de vérification tiers (banques, notaires) ----------

function VerificationTiers({ parcelles, cartes }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(undefined); // undefined = pas cherché, null = introuvable

  function verifier() {
    const q = query.trim().toUpperCase();
    const parcelle = parcelles.find((p) => p.id.toUpperCase() === q);
    const carte = cartes.find((c) => c.id.toUpperCase() === q);
    if (parcelle) {
      setResult({ type: "parcelle", data: parcelle });
    } else if (carte) {
      setResult({ type: "carte", data: carte });
    } else {
      setResult(null);
    }
  }

  return (
    <div className="bg-white rounded-sm p-6">
      <div className="text-xs text-stone-500 mb-4">Espace banques et notaires — vérifiez l'authenticité d'un titre ou d'une carte foncière sans accéder aux données personnelles complètes.</div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
          placeholder="P-04131 ou CF-1001"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && verifier()}
        />
        <button onClick={verifier} className="bg-stone-900 hover:bg-stone-800 text-white text-xs px-4 rounded-sm">Vérifier</button>
      </div>

      {result === null && (
        <div className="mt-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-3">Aucun titre ni carte foncière ne correspond à cette référence.</div>
      )}
      {result && result.type === "parcelle" && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-sm p-3 text-xs text-stone-700 space-y-1.5">
          <div className="font-semibold text-emerald-800">Référence authentifiée — {result.data.id}</div>
          <div>Commune : {result.data.commune} · Superficie : {result.data.superficie} m²</div>
          <div>État : <span className="font-medium">{result.data.statut === "litige" ? "Faisant l'objet d'un contentieux" : result.data.hypotheque ? "Sous hypothèque" : "Saine"}</span></div>
        </div>
      )}
      {result && result.type === "carte" && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-sm p-3 text-xs text-stone-700 space-y-1.5">
          <div className="font-semibold text-emerald-800">Carte foncière valide — {result.data.id}</div>
          <div>Nombre de biens rattachés : {result.data.parcelleIds.length}</div>
        </div>
      )}
    </div>
  );
}

// ---------- Dashboard ----------

function Kpi({ label, value, tone = "stone" }) {
  const tones = {
    stone: "text-stone-900",
    red: "text-red-700",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
  };
  return (
    <div className="bg-white border border-stone-200 rounded-sm p-5">
      <div className="text-xs uppercase tracking-wide text-stone-500 font-mono mb-2">{label}</div>
      <div className={`text-3xl font-semibold ${tones[tone]}`}>{value}</div>
    </div>
  );
}

function Dashboard({ kpi, statutData, parcelleData, colors, dossiers, extended, recettesData, agents, cartesCount, baux, activiteData, tensionData, tauxRecouvrement, dossiersPrioritaires, hautsRisques, onValiderUrgence }) {
  const recents = dossiers.slice(0, 5);
  const totalRecettes = recettesData ? recettesData.reduce((s, r) => s + r.value, 0) : 0;
  const retards = baux ? baux.filter((b) => b.statutPaiement === "en retard").length : 0;
  const totalParcelles = parcelleData.reduce((s, p) => s + p.value, 0);

  return (
    <div className="space-y-6">
      {extended && (
        <div className="bg-stone-900 text-stone-100 rounded-sm px-5 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Vue d'ensemble — Cabinet du Ministre</div>
          <div className="text-xs text-stone-400 font-mono">Supervision transversale de l'ensemble des services</div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <Kpi label="Parcelles enregistrées" value={kpi.total} />
        <Kpi label="Litiges détectés" value={kpi.litiges} tone="red" />
        <Kpi label="Dossiers en cours" value={kpi.enCours} tone="amber" />
        <Kpi label="Délai moyen de traitement" value={`${kpi.delaiMoyen} j`} tone="emerald" />
      </div>

      {extended && (
        <div className="grid grid-cols-4 gap-4">
          <Kpi label="Recettes totales (domaine + trésor)" value={`${totalRecettes.toLocaleString("fr-FR")} FCFA`} tone="emerald" />
          <Kpi label="Cartes foncières émises" value={cartesCount} />
          <Kpi label="Redevances en retard" value={retards} tone={retards > 0 ? "red" : "emerald"} />
          <Kpi label="Directions actives" value={agents ? new Set(agents.map((a) => a.direction)).size : 0} />
        </div>
      )}

      {extended && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-stone-200 rounded-sm p-5">
            <div className="text-sm font-semibold mb-1">Tension foncière par commune</div>
            <div className="text-xs text-stone-500 mb-4">Litiges enregistrés par zone — identifie les points chauds du territoire.</div>
            <div className="space-y-2.5">
              {tensionData.map((z, i) => (
                <div key={z.commune} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-stone-600 shrink-0">{z.commune}</div>
                  <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${i === 0 && z.litiges > 0 ? "bg-red-600" : "bg-amber-500"}`}
                      style={{ width: `${z.total > 0 ? (z.litiges / z.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="w-20 text-xs text-stone-500 text-right shrink-0">{z.litiges} / {z.total} parcelles</div>
                </div>
              ))}
              {tensionData.length > 0 && tensionData[0].litiges > 0 && (
                <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2.5 mt-1">
                  <AlertTriangle size={13} className="shrink-0" /> Point chaud identifié : {tensionData[0].commune}
                </div>
              )}
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-sm p-5">
            <div className="text-sm font-semibold mb-1">Taux de recouvrement des recettes domaniales</div>
            <div className="text-xs text-stone-500 mb-4">Redevances effectivement encaissées / redevances théoriquement dues.</div>
            <div className="flex items-center gap-5">
              <div className="relative w-28 h-28 shrink-0">
                <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e7e5e4" strokeWidth="3.5" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke={tauxRecouvrement >= 80 ? "#059669" : tauxRecouvrement >= 50 ? "#d97706" : "#dc2626"}
                    strokeWidth="3.5" strokeLinecap="round"
                    strokeDasharray={`${tauxRecouvrement * 0.974} 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-stone-900">{tauxRecouvrement}%</div>
              </div>
              <div className="text-xs text-stone-500">
                {tauxRecouvrement >= 80 ? "Recouvrement satisfaisant." : tauxRecouvrement >= 50 ? "Recouvrement à surveiller — relances à engager." : "Recouvrement critique — intervention requise."}
              </div>
            </div>
          </div>
        </div>
      )}

      {extended && dossiersPrioritaires.length > 0 && (
        <div className="bg-white border border-red-200 rounded-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-600" />
            <div className="text-sm font-semibold">Dossiers prioritaires &amp; sensibles</div>
          </div>
          <div className="text-xs text-stone-500 mb-4">Dossiers bloqués depuis plus de 30 jours, contentieux impliquant l'État, ou demandes d'investisseurs stratégiques nécessitant un arbitrage direct.</div>
          <div className="space-y-2">
            {dossiersPrioritaires.map((d) => (
              <div key={d.id} className="flex items-center justify-between border border-stone-200 rounded-sm p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-stone-500">{d.id}</span>
                    <span className="text-sm font-medium">{d.demandeur}</span>
                  </div>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {d.tags.map((t, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded-sm border border-red-200">{t}</span>
                    ))}
                    <StatutBadge statut={d.statut} />
                  </div>
                </div>
                {d.statut === "Validé" && (
                  <button
                    onClick={() => onValiderUrgence(d.id)}
                    className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs px-3 py-2 rounded-sm shrink-0"
                  >
                    <ShieldCheck size={13} /> Viser (signature électronique)
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {extended && (
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <Eye size={15} className="text-stone-600" />
            <div className="text-sm font-semibold">Journal des actions à hauts risques</div>
          </div>
          <div className="text-xs text-stone-500 mb-4">Modifications sensibles récentes — annulations, litiges, transferts de propriété, validations techniques.</div>
          {hautsRisques.length === 0 && <div className="text-xs text-stone-400">Aucune action à risque détectée récemment.</div>}
          <div className="space-y-0">
            {hautsRisques.map((a) => (
              <div key={a.id} className="flex gap-4 py-2.5 border-b border-stone-100 text-sm last:border-0">
                <div className="font-mono text-xs text-stone-400 w-32 shrink-0">{a.ts}</div>
                <div className="font-medium w-36 shrink-0 text-stone-600 text-xs">{a.user}</div>
                <div className="text-stone-700 text-xs">{a.action}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold">Activité du système — 7 derniers jours</div>
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Stable
          </span>
        </div>
        <div className="text-xs text-stone-500 mb-4">Volume de dossiers et parcelles traités par jour — une courbe qui monte signale une charge croissante sur les services.</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={activiteData}>
            <defs>
              <linearGradient id="activiteGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d97706" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Area type="monotone" dataKey="valeur" stroke="#d97706" strokeWidth={2.5} fill="url(#activiteGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="text-sm font-semibold mb-4">Dossiers par étape</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statutData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="text-sm font-semibold mb-4">Parcelles par statut</div>
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={parcelleData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} paddingAngle={2}>
                  {parcelleData.map((entry, i) => (
                    <Cell key={i} fill={colors[entry.key] || "#78716c"} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingBottom: 28 }}>
              <div className="text-3xl font-semibold text-stone-900">{totalParcelles}</div>
              <div className="text-xs text-stone-500 uppercase tracking-wide font-mono">Parcelles</div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
            {parcelleData.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-stone-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[entry.key] || "#78716c" }}></span>
                {entry.name} ({entry.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {extended && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-stone-200 rounded-sm p-5">
            <div className="text-sm font-semibold mb-4">Recettes par source</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={recettesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v.toLocaleString("fr-FR")} FCFA`} />
                <Bar dataKey="value" fill="#d97706" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white border border-stone-200 rounded-sm p-5">
            <div className="text-sm font-semibold mb-4">Dossiers traités par direction</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agents.map((a) => ({ name: a.direction, dossiers: a.dossiersTraites }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="dossiers" fill="#059669" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="text-sm font-semibold mb-4">Dossiers récents</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 border-b border-stone-200 font-mono text-xs uppercase">
              <th className="pb-2">Référence</th><th>Demandeur</th><th>Type</th><th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {recents.map((d) => (
              <tr key={d.id} className="border-b border-stone-100">
                <td className="py-2 font-mono text-xs">{d.id}</td>
                <td>{d.demandeur}</td>
                <td className="text-stone-600">{d.type}</td>
                <td><StatutBadge statut={d.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatutBadge({ statut }) {
  const map = {
    "Reçu": "bg-stone-200 text-stone-700",
    "En instruction": "bg-amber-100 text-amber-800",
    "Validé": "bg-sky-100 text-sky-800",
    "Délivré": "bg-emerald-100 text-emerald-800",
    "Rejeté": "bg-red-100 text-red-800",
  };
  return <span className={`text-xs px-2 py-1 rounded-sm font-medium ${map[statut]}`}>{statut}</span>;
}

// ---------- Cadastre ----------

// ---------- Tableau de bord — Brigade Topographique ----------

function BrigadeDashboard({ brigadeStats, parcelleData, colors, scanChronologique, goulotsData, missionsVol, tensionData }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <Kpi label="Parcelles numérisées" value={brigadeStats.total} />
        <Kpi label="Superficie cartographiée" value={`${brigadeStats.superficieTotaleKm2} km²`} tone="emerald" />
        <Kpi label="Missions exécutées / planifiées" value={`${brigadeStats.missionsExecutees} / ${brigadeStats.missionsPlanifiees}`} tone="amber" />
        <Kpi label="Taux de validation technique" value={`${brigadeStats.tauxValidation}%`} tone={brigadeStats.tauxValidation >= 70 ? "emerald" : "amber"} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="text-sm font-semibold mb-4">Répartition du foncier</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={parcelleData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                {parcelleData.map((entry, i) => (
                  <Cell key={i} fill={colors[entry.key] || "#78716c"} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="text-sm font-semibold mb-1">Suivi chronologique des levés</div>
          <div className="text-xs text-stone-500 mb-3">Km² scannés et PV de bornage générés — tendance illustrative sur 6 semaines.</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={scanChronologique}>
              <defs>
                <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="km2" name="km² scannés" stroke="#059669" strokeWidth={2} fill="url(#scanGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="text-sm font-semibold mb-1">Goulots d'étranglement</div>
          <div className="text-xs text-stone-500 mb-3">Volume à chaque étape — du levé brut à la validation finale.</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={goulotsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="text-sm font-semibold mb-1">Missions de vol par zone</div>
          <div className="text-xs text-stone-500 mb-3">Planifiées vs exécutées.</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={missionsVol}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis dataKey="zone" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="planifiees" name="Planifiées" fill="#a8a29e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="executees" name="Exécutées" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="text-sm font-semibold mb-1">Hotspots — zones à prioriser</div>
        <div className="text-xs text-stone-500 mb-4">Communes avec le plus de superpositions ou conflits de limites — à traiter en priorité sur le terrain.</div>
        <div className="space-y-2.5">
          {tensionData.map((z, i) => (
            <div key={z.commune} className="flex items-center gap-3">
              <div className="w-28 text-xs text-stone-600 shrink-0">{z.commune}</div>
              <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${i === 0 && z.litiges > 0 ? "bg-red-600" : "bg-amber-500"}`}
                  style={{ width: `${z.total > 0 ? (z.litiges / z.total) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="w-24 text-xs text-stone-500 text-right shrink-0">{z.litiges} / {z.total} parcelles</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Cadastre({ parcelles, selected, onSelect, onAdd, onValiderTechnique, canValider, readOnly }) {
  const sel = parcelles.find((p) => p.id === selected);
  return (
    <div className="grid grid-cols-3 gap-5">
      <div className="col-span-2 bg-white border border-stone-200 rounded-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold">Carte cadastrale — vue schématique</div>
          {!readOnly && (
            <button onClick={onAdd} className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-2 rounded-sm">
              <Plus size={14} /> Enregistrer une parcelle
            </button>
          )}
        </div>
        <svg viewBox="0 0 400 280" className="w-full border border-stone-200 bg-stone-50" style={{ backgroundImage: "linear-gradient(#e7e5e4 1px, transparent 1px), linear-gradient(90deg, #e7e5e4 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
          {parcelles.map((p) => {
            const style = STATUT_STYLE[p.statut];
            const isSel = p.id === selected;
            const fill = { titre: "#a7f3d0", litige: "#fecaca", domaine: "#fde68a", libre: "#e7e5e4", gage: "#ddd6fe", gel_judiciaire: "#c7d2fe" }[p.statut];
            const stroke = { titre: "#059669", litige: "#dc2626", domaine: "#d97706", libre: "#78716c", gage: "#7c3aed", gel_judiciaire: "#4338ca" }[p.statut];
            return (
              <g key={p.id} onClick={() => onSelect(p.id)} className="cursor-pointer">
                <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={fill} fillOpacity={p.statut === "litige" ? 0.55 : 0.8} stroke={stroke} strokeWidth={isSel ? 2.5 : 1.2} strokeDasharray={p.validationTechnique === "en attente" ? "4 3" : "0"} />
                <text x={p.x + 6} y={p.y + 16} fontSize="9" fontFamily="monospace" fill="#292524">{p.id}</text>
              </g>
            );
          })}
        </svg>
        <div className="flex gap-4 mt-3 text-xs text-stone-500 flex-wrap">
          {Object.entries(STATUT_STYLE).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${v.dot}`}></span>{v.label}</div>
          ))}
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-0 border-t border-dashed border-stone-400"></span>Bornage en attente de validation</div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="text-sm font-semibold mb-4">Fiche parcelle</div>
        {!sel && <div className="text-stone-400 text-sm">Sélectionnez une parcelle sur la carte.</div>}
        {sel && (
          <div className="space-y-3 text-sm">
            <div><span className="text-stone-500 text-xs font-mono block">Référence</span>{sel.id}</div>
            <div><span className="text-stone-500 text-xs font-mono block">Propriétaire</span>{sel.proprietaire}</div>
            <div><span className="text-stone-500 text-xs font-mono block">Commune</span>{sel.commune}</div>
            <div><span className="text-stone-500 text-xs font-mono block">Superficie</span>{sel.superficie} m²</div>
            <div>
              <span className="text-stone-500 text-xs font-mono block mb-1">Statut</span>
              <span className={`text-xs px-2 py-1 rounded-sm ${STATUT_STYLE[sel.statut].bg} ${STATUT_STYLE[sel.statut].text}`}>{STATUT_STYLE[sel.statut].label}</span>
            </div>
            <div>
              <span className="text-stone-500 text-xs font-mono block mb-1">Validation technique (bornage)</span>
              <span className={`text-xs px-2 py-1 rounded-sm ${sel.validationTechnique === "validé" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {sel.validationTechnique === "validé" ? "Levé géodésique validé" : "En attente de validation terrain"}
              </span>
            </div>
            {sel.validationTechnique === "en attente" && canValider && (
              <button onClick={() => onValiderTechnique(sel.id)} className="w-full flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs py-2 rounded-sm">
                <CheckCircle2 size={14} /> Valider le bornage (Brigade Topographique)
              </button>
            )}
            {sel.validationTechnique === "validé" && (
              <PvBornage parcelle={sel} parcelles={parcelles} />
            )}
            {sel.statut === "litige" && (
              <div className="flex gap-2 items-start bg-red-50 border border-red-200 p-3 text-xs text-red-800 rounded-sm">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                Chevauchement détecté automatiquement avec une parcelle voisine. Un dossier de contentieux doit être ouvert au guichet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PvBornage({ parcelle, parcelles }) {
  const [ouvert, setOuvert] = useState(false);
  const voisins = parcelles.filter((p) => p.id !== parcelle.id && Math.abs(p.x - parcelle.x) < 130 && Math.abs(p.y - parcelle.y) < 130);
  const signature = `PV-${hashString(parcelle.id + parcelle.commune).toString(16).toUpperCase()}`;

  return (
    <div>
      <button onClick={() => setOuvert((o) => !o)} className="w-full text-xs text-stone-600 hover:underline text-left">
        {ouvert ? "Masquer le PV de bornage" : "Générer le PV de bornage numérique"}
      </button>
      {ouvert && (
        <div className="mt-2 bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs text-stone-700 space-y-2">
          <div className="font-semibold">Procès-verbal de bornage — {parcelle.id}</div>
          <div>Commune : {parcelle.commune} · Superficie : {parcelle.superficie} m²</div>
          <div>
            Voisins adjacents constatés :
            {voisins.length === 0 && <span className="text-stone-400"> aucun voisin recensé dans le périmètre.</span>}
            {voisins.map((v) => <div key={v.id} className="ml-2">— {v.id} ({v.proprietaire})</div>)}
          </div>
          <div className="pt-2 border-t border-stone-200 font-mono text-stone-500">Signature électronique brigade : {signature}</div>
        </div>
      )}
    </div>
  );
}

function AddParcelleModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ proprietaire: "", commune: "", x: 300, y: 190, w: 60, h: 50 });
  const [refus, setRefus] = useState(null);
  const superficieCalculee = Math.round(Number(form.w) * Number(form.h) * 2.5);

  function submit() {
    const res = onSubmit(form);
    if (res && !res.ok) setRefus(res.conflitId);
  }

  return (
    <Modal title="Enregistrer une parcelle" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Propriétaire"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.proprietaire} onChange={(e) => setForm({ ...form, proprietaire: e.target.value })} /></Field>
        <Field label="Commune"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.commune} onChange={(e) => setForm({ ...form, commune: e.target.value })} /></Field>
        <div className="text-xs text-stone-500 pt-2 border-t border-stone-200">Coordonnées du polygone (démonstration schématique — remplace la saisie de levé GPS/drone).</div>
        <div className="grid grid-cols-4 gap-2">
          <Field label="X"><input type="number" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.x} onChange={(e) => setForm({ ...form, x: e.target.value })} /></Field>
          <Field label="Y"><input type="number" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.y} onChange={(e) => setForm({ ...form, y: e.target.value })} /></Field>
          <Field label="Largeur"><input type="number" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.w} onChange={(e) => setForm({ ...form, w: e.target.value })} /></Field>
          <Field label="Hauteur"><input type="number" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.h} onChange={(e) => setForm({ ...form, h: e.target.value })} /></Field>
        </div>
        <div className="bg-stone-50 border border-stone-200 rounded-sm p-2.5 text-xs text-stone-600">
          Superficie calculée automatiquement : <span className="font-semibold text-stone-900">{superficieCalculee} m²</span>
        </div>
        {refus && (
          <div className="flex gap-2 items-start bg-red-50 border border-red-200 p-3 text-xs text-red-800 rounded-sm">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            Enregistrement refusé — ce polygone chevauche la parcelle {refus}, déjà enregistrée. Corrigez les coordonnées ou traitez le litige avant nouvelle tentative.
          </div>
        )}
      </div>
      <ModalFooter onClose={onClose} onSubmit={submit} disabled={!form.proprietaire || !form.commune} label="Enregistrer" />
    </Modal>
  );
}

// ---------- Titres ----------

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function QrBadge({ seed }) {
  const h = hashString(seed);
  const size = 9;
  const cells = [];
  for (let i = 0; i < size * size; i++) {
    const on = ((h >> (i % 24)) ^ (h >> ((i * 7) % 24))) & 1;
    cells.push(on);
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="72" height="72" className="border border-stone-300 bg-white">
      {cells.map((on, i) => {
        const x = i % size, y = Math.floor(i / size);
        const corner = (x < 3 && y < 3) || (x >= size - 3 && y < 3) || (x < 3 && y >= size - 3);
        return on || corner ? <rect key={i} x={x} y={y} width={1} height={1} fill="#1c1917" /> : null;
      })}
    </svg>
  );
}

function TitreSecurise({ parcelle, dossier }) {
  const signature = `SIGEF-${hashString(parcelle.id + (dossier?.id || "")).toString(16).toUpperCase()}`;
  return (
    <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-sm p-4 mt-3">
      <QrCode className="hidden" />
      <QrBadge seed={parcelle.id + (dossier?.id || "")} />
      <div className="text-xs">
        <div className="font-semibold text-emerald-800 mb-1">Titre foncier numérique sécurisé</div>
        <div className="text-stone-600 font-mono">Signature électronique : {signature}</div>
        <div className="text-stone-500 mt-1">Le code QR permet une vérification d'authenticité instantanée du titre et prévient la falsification.</div>
      </div>
    </div>
  );
}

function Titres({ parcelles, dossiers }) {
  const titrees = parcelles.filter((p) => p.statut === "titre" || p.statut === "litige" || p.statut === "gage");
  const [expanded, setExpanded] = useState(null);
  return (
    <div className="bg-white border border-stone-200 rounded-sm p-5">
      <div className="text-sm font-semibold mb-4">Registre des titres fonciers</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-stone-500 border-b border-stone-200 font-mono text-xs uppercase">
            <th className="pb-2">Parcelle</th><th>Propriétaire</th><th>Commune</th><th>Superficie</th><th>Statut</th><th>Dossier lié</th><th></th>
          </tr>
        </thead>
        <tbody>
          {titrees.map((p) => {
            const dossier = dossiers.find((d) => d.parcelleId === p.id);
            const delivre = dossier?.statut === "Délivré";
            return (
              <Fragment key={p.id}>
                <tr className="border-b border-stone-100">
                  <td className="py-2.5 font-mono text-xs">{p.id}</td>
                  <td>{p.proprietaire}</td>
                  <td className="text-stone-600">{p.commune}</td>
                  <td className="text-stone-600">{p.superficie} m²</td>
                  <td><span className={`text-xs px-2 py-1 rounded-sm ${STATUT_STYLE[p.statut].bg} ${STATUT_STYLE[p.statut].text}`}>{STATUT_STYLE[p.statut].label}</span></td>
                  <td className="text-xs text-stone-500 font-mono">{dossier ? dossier.id : "—"}</td>
                  <td>
                    {delivre && (
                      <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="text-xs text-emerald-700 hover:underline">
                        {expanded === p.id ? "Masquer" : "Titre sécurisé"}
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === p.id && delivre && (
                  <tr>
                    <td colSpan={7}><TitreSecurise parcelle={p} dossier={dossier} /></td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Cartes foncières (administration) ----------

const BLASON_CONGO_B64 = "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";

function BlasonCongo({ size = 48 }) {
  return (
    <img
      src={`data:image/png;base64,${BLASON_CONGO_B64}`}
      alt="Armoiries de la République du Congo"
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
    />
  );
}

function Avatar({ nom, size = 36 }) {
  const initiales = (nom || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const hue = hashString(nom || "") % 360;
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: `hsl(${hue}, 45%, 42%)` }}
    >
      {initiales}
    </div>
  );
}

function calculerAge(dateNaissance) {
  if (!dateNaissance) return null;
  const diff = new Date("2026-08-22") - new Date(dateNaissance);
  return Math.floor(diff / (365.25 * 86400000));
}

function PlanCadastral({ parcelle, parcelles }) {
  const largeur = Math.max(5, Math.round(parcelle.w * 0.9));
  const longueur = Math.max(5, Math.round(parcelle.superficie / largeur));
  const voisins = parcelles.filter(
    (p) => p.id !== parcelle.id && p.commune === parcelle.commune && Math.abs(p.x - parcelle.x) < 140 && Math.abs(p.y - parcelle.y) < 140
  );
  const hatchId = `hatch-${parcelle.id}`;

  return (
    <div className="border border-stone-300 rounded-sm p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-stone-700">Plan cadastral schématique — {parcelle.id}</div>
        <div className="text-xs text-stone-400 font-mono">Échelle indicative</div>
      </div>
      <svg viewBox="0 0 220 160" className="w-full border border-stone-200 bg-stone-50">
        <defs>
          <pattern id={hatchId} width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#d6d3d1" strokeWidth="1" />
          </pattern>
        </defs>
        {voisins.map((v) => (
          <rect
            key={v.id}
            x={70 + (v.x - parcelle.x) * 0.5}
            y={55 + (v.y - parcelle.y) * 0.5}
            width={v.w * 0.5}
            height={v.h * 0.5}
            fill="none"
            stroke="#d6d3d1"
            strokeDasharray="2 2"
          />
        ))}
        <rect x="60" y="45" width="100" height="65" fill={`url(#${hatchId})`} stroke="#292524" strokeWidth="1.5" />
        <line x1="60" y1="36" x2="160" y2="36" stroke="#57534e" strokeWidth="1" />
        <line x1="60" y1="33" x2="60" y2="39" stroke="#57534e" strokeWidth="1" />
        <line x1="160" y1="33" x2="160" y2="39" stroke="#57534e" strokeWidth="1" />
        <text x="110" y="28" fontSize="8" textAnchor="middle" fontFamily="monospace" fill="#57534e">{longueur} m</text>
        <text x="40" y="80" fontSize="8" textAnchor="middle" fontFamily="monospace" fill="#57534e" transform="rotate(-90 40 80)">{largeur} m</text>
        <g transform="translate(195,25)">
          <line x1="0" y1="14" x2="0" y2="0" stroke="#292524" strokeWidth="1.2" />
          <polygon points="0,0 -2.5,5 2.5,5" fill="#292524" />
          <text x="0" y="-3" fontSize="8" textAnchor="middle" fontFamily="monospace" fill="#292524">N</text>
        </g>
        <text x="110" y="126" fontSize="8" textAnchor="middle" fontFamily="monospace" fill="#78716c">{parcelle.commune}</text>
        <text x="110" y="138" fontSize="7" textAnchor="middle" fontFamily="monospace" fill="#a8a29e">
          {voisins.length > 0 ? `${voisins.length} parcelle(s) voisine(s) en pointillé` : "Aucune parcelle voisine recensée"}
        </text>
      </svg>
      <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-stone-600">
        <div><span className="text-stone-400 block">Longueur</span>{longueur} m</div>
        <div><span className="text-stone-400 block">Largeur</span>{largeur} m</div>
        <div><span className="text-stone-400 block">Superficie</span>{parcelle.superficie} m²</div>
      </div>
    </div>
  );
}

function LecturePuce({ cartes, parcelles, dossiers, onClose }) {
  const [saisie, setSaisie] = useState("");
  const [carte, setCarte] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [reimprimes, setReimprimes] = useState([]);
  const [planParcelle, setPlanParcelle] = useState(null);

  function lire() {
    const c = cartes.find((x) => x.id.toLowerCase() === saisie.trim().toLowerCase());
    if (!c) {
      setCarte(null);
      setNotFound(true);
      return;
    }
    setNotFound(false);
    setCarte(c);
  }

  function reimprimer(parcelleId) {
    setReimprimes((r) => [...r, parcelleId]);
  }

  const biens = carte ? parcelles.filter((p) => carte.parcelleIds.includes(p.id)) : [];

  return (
    <div className="mb-4 border border-stone-300 rounded-sm p-4 bg-stone-50">
      <div className="text-xs text-stone-500 mb-2">
        Simulation de lecture de puce — saisissez le numéro de carte comme si elle venait d'être lue par un lecteur physique. (La lecture NFC réelle nécessite un lecteur matériel, non disponible dans cette démonstration navigateur.)
      </div>
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
          placeholder="CF-1001"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lire()}
        />
        <button onClick={lire} className="bg-stone-900 hover:bg-stone-800 text-white text-xs px-4 rounded-sm">Lire</button>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xs px-2">Fermer</button>
      </div>

      {notFound && <div className="text-xs text-red-700">Aucune carte ne correspond à cette référence.</div>}

      {carte && (
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar nom={carte.titulaire} size={44} />
            <div>
              <div className="font-semibold text-sm">{carte.titulaire}</div>
              <div className="text-xs text-stone-500 font-mono">{carte.id} — {biens.length} document(s) rattaché(s)</div>
            </div>
            {carte.revoquee && <span className="ml-auto text-xs px-2 py-1 rounded-sm bg-red-100 text-red-800">Carte révoquée</span>}
          </div>
          {biens.length === 0 && <div className="text-xs text-stone-400">Aucun titre foncier sur cette carte.</div>}
          <div className="space-y-2">
            {biens.map((b) => (
              <div key={b.id} className="border border-stone-200 rounded-sm p-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-mono font-medium">{b.id}</span>
                    <span className="text-stone-500"> — {b.commune}, {b.superficie} m²</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPlanParcelle(planParcelle === b.id ? null : b.id)} className="text-xs text-stone-600 hover:underline">Plan</button>
                    <button onClick={() => reimprimer(b.id)} className="flex items-center gap-1 text-xs text-emerald-700 hover:underline">
                      <Send size={11} /> Réimprimer
                    </button>
                  </div>
                </div>
                {reimprimes.includes(b.id) && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm p-2 mt-2">
                    Document régénéré depuis la puce et envoyé à la file d'impression du poste Conservation.
                  </div>
                )}
                {planParcelle === b.id && (
                  <div className="mt-2">
                    <PlanCadastral parcelle={b} parcelles={parcelles} />
                    <TitreSecurise parcelle={b} dossier={dossiers.find((d) => d.parcelleId === b.id)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CartesFoncieres({ cartes, parcelles, onAdd, onRenouveler, readOnly, onCreerTitre, dossiers }) {
  const [selectedId, setSelectedId] = useState(null);
  const [planOuvert, setPlanOuvert] = useState(null);
  const [lecturePuce, setLecturePuce] = useState(false);
  const selected = cartes.find((c) => c.id === selectedId);
  const biens = selected ? parcelles.filter((p) => selected.parcelleIds.includes(p.id)) : [];

  return (
    <div className="grid grid-cols-3 gap-5">
      <div className="col-span-2 bg-white border border-stone-200 rounded-sm p-5">
        <div className="flex flex-col gap-3 mb-4">
          <div>
            <div className="text-sm font-semibold">Cartes foncières numériques</div>
            <div className="text-xs text-stone-500 mt-0.5">En cas de perte, la carte est révoquée et remplacée par une version incrémentée.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setLecturePuce((s) => !s)} className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs px-3 py-2 rounded-sm whitespace-nowrap">
              <CreditCard size={14} /> Lire une carte
            </button>
            {onCreerTitre && (
              <button onClick={onCreerTitre} className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-2 rounded-sm whitespace-nowrap">
                <Plus size={14} /> Créer un titre foncier
              </button>
            )}
            {!readOnly && (
              <button onClick={onAdd} className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-2 rounded-sm whitespace-nowrap">
                <Plus size={14} /> Créer une carte
              </button>
            )}
          </div>
        </div>

        {lecturePuce && <LecturePuce cartes={cartes} parcelles={parcelles} dossiers={dossiers} onClose={() => setLecturePuce(false)} />}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 border-b border-stone-200 font-mono text-xs uppercase">
              <th className="pb-2">Carte</th><th>Titulaire</th><th>Biens</th><th>Statut</th><th></th>
            </tr>
          </thead>
          <tbody>
            {cartes.map((c) => (
              <tr key={c.id} className={`border-b border-stone-100 cursor-pointer ${selectedId === c.id ? "bg-stone-50" : ""}`} onClick={() => setSelectedId(c.id)}>
                <td className="py-2.5 font-mono text-xs">{c.id}{c.version > 1 && <span className="text-stone-400"> (v{c.version})</span>}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <Avatar nom={c.titulaire} size={26} />
                    {c.titulaire}
                  </div>
                </td>
                <td className="text-xs text-stone-600">{c.parcelleIds.length} parcelle{c.parcelleIds.length > 1 ? "s" : ""}</td>
                <td>
                  {c.revoquee ? (
                    <span className="text-xs px-2 py-1 rounded-sm bg-red-100 text-red-800">Révoquée</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-sm bg-emerald-100 text-emerald-800">Active</span>
                  )}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  {!readOnly && !c.revoquee && (
                    <button onClick={() => onRenouveler(c.id)} className="text-xs text-red-700 hover:underline">Déclarer perdue</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="text-sm font-semibold mb-4">Fiche d'identité foncière</div>
        {!selected && <div className="text-stone-400 text-sm">Sélectionnez une carte pour afficher sa fiche complète.</div>}
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <Avatar nom={selected.titulaire} size={52} />
              <div>
                <div className="font-semibold">{selected.prenom ? `${selected.prenom} ${selected.nom}` : selected.nom}</div>
                <div className="text-xs text-stone-500 font-mono">{selected.id}{selected.version > 1 && ` (v${selected.version})`}</div>
              </div>
            </div>
            {selected.dateNaissance ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-stone-400 block">Date de naissance</span>{selected.dateNaissance} ({calculerAge(selected.dateNaissance)} ans)</div>
                <div><span className="text-stone-400 block">Lieu de naissance</span>{selected.lieuNaissance}</div>
              </div>
            ) : (
              <div className="text-xs text-stone-400">Personne morale — pas d'état civil individuel.</div>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-stone-400 block">Date d'émission</span>{selected.dateEmission}</div>
              <div><span className="text-stone-400 block">Date d'expiration</span>{selected.dateExpiration}</div>
            </div>
            <div>
              <span className="text-xs text-stone-400 block mb-1.5">Biens rattachés — {biens.length} parcelle{biens.length > 1 ? "s" : ""}</span>
              {biens.length === 0 && <div className="text-xs text-stone-400">Aucun bien rattaché.</div>}
              <div className="space-y-2">
                {biens.map((b) => (
                  <div key={b.id}>
                    <div className="flex items-center justify-between border border-stone-200 rounded-sm px-2.5 py-1.5 text-xs">
                      <span className="font-mono">{b.id}</span>
                      <span className="text-stone-500">{b.commune}, {b.superficie} m²</span>
                      <span className={`px-1.5 py-0.5 rounded-sm ${STATUT_STYLE[b.statut].bg} ${STATUT_STYLE[b.statut].text}`}>{STATUT_STYLE[b.statut].label}</span>
                    </div>
                    <button
                      onClick={() => setPlanOuvert(planOuvert === b.id ? null : b.id)}
                      className="text-xs text-stone-500 hover:text-stone-800 mt-1"
                    >
                      {planOuvert === b.id ? "Masquer le plan cadastral" : "Voir le plan cadastral"}
                    </button>
                    {planOuvert === b.id && (
                      <div className="mt-2">
                        <PlanCadastral parcelle={b} parcelles={parcelles} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddCarteModal({ parcelles, cartes, onClose, onSubmit }) {
  const linked = new Set(cartes.flatMap((c) => c.parcelleIds));
  const disponibles = parcelles.filter((p) => !linked.has(p.id) && (p.statut === "titre" || p.statut === "litige"));
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const dans10ans = `${new Date().getFullYear() + 10}-${aujourdhui.slice(5)}`;
  const [form, setForm] = useState({
    nom: "", prenom: "", dateNaissance: "", lieuNaissance: "",
    dateEmission: aujourdhui, dateExpiration: dans10ans,
    pin: "", parcelleIds: [],
  });
  const [personneMorale, setPersonneMorale] = useState(false);

  function toggleParcelle(id) {
    setForm((f) => ({ ...f, parcelleIds: f.parcelleIds.includes(id) ? f.parcelleIds.filter((x) => x !== id) : [...f.parcelleIds, id] }));
  }

  return (
    <Modal title="Créer une carte foncière" onClose={onClose}>
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs text-stone-600">
          <input type="checkbox" checked={personneMorale} onChange={(e) => setPersonneMorale(e.target.checked)} />
          Personne morale (société, entreprise)
        </label>
        {personneMorale ? (
          <Field label="Raison sociale"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value, prenom: "", dateNaissance: "", lieuNaissance: "" })} /></Field>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nom"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></Field>
              <Field label="Prénom"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Date de naissance"><input type="date" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.dateNaissance} onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })} /></Field>
              <Field label="Lieu de naissance"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.lieuNaissance} onChange={(e) => setForm({ ...form, lieuNaissance: e.target.value })} /></Field>
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Date d'émission"><input type="date" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.dateEmission} onChange={(e) => setForm({ ...form, dateEmission: e.target.value })} /></Field>
          <Field label="Date d'expiration"><input type="date" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.dateExpiration} onChange={(e) => setForm({ ...form, dateExpiration: e.target.value })} /></Field>
        </div>
        <Field label="Code PIN (4 chiffres)"><input inputMode="numeric" maxLength={4} className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></Field>
        <div>
          <label className="text-xs font-mono text-stone-500 block mb-1.5">Titres à associer</label>
          {disponibles.length === 0 && <div className="text-xs text-stone-400">Aucun titre disponible (déjà associés à une carte).</div>}
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {disponibles.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.parcelleIds.includes(p.id)} onChange={() => toggleParcelle(p.id)} />
                {p.id} — {p.proprietaire}
              </label>
            ))}
          </div>
        </div>
      </div>
      <ModalFooter onClose={onClose} onSubmit={() => onSubmit(form)} disabled={!form.nom || form.pin.length !== 4} label="Créer la carte" />
    </Modal>
  );
}

function CreerTitreModal({ cartes, onClose, onSubmit }) {
  const [mode, setMode] = useState("nouvelle"); // "nouvelle" | "existante"
  const [form, setForm] = useState({
    commune: "", x: 300, y: 190, w: 60, h: 50,
    carteId: "", nom: "", prenom: "", dateNaissance: "", lieuNaissance: "", pin: "",
  });
  const [result, setResult] = useState(null);

  function submit() {
    const res = onSubmit({ ...form, mode });
    if (res && !res.ok) setResult(res);
  }

  const disabled = !form.commune || (mode === "existante" ? !form.carteId : !form.nom || form.pin.length !== 4);

  return (
    <Modal title="Créer un titre foncier" onClose={onClose}>
      <div className="space-y-3">
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-sm p-2.5">
          Tout titre foncier créé ici est immédiatement dématérialisé et rattaché à une carte foncière — aucun titre ne peut exister sans carte.
        </div>

        <div className="flex bg-stone-100 rounded-sm p-1">
          <button onClick={() => setMode("nouvelle")} className={`flex-1 text-xs py-1.5 rounded-sm ${mode === "nouvelle" ? "bg-white shadow-sm font-medium" : "text-stone-500"}`}>Nouvelle carte</button>
          <button onClick={() => setMode("existante")} className={`flex-1 text-xs py-1.5 rounded-sm ${mode === "existante" ? "bg-white shadow-sm font-medium" : "text-stone-500"}`}>Carte existante</button>
        </div>

        {mode === "existante" ? (
          <Field label="Numéro de carte foncière du titulaire">
            <input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-500" placeholder="CF-1001" value={form.carteId} onChange={(e) => setForm({ ...form, carteId: e.target.value })} />
          </Field>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nom"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></Field>
              <Field label="Prénom"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Date de naissance"><input type="date" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.dateNaissance} onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })} /></Field>
              <Field label="Lieu de naissance"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.lieuNaissance} onChange={(e) => setForm({ ...form, lieuNaissance: e.target.value })} /></Field>
            </div>
            <Field label="Code PIN de la nouvelle carte (4 chiffres)"><input inputMode="numeric" maxLength={4} className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></Field>
          </>
        )}

        <div className="text-xs text-stone-500 pt-2 border-t border-stone-200">Localisation schématique de la parcelle — la détection de chevauchement s'applique.</div>
        <Field label="Commune"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.commune} onChange={(e) => setForm({ ...form, commune: e.target.value })} /></Field>
        <div className="grid grid-cols-4 gap-2">
          <Field label="X"><input type="number" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.x} onChange={(e) => setForm({ ...form, x: e.target.value })} /></Field>
          <Field label="Y"><input type="number" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.y} onChange={(e) => setForm({ ...form, y: e.target.value })} /></Field>
          <Field label="Largeur"><input type="number" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.w} onChange={(e) => setForm({ ...form, w: e.target.value })} /></Field>
          <Field label="Hauteur"><input type="number" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.h} onChange={(e) => setForm({ ...form, h: e.target.value })} /></Field>
        </div>

        {result && !result.ok && (
          <div className="flex gap-2 items-start bg-red-50 border border-red-200 p-3 text-xs text-red-800 rounded-sm">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            {result.conflitId ? `Chevauchement avec la parcelle ${result.conflitId}. Aucun titre créé.` : result.error}
          </div>
        )}
      </div>
      <ModalFooter onClose={onClose} onSubmit={submit} disabled={disabled} label="Créer le titre foncier" />
    </Modal>
  );
}

// ---------- Portail citoyen : carte foncière ----------

function CitizenPortal({ card, parcelles, cartes, dossiers, encaissements, onTransfer, onLogout }) {
  const [screen, setScreen] = useState("titres");
  const mesParcelles = parcelles.filter((p) => card.parcelleIds.includes(p.id));

  return (
    <div className="min-h-screen w-full bg-stone-100" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
      <header className="bg-stone-900 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-amber-500 text-xs uppercase tracking-wide font-mono">
            <CreditCard size={16} /> Carte foncière numérique
          </div>
          <button onClick={onLogout} className="text-amber-500 hover:text-amber-400 text-xs">Fermer ma carte</button>
        </div>
        <div className="bg-stone-800 rounded-sm p-4 flex items-center gap-4 max-w-2xl mx-auto">
          <Avatar nom={card.titulaire} size={56} />
          <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-stone-300">
            <div className="col-span-2">
              <div className="text-stone-50 text-base font-semibold">{card.prenom ? `${card.prenom} ${card.nom}` : card.nom}</div>
              <div className="font-mono text-stone-500">{card.id}{card.version > 1 && ` (v${card.version})`}</div>
            </div>
            {card.dateNaissance && (
              <>
                <div><span className="text-stone-500">Né(e) le</span> {card.dateNaissance}</div>
                <div><span className="text-stone-500">à</span> {card.lieuNaissance}</div>
              </>
            )}
            <div><span className="text-stone-500">Émise le</span> {card.dateEmission}</div>
            <div><span className="text-stone-500">Expire le</span> {card.dateExpiration}</div>
            <div className="col-span-2 text-amber-400 font-medium">{card.parcelleIds.length} bien{card.parcelleIds.length > 1 ? "s" : ""} rattaché{card.parcelleIds.length > 1 ? "s" : ""}</div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6">
        <div className="flex bg-white border border-stone-200 rounded-sm p-1 mb-5 flex-wrap">
          <button onClick={() => setScreen("titres")} className={`flex-1 text-xs py-2 rounded-sm ${screen === "titres" ? "bg-stone-900 text-white" : "text-stone-500"}`}>Mes titres</button>
          <button onClick={() => setScreen("estimation")} className={`flex-1 text-xs py-2 rounded-sm ${screen === "estimation" ? "bg-stone-900 text-white" : "text-stone-500"}`}>Estimation</button>
          <button onClick={() => setScreen("quittances")} className={`flex-1 text-xs py-2 rounded-sm ${screen === "quittances" ? "bg-stone-900 text-white" : "text-stone-500"}`}>Quittances &amp; preuve</button>
          <button onClick={() => setScreen("transfert")} className={`flex-1 text-xs py-2 rounded-sm flex items-center justify-center gap-1.5 ${screen === "transfert" ? "bg-stone-900 text-white" : "text-stone-500"}`}>
            <ArrowLeftRight size={13} /> Transférer
          </button>
        </div>

        {screen === "titres" && (
          <div className="space-y-4">
            {mesParcelles.length === 0 && (
              <div className="bg-white border border-stone-200 rounded-sm p-5 text-sm text-stone-400">Aucun titre associé à cette carte pour le moment.</div>
            )}
            {mesParcelles.map((p) => (
              <div key={p.id} className="bg-white border border-stone-200 rounded-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-mono text-xs text-stone-500">{p.id}</div>
                  <span className={`text-xs px-2 py-1 rounded-sm ${STATUT_STYLE[p.statut].bg} ${STATUT_STYLE[p.statut].text}`}>{STATUT_STYLE[p.statut].label}</span>
                </div>
                <div className="text-sm text-stone-700 mb-3">{p.commune} — {p.superficie} m²</div>
                <PlanCadastral parcelle={p} parcelles={parcelles} />
                <TitreSecurise parcelle={p} dossier={null} />
              </div>
            ))}
          </div>
        )}

        {screen === "estimation" && <EstimationBiens mesParcelles={mesParcelles} />}

        {screen === "quittances" && <QuittancesEtPreuve mesParcelles={mesParcelles} encaissements={encaissements} card={card} />}

        {screen === "transfert" && <TransfertForm card={card} mesParcelles={mesParcelles} onTransfer={onTransfer} />}
      </div>
    </div>
  );
}

const VALEUR_M2_PAR_COMMUNE = { Bacongo: 45000, "Poto-Poto": 38000, Ouenzé: 32000 };

function EstimationBiens({ mesParcelles }) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-stone-500 bg-stone-100 border border-stone-200 rounded-sm p-3">
        Estimation indicative basée sur une valeur moyenne au m² par commune — ne remplace pas une expertise immobilière officielle.
      </div>
      {mesParcelles.length === 0 && <div className="bg-white border border-stone-200 rounded-sm p-5 text-sm text-stone-400">Aucun bien à estimer.</div>}
      {mesParcelles.map((p) => {
        const valeurM2 = VALEUR_M2_PAR_COMMUNE[p.commune] || 30000;
        const valeurEstimee = p.superficie * valeurM2;
        return (
          <div key={p.id} className="bg-white border border-stone-200 rounded-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-xs text-stone-500">{p.id}</div>
              <div className="text-xs text-stone-500">{p.commune}, {p.superficie} m²</div>
            </div>
            <div className="text-2xl font-semibold text-stone-900">{valeurEstimee.toLocaleString("fr-FR")} FCFA</div>
            <div className="text-xs text-stone-400 mt-1">≈ {valeurM2.toLocaleString("fr-FR")} FCFA / m² dans cette commune</div>
          </div>
        );
      })}
    </div>
  );
}

function QuittancesEtPreuve({ mesParcelles, encaissements, card }) {
  const [preuveActive, setPreuveActive] = useState(null);
  const mesQuittances = encaissements.filter((e) => mesParcelles.some((p) => p.id === e.dossierId));

  function genererPreuve(parcelleId) {
    const expiration = new Date(Date.now() + 15 * 60000);
    setPreuveActive({ parcelleId, expiration, code: `PROOF-${hashString(parcelleId + card.id + expiration.getTime()).toString(16).toUpperCase()}` });
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="text-sm font-semibold mb-4">Quittances de taxes payées</div>
        {mesQuittances.length === 0 && <div className="text-xs text-stone-400">Aucune quittance enregistrée pour vos biens.</div>}
        <div className="space-y-2">
          {mesQuittances.map((e) => (
            <div key={e.id} className="flex items-center justify-between border border-stone-200 rounded-sm px-3 py-2 text-xs">
              <div>
                <div className="font-mono">{e.id}</div>
                <div className="text-stone-500">{e.type} — {e.dossierId}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{e.montant.toLocaleString("fr-FR")} FCFA</div>
                <div className="text-stone-400">{e.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="text-sm font-semibold mb-1">Preuve de propriété temporaire</div>
        <div className="text-xs text-stone-500 mb-3">Génère un code de vérification à durée limitée, à présenter lors d'une location ou d'une vente — sans exposer votre carte complète.</div>
        <div className="space-y-2">
          {mesParcelles.map((p) => (
            <div key={p.id} className="border border-stone-200 rounded-sm p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono">{p.id}</span>
                <button onClick={() => genererPreuve(p.id)} className="text-xs text-amber-700 hover:underline">Générer un code (15 min)</button>
              </div>
              {preuveActive?.parcelleId === p.id && (
                <div className="mt-2 bg-amber-50 border border-amber-200 rounded-sm p-2.5 text-xs">
                  <div className="font-mono font-semibold text-amber-900">{preuveActive.code}</div>
                  <div className="text-amber-700 mt-0.5">Valide jusqu'à {preuveActive.expiration.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} — communiquez ce code, jamais votre PIN.</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TransfertForm({ card, mesParcelles, onTransfer }) {
  const [parcelleId, setParcelleId] = useState(mesParcelles[0]?.id || "");
  const [destCardId, setDestCardId] = useState("");
  const [pin, setPin] = useState("");
  const [result, setResult] = useState(null);

  function submit() {
    if (!parcelleId) return;
    const res = onTransfer(card.id, parcelleId, destCardId, pin);
    setResult(res);
    if (res.ok) {
      setDestCardId("");
      setPin("");
    }
  }

  if (mesParcelles.length === 0) {
    return <div className="bg-white border border-stone-200 rounded-sm p-5 text-sm text-stone-400">Aucun titre disponible pour transfert.</div>;
  }

  return (
    <div className="bg-white border border-stone-200 rounded-sm p-5 space-y-4">
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-sm p-3 text-xs text-amber-800">
        <Lock size={14} className="shrink-0 mt-0.5" />
        Le transfert génère un code de transaction chiffré et ouvre automatiquement un dossier de mutation auprès de la Conservation foncière pour officialisation.
      </div>
      <Field label="Titre à transférer">
        <select className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={parcelleId} onChange={(e) => setParcelleId(e.target.value)}>
          {mesParcelles.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.commune}</option>)}
        </select>
      </Field>
      <Field label="Numéro de carte du nouveau détenteur">
        <input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono" placeholder="CF-1002" value={destCardId} onChange={(e) => setDestCardId(e.target.value)} />
      </Field>
      <Field label="Confirmez avec votre code PIN">
        <input type="password" inputMode="numeric" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={pin} onChange={(e) => setPin(e.target.value)} />
      </Field>

      {result && !result.ok && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2.5">{result.error}</div>}
      {result && result.ok && (
        <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-sm p-3 space-y-1">
          <div className="font-semibold">Transfert effectué avec succès.</div>
          <div className="font-mono">Code de transaction : {result.code}</div>
          <div>Dossier de mutation ouvert : {result.mutationId}</div>
        </div>
      )}

      <button onClick={submit} disabled={!destCardId || !pin} className="w-full flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm py-2.5 rounded-sm font-medium">
        <Send size={14} /> Transférer la propriété
      </button>
    </div>
  );
}

// ---------- Guichet ----------

function Guichet({ dossiers, onAdvance, onReject, onNew, readOnly }) {
  return (
    <div className="bg-white border border-stone-200 rounded-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold">Dossiers déposés au guichet</div>
        {!readOnly && (
          <button onClick={onNew} className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-2 rounded-sm">
            <Plus size={14} /> Nouveau dossier
          </button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-stone-500 border-b border-stone-200 font-mono text-xs uppercase">
            <th className="pb-2">Référence</th><th>Demandeur</th><th>Type</th><th>Parcelle</th><th>Déposé le</th><th>Statut</th><th></th>
          </tr>
        </thead>
        <tbody>
          {dossiers.map((d) => (
            <tr key={d.id} className="border-b border-stone-100">
              <td className="py-2.5 font-mono text-xs">{d.id}</td>
              <td>{d.demandeur}</td>
              <td className="text-stone-600">{d.type}</td>
              <td className="text-xs font-mono text-stone-500">{d.parcelleId}</td>
              <td className="text-stone-600">{d.dateDepot}</td>
              <td><StatutBadge statut={d.statut} /></td>
              <td>
                {!readOnly && !["Délivré", "Rejeté"].includes(d.statut) && (
                  <div className="flex gap-2">
                    <button onClick={() => onAdvance(d.id)} className="text-xs text-emerald-700 hover:underline">Faire avancer</button>
                    <button onClick={() => onReject(d.id)} className="text-xs text-red-700 hover:underline">Rejeter</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddDossierModal({ parcelles, onClose, onSubmit }) {
  const [form, setForm] = useState({ demandeur: "", type: "Demande de titre foncier", parcelleId: parcelles[0]?.id || "" });
  const [refus, setRefus] = useState(null);

  function submit() {
    const res = onSubmit(form);
    if (res && !res.ok) setRefus(res.error);
  }

  return (
    <Modal title="Nouveau dossier — guichet unique" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Demandeur"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.demandeur} onChange={(e) => setForm({ ...form, demandeur: e.target.value })} /></Field>
        <Field label="Type de demande">
          <select className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option>Demande de titre foncier</option>
            <option>Extrait cadastral</option>
            <option>Opposition / bornage</option>
            <option>Mutation (vente, succession)</option>
          </select>
        </Field>
        <Field label="Parcelle concernée">
          <select className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.parcelleId} onChange={(e) => setForm({ ...form, parcelleId: e.target.value })}>
            {parcelles.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.proprietaire}{p.statut === "gage" ? " (sous hypothèque)" : ""}</option>)}
          </select>
        </Field>
        {refus && (
          <div className="flex gap-2 items-start bg-red-50 border border-red-200 p-3 text-xs text-red-800 rounded-sm">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            {refus}
          </div>
        )}
      </div>
      <ModalFooter onClose={onClose} onSubmit={submit} disabled={!form.demandeur} label="Déposer le dossier" />
    </Modal>
  );
}

// ---------- Domaine public ----------

function Domaine({ baux, parcelles, onAdd, onMarkPaiement, readOnly }) {
  return (
    <div className="bg-white border border-stone-200 rounded-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold">Baux, concessions &amp; occupations temporaires</div>
        {!readOnly && (
          <button onClick={onAdd} className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-2 rounded-sm">
            <Plus size={14} /> Nouvel acte domanial
          </button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-stone-500 border-b border-stone-200 font-mono text-xs uppercase">
            <th className="pb-2">Référence</th><th>Type</th><th>Bénéficiaire</th><th>Parcelle</th><th>Durée</th><th>Redevance / an</th><th>Paiement</th><th></th>
          </tr>
        </thead>
        <tbody>
          {baux.map((b) => (
            <tr key={b.id} className="border-b border-stone-100">
              <td className="py-2.5 font-mono text-xs">{b.id}</td>
              <td className="text-stone-600">{b.type}</td>
              <td>{b.beneficiaire}</td>
              <td className="text-xs font-mono text-stone-500">{b.parcelleId}</td>
              <td className="text-stone-600">{b.dureeAns} ans</td>
              <td className="text-stone-600">{b.redevanceAnnuelle.toLocaleString("fr-FR")} FCFA</td>
              <td>
                <span className={`text-xs px-2 py-1 rounded-sm ${b.statutPaiement === "à jour" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                  {b.statutPaiement === "à jour" ? "À jour" : "En retard"}
                </span>
              </td>
              <td>
                {!readOnly && b.statutPaiement === "en retard" && (
                  <button onClick={() => onMarkPaiement(b.id)} className="text-xs text-emerald-700 hover:underline">Régulariser</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddBailModal({ parcelles, onClose, onSubmit }) {
  const [form, setForm] = useState({ type: "Bail emphytéotique", beneficiaire: "", parcelleId: parcelles[0]?.id || "", dateDebut: new Date().toISOString().slice(0, 10), dureeAns: 10, redevanceAnnuelle: "" });
  return (
    <Modal title="Nouvel acte domanial" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Type d'acte">
          <select className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option>Bail emphytéotique</option>
            <option>Concession</option>
            <option>Occupation temporaire (OTP)</option>
          </select>
        </Field>
        <Field label="Bénéficiaire"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.beneficiaire} onChange={(e) => setForm({ ...form, beneficiaire: e.target.value })} /></Field>
        <Field label="Parcelle du domaine">
          <select className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.parcelleId} onChange={(e) => setForm({ ...form, parcelleId: e.target.value })}>
            {parcelles.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.proprietaire}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Durée (années)"><input type="number" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.dureeAns} onChange={(e) => setForm({ ...form, dureeAns: e.target.value })} /></Field>
          <Field label="Redevance annuelle (FCFA)"><input type="number" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.redevanceAnnuelle} onChange={(e) => setForm({ ...form, redevanceAnnuelle: e.target.value })} /></Field>
        </div>
      </div>
      <ModalFooter onClose={onClose} onSubmit={() => onSubmit(form)} disabled={!form.beneficiaire || !form.redevanceAnnuelle} label="Créer l'acte" />
    </Modal>
  );
}

// ---------- Guichet externe (notaires, géomètres agréés) ----------

function GuichetExterne({ dossiers, parcelles, cartes, onNew, onActeNotarie, readOnly }) {
  const [onglet, setOnglet] = useState("requete");
  const [form, setForm] = useState({ demandeur: "", type: "Mutation (vente, succession)", parcelleId: parcelles[0]?.id || "" });
  const [refus, setRefus] = useState(null);

  const [acte, setActe] = useState({ parcelleId: parcelles[0]?.id || "", montantVente: "", modeAcquereur: "existante", carteAcquereurId: "", acquereurNom: "", pin: "" });
  const [acteResult, setActeResult] = useState(null);
  const [acteErr, setActeErr] = useState(null);

  function submit() {
    if (!form.demandeur) return;
    const res = onNew(form);
    if (res && !res.ok) {
      setRefus(res.error);
    } else {
      setRefus(null);
      setForm({ ...form, demandeur: "" });
    }
  }

  function submitActe() {
    const payload = {
      parcelleId: acte.parcelleId,
      montantVente: acte.montantVente,
      creerCarte: acte.modeAcquereur === "nouvelle",
      carteAcquereurId: acte.modeAcquereur === "existante" ? acte.carteAcquereurId : "",
      acquereurNom: acte.acquereurNom,
      pin: acte.pin,
    };
    const res = onActeNotarie(payload);
    if (!res.ok) { setActeErr(res.error); setActeResult(null); }
    else { setActeErr(null); setActeResult(res); }
  }

  return (
    <div className={readOnly ? "" : "grid grid-cols-3 gap-5"}>
      <div className={readOnly ? "bg-white border border-stone-200 rounded-sm p-5" : "col-span-2 bg-white border border-stone-200 rounded-sm p-5"}>
        <div className="text-sm font-semibold mb-1">Espace auxiliaires de justice</div>
        <div className="text-xs text-stone-500 mb-4">Notaires et géomètres experts agréés — dépôt sécurisé d'actes authentiques et requêtes de mutation.</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 border-b border-stone-200 font-mono text-xs uppercase">
              <th className="pb-2">Référence</th><th>Demandeur</th><th>Type</th><th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {dossiers.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-stone-400 text-xs">Aucune requête déposée pour l'instant.</td></tr>
            )}
            {dossiers.map((d) => (
              <tr key={d.id} className="border-b border-stone-100">
                <td className="py-2.5 font-mono text-xs">{d.id}</td>
                <td>{d.demandeur}</td>
                <td className="text-stone-600">{d.type}</td>
                <td><StatutBadge statut={d.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="flex bg-stone-100 rounded-sm p-1 mb-4">
            <button onClick={() => setOnglet("requete")} className={`flex-1 text-xs py-1.5 rounded-sm ${onglet === "requete" ? "bg-white shadow-sm font-medium" : "text-stone-500"}`}>Déposer une requête</button>
            <button onClick={() => setOnglet("acte")} className={`flex-1 text-xs py-1.5 rounded-sm ${onglet === "acte" ? "bg-white shadow-sm font-medium" : "text-stone-500"}`}>Acte de vente</button>
          </div>

          {onglet === "requete" && (
            <div className="space-y-3">
              <Field label="Demandeur (client représenté)"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.demandeur} onChange={(e) => setForm({ ...form, demandeur: e.target.value })} /></Field>
              <Field label="Type de requête">
                <select className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option>Mutation (vente, succession)</option>
                  <option>Demande de titre foncier</option>
                  <option>Extrait cadastral</option>
                </select>
              </Field>
              <Field label="Parcelle concernée">
                <select className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.parcelleId} onChange={(e) => setForm({ ...form, parcelleId: e.target.value })}>
                  {parcelles.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.proprietaire}{p.statut !== "titre" ? ` (${STATUT_STYLE[p.statut].label})` : ""}</option>)}
                </select>
              </Field>
              {refus && (
                <div className="flex gap-2 items-start bg-red-50 border border-red-200 p-3 text-xs text-red-800 rounded-sm">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  {refus}
                </div>
              )}
              <button
                onClick={submit}
                disabled={!form.demandeur}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs py-2.5 rounded-sm font-medium"
              >
                Déposer l'acte
              </button>
            </div>
          )}

          {onglet === "acte" && (
            <div className="space-y-3">
              <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-sm p-2.5">
                Zéro papier — la signature de l'acte déclenche instantanément le transfert de propriété, le paiement des droits de mutation au Trésor, et la mise à jour de la carte foncière de l'acheteur.
              </div>
              <Field label="Bien vendu">
                <select className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={acte.parcelleId} onChange={(e) => setActe({ ...acte, parcelleId: e.target.value })}>
                  {parcelles.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.proprietaire}{p.statut !== "titre" ? ` (${STATUT_STYLE[p.statut].label})` : ""}</option>)}
                </select>
              </Field>
              <Field label="Montant de la vente (FCFA)"><input type="number" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={acte.montantVente} onChange={(e) => setActe({ ...acte, montantVente: e.target.value })} /></Field>

              <div className="flex bg-stone-100 rounded-sm p-1">
                <button onClick={() => setActe({ ...acte, modeAcquereur: "existante" })} className={`flex-1 text-xs py-1.5 rounded-sm ${acte.modeAcquereur === "existante" ? "bg-white shadow-sm font-medium" : "text-stone-500"}`}>Acheteur a déjà une carte</button>
                <button onClick={() => setActe({ ...acte, modeAcquereur: "nouvelle" })} className={`flex-1 text-xs py-1.5 rounded-sm ${acte.modeAcquereur === "nouvelle" ? "bg-white shadow-sm font-medium" : "text-stone-500"}`}>Nouvel acheteur</button>
              </div>

              {acte.modeAcquereur === "existante" ? (
                <Field label="Numéro de carte de l'acheteur"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-500" placeholder="CF-1002" value={acte.carteAcquereurId} onChange={(e) => setActe({ ...acte, carteAcquereurId: e.target.value })} /></Field>
              ) : (
                <>
                  <Field label="Nom de l'acheteur"><input className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={acte.acquereurNom} onChange={(e) => setActe({ ...acte, acquereurNom: e.target.value })} /></Field>
                  <Field label="Code PIN de la nouvelle carte"><input inputMode="numeric" maxLength={4} className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={acte.pin} onChange={(e) => setActe({ ...acte, pin: e.target.value })} /></Field>
                </>
              )}

              {acteErr && (
                <div className="flex gap-2 items-start bg-red-50 border border-red-200 p-3 text-xs text-red-800 rounded-sm">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  {acteErr}
                </div>
              )}
              {acteResult && (
                <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-sm p-3 space-y-1">
                  <div className="font-semibold">Acte exécuté avec succès.</div>
                  <div>Droits de mutation encaissés : {acteResult.droitsMutation.toLocaleString("fr-FR")} FCFA (quittance {acteResult.quittanceId})</div>
                  <div>Carte foncière mise à jour : {acteResult.carteId}</div>
                </div>
              )}
              <button
                onClick={submitActe}
                disabled={!acte.montantVente || (acte.modeAcquereur === "existante" ? !acte.carteAcquereurId : !acte.acquereurNom || acte.pin.length !== 4)}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs py-2.5 rounded-sm font-medium"
              >
                Signer l'acte et exécuter le transfert
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Trésor / Régie ----------

const TAUX_IMPOT_PAR_COMMUNE = { Bacongo: 350, "Poto-Poto": 300, Ouenzé: 280 };

function Tresor({ encaissements, dossiers, parcelles, onAdd, readOnly }) {
  const total = encaissements.reduce((s, e) => s + e.montant, 0);
  const impotTheorique = parcelles
    ? parcelles.filter((p) => p.statut === "titre" || p.statut === "litige").reduce((s, p) => s + p.superficie * (TAUX_IMPOT_PAR_COMMUNE[p.commune] || 300), 0)
    : 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Quittances émises" value={encaissements.length} />
        <Kpi label="Total encaissé" value={`${total.toLocaleString("fr-FR")} FCFA`} tone="emerald" />
        <Kpi label="Dossiers en attente de paiement" value={dossiers.filter((d) => !["Délivré", "Rejeté"].includes(d.statut)).length} tone="amber" />
      </div>
      {parcelles && (
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="text-sm font-semibold mb-1">Impôt foncier théorique</div>
          <div className="text-xs text-stone-500 mb-3">Calculé automatiquement : superficie exacte × taux communal, sur les parcelles titrées.</div>
          <div className="text-2xl font-semibold text-stone-900">{impotTheorique.toLocaleString("fr-FR")} FCFA / an</div>
        </div>
      )}
      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold">Encaissements &amp; quittances sécurisées</div>
          {!readOnly && (
            <button onClick={onAdd} className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-2 rounded-sm">
              <Plus size={14} /> Enregistrer un paiement
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 border-b border-stone-200 font-mono text-xs uppercase">
              <th className="pb-2">Quittance</th><th>Dossier</th><th>Type</th><th>Montant</th><th>Mode</th><th>Date</th>
            </tr>
          </thead>
          <tbody>
            {encaissements.map((e) => (
              <tr key={e.id} className="border-b border-stone-100">
                <td className="py-2.5 font-mono text-xs">{e.id}</td>
                <td className="text-xs font-mono text-stone-500">{e.dossierId}</td>
                <td className="text-stone-600">{e.type}</td>
                <td>{e.montant.toLocaleString("fr-FR")} FCFA</td>
                <td className="text-stone-600 text-xs">{e.mode || "Espèces"}</td>
                <td className="text-stone-600">{e.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddEncaissementModal({ dossiers, onClose, onSubmit }) {
  const [form, setForm] = useState({ dossierId: dossiers[0]?.id || "", type: "Droits d'enregistrement", montant: "", mode: "Espèces" });
  return (
    <Modal title="Enregistrer un paiement" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Dossier concerné">
          <select className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.dossierId} onChange={(e) => setForm({ ...form, dossierId: e.target.value })}>
            {dossiers.map((d) => <option key={d.id} value={d.id}>{d.id} — {d.demandeur}</option>)}
          </select>
        </Field>
        <Field label="Nature du paiement">
          <select className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option>Droits d'enregistrement</option>
            <option>Frais de mutation</option>
            <option>Impôt foncier</option>
            <option>Extrait cadastral</option>
          </select>
        </Field>
        <Field label="Mode de paiement">
          <select className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            <option>Espèces</option>
            <option>Mobile Money</option>
            <option>Virement bancaire</option>
            <option>Chèque Trésor</option>
          </select>
        </Field>
        <Field label="Montant (FCFA)"><input type="number" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} /></Field>
      </div>
      <ModalFooter onClose={onClose} onSubmit={() => onSubmit(form)} disabled={!form.montant} label="Émettre la quittance" />
    </Modal>
  );
}

// ---------- Workflow ----------

function Workflow({ dossiers, onAdvance, onReject, readOnly }) {
  const cols = ["Reçu", "En instruction", "Validé", "Délivré"];
  return (
    <div className="grid grid-cols-4 gap-4">
      {cols.map((col) => (
        <div key={col} className="bg-stone-200/50 rounded-sm p-3">
          <div className="text-xs font-mono uppercase tracking-wide text-stone-500 mb-3 flex items-center justify-between">
            {col} <span className="bg-white px-1.5 rounded-sm">{dossiers.filter((d) => d.statut === col).length}</span>
          </div>
          <div className="space-y-2">
            {dossiers.filter((d) => d.statut === col).map((d) => (
              <div key={d.id} className="bg-white border border-stone-200 rounded-sm p-3 text-xs">
                <div className="font-mono text-stone-500">{d.id}</div>
                <div className="font-medium mt-1">{d.demandeur}</div>
                <div className="text-stone-500 mt-0.5">{d.type}</div>
                {!readOnly && col !== "Délivré" && (
                  <button onClick={() => onAdvance(d.id)} className="mt-2 text-emerald-700 flex items-center gap-1 hover:underline">
                    Étape suivante <ChevronRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Audit ----------

function Audit({ audit, readOnly, service }) {
  const [verif, setVerif] = useState(null);
  const [showHash, setShowHash] = useState(false);

  function verifierChaine() {
    let ok = true;
    let prevHash = null;
    for (let i = audit.length - 1; i >= 0; i--) {
      const e = audit[i];
      const attendu = hashString((prevHash || "GENESIS") + e.ts + e.user + e.action).toString(16).toUpperCase();
      if (attendu !== e.hash) { ok = false; break; }
      prevHash = e.hash;
    }
    setVerif(ok);
  }

  return (
    <div className="bg-white border border-stone-200 rounded-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-700" />
          <div className="text-sm font-semibold">Journal d'audit immuable</div>
        </div>
        {readOnly && (
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-stone-100 text-stone-600 rounded-sm">
            <Eye size={12} /> Lecture seule — {service}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={verifierChaine} className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs px-3 py-2 rounded-sm">
          <Lock size={12} /> Vérifier l'intégrité de la chaîne
        </button>
        <button onClick={() => setShowHash((s) => !s)} className="text-xs text-stone-500 hover:text-stone-800">
          {showHash ? "Masquer les empreintes" : "Afficher les empreintes cryptographiques"}
        </button>
        {verif === true && <span className="text-xs text-emerald-700 font-medium">✓ Chaîne intègre — {audit.length} entrées vérifiées, aucune altération détectée.</span>}
        {verif === false && <span className="text-xs text-red-700 font-medium">✗ Anomalie détectée — la chaîne a été modifiée hors du système.</span>}
      </div>
      <div className="space-y-0">
        {audit.map((a) => (
          <div key={a.id} className="flex gap-4 py-3 border-b border-stone-100 text-sm">
            <div className="font-mono text-xs text-stone-400 w-32 shrink-0">{a.ts}</div>
            <div className="font-medium w-36 shrink-0 text-stone-600">{a.user}</div>
            <div className="flex-1">
              <div className="text-stone-700">{a.action}</div>
              {showHash && <div className="text-xs text-stone-400 font-mono mt-0.5">Empreinte : {a.hash}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- RH ----------

function RH({ agents }) {
  return (
    <div className="bg-white border border-stone-200 rounded-sm p-5">
      <div className="text-sm font-semibold mb-4">Agents — DGRH</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-stone-500 border-b border-stone-200 font-mono text-xs uppercase">
            <th className="pb-2">Agent</th><th>Poste</th><th>Direction</th><th>Dossiers traités</th><th>Délai moyen</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((a) => (
            <tr key={a.id} className="border-b border-stone-100">
              <td className="py-2.5">{a.nom}</td>
              <td className="text-stone-600">{a.poste}</td>
              <td className="text-stone-600">{a.direction}</td>
              <td>{a.dossiersTraites}</td>
              <td className={a.delaiMoyen > 20 ? "text-red-700" : "text-emerald-700"}>{a.delaiMoyen} j</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Rapports ----------

function Rapports({ statutData, parcelleData, colors, agents, recettesData }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="text-sm font-semibold mb-4">Performance par direction — goulots d'étranglement</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={agents.map((a) => ({ name: a.direction, dossiers: a.dossiersTraites, delai: a.delaiMoyen }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="dossiers" fill="#059669" radius={[3, 3, 0, 0]} name="Dossiers traités" />
              <Bar dataKey="delai" fill="#dc2626" radius={[3, 3, 0, 0]} name="Délai moyen (j)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="text-sm font-semibold mb-4">Répartition du parc foncier</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={parcelleData} dataKey="value" nameKey="name" outerRadius={85}>
                {parcelleData.map((entry, i) => <Cell key={i} fill={colors[entry.key] || "#78716c"} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="text-sm font-semibold mb-4">Recettes du domaine public et du trésor</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={recettesData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `${v.toLocaleString("fr-FR")} FCFA`} />
            <Bar dataKey="value" fill="#d97706" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------- Carte nationale interactive (Ministre) ----------

function CarteNationale({ parcelles, dossiers, baux }) {
  const [level, setLevel] = useState("pays"); // "pays" | "ville"
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedParcelle, setSelectedParcelle] = useState(null);
  const [layers, setLayers] = useState({ titre: true, libre: true, litige: true, domaine: true });
  const [deptMessage, setDeptMessage] = useState(null);

  const communes = useMemo(() => {
    const groups = {};
    parcelles.forEach((p) => {
      if (!groups[p.commune]) groups[p.commune] = [];
      groups[p.commune].push(p);
    });
    return groups;
  }, [parcelles]);

  const deptStatus = useMemo(() => {
    return DEPARTEMENTS.map((d) => {
      if (!d.hasData) return { ...d, tension: null, color: "#a8a29e" };
      const litiges = parcelles.filter((p) => p.statut === "litige").length;
      const enAttente = dossiers.filter((x) => !["Délivré", "Rejeté"].includes(x.statut)).length;
      let color = "#059669";
      if (litiges > 0) color = "#dc2626";
      else if (enAttente > 2) color = "#d97706";
      return { ...d, tension: litiges > 0 ? "Litiges actifs" : enAttente > 2 ? "Dossiers en attente" : "Gestion fluide", color };
    });
  }, [parcelles, dossiers]);

  function openDept(d) {
    if (!d.hasData) {
      setDeptMessage(d.nom);
      return;
    }
    setDeptMessage(null);
    setSelectedDept(d);
    setLevel("ville");
  }

  function toggleLayer(key) {
    setLayers((l) => ({ ...l, [key]: !l[key] }));
  }

  const fillFor = { titre: "#a7f3d0", litige: "#fecaca", domaine: "#fde68a", libre: "#e7e5e4", gage: "#ddd6fe", gel_judiciaire: "#c7d2fe" };
  const strokeFor = { titre: "#059669", litige: "#dc2626", domaine: "#d97706", libre: "#78716c", gage: "#7c3aed", gel_judiciaire: "#4338ca" };

  return (
    <div className="grid grid-cols-3 gap-5">
      <div className="col-span-2 bg-white border border-stone-200 rounded-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
            <span className={level === "pays" ? "text-stone-900 font-semibold" : ""}>République du Congo</span>
            {level === "ville" && (
              <>
                <ChevronRight size={12} />
                <span className="text-stone-900 font-semibold">{selectedDept?.nom}</span>
              </>
            )}
          </div>
          {level === "ville" && (
            <button onClick={() => { setLevel("pays"); setSelectedParcelle(null); }} className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900">
              <ArrowLeft size={13} /> Retour à la carte nationale
            </button>
          )}
        </div>
        <div className="text-xs text-stone-500 mb-4">
          {level === "pays" ? "Vue macro — cliquez sur un département pour zoomer." : "Vue territoriale — arrondissements et parcelles cadastrées."}
        </div>

        {deptMessage && (
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-sm p-2.5 mb-3">
            <AlertTriangle size={13} className="shrink-0" /> Aucune donnée cadastrale numérisée pour {deptMessage} à ce stade du déploiement.
          </div>
        )}

        {level === "pays" && (
          <>
            <svg viewBox="0 0 400 300" className="w-full border border-stone-200 bg-stone-50">
              {deptStatus.map((d) => (
                <g key={d.id} onClick={() => openDept(d)} className="cursor-pointer">
                  <circle cx={d.x} cy={d.y} r={d.hasData ? 20 : 15} fill={d.color} fillOpacity={d.hasData ? 0.85 : 0.35} stroke={d.color} strokeWidth={d.hasData ? 2 : 1} />
                  <text x={d.x} y={d.y + 32} fontSize="9" fontFamily="monospace" textAnchor="middle" fill="#44403c">{d.nom}</text>
                </g>
              ))}
            </svg>
            <div className="flex gap-4 mt-3 text-xs text-stone-500 flex-wrap">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>Gestion fluide</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Dossiers en attente</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>Litiges actifs</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-stone-400 opacity-50"></span>Non couvert numériquement</div>
            </div>
          </>
        )}

        {level === "ville" && (
          <>
            <div className="flex gap-3 mb-3 flex-wrap">
              {[
                { key: "titre", label: "Parcelles titrées" },
                { key: "libre", label: "Parcelles libres" },
                { key: "litige", label: "Litiges en cours" },
                { key: "domaine", label: "Domaine / réserves" },
              ].map((l) => (
                <label key={l.key} className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-100 px-2.5 py-1.5 rounded-sm cursor-pointer">
                  <input type="checkbox" checked={layers[l.key]} onChange={() => toggleLayer(l.key)} />
                  {l.label}
                </label>
              ))}
            </div>
            <svg viewBox="0 0 400 280" className="w-full border border-stone-200 bg-stone-50" style={{ backgroundImage: "linear-gradient(#e7e5e4 1px, transparent 1px), linear-gradient(90deg, #e7e5e4 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
              {Object.entries(communes).map(([commune, ps], gi) => {
                const bx = (gi % 2) * 190 + 10;
                const by = Math.floor(gi / 2) * 140 + 10;
                return (
                  <g key={commune}>
                    <rect x={bx} y={by} width={175} height={125} fill="none" stroke="#d6d3d1" strokeDasharray="3 3" />
                    <text x={bx + 6} y={by - 4} fontSize="10" fontFamily="monospace" fill="#57534e">{commune}</text>
                    {ps.map((p) => {
                      if (!layers[p.statut]) return null;
                      const px = bx + 10 + ((p.x + p.y) % 90);
                      const py = by + 15 + ((p.x * 2) % 80);
                      const isSel = selectedParcelle?.id === p.id;
                      return (
                        <g key={p.id} onClick={() => setSelectedParcelle(p)} className="cursor-pointer">
                          <rect
                            x={px} y={py} width={55} height={40}
                            fill={fillFor[p.statut]} fillOpacity={0.85} stroke={strokeFor[p.statut]}
                            strokeWidth={isSel ? 2.5 : 1.2}
                            className={p.statut === "litige" ? "animate-pulse" : ""}
                          />
                          <text x={px + 4} y={py + 14} fontSize="7" fontFamily="monospace" fill="#292524">{p.id}</text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={15} className="text-stone-600" />
          <div className="text-sm font-semibold">Fiche de sélection</div>
        </div>

        {!selectedParcelle && (
          <div className="text-stone-400 text-sm">
            {level === "pays" ? "Sélectionnez un département sur la carte." : "Sélectionnez une parcelle pour afficher son dossier complet."}
          </div>
        )}

        {selectedParcelle && (
          <ParcelleFicheMinistre parcelle={selectedParcelle} dossiers={dossiers} baux={baux} />
        )}
      </div>
    </div>
  );
}

function ParcelleFicheMinistre({ parcelle: p, dossiers, baux }) {
  const mutations = dossiers.filter((d) => d.parcelleId === p.id && d.type === "Mutation (vente, succession)");
  const acteNotarie = dossiers.find((d) => d.parcelleId === p.id && d.origine === "notaire");
  const bailActif = baux.find((b) => b.parcelleId === p.id);
  const dossierOrigine = dossiers.find((d) => d.parcelleId === p.id);

  const etatJuridique = p.statut === "litige"
    ? { label: "Faisant l'objet d'un contentieux", bg: "bg-red-100", text: "text-red-800" }
    : p.statut === "gage"
    ? { label: `Sous hypothèque — ${p.gageInfo?.banque}`, bg: "bg-purple-100", text: "text-purple-800" }
    : p.hypotheque
    ? { label: "Sous hypothèque", bg: "bg-amber-100", text: "text-amber-800" }
    : { label: "Saine", bg: "bg-emerald-100", text: "text-emerald-800" };

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-xs text-stone-500 font-mono mb-1">Titre foncier</div>
        <div className="font-semibold">{p.id}</div>
        <div className="text-stone-600 text-xs mt-0.5">{p.proprietaire} — {p.commune}, {p.superficie} m²</div>
      </div>

      <div>
        <span className="text-xs font-mono text-stone-500 block mb-1">État juridique</span>
        <span className={`text-xs px-2 py-1 rounded-sm ${etatJuridique.bg} ${etatJuridique.text}`}>{etatJuridique.label}</span>
        {bailActif && <span className="ml-1.5 text-xs px-2 py-1 rounded-sm bg-stone-100 text-stone-700">{bailActif.type}</span>}
      </div>

      <div>
        <span className="text-xs font-mono text-stone-500 block mb-1.5">Historique des mutations</span>
        {mutations.length === 0 && <div className="text-xs text-stone-400">Aucune mutation enregistrée.</div>}
        {mutations.map((m) => (
          <div key={m.id} className="text-xs text-stone-600 border-l-2 border-stone-200 pl-2 mb-1.5">
            {m.dateDepot} — {m.demandeur} <span className="text-stone-400 font-mono">({m.id})</span>
          </div>
        ))}
      </div>

      <div>
        <span className="text-xs font-mono text-stone-500 block mb-1.5">Intervenants</span>
        <div className="space-y-1.5 text-xs text-stone-600">
          <div><span className="text-stone-400">Brigade topographique — </span>{p.validationTechnique === "validé" ? "F. Ngoma (bornage validé)" : "Validation terrain en attente"}</div>
          <div><span className="text-stone-400">Notaire — </span>{acteNotarie ? `Me Kimbembe (dossier ${acteNotarie.id})` : "Aucun acte notarié enregistré"}</div>
          <div><span className="text-stone-400">Conservation foncière — </span>{p.statut === "titre" || p.statut === "litige" ? "R. Ondongo (acte validé)" : "Non instruit"}</div>
        </div>
      </div>

      {p.statut === "litige" && (
        <div className="flex gap-2 items-start bg-red-50 border border-red-200 p-3 text-xs text-red-800 rounded-sm">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          Contentieux actif — un dossier de résolution doit être suivi par le service Contentieux.
        </div>
      )}
    </div>
  );
}

// ---------- Assistant IA (Cabinet du Ministre) ----------
// Chaque fonction ci-dessous appelle réellement l'API Claude (aucune
// réponse n'est pré-écrite) en lui fournissant uniquement les données
// présentes dans l'ERP comme contexte, avec consigne explicite de ne pas
// inventer de faits hors de ce contexte.

// IMPORTANT — hors de l'environnement Claude.ai, l'appel direct à
// api.anthropic.com depuis le navigateur ne fonctionne pas (pas de clé API
// côté client, et l'API n'autorise pas les appels directs depuis un
// navigateur pour des raisons de sécurité). Cette fonction appelle donc un
// point d'entrée relatif "/api/ask-claude" que VOUS devez implémenter côté
// serveur (Supabase Edge Function ou petit service Render) : il reçoit
// { systemPrompt, userPrompt } et relaie l'appel à l'API Anthropic en
// gardant la clé API secrète côté serveur. Tant que ce point d'entrée
// n'existe pas, les modules IA afficheront une erreur de façon propre
// (déjà géré par les blocs try/catch existants) sans faire planter le reste
// de l'application.
async function askClaude(systemPrompt, userPrompt) {
  const response = await fetch("/api/ask-claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, userPrompt }),
  });
  if (!response.ok) throw new Error(`Erreur API (${response.status})`);
  const data = await response.json();
  return data.text;
}

function AssistantIA({ parcelles, dossiers, audit, agents, baux, encaissements, tensionData, tauxRecouvrement, dossiersPrioritaires }) {
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState(null);

  const [query, setQuery] = useState("");
  const [semanticAnswer, setSemanticAnswer] = useState(null);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [semanticError, setSemanticError] = useState(null);

  const [anomalies, setAnomalies] = useState(null);
  const [anomaliesLoading, setAnomaliesLoading] = useState(false);
  const [anomaliesError, setAnomaliesError] = useState(null);

  const [scoreAnalyse, setScoreAnalyse] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  const [selectedDossierId, setSelectedDossierId] = useState("");
  const [arbitrage, setArbitrage] = useState(null);
  const [arbitrageLoading, setArbitrageLoading] = useState(false);
  const [arbitrageError, setArbitrageError] = useState(null);

  const dossiersSensibles = dossiers.filter((d) => d.type === "Opposition / bornage" || d.statut === "Reçu" || d.statut === "En instruction");

  const contexteBase = {
    parcelles: parcelles.map((p) => ({ id: p.id, commune: p.commune, statut: p.statut, proprietaire: p.proprietaire, hypotheque: !!p.hypotheque })),
    dossiers: dossiers.map((d) => ({ id: d.id, type: d.type, statut: d.statut, demandeur: d.demandeur, dateDepot: d.dateDepot })),
    tensionParCommune: tensionData,
    tauxRecouvrement,
    recettesDomaine: baux.reduce((s, b) => s + b.redevanceAnnuelle, 0),
    encaissementsTotal: encaissements.reduce((s, e) => s + e.montant, 0),
    baux,
  };

  async function genererBriefing() {
    setBriefingLoading(true);
    setBriefingError(null);
    try {
      const litiges = parcelles.filter((p) => p.statut === "litige");
      const sys = "Tu es le chef de cabinet virtuel du Ministre des Affaires Foncières de la République du Congo. Tu rédiges un bulletin d'ouverture de session bref (4 à 6 phrases), factuel, en t'adressant à 'Monsieur le Ministre'. Tu t'appuies STRICTEMENT sur les données fournies, sans jamais inventer de chiffres ou d'événements absents du contexte. Ton style est direct, professionnel, orienté action.";
      const usr = `Données actuelles du système SIGEF :\n${JSON.stringify(contexteBase, null, 2)}\n\nDossiers prioritaires signalés : ${JSON.stringify(dossiersPrioritaires.map((d) => ({ id: d.id, tags: d.tags })))}\n\nRédige le bulletin du jour.`;
      const text = await askClaude(sys, usr);
      setBriefing(text);
    } catch (e) {
      setBriefingError("Impossible de générer le briefing pour le moment. Réessayez.");
    } finally {
      setBriefingLoading(false);
    }
  }

  async function lancerRecherche() {
    if (!query.trim()) return;
    setSemanticLoading(true);
    setSemanticError(null);
    setSemanticAnswer(null);
    try {
      const sys = "Tu es un assistant d'analyse documentaire pour le Cabinet d'un Ministre des Affaires Foncières. Tu réponds UNIQUEMENT à partir des données JSON fournies (dossiers, parcelles, journal d'audit). Si l'information demandée n'est pas présente dans les données, dis-le clairement plutôt que d'inventer une réponse. Réponse concise, en français, format synthèse.";
      const usr = `Données disponibles :\n${JSON.stringify({ ...contexteBase, journalAudit: audit.slice(0, 40) }, null, 2)}\n\nQuestion du Ministre : ${query}`;
      const text = await askClaude(sys, usr);
      setSemanticAnswer(text);
    } catch (e) {
      setSemanticError("La recherche n'a pas abouti. Réessayez.");
    } finally {
      setSemanticLoading(false);
    }
  }

  async function lancerDetectionAnomalies() {
    setAnomaliesLoading(true);
    setAnomaliesError(null);
    try {
      const sys = "Tu es un module de détection d'anomalies pour un ERP foncier gouvernemental. Analyse les données fournies (dossiers, parcelles, journal d'audit) et identifie : (1) des tentatives de double attribution ou de superposition de parcelles, (2) des retards anormaux de traitement pouvant indiquer un blocage volontaire par un agent ou service, (3) tout autre schéma suspect. Réponds en une liste courte à puces, factuelle, en citant les identifiants concernés. Si rien de suspect n'est détecté au-delà de ce qui est déjà signalé, dis-le explicitement. Ne jamais accuser nommément un agent sans nuance — utiliser un langage de type 'à vérifier'.";
      const usr = `Parcelles :\n${JSON.stringify(parcelles.map((p) => ({ id: p.id, statut: p.statut, commune: p.commune })))}\n\nDossiers :\n${JSON.stringify(dossiers)}\n\nJournal d'audit (derniers événements) :\n${JSON.stringify(audit.slice(0, 30))}`;
      const text = await askClaude(sys, usr);
      setAnomalies(text);
    } catch (e) {
      setAnomaliesError("L'analyse n'a pas pu être réalisée. Réessayez.");
    } finally {
      setAnomaliesLoading(false);
    }
  }

  async function lancerAnalyseScore() {
    setScoreLoading(true);
    try {
      const sys = "Tu es un analyste de performance publique. À partir des données de délai moyen et de dossiers traités par direction, produis un court commentaire (3-4 phrases) identifiant la direction la plus performante et celle qui nécessite un appui, avec un ton neutre et constructif, à l'attention du Ministre.";
      const usr = `Données agents/directions :\n${JSON.stringify(agents)}`;
      const text = await askClaude(sys, usr);
      setScoreAnalyse(text);
    } catch (e) {
      setScoreAnalyse("Analyse indisponible pour le moment.");
    } finally {
      setScoreLoading(false);
    }
  }

  async function genererArbitrage() {
    const dossier = dossiers.find((d) => d.id === selectedDossierId);
    if (!dossier) return;
    setArbitrageLoading(true);
    setArbitrageError(null);
    try {
      const parcelle = parcelles.find((p) => p.id === dossier.parcelleId);
      const sys = "Tu es un assistant d'aide à la décision pour un Cabinet ministériel congolais en matière foncière. Tu proposes des OPTIONS d'arbitrage possibles (pas une décision, pas un avis juridique définitif), structurées en 2 à 3 scénarios avec leurs avantages/risques respectifs. Tu dois explicitement rappeler en fin de réponse que ces pistes doivent être validées par les services juridiques et la Conservation foncière avant toute décision, et que tu n'as pas accès à la jurisprudence réelle ni aux textes réglementaires à jour — ne cite jamais d'article de loi ou de jurisprudence précis que tu ne peux pas vérifier.";
      const usr = `Dossier en contentieux :\n${JSON.stringify(dossier)}\n\nParcelle concernée :\n${JSON.stringify(parcelle)}\n\nPropose des options d'arbitrage.`;
      const text = await askClaude(sys, usr);
      setArbitrage(text);
    } catch (e) {
      setArbitrageError("La génération des options n'a pas abouti. Réessayez.");
    } finally {
      setArbitrageLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Briefing du matin */}
      <div className="bg-stone-900 text-stone-100 rounded-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bot size={17} className="text-amber-400" />
            <div className="text-sm font-semibold">Briefing du Cabinet</div>
          </div>
          <button
            onClick={genererBriefing}
            disabled={briefingLoading}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-sm"
          >
            {briefingLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {briefing ? "Régénérer" : "Générer le briefing du jour"}
          </button>
        </div>
        {!briefing && !briefingLoading && !briefingError && (
          <div className="text-xs text-stone-400">Cliquez pour obtenir une synthèse des points critiques, générée en direct à partir des données du système.</div>
        )}
        {briefingLoading && <div className="text-xs text-stone-400">Analyse des données en cours…</div>}
        {briefingError && <div className="text-xs text-red-400">{briefingError}</div>}
        {briefing && <div className="text-sm text-stone-100 leading-relaxed whitespace-pre-wrap mt-2">{briefing}</div>}
      </div>

      {/* Recherche sémantique */}
      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <Search size={15} className="text-stone-600" />
          <div className="text-sm font-semibold">Recherche en langage naturel</div>
        </div>
        <div className="text-xs text-stone-500 mb-3">Posez une question sur les dossiers, litiges ou recettes — l'IA interroge les données réelles du système.</div>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Ex. : Quels litiges fonciers sont actifs à Bacongo ?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lancerRecherche()}
          />
          <button onClick={lancerRecherche} disabled={semanticLoading || !query.trim()} className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-xs px-4 rounded-sm">
            {semanticLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
        {semanticError && <div className="text-xs text-red-700 mt-3">{semanticError}</div>}
        {semanticAnswer && (
          <div className="mt-4 bg-stone-50 border border-stone-200 rounded-sm p-3 text-sm text-stone-700 whitespace-pre-wrap">{semanticAnswer}</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Détection d'anomalies */}
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-600" />
              <div className="text-sm font-semibold">Détection d'anomalies &amp; fraude</div>
            </div>
          </div>
          <div className="text-xs text-stone-500 mb-3">Superpositions suspectes, blocages anormaux de dossiers.</div>
          <button
            onClick={lancerDetectionAnomalies}
            disabled={anomaliesLoading}
            className="flex items-center gap-1.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-sm mb-3"
          >
            {anomaliesLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Analyser
          </button>
          {anomaliesError && <div className="text-xs text-red-700">{anomaliesError}</div>}
          {anomalies && <div className="text-xs text-stone-700 whitespace-pre-wrap bg-red-50 border border-red-200 rounded-sm p-3">{anomalies}</div>}
        </div>

        {/* Score des directions */}
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={15} className="text-stone-600" />
            <div className="text-sm font-semibold">Scoring des directions</div>
          </div>
          <div className="text-xs text-stone-500 mb-3">Performance relative basée sur les délais et volumes traités.</div>
          <div className="space-y-1.5 mb-3">
            {agents.map((a) => {
              const score = Math.max(0, Math.min(100, Math.round(100 - a.delaiMoyen * 2 + a.dossiersTraites)));
              return (
                <div key={a.id} className="flex items-center gap-2 text-xs">
                  <div className="w-28 text-stone-600 shrink-0">{a.direction}</div>
                  <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${score >= 70 ? "bg-emerald-600" : score >= 40 ? "bg-amber-500" : "bg-red-600"}`} style={{ width: `${score}%` }}></div>
                  </div>
                  <div className="w-8 text-right text-stone-500">{score}</div>
                </div>
              );
            })}
          </div>
          <button onClick={lancerAnalyseScore} disabled={scoreLoading} className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-sm">
            {scoreLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Commentaire IA
          </button>
          {scoreAnalyse && <div className="text-xs text-stone-700 mt-3 bg-stone-50 border border-stone-200 rounded-sm p-3">{scoreAnalyse}</div>}
        </div>
      </div>

      {/* Aide à l'arbitrage */}
      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <Scale size={15} className="text-stone-600" />
          <div className="text-sm font-semibold">Aide à l'arbitrage</div>
        </div>
        <div className="text-xs text-stone-500 mb-3">Propose des pistes d'arbitrage pour un dossier de contentieux sélectionné — à valider impérativement par les services juridiques.</div>
        <div className="flex gap-2 mb-3">
          <select
            className="flex-1 border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            value={selectedDossierId}
            onChange={(e) => setSelectedDossierId(e.target.value)}
          >
            <option value="">Sélectionner un dossier sensible…</option>
            {dossiersSensibles.map((d) => (
              <option key={d.id} value={d.id}>{d.id} — {d.type} ({d.demandeur})</option>
            ))}
          </select>
          <button onClick={genererArbitrage} disabled={arbitrageLoading || !selectedDossierId} className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs px-4 rounded-sm">
            {arbitrageLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          </button>
        </div>
        {arbitrageError && <div className="text-xs text-red-700">{arbitrageError}</div>}
        {arbitrage && <div className="text-sm text-stone-700 whitespace-pre-wrap bg-amber-50 border border-amber-200 rounded-sm p-3">{arbitrage}</div>}
      </div>
    </div>
  );
}

// ---------- Laboratoire d'Anticipation Stratégique (Cabinet du Ministre) ----------
// Chaque axe interroge réellement l'API Claude à partir des données du
// système. Le jeu de données de cette démonstration est volontairement
// limité (pas de séries démographiques ou pluriannuelles réelles) : le
// prompt système impose donc à l'IA de le signaler explicitement plutôt
// que de fabriquer une précision qu'elle n'a pas.

function LaboratoireAnticipation({ parcelles, dossiers, baux, encaissements, tensionData, tauxRecouvrement }) {
  const axes = [
    {
      key: "urbanisation",
      icon: TrendingUp,
      titre: "Pression urbaine & extension des villes",
      description: "Identifie les zones où la part de parcelles non titrées progresse le plus vite, avant l'apparition de litiges ou d'habitat informel.",
      color: "text-red-600",
      buildPrompt: () => ({
        sys: "Tu es un conseiller en aménagement du territoire auprès d'un Cabinet ministériel congolais. À partir des données cadastrales fournies (répartition des parcelles par commune et statut), identifie les zones sous tension d'urbanisation et propose UN projet concret d'intervention (ex. lotissement concerté, sécurisation foncière). Sois direct, 5-6 phrases maximum. IMPORTANT : le jeu de données est limité (pas de séries démographiques pluriannuelles réelles) — dis-le explicitement et présente ta proposition comme une piste directionnelle à confirmer avec des données démographiques réelles, pas comme un constat statistique certain.",
        usr: `Répartition des parcelles par commune :\n${JSON.stringify(tensionData)}\n\nParcelles détaillées :\n${JSON.stringify(parcelles.map((p) => ({ commune: p.commune, statut: p.statut })))}`,
      }),
    },
    {
      key: "reserves",
      icon: Landmark,
      titre: "Réserves foncières de l'État",
      description: "Croise les parcelles du domaine public et les concessions actives pour proposer des sites stratégiques pour de grands projets.",
      color: "text-amber-600",
      buildPrompt: () => ({
        sys: "Tu es un conseiller en stratégie foncière publique. À partir des parcelles appartenant à l'État et des baux/concessions en cours, propose UNE suggestion de projet d'affectation stratégique (infrastructures, logements sociaux, zone industrielle). 5-6 phrases. IMPORTANT : précise que l'identification de sites réels nécessiterait un croisement SIG complet, non disponible dans cette démonstration — ne prétends pas avoir vérifié la disponibilité réelle du terrain.",
        usr: `Parcelles du domaine public :\n${JSON.stringify(parcelles.filter((p) => p.statut === "domaine"))}\n\nBaux et concessions actifs :\n${JSON.stringify(baux)}`,
      }),
    },
    {
      key: "reglementaire",
      icon: Scale,
      titre: "Modernisation réglementaire",
      description: "Analyse les types de dossiers et de contentieux récurrents pour suggérer des pistes de réforme administrative.",
      color: "text-stone-600",
      buildPrompt: () => ({
        sys: "Tu es un conseiller juridique et administratif. À partir de la répartition des types de dossiers et de leurs statuts, identifie un blocage administratif récurrent et propose UNE piste de réforme ou de simplification réglementaire. 5-6 phrases. IMPORTANT : ne cite aucun texte de loi ou décret précis que tu ne peux pas vérifier ; reste au niveau du principe de réforme, à faire valider par les services juridiques.",
        usr: `Dossiers (type, statut) :\n${JSON.stringify(dossiers.map((d) => ({ type: d.type, statut: d.statut, dateDepot: d.dateDepot })))}`,
      }),
    },
    {
      key: "fiscal",
      icon: Banknote,
      titre: "Optimisation des recettes fiscales",
      description: "Compare redevances domaniales et encaissements réels pour identifier un levier de recette sans impact sur les ménages modestes.",
      color: "text-emerald-600",
      buildPrompt: () => ({
        sys: "Tu es un conseiller en finances publiques locales. À partir des redevances domaniales, du taux de recouvrement et des encaissements du Trésor, propose UN levier ciblé d'optimisation des recettes (ex. révision de redevance sur un segment précis), en précisant qu'il ne doit pas peser sur les ménages à faibles revenus. 5-6 phrases. IMPORTANT : n'invente pas de pourcentage de gain de recette précis ; si tu en évoques un, qualifie-le explicitement d'estimation illustrative à vérifier.",
        usr: `Baux et redevances :\n${JSON.stringify(baux)}\n\nTaux de recouvrement actuel : ${tauxRecouvrement}%\n\nEncaissements Trésor :\n${JSON.stringify(encaissements)}`,
      }),
    },
  ];

  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  async function genererAxe(axe) {
    setLoading((l) => ({ ...l, [axe.key]: true }));
    setErrors((e) => ({ ...e, [axe.key]: null }));
    try {
      const { sys, usr } = axe.buildPrompt();
      const text = await askClaude(sys, usr);
      setResults((r) => ({ ...r, [axe.key]: text }));
    } catch (e) {
      setErrors((er) => ({ ...er, [axe.key]: "Génération impossible pour le moment. Réessayez." }));
    } finally {
      setLoading((l) => ({ ...l, [axe.key]: false }));
    }
  }

  async function genererTout() {
    for (const axe of axes) {
      await genererAxe(axe);
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-stone-900 text-stone-100 rounded-sm p-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb size={17} className="text-amber-400" />
          <div>
            <div className="text-sm font-semibold">Laboratoire d'Anticipation Stratégique</div>
            <div className="text-xs text-stone-400 mt-0.5">Recommandations proactives, générées à partir des données réelles du système — pas de la gestion réactive.</div>
          </div>
        </div>
        <button onClick={genererTout} className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-2 rounded-sm shrink-0">
          <Sparkles size={13} /> Générer le rapport complet
        </button>
      </div>

      {axes.map((axe) => {
        const Icon = axe.icon;
        return (
          <div key={axe.key} className="bg-white border border-stone-200 rounded-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Icon size={16} className={axe.color} />
                <div className="text-sm font-semibold">{axe.titre}</div>
              </div>
              <button
                onClick={() => genererAxe(axe)}
                disabled={loading[axe.key]}
                className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-sm shrink-0"
              >
                {loading[axe.key] ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {results[axe.key] ? "Régénérer" : "Analyser"}
              </button>
            </div>
            <div className="text-xs text-stone-500 mb-3">{axe.description}</div>
            {errors[axe.key] && <div className="text-xs text-red-700">{errors[axe.key]}</div>}
            {loading[axe.key] && <div className="text-xs text-stone-400">Analyse des données en cours…</div>}
            {results[axe.key] && (
              <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap bg-stone-50 border border-stone-200 rounded-sm p-3 mt-1">
                {results[axe.key]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Sécuri-Gage Foncier (partenaires bancaires) ----------

function SecuriGage({ parcelles, cartes, banque, compteId, readOnly, onPoserGage, onLeverGage }) {
  const [saisie, setSaisie] = useState("");
  const [trouve, setTrouve] = useState(undefined);
  const [showPose, setShowPose] = useState(false);
  const [msg, setMsg] = useState(null);
  const [nbConsultations, setNbConsultations] = useState(0);
  const [gagesDB, setGagesDB] = useState([]);
  const [alertes, setAlertes] = useState([]);

  useEffect(() => {
    if (!compteId) return;
    chargerGagesActifs(compteId).then(setGagesDB).catch(console.error);
    chargerAlertesEcheance().then((a) => setAlertes(a.filter((x) => x.banque === banque))).catch(console.error);
  }, [compteId, parcelles, banque]);

  async function prolonger(parcelleId) {
    const mois = prompt("Nombre de mois supplémentaires :", "12");
    if (!mois || Number(mois) <= 0) return;
    try {
      const res = await prolongerGageSQL(parcelleId, compteId, Number(mois));
      setMsg(res.ok ? { ok: true, text: "Gage prolongé de " + mois + " mois. Nouvelle échéance : " + res.nouvelle_echeance } : { ok: false, text: "Refus : " + res.raison });
      if (res.ok) {
        const list = await chargerGagesActifs(compteId);
        setGagesDB(list);
      }
    } catch (e) { setMsg({ ok: false, text: "Erreur : " + e.message }); }
  }

  async function realiser(parcelleId) {
    if (!confirm("Confirmer la réalisation du gage ? Cette action engage la procédure contentieuse.")) return;
    try {
      const res = await realiserGageSQL(parcelleId, compteId, "défaillance débiteur");
      setMsg(res.ok ? { ok: true, text: "Réalisation engagée. Le dossier est transmis au Contentieux et au Tribunal." } : { ok: false, text: "Refus : " + res.raison });
    } catch (e) { setMsg({ ok: false, text: "Erreur : " + e.message }); }
  }

  const mesGages = gagesDB;
  const TARIF_CONSULTATION = 2000;
  const TARIF_GAGE = 100000;
  const facturationConsultations = nbConsultations * TARIF_CONSULTATION;
  const facturationGages = mesGages.length * TARIF_GAGE;
  const facturationTotale = facturationConsultations + facturationGages;

  async function consulter() {
    setNbConsultations((n) => n + 1);
    const q = saisie.trim().toUpperCase();
    const parcelle = parcelles.find((p) => p.id.toUpperCase() === q);
    const carte = cartes.find((c) => c.id.toUpperCase() === q);
    if (parcelle) setTrouve({ type: "parcelle", data: parcelle });
    else if (carte) setTrouve({ type: "carte", data: carte });
    else setTrouve(null);
    if (compteId) {
      try {
        await enregistrerConsultation(compteId, parcelle?.id || null, carte?.id || null, parcelle ? "trouve" : carte ? "carte" : "introuvable");
      } catch (e) {
        console.error("Facturation consultation échouée :", e.message);
      }
    }
  }

  async function lever(parcelleId) {
    if (!compteId) return;
    try {
      const res = await leverGageSQL(parcelleId, compteId);
      if (!res.ok) {
        setMsg({ ok: false, text: "Refus : " + res.raison });
        return;
      }
      setMsg({ ok: true, text: "Mainlevée émise avec succès. Le bien est de nouveau sain et disponible." });
      const list = await chargerGagesActifs(compteId).catch(() => []);
      setGagesDB(list);
      const al = await chargerAlertesEcheance().catch(() => []);
      setAlertes(al.filter((x) => x.banque === banque));
      // Rafraîchir l'état local pour retirer le gage de la parcelle
      if (typeof onLeverGage === "function") {
        await onLeverGage(parcelleId, banque);
      }
    } catch (e) {
      setMsg({ ok: false, text: "Erreur : " + e.message });
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-stone-900 text-stone-100 rounded-sm p-5">
        <div className="flex items-center gap-2">
          <Lock size={17} className="text-amber-400" />
          <div className="text-sm font-semibold">Sécuri-Gage Foncier — {banque}</div>
        </div>
        <div className="text-xs text-stone-400 mt-1">Consultation en temps réel de la réalité d'un bien, pose de gage et mainlevée — connectés au registre central du Ministère.</div>
      </div>

      {alertes.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-sm p-4">
          <div className="flex items-center gap-2 text-amber-900 text-sm font-semibold mb-2">
            <AlertTriangle size={16} />
            {alertes.length} alerte(s) d'échéance — action requise
          </div>
          <div className="space-y-2">
            {alertes.map((a, i) => (
              <div key={i} className="text-xs text-amber-800 flex items-center justify-between bg-white border border-amber-200 rounded-sm p-2">
                <div>
                  <span className="font-mono">{a.parcelle}</span>
                  <span className="mx-2">·</span>
                  <span>
                    {a.type_alerte === "mi_parcours" && "Mi-parcours du gage"}
                    {a.type_alerte === "pre_echeance" && "Pré-échéance"}
                    {a.type_alerte === "echeance" && "Échéance atteinte"}
                  </span>
                  <span className="mx-2">·</span>
                  <span>{a.jours_restants >= 0 ? a.jours_restants + " jours restants" : Math.abs(a.jours_restants) + " jours dépassés"}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => lever(a.parcelle)} className="text-xs px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-sm">Mainlevée</button>
                  <button onClick={() => prolonger(a.parcelle)} className="text-xs px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-sm">Prolonger</button>
                  <button onClick={() => realiser(a.parcelle)} className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-sm">Réaliser</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="text-sm font-semibold mb-1">Consultation — scan de la carte foncière</div>
        <div className="text-xs text-stone-500 mb-3">Simulation de lecture QR/NFC — saisissez le numéro de titre ou de carte scanné.</div>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="P-04131 ou CF-1001"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && consulter()}
          />
          <button onClick={consulter} className="bg-stone-900 hover:bg-stone-800 text-white text-xs px-4 rounded-sm">Consulter</button>
        </div>

        {trouve === null && <div className="text-xs text-red-700 mt-3">Aucune référence correspondante dans le registre.</div>}

        {trouve && trouve.type === "parcelle" && (
          <FicheBienBancaire parcelle={trouve.data} banque={banque} readOnly={readOnly} onPoserGage={onPoserGage} onLeverGage={lever} />
        )}
        {trouve && trouve.type === "carte" && (
          <div className="mt-4 bg-stone-50 border border-stone-200 rounded-sm p-4">
            <div className="text-xs font-semibold mb-2">Carte {trouve.data.id} — {trouve.data.titulaire} ({trouve.data.parcelleIds.length} bien(s))</div>
            <div className="space-y-3">
              {parcelles.filter((p) => trouve.data.parcelleIds.includes(p.id)).map((p) => (
                <FicheBienBancaire key={p.id} parcelle={p} banque={banque} readOnly={readOnly} onPoserGage={onPoserGage} onLeverGage={lever} />
              ))}
            </div>
          </div>
        )}

        {msg && (
          <div className={`mt-3 text-xs p-2.5 rounded-sm border ${msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
            {msg.text}
          </div>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="text-sm font-semibold mb-4">Portefeuille de gages actifs — {banque}</div>
        {mesGages.length === 0 && <div className="text-xs text-stone-400">Aucun gage actif pour cette institution.</div>}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 border-b border-stone-200 font-mono text-xs uppercase">
              <th className="pb-2">Parcelle</th><th>Propriétaire</th><th>Dossier crédit</th><th>Montant</th><th>Durée</th><th>Depuis</th><th></th>
            </tr>
          </thead>
          <tbody>
            {mesGages.map((g) => {
              const p = parcelles.find((x) => x.id === g.parcelle_id);
              return (
                <tr key={g.id} className="border-b border-stone-100">
                  <td className="py-2.5 font-mono text-xs">{g.parcelle_id}</td>
                  <td>{p?.proprietaire || "—"}</td>
                  <td className="text-xs font-mono text-stone-500">{g.dossier_credit || "—"}</td>
                  <td>{Number(g.montant).toLocaleString("fr-FR")} FCFA</td>
                  <td className="text-stone-600">{g.duree_mois ? g.duree_mois + " mois" : "—"}</td>
                  <td className="text-stone-600">{new Date(g.date_pose).toLocaleDateString("fr-FR")}</td>
                  <td>
                    {!readOnly && (
                      <button onClick={() => lever(g.parcelle_id)} className="text-xs text-emerald-700 hover:underline">Mainlevée</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="text-sm font-semibold mb-1">Facturation API (session en cours)</div>
        <div className="text-xs text-stone-500 mb-3">Modèle par requête — assure la viabilité et la maintenance évolutive du registre central.</div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-stone-100">
              <td className="py-2 text-stone-600">Consultations ({nbConsultations} × {TARIF_CONSULTATION.toLocaleString("fr-FR")} FCFA)</td>
              <td className="py-2 text-right font-mono">{facturationConsultations.toLocaleString("fr-FR")} FCFA</td>
            </tr>
            <tr className="border-b border-stone-100">
              <td className="py-2 text-stone-600">Gages actifs ({mesGages.length} × {TARIF_GAGE.toLocaleString("fr-FR")} FCFA)</td>
              <td className="py-2 text-right font-mono">{facturationGages.toLocaleString("fr-FR")} FCFA</td>
            </tr>
            <tr>
              <td className="py-2 font-semibold">Total dû ce mois</td>
              <td className="py-2 text-right font-mono font-semibold">{facturationTotale.toLocaleString("fr-FR")} FCFA</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FicheBienBancaire({ parcelle: p, banque, readOnly, onPoserGage, onLeverGage }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ dossierCredit: "", montant: "", dureeAns: "5" });
  const [err, setErr] = useState(null);

  const disponible = p.statut === "titre";
  const gagePar = p.statut === "gage" ? p.gageInfo.banque : null;
  const estMonGage = gagePar === banque;

  async function submitGage() {
    const res = await onPoserGage(p.id, banque, form);
    if (!res.ok) setErr(res.error);
    else { setErr(null); setShowForm(false); }
  }

  return (
    <div className="mt-3 border border-stone-200 rounded-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-mono font-medium">{p.id}</div>
        <span className={`text-xs px-2 py-1 rounded-sm ${disponible ? "bg-emerald-100 text-emerald-800" : gagePar ? "bg-purple-100 text-purple-800" : STATUT_STYLE[p.statut].bg + " " + STATUT_STYLE[p.statut].text}`}>
          {disponible ? "DISPONIBLE" : gagePar ? `DÉJÀ ENGAGÉ — ${gagePar}` : STATUT_STYLE[p.statut].label}
        </span>
      </div>
      <div className="text-xs text-stone-600 mb-2">{p.proprietaire} — {p.commune}, {p.superficie} m²</div>

      {disponible && !readOnly && !showForm && (
        <button onClick={() => setShowForm(true)} className="text-xs text-amber-700 hover:underline">Poser un gage sur ce bien</button>
      )}

      {showForm && (
        <div className="space-y-2 bg-stone-50 border border-stone-200 rounded-sm p-3 mt-2">
          <Field label="Référence dossier de crédit"><input className="w-full border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.dossierCredit} onChange={(e) => setForm({ ...form, dossierCredit: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Montant (FCFA)"><input type="number" className="w-full border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} /></Field>
            <Field label="Durée (années)"><input type="number" className="w-full border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" value={form.dureeAns} onChange={(e) => setForm({ ...form, dureeAns: e.target.value })} /></Field>
          </div>
          {err && <div className="text-xs text-red-700">{err}</div>}
          <div className="flex gap-2">
            <button onClick={submitGage} disabled={!form.dossierCredit || !form.montant} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs py-2 rounded-sm">Valider le gage</button>
            <button onClick={() => setShowForm(false)} className="text-xs text-stone-500 px-2">Annuler</button>
          </div>
        </div>
      )}

      {gagePar && !readOnly && (
        estMonGage ? (
          <button onClick={() => onLeverGage(p.id)} className="text-xs text-emerald-700 hover:underline">Émettre la mainlevée (crédit soldé)</button>
        ) : (
          <div className="text-xs text-stone-400">Gage détenu par une autre institution — mainlevée non autorisée pour {banque}.</div>
        )
      )}
    </div>
  );
}

// ---------- Connexion Judiciaire (Tribunaux) ----------

function ConnexionJudiciaire({ parcelles, cartes, dossiers, audit, readOnly, onPoserGel, onLeverGel, onExecuterDecision }) {
  const [saisie, setSaisie] = useState("");
  const [resultats, setResultats] = useState(undefined);
  const [msg, setMsg] = useState(null);

  const [analyseSuperposition, setAnalyseSuperposition] = useState(null);
  const [loadingSuperposition, setLoadingSuperposition] = useState(false);
  const [erreurSuperposition, setErreurSuperposition] = useState(null);

  const [motifRecherche, setMotifRecherche] = useState("");
  const [communeRecherche, setCommuneRecherche] = useState("");
  const [antecedents, setAntecedents] = useState(null);
  const [loadingAntecedents, setLoadingAntecedents] = useState(false);
  const [erreurAntecedents, setErreurAntecedents] = useState(null);

  const gelsActifs = parcelles.filter((p) => p.statut === "gel_judiciaire");

  function consulter() {
    const q = saisie.trim().toLowerCase();
    if (!q) return;
    const parcelleExacte = parcelles.find((p) => p.id.toLowerCase() === q);
    if (parcelleExacte) { setResultats([parcelleExacte]); return; }
    const carte = cartes.find((c) => c.id.toLowerCase() === q || (c.nin && c.nin.toLowerCase() === q));
    if (carte) {
      const biens = parcelles.filter((p) => carte.parcelleIds.includes(p.id));
      setResultats(biens.length > 0 ? biens : null);
      return;
    }
    // Recherche par nom des parties (propriétaire actuel ou demandeur d'un dossier)
    const parNom = parcelles.filter((p) => p.proprietaire.toLowerCase().includes(q));
    if (parNom.length > 0) { setResultats(parNom); return; }
    const dossierMatch = dossiers.filter((d) => d.demandeur.toLowerCase().includes(q));
    if (dossierMatch.length > 0) {
      const ids = new Set(dossierMatch.map((d) => d.parcelleId));
      setResultats(parcelles.filter((p) => ids.has(p.id)));
      return;
    }
    setResultats(null);
  }

  async function lancerAnalyseSuperposition() {
    setLoadingSuperposition(true);
    setErreurSuperposition(null);
    try {
      const sys = "Tu es un module d'analyse géométrique pour un tribunal statuant sur des litiges fonciers. À partir des coordonnées schématiques des parcelles (x, y, largeur, hauteur, statut, commune), identifie : (1) les superpositions déjà détectées (statut 'litige'), (2) toute incohérence de limites entre parcelles voisines proches géométriquement mais aux statuts contradictoires, (3) les parcelles dont l'historique de mutations suggère un doublon de titre. Présente une liste courte, factuelle, citant les identifiants de parcelles concernées. Si rien d'anormal au-delà des litiges déjà signalés, dis-le explicitement.";
      const usr = `Parcelles (coordonnées schématiques) :\n${JSON.stringify(parcelles.map((p) => ({ id: p.id, x: p.x, y: p.y, w: p.w, h: p.h, statut: p.statut, commune: p.commune, proprietaire: p.proprietaire })))}\n\nMutations enregistrées :\n${JSON.stringify(dossiers.filter((d) => d.type === "Mutation (vente, succession)").map((d) => ({ parcelleId: d.parcelleId, demandeur: d.demandeur, date: d.dateDepot })))}`;
      const text = await askClaude(sys, usr);
      setAnalyseSuperposition(text);
    } catch (e) {
      setErreurSuperposition("Analyse indisponible pour le moment. Réessayez.");
    } finally {
      setLoadingSuperposition(false);
    }
  }

  async function lancerRechercheAntecedents() {
    if (!motifRecherche.trim()) return;
    setLoadingAntecedents(true);
    setErreurAntecedents(null);
    try {
      const sys = "Tu es un assistant de classement pour un greffe de tribunal foncier. Tu analyses UNIQUEMENT les dossiers de gel judiciaire et décisions déjà enregistrés dans le registre ERP fourni — tu n'as accès à aucune base de jurisprudence réelle ni texte de loi. Identifie les dossiers passés au motif similaire ou à la même localisation géographique, et résume les schémas récurrents observés dans CES données uniquement. Si aucun antécédent pertinent n'existe dans les données fournies, dis-le clairement plutôt que d'inventer une jurisprudence.";
      const usr = `Motif recherché : ${motifRecherche}\nCommune/zone recherchée : ${communeRecherche || "non précisée"}\n\nJournal d'audit (actions judiciaires passées) :\n${JSON.stringify(audit.filter((a) => /tribunal|gel judiciaire|jugement/i.test(a.action)))}\n\nParcelles par commune :\n${JSON.stringify(parcelles.map((p) => ({ id: p.id, commune: p.commune, statut: p.statut })))}`;
      const text = await askClaude(sys, usr);
      setAntecedents(text);
    } catch (e) {
      setErreurAntecedents("Recherche indisponible pour le moment. Réessayez.");
    } finally {
      setLoadingAntecedents(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-stone-900 text-stone-100 rounded-sm p-5">
        <div className="flex items-center gap-2">
          <Scale size={17} className="text-amber-400" />
          <div className="text-sm font-semibold">Connexion Judiciaire — Tribunal de Grande Instance</div>
        </div>
        <div className="text-xs text-stone-400 mt-1">Identification rapide d'un bien ou d'une partie, gel conservatoire d'urgence, et exécution directe des décisions de justice.</div>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="text-sm font-semibold mb-1">Recherche multicritères</div>
        <div className="text-xs text-stone-500 mb-2">Numéro de parcelle, numéro de carte foncière, NIN, ou nom d'une partie au litige.</div>
        <div className="flex gap-2 mt-2">
          <input
            className="flex-1 border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="P-04131, CF-1001, CG197804120017, ou un nom"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && consulter()}
          />
          <button onClick={consulter} className="bg-stone-900 hover:bg-stone-800 text-white text-xs px-4 rounded-sm">Rechercher</button>
        </div>
        {resultats === null && <div className="text-xs text-red-700 mt-3">Aucune référence, carte, NIN ou partie correspondante.</div>}
        {resultats && resultats.length > 1 && (
          <div className="text-xs text-stone-500 mt-3">{resultats.length} biens correspondants — sélectionnez une fiche :</div>
        )}
        {resultats && resultats.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {resultats.map((p) => (
              <button key={p.id} onClick={() => setResultats([p])} className="text-xs font-mono bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-sm">{p.id} — {p.proprietaire}</button>
            ))}
          </div>
        )}
        {resultats && resultats.length === 1 && (
          <FicheBienJudiciaire
            parcelle={resultats[0]}
            parcelles={parcelles}
            dossiers={dossiers}
            readOnly={readOnly}
            onPoserGel={onPoserGel}
            onLeverGel={onLeverGel}
            onExecuterDecision={onExecuterDecision}
            setMsg={setMsg}
          />
        )}
        {msg && (
          <div className={`mt-3 text-xs p-2.5 rounded-sm border ${msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
            {msg.text}
          </div>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={15} className="text-indigo-600" />
          <div className="text-sm font-semibold">Assistant IA — Gestion des litiges</div>
        </div>
        <div className="text-xs text-stone-500 mb-4">Détection de doublons/superpositions et recherche d'antécédents dans le registre — appels réels à l'IA, pas de résultats préécrits.</div>

        <div className="border-t border-stone-100 pt-4 mb-4">
          <div className="text-xs font-semibold mb-1">Détection des doublons et superpositions complexes</div>
          <div className="text-xs text-stone-500 mb-2">Analyse les coordonnées de toutes les parcelles pour repérer des incohérences de limites ou des historiques de titres superposés.</div>
          <button
            onClick={lancerAnalyseSuperposition}
            disabled={loadingSuperposition}
            className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-sm mb-2"
          >
            {loadingSuperposition ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Analyser les superpositions
          </button>
          {erreurSuperposition && <div className="text-xs text-red-700">{erreurSuperposition}</div>}
          {analyseSuperposition && <div className="text-xs text-stone-700 whitespace-pre-wrap bg-indigo-50 border border-indigo-200 rounded-sm p-3">{analyseSuperposition}</div>}
        </div>

        <div className="border-t border-stone-100 pt-4">
          <div className="text-xs font-semibold mb-1">Recherche d'antécédents similaires</div>
          <div className="text-xs text-stone-500 mb-2">Recherche dans les gels et décisions déjà enregistrés dans SIGEF — pas une base de jurisprudence réelle.</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              className="border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Motif (ex. succession)"
              value={motifRecherche}
              onChange={(e) => setMotifRecherche(e.target.value)}
            />
            <input
              className="border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Commune / zone (optionnel)"
              value={communeRecherche}
              onChange={(e) => setCommuneRecherche(e.target.value)}
            />
          </div>
          <button
            onClick={lancerRechercheAntecedents}
            disabled={loadingAntecedents || !motifRecherche.trim()}
            className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-xs px-3 py-2 rounded-sm mb-2"
          >
            {loadingAntecedents ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            Rechercher des antécédents
          </button>
          {erreurAntecedents && <div className="text-xs text-red-700">{erreurAntecedents}</div>}
          {antecedents && <div className="text-xs text-stone-700 whitespace-pre-wrap bg-stone-50 border border-stone-200 rounded-sm p-3">{antecedents}</div>}
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="text-sm font-semibold mb-4">Biens sous gel judiciaire actif — vue de juridiction</div>
        {gelsActifs.length === 0 && <div className="text-xs text-stone-400">Aucun bien sous gel judiciaire actuellement.</div>}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500 border-b border-stone-200 font-mono text-xs uppercase">
              <th className="pb-2">Parcelle</th><th>Propriétaire</th><th>Dossier</th><th>Motif</th><th>Magistrat</th><th>Depuis</th>
            </tr>
          </thead>
          <tbody>
            {gelsActifs.map((p) => (
              <tr key={p.id} className="border-b border-stone-100">
                <td className="py-2.5 font-mono text-xs">{p.id}</td>
                <td>{p.proprietaire}</td>
                <td className="text-xs font-mono text-stone-500">{p.gelInfo.dossierJudiciaire}</td>
                <td className="text-stone-600">{p.gelInfo.motif}</td>
                <td className="text-stone-600">{p.gelInfo.magistrat || "—"}</td>
                <td className="text-stone-600">{p.gelInfo.dateEffet || p.gelInfo.dateGel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FicheBienJudiciaire({ parcelle: p, parcelles, dossiers, readOnly, onPoserGel, onLeverGel, onExecuterDecision, setMsg }) {
  const [showGel, setShowGel] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [formGel, setFormGel] = useState({ dossierJudiciaire: "", motif: "", magistrat: "", dateEffet: new Date().toISOString().slice(0, 10) });
  const [formDecision, setFormDecision] = useState({ decision: "annulation", jugementRef: "", magistrat: "", nouveauProprietaire: "", carteDestinataire: "" });
  const [err, setErr] = useState(null);

  const sousGel = p.statut === "gel_judiciaire";
  const mutations = dossiers.filter((d) => d.parcelleId === p.id && d.type === "Mutation (vente, succession)");
  const chargeGage = p.statut === "gage" ? p.gageInfo : null;

  function submitGel() {
    const res = onPoserGel(p.id, formGel);
    if (!res.ok) setErr(res.error);
    else { setErr(null); setShowGel(false); setMsg({ ok: true, text: `Gel judiciaire posé sur ${p.id} par ${formGel.magistrat}. Vente et crédit bloqués.` }); }
  }

  function lever() {
    const res = onLeverGel(p.id, "Greffe");
    setMsg(res.ok ? { ok: true, text: "Gel judiciaire levé." } : { ok: false, text: res.error });
  }

  function submitDecision() {
    const res = onExecuterDecision(p.id, formDecision);
    if (!res.ok) setErr(res.error);
    else { setErr(null); setShowDecision(false); setMsg({ ok: true, text: `Décision exécutée sur ${p.id}.` }); }
  }

  return (
    <div className="mt-4 border border-stone-200 rounded-sm p-4">
      {/* Fiche d'identité du bien */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-mono font-semibold">{p.id}</div>
        <span className={`text-xs px-2 py-1 rounded-sm ${STATUT_STYLE[p.statut].bg} ${STATUT_STYLE[p.statut].text}`}>{STATUT_STYLE[p.statut].label}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        <div><span className="text-stone-400 block">Propriétaire actuel enregistré</span>{p.proprietaire}</div>
        <div><span className="text-stone-400 block">Localisation / superficie</span>{p.commune} — {p.superficie} m²</div>
      </div>

      <div className="mb-3">
        <span className="text-xs text-stone-400 block mb-1">Historique des propriétaires précédents</span>
        {mutations.length === 0 && <div className="text-xs text-stone-400">Aucune mutation antérieure enregistrée — titre d'origine.</div>}
        {mutations.map((m) => (
          <div key={m.id} className="text-xs text-stone-600 border-l-2 border-stone-200 pl-2 mb-1">
            {m.dateDepot} — devenu {m.demandeur} <span className="text-stone-400 font-mono">({m.id})</span>
          </div>
        ))}
      </div>

      <div className="mb-3">
        <button onClick={() => setShowPlan((s) => !s)} className="text-xs text-stone-600 hover:underline">
          {showPlan ? "Masquer les données topographiques" : "Voir les données topographiques (plan cadastral)"}
        </button>
        {showPlan && (
          <div className="mt-2">
            <PlanCadastral parcelle={p} parcelles={parcelles} />
            <div className="text-xs text-stone-400 mt-1">Vue 3D par relevé drone non disponible dans cette démonstration — nécessite une intégration SIG réelle.</div>
          </div>
        )}
      </div>

      <div className="mb-3">
        <span className="text-xs text-stone-400 block mb-1">Charges existantes</span>
        {chargeGage && (
          <div className="text-xs text-purple-800 bg-purple-50 border border-purple-200 rounded-sm p-2 mb-1">
            Sous gage bancaire actif — {chargeGage.banque}, dossier crédit {chargeGage.dossierCredit} ({chargeGage.montant.toLocaleString("fr-FR")} FCFA)
          </div>
        )}
        {sousGel && (
          <div className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-sm p-2 mb-1">
            Gel judiciaire actif — dossier {p.gelInfo.dossierJudiciaire} ({p.gelInfo.motif}), ordonné par {p.gelInfo.magistrat || "le tribunal"} le {p.gelInfo.dateEffet || p.gelInfo.dateGel}
          </div>
        )}
        {!chargeGage && !sousGel && <div className="text-xs text-emerald-700">Aucune charge — bien libre de tout gage ou contentieux.</div>}
      </div>

      {/* Actions */}
      {!readOnly && !sousGel && !showGel && (
        <button onClick={() => setShowGel(true)} className="text-xs text-indigo-700 hover:underline">Apposer un gel judiciaire</button>
      )}
      {showGel && (
        <div className="space-y-2 bg-stone-50 border border-stone-200 rounded-sm p-3 mt-2">
          <Field label="Numéro de l'affaire / du dossier"><input className="w-full border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" value={formGel.dossierJudiciaire} onChange={(e) => setFormGel({ ...formGel, dossierJudiciaire: e.target.value })} /></Field>
          <Field label="Motif du litige">
            <select className="w-full border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" value={formGel.motif} onChange={(e) => setFormGel({ ...formGel, motif: e.target.value })}>
              <option value="">Sélectionner…</option>
              <option>Conflit de succession</option>
              <option>Contestation de propriété</option>
              <option>Faux et usage de faux</option>
              <option>Litige de bornage</option>
              <option>Autre contentieux foncier</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date d'effet"><input type="date" className="w-full border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" value={formGel.dateEffet} onChange={(e) => setFormGel({ ...formGel, dateEffet: e.target.value })} /></Field>
            <Field label="Magistrat ordonnateur"><input className="w-full border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" placeholder="Juge X." value={formGel.magistrat} onChange={(e) => setFormGel({ ...formGel, magistrat: e.target.value })} /></Field>
          </div>
          {err && <div className="text-xs text-red-700">{err}</div>}
          <div className="flex gap-2">
            <button onClick={submitGel} disabled={!formGel.dossierJudiciaire || !formGel.motif || !formGel.magistrat} className="flex-1 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 text-white text-xs py-2 rounded-sm">Geler ce bien</button>
            <button onClick={() => setShowGel(false)} className="text-xs text-stone-500 px-2">Annuler</button>
          </div>
        </div>
      )}

      {!readOnly && sousGel && !showDecision && (
        <div className="flex gap-3">
          <button onClick={lever} className="text-xs text-emerald-700 hover:underline">Lever le gel (classé sans suite)</button>
          <button onClick={() => setShowDecision(true)} className="text-xs text-indigo-700 hover:underline">Exécuter une décision de justice</button>
        </div>
      )}
      {showDecision && (
        <div className="space-y-2 bg-stone-50 border border-stone-200 rounded-sm p-3 mt-2">
          <Field label="Référence du jugement"><input className="w-full border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" value={formDecision.jugementRef} onChange={(e) => setFormDecision({ ...formDecision, jugementRef: e.target.value })} /></Field>
          <Field label="Magistrat / greffier"><input className="w-full border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" value={formDecision.magistrat} onChange={(e) => setFormDecision({ ...formDecision, magistrat: e.target.value })} /></Field>
          <Field label="Décision">
            <select className="w-full border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" value={formDecision.decision} onChange={(e) => setFormDecision({ ...formDecision, decision: e.target.value })}>
              <option value="annulation">Annulation du titre</option>
              <option value="transfert">Transfert de propriété</option>
              <option value="expulsion">Expulsion (propriété inchangée)</option>
            </select>
          </Field>
          {formDecision.decision === "transfert" && (
            <>
              <Field label="Nouveau propriétaire"><input className="w-full border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500" value={formDecision.nouveauProprietaire} onChange={(e) => setFormDecision({ ...formDecision, nouveauProprietaire: e.target.value })} /></Field>
              <Field label="Carte foncière destinataire (optionnel)"><input className="w-full border border-stone-300 rounded-sm px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500" placeholder="CF-1002" value={formDecision.carteDestinataire} onChange={(e) => setFormDecision({ ...formDecision, carteDestinataire: e.target.value })} /></Field>
            </>
          )}
          {err && <div className="text-xs text-red-700">{err}</div>}
          <div className="flex gap-2">
            <button onClick={submitDecision} disabled={!formDecision.jugementRef || !formDecision.magistrat} className="flex-1 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 text-white text-xs py-2 rounded-sm">Exécuter la décision</button>
            <button onClick={() => setShowDecision(false)} className="text-xs text-stone-500 px-2">Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Conformité AML (Anti-Blanchiment) ----------

function ConformiteAML({ dossiers, encaissements, audit, onSignaler }) {
  const [signales, setSignales] = useState([]);

  const alertesVolume = useMemo(() => {
    const parDemandeur = {};
    dossiers.filter((d) => d.type === "Mutation (vente, succession)").forEach((d) => {
      if (!parDemandeur[d.demandeur]) parDemandeur[d.demandeur] = [];
      parDemandeur[d.demandeur].push(d);
    });
    return Object.entries(parDemandeur)
      .filter(([, ds]) => ds.length >= 2)
      .map(([demandeur, ds]) => ({
        id: `AML-VOL-${demandeur}`,
        type: "Volume anormal d'acquisitions",
        detail: `${demandeur} : ${ds.length} mutations enregistrées (${ds.map((d) => d.parcelleId).join(", ")})`,
        gravite: ds.length >= 3 ? "Élevée" : "Moyenne",
      }));
  }, [dossiers]);

  const alertesEspeces = useMemo(() => {
    return encaissements
      .filter((e) => e.mode === "Espèces" && e.montant >= 100000)
      .map((e) => ({
        id: `AML-CASH-${e.id}`,
        type: "Paiement en espèces significatif",
        detail: `Quittance ${e.id} — ${e.montant.toLocaleString("fr-FR")} FCFA en espèces (dossier ${e.dossierId})`,
        gravite: e.montant >= 300000 ? "Élevée" : "Moyenne",
      }));
  }, [encaissements]);

  const toutesAlertes = [...alertesVolume, ...alertesEspeces];

  function signaler(alerte) {
    onSignaler(`${alerte.type} — ${alerte.detail}`);
    setSignales((s) => [...s, alerte.id]);
  }

  return (
    <div className="space-y-5">
      <div className="bg-stone-900 text-stone-100 rounded-sm p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle size={17} className="text-amber-400" />
          <div className="text-sm font-semibold">Conformité — Lutte anti-blanchiment (AML)</div>
        </div>
        <div className="text-xs text-stone-400 mt-1">Détection automatique de schémas suspects à partir des données du registre — acquisitions multiples rapprochées, paiements en espèces significatifs.</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Kpi label="Alertes actives" value={toutesAlertes.length} tone={toutesAlertes.length > 0 ? "red" : "emerald"} />
        <Kpi label="Signalements transmis à l'ANIF" value={signales.length} tone="amber" />
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="text-sm font-semibold mb-4">Schémas détectés</div>
        {toutesAlertes.length === 0 && <div className="text-xs text-stone-400">Aucun schéma suspect détecté sur les données actuelles.</div>}
        <div className="space-y-2">
          {toutesAlertes.map((a) => (
            <div key={a.id} className="border border-stone-200 rounded-sm p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-semibold">{a.type}</div>
                <span className={`text-xs px-2 py-0.5 rounded-sm ${a.gravite === "Élevée" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{a.gravite}</span>
              </div>
              <div className="text-xs text-stone-600 mb-2">{a.detail}</div>
              {signales.includes(a.id) ? (
                <span className="text-xs text-emerald-700">Signalé à l'ANIF</span>
              ) : (
                <button onClick={() => signaler(a)} className="text-xs text-red-700 hover:underline">Signaler à l'ANIF</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-stone-500 bg-stone-100 border border-stone-200 rounded-sm p-3">
        Ces règles sont des seuils de démonstration (≥2 mutations par personne, paiements espèces ≥100 000 FCFA). En production, les seuils et la définition des schémas suspects doivent être calibrés avec l'ANIF, et le signalement doit emprunter un canal officiel sécurisé — ce bouton journalise l'action dans l'ERP mais ne transmet rien à une institution externe réelle.
      </div>
    </div>
  );
}

// ---------- UI primitives ----------

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="text-base font-semibold">{title}</div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onClose, onSubmit, disabled, label }) {
  return (
    <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-stone-200">
      <button onClick={onClose} className="text-xs px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
      <button onClick={onSubmit} disabled={disabled} className="text-xs px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-sm">{label}</button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-mono text-stone-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}

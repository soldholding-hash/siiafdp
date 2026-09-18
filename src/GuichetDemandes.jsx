import { useState, useEffect } from "react";
import {
  Inbox, Plus, Loader2, X, CheckCircle, Clock, Send,
  User, FileText, Search, CreditCard
} from "lucide-react";
import { creerDemande, listerDemandes, transmettreTresor, transmettreTopographe, validerPaiement } from "./lib/demandes";

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n || 0) + " FCFA";

const TYPES_DEMANDE = [
  { id: "titre_foncier", label: "Titre foncier", frais: 150000 },
  { id: "carte_fonciere", label: "Carte foncière", frais: 50000 },
  { id: "extrait_cadastral", label: "Extrait cadastral", frais: 15000 },
  { id: "mutation", label: "Mutation", frais: 100000 },
  { id: "morcellement", label: "Morcellement", frais: 200000 },
  { id: "bornage", label: "Bornage", frais: 75000 },
];

const STATUT_INFO = {
  cree: { label: "Créé", couleur: "bg-stone-100 text-stone-700" },
  en_attente_paiement: { label: "Attente paiement", couleur: "bg-amber-100 text-amber-800" },
  paye: { label: "Payé", couleur: "bg-emerald-100 text-emerald-800" },
  transmis_topographe: { label: "Au topographe", couleur: "bg-blue-100 text-blue-800" },
  leve_effectue: { label: "Levé effectué", couleur: "bg-indigo-100 text-indigo-800" },
  transmis_conservation: { label: "À la conservation", couleur: "bg-purple-100 text-purple-800" },
  titre_produit: { label: "Titre produit", couleur: "bg-emerald-100 text-emerald-800" },
  livre: { label: "Livré", couleur: "bg-emerald-200 text-emerald-900" },
  rejete: { label: "Rejeté", couleur: "bg-red-100 text-red-800" },
};

// ============================================
// MODAL : Nouvelle demande
// ============================================
function ModalNouvelleDemande({ agentNom, onClose, onDone }) {
  const [form, setForm] = useState({
    demandeur_nom: "",
    demandeur_prenom: "",
    demandeur_nin: "",
    demandeur_telephone: "",
    demandeur_email: "",
    demandeur_adresse: "",
    type_demande: "titre_foncier",
    parcelle_id: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const frais = TYPES_DEMANDE.find((t) => t.id === form.type_demande)?.frais || 0;

  async function valider() {
    if (!form.demandeur_nom.trim()) { setErr("Nom obligatoire"); return; }
    if (!form.demandeur_prenom.trim()) { setErr("Prénom obligatoire"); return; }
    if (!form.demandeur_nin.trim()) { setErr("NIN obligatoire"); return; }
    setLoading(true);
    const res = await creerDemande({
      ...form,
      montant_frais: frais,
      guichet_agent_nom: agentNom,
    });
    setLoading(false);
    if (!res.ok) { setErr(res.raison); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-stone-900/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-2xl my-4">
        <div className="bg-indigo-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus size={18} />
            <div className="text-sm font-semibold">Nouvelle demande au guichet</div>
          </div>
          <button onClick={onClose} className="text-indigo-200 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs">
            <div className="font-semibold text-stone-700 mb-1">👤 Informations du demandeur</div>
            <div className="text-stone-500">Le NIN est obligatoire — il servira au Trésor pour identifier le demandeur.</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Nom *</label>
              <input value={form.demandeur_nom}
                onChange={(e) => setForm({ ...form, demandeur_nom: e.target.value })}
                placeholder="Ex: MABIALD"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Prénom *</label>
              <input value={form.demandeur_prenom}
                onChange={(e) => setForm({ ...form, demandeur_prenom: e.target.value })}
                placeholder="Ex: Jean"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">NIN (Numéro d'Identification National) *</label>
            <input value={form.demandeur_nin}
              onChange={(e) => setForm({ ...form, demandeur_nin: e.target.value })}
              placeholder="Ex: CG197804120017"
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Téléphone</label>
              <input value={form.demandeur_telephone}
                onChange={(e) => setForm({ ...form, demandeur_telephone: e.target.value })}
                placeholder="+242 06 000 00 00"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Email</label>
              <input value={form.demandeur_email}
                onChange={(e) => setForm({ ...form, demandeur_email: e.target.value })}
                placeholder="exemple@email.cg"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Adresse</label>
            <input value={form.demandeur_adresse}
              onChange={(e) => setForm({ ...form, demandeur_adresse: e.target.value })}
              placeholder="Ex: Brazzaville, Bacongo"
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Type de demande *</label>
            <select value={form.type_demande}
              onChange={(e) => setForm({ ...form, type_demande: e.target.value })}
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm">
              {TYPES_DEMANDE.map((t) => (
                <option key={t.id} value={t.id}>{t.label} — {fmt(t.frais)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Parcelle concernée (optionnel)</label>
            <input value={form.parcelle_id}
              onChange={(e) => setForm({ ...form, parcelle_id: e.target.value })}
              placeholder="Ex: P-04129"
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Description / Observations</label>
            <textarea value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Détails supplémentaires sur la demande..."
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-sm p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-indigo-700">Frais à payer au Trésor :</span>
              <span className="font-mono font-bold text-indigo-900">{fmt(frais)}</span>
            </div>
          </div>

          {err && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button onClick={valider} disabled={loading}
            className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {loading ? "Enregistrement..." : "Enregistrer la demande"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MODAL : Valider le paiement (Trésor)
// ============================================
function ModalPaiement({ demande, agentNom, onClose, onDone }) {
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function valider() {
    if (!reference.trim()) { setErr("Référence de quittance obligatoire"); return; }
    setLoading(true);
    const res = await validerPaiement(demande.id, agentNom, reference.trim());
    setLoading(false);
    if (!res.ok) { setErr(res.raison); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-stone-900/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-lg my-4">
        <div className="bg-emerald-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={18} />
            <div className="text-sm font-semibold">Valider le paiement</div>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs space-y-1">
            <div><strong>Référence :</strong> <span className="font-mono">{demande.reference}</span></div>
            <div><strong>Demandeur :</strong> {demande.demandeur_prenom} {demande.demandeur_nom}</div>
            {demande.demandeur_nin && (
              <div><strong>NIN :</strong> <span className="font-mono">{demande.demandeur_nin}</span></div>
            )}
            <div><strong>Montant :</strong> <span className="font-mono font-bold text-red-700">{fmt(demande.montant_frais)}</span></div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 text-xs text-amber-900">
            Vérifiez que le demandeur a bien payé <strong>{fmt(demande.montant_frais)}</strong> en espèces ou par mobile money.
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Numéro de quittance *</label>
            <input value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex: QUIT-2026-0001"
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
          </div>

          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button onClick={valider} disabled={loading}
            className="text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {loading ? "Validation..." : "Valider le paiement"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export default function GuichetDemandes({ currentUser }) {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("tous");
  const [showNouvelle, setShowNouvelle] = useState(false);
  const [msg, setMsg] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [paiementCible, setPaiementCible] = useState(null);

  async function charger() {
    setLoading(true);
    const data = await listerDemandes(filtre === "tous" ? {} : { statut: filtre });
    setDemandes(data);
    setLoading(false);
  }

  useEffect(() => { charger(); }, [filtre]);

  async function apresCreation() {
    setShowNouvelle(false);
    setMsg({ ok: true, text: "Demande enregistrée. Vous pouvez la transmettre au Trésor." });
    await charger();
    setTimeout(() => setMsg(null), 4000);
  }

  async function apresPaiement() {
    setPaiementCible(null);
    setMsg({ ok: true, text: "Paiement validé. Le dossier repart au guichet pour transmission." });
    await charger();
    setTimeout(() => setMsg(null), 4000);
  }

  async function validerPaiementDemande(d) {
    const ref = prompt("Référence de la quittance (ex: Q-2026-0451) :");
    if (!ref) return;
    const res = await validerPaiement(d.id, currentUser?.nom || "Agent Trésor", ref);
    if (!res.ok) { setMsg({ ok: false, text: "Erreur : " + res.raison }); return; }
    setMsg({ ok: true, text: "Paiement validé. Vous pouvez transmettre au topographe." });
    await charger();
    setTimeout(() => setMsg(null), 4000);
  }

  async function transmettreTopo(d) {
    if (!confirm("Transmettre la demande " + d.reference + " au topographe ?")) return;
    const res = await transmettreTopographe(d.id, currentUser?.nom || "Agent Trésor");
    if (!res.ok) { setMsg({ ok: false, text: "Erreur : " + res.raison }); return; }
    setMsg({ ok: true, text: "Demande " + d.reference + " transmise au topographe." });
    await charger();
    setTimeout(() => setMsg(null), 4000);
  }

  async function transmettre(d) {
    if (!confirm(`Transmettre la demande ${d.reference} au Trésor pour un montant de ${fmt(d.montant_frais)} ?`)) return;
    const res = await transmettreTresor(d.id, currentUser?.nom || "Agent Guichet", d.montant_frais);
    if (!res.ok) { setMsg({ ok: false, text: "Erreur : " + res.raison }); return; }
    setMsg({ ok: true, text: `Demande ${d.reference} transmise au Trésor.` });
    await charger();
    setTimeout(() => setMsg(null), 4000);
  }

  const filtres = [
    { id: "tous", label: "Toutes", icone: FileText },
    { id: "cree", label: "Créées", icone: Plus },
    { id: "en_attente_paiement", label: "Attente paiement", icone: Clock },
    { id: "paye", label: "Payées", icone: CheckCircle },
  ];

  const demandesFiltrees = demandes.filter((d) => {
    if (!recherche.trim()) return true;
    const r = recherche.toLowerCase();
    return (
      (d.reference || "").toLowerCase().includes(r) ||
      (d.demandeur_nom || "").toLowerCase().includes(r) ||
      (d.demandeur_prenom || "").toLowerCase().includes(r) ||
      (d.demandeur_nin || "").toLowerCase().includes(r)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Inbox className="text-indigo-700" size={26} />
            <div className="text-2xl font-semibold text-stone-900">Guichet unique</div>
          </div>
          <div className="text-sm text-stone-500 mt-1">
            Enregistrement des demandes et orientation vers les services
          </div>
        </div>
        <button onClick={() => setShowNouvelle(true)}
          className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm inline-flex items-center gap-1.5">
          <Plus size={14} /> Nouvelle demande
        </button>
      </div>

      {msg && (
        <div className={"text-xs p-2 rounded-sm border " + (msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
          {msg.text}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {filtres.map((f) => {
          const Icone = f.icone;
          return (
            <button key={f.id} onClick={() => setFiltre(f.id)}
              className={"text-xs px-3 py-2 rounded-sm border inline-flex items-center gap-1.5 " + (
                filtre === f.id
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-stone-600 border-stone-200 hover:border-indigo-400"
              )}>
              <Icone size={12} /> {f.label}
            </button>
          );
        })}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" size={13} />
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par référence, nom, NIN..."
            className="w-full border border-stone-200 rounded-sm pl-7 pr-3 py-1.5 text-xs" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm p-6">
          <Loader2 className="animate-spin" size={16} /> Chargement...
        </div>
      ) : demandesFiltrees.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <Inbox size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">Aucune demande dans cette catégorie</div>
        </div>
      ) : (
        <div className="space-y-3">
          {demandesFiltrees.map((d) => (
            <div key={d.id} className="bg-white border border-stone-200 rounded-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm font-semibold text-stone-900">{d.reference}</div>
                <span className={"text-xs px-2 py-0.5 rounded-sm font-medium " + (STATUT_INFO[d.statut]?.couleur || "bg-stone-100 text-stone-700")}>
                  {STATUT_INFO[d.statut]?.label || d.statut}
                </span>
              </div>

              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Demandeur</span>
                  <span className="font-semibold text-right">{d.demandeur_prenom} {d.demandeur_nom}</span>
                </div>
                {d.demandeur_nin && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">NIN</span>
                    <span className="font-mono text-right">{d.demandeur_nin}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-stone-500">Type</span>
                  <span className="text-right">{TYPES_DEMANDE.find((t) => t.id === d.type_demande)?.label || d.type_demande}</span>
                </div>
                {d.montant_frais && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Frais</span>
                    <span className="font-mono font-bold text-red-700 text-right">{fmt(d.montant_frais)}</span>
                  </div>
                )}
                {d.parcelle_id && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Parcelle</span>
                    <span className="font-mono text-right">{d.parcelle_id}</span>
                  </div>
                )}
              </div>

              {d.statut === "cree" && (
                <button onClick={() => transmettre(d)}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-sm inline-flex items-center justify-center gap-1.5 text-xs font-medium">
                  <Send size={12} /> Transmettre au Trésor
                </button>
              )}

              {d.statut === "en_attente_paiement" && (
                <button onClick={() => setPaiementCible(d)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm inline-flex items-center justify-center gap-1.5 text-xs font-medium">
                  <CreditCard size={12} /> Valider le paiement
                </button>
              )}

              {d.statut === "paye" && (
                <button onClick={() => transmettreTopo(d)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm inline-flex items-center justify-center gap-1.5 text-xs font-medium">
                  <Send size={12} /> Transmettre au topographe
                </button>
              )}


            </div>
          ))}
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-200 rounded-sm p-4 text-xs text-indigo-900">
        <strong>Procédure :</strong> le guichet enregistre la demande du citoyen, puis la transmet au Trésor pour encaissement des frais. Une fois payé, le dossier revient au guichet qui l'oriente vers le service compétent (topographe ou conservation).
      </div>

      {paiementCible && (
        <ModalPaiement
          demande={paiementCible}
          agentNom={currentUser?.nom || "Agent Trésor"}
          onClose={() => setPaiementCible(null)}
          onDone={apresPaiement}
        />
      )}

      {showNouvelle && (
        <ModalNouvelleDemande
          agentNom={currentUser?.nom || "Agent Guichet"}
          onClose={() => setShowNouvelle(false)}
          onDone={apresCreation}
        />
      )}


    </div>
  );
}

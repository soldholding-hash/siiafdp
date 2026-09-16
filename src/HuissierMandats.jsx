import { useState, useEffect } from "react";
import {
  Inbox, Loader2, X, Check, XCircle, AlertCircle,
  Building2, FileText, Eye, Paperclip, Scale
} from "lucide-react";
import {
  chargerMonProfilHuissier,
  getSignedUrl,
} from "./lib/huissier";
import {
  listerMesMandatsHuissier,
  deciderMandat,
} from "./lib/mandats";

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n || 0) + " FCFA";

const STATUT_INFO = {
  en_attente: { label: "En attente", couleur: "bg-amber-100 text-amber-800" },
  accepte: { label: "Accepté", couleur: "bg-emerald-100 text-emerald-800" },
  refuse: { label: "Refusé", couleur: "bg-red-100 text-red-800" },
  complement_demande: { label: "Complément demandé", couleur: "bg-blue-100 text-blue-800" },
  commande: { label: "Commandement créé", couleur: "bg-purple-100 text-purple-800" },
  saisie: { label: "Saisie effectuée", couleur: "bg-red-200 text-red-900" },
  clos: { label: "Clos", couleur: "bg-stone-100 text-stone-700" },
};

// ---------- Modal : examiner un mandat ----------
function ModalMandat({ mandat, onClose, onDone }) {
  const [decision, setDecision] = useState("accepte");
  const [motif, setMotif] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function ouvrirPiece(url) {
    if (!url) return;
    const signed = await getSignedUrl(url, 3600);
    if (signed) window.open(signed, "_blank");
    else alert("Impossible d'ouvrir le document.");
  }

  async function valider() {
    if (decision !== "accepte" && !motif.trim()) {
      setErr("Motif obligatoire pour un refus ou une demande de complément");
      return;
    }
    setLoading(true);
    const res = await deciderMandat(mandat.id, decision, motif.trim() || null);
    setLoading(false);
    if (!res.ok) { setErr(res.raison); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-stone-900/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-2xl my-4">
        <div className="bg-cyan-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox size={18} />
            <div className="text-sm font-semibold">Mandat {mandat.reference}</div>
          </div>
          <button onClick={onClose} className="text-cyan-200 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Banque émettrice */}
          <div className="bg-cyan-50 border border-cyan-200 rounded-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="text-cyan-700" size={16} />
              <div className="text-xs font-mono text-cyan-700 uppercase">Banque émettrice</div>
            </div>
            <div className="text-sm font-semibold text-cyan-900">{mandat.banque_nom}</div>
            <div className="text-xs text-cyan-700 mt-1">
              Reçu le {new Date(mandat.created_at).toLocaleString("fr-FR")}
            </div>
          </div>

          {/* Dossier */}
          <div>
            <div className="text-sm font-semibold text-stone-800 mb-3">Dossier du débiteur</div>
            <div className="bg-stone-50 border border-stone-200 rounded-sm p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Parcelle</span>
                <span className="font-mono font-semibold">{mandat.parcelle_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Débiteur</span>
                <span className="font-medium">{mandat.debiteur_nom}</span>
              </div>
              {mandat.debiteur_nin && (
                <div className="flex justify-between">
                  <span className="text-stone-500">NIN</span>
                  <span className="font-mono">{mandat.debiteur_nin}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-stone-500">Montant dû</span>
                <span className="font-mono font-bold text-red-700">{fmt(mandat.montant_du)}</span>
              </div>
              {mandat.reference_contrat && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Référence contrat</span>
                  <span className="font-mono">{mandat.reference_contrat}</span>
                </div>
              )}
              {mandat.date_impaye_debut && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Début impayé</span>
                  <span>{new Date(mandat.date_impaye_debut).toLocaleDateString("fr-FR")}</span>
                </div>
              )}
              {mandat.motif_dette && (
                <div className="pt-2 border-t border-stone-200">
                  <div className="text-stone-500 mb-1">Motif</div>
                  <div className="italic text-stone-700">« {mandat.motif_dette} »</div>
                </div>
              )}
            </div>
          </div>

          {/* Pièces jointes */}
          <div>
            <div className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
              <Paperclip size={14} /> Pièces fournies par la banque
            </div>
            <div className="space-y-2">
              {[
                { label: "Contrat de prêt", url: mandat.contrat_url },
                { label: "Échéancier", url: mandat.echeancier_url },
                { label: "Mise en demeure préalable", url: mandat.mise_demeure_url },
              ].map((p) => (
                <div key={p.label} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-sm p-3">
                  <div className="text-xs">
                    <div className="font-medium text-stone-700">{p.label}</div>
                    {!p.url && <div className="text-stone-400 text-[10px]">Non fourni</div>}
                  </div>
                  {p.url ? (
                    <button
                      onClick={() => ouvrirPiece(p.url)}
                      className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm inline-flex items-center gap-1"
                    >
                      <Eye size={11} /> Voir
                    </button>
                  ) : (
                    <span className="text-xs text-stone-400">—</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Décision */}
          {mandat.statut === "en_attente" && (
            <>
              <div>
                <label className="text-xs font-mono text-stone-500 block mb-2">Décision</label>
                <div className="space-y-1.5">
                  {[
                    { id: "accepte", label: "✅ Accepter le mandat", couleur: "border-emerald-500 bg-emerald-50" },
                    { id: "complement_demande", label: "⚠️ Demander un complément", couleur: "border-amber-500 bg-amber-50" },
                    { id: "refuse", label: "❌ Refuser le mandat", couleur: "border-red-500 bg-red-50" },
                  ].map((o) => (
                    <label key={o.id} className={"flex items-center gap-2 p-2 border rounded-sm cursor-pointer text-sm " + (decision === o.id ? o.couleur : "border-stone-200")}>
                      <input type="radio" name="decision" checked={decision === o.id} onChange={() => setDecision(o.id)} />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-stone-500 block mb-1">
                  Motif {decision === "accepte" ? "(optionnel)" : "(obligatoire)"}
                </label>
                <textarea
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  rows={3}
                  placeholder={decision === "accepte" ? "Observations éventuelles..." : "Raison du refus ou du complément demandé..."}
                  className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm"
                />
              </div>

              {err && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2 flex items-center gap-2">
                  <AlertCircle size={14} /> {err}
                </div>
              )}
            </>
          )}

          {/* Statut final si déjà traité */}
          {mandat.statut !== "en_attente" && (
            <div className="bg-stone-50 border border-stone-200 rounded-sm p-4 text-xs">
              <div className="text-stone-500 mb-2">Ce mandat a été traité</div>
              <div className={"inline-flex items-center gap-1 px-2 py-1 rounded-sm font-medium " + (STATUT_INFO[mandat.statut]?.couleur || "bg-stone-100")}>
                {STATUT_INFO[mandat.statut]?.label || mandat.statut}
              </div>
              {mandat.motif_refus && (
                <div className="mt-2 italic text-stone-600">Motif : « {mandat.motif_refus} »</div>
              )}
              {mandat.pieces_complementaires && (
                <div className="mt-2 italic text-stone-600">Complément demandé : « {mandat.pieces_complementaires} »</div>
              )}
            </div>
          )}
        </div>

        {/* Pied */}
        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">
            Fermer
          </button>
          {mandat.statut === "en_attente" && (
            <button
              onClick={valider}
              disabled={loading}
              className="text-xs px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-sm inline-flex items-center gap-1"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {loading ? "Traitement..." : "Confirmer la décision"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Composant principal ----------
export default function HuissierMandats() {
  const [profil, setProfil] = useState(null);
  const [mandats, setMandats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("en_attente");
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState(null);

  async function charger() {
    setLoading(true);
    const p = await chargerMonProfilHuissier();
    setProfil(p);
    if (p) {
      const m = await listerMesMandatsHuissier(p.id, filtre === "tous" ? null : filtre);
      setMandats(m);
    }
    setLoading(false);
  }

  useEffect(() => { charger(); }, [filtre]);

  async function apresDecision() {
    setSelected(null);
    setMsg({ ok: true, text: "Décision enregistrée. La banque sera notifiée." });
    await charger();
    setTimeout(() => setMsg(null), 4000);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-stone-500 text-sm p-6">
        <Loader2 className="animate-spin" size={16} /> Chargement...
      </div>
    );
  }

  if (!profil) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-sm text-amber-900">
          Aucun profil huissier lié à ce compte.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Inbox className="text-cyan-700" size={26} />
          <div className="text-2xl font-semibold text-stone-900">Mandats reçus</div>
        </div>
        <div className="text-sm text-stone-500 mt-1">
          Dossiers de saisie transmis par les banques partenaires
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: "en_attente", label: "En attente" },
          { id: "accepte", label: "Acceptés" },
          { id: "refuse", label: "Refusés" },
          { id: "complement_demande", label: "Compléments" },
          { id: "tous", label: "Tous" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltre(f.id)}
            className={"text-xs px-3 py-2 rounded-sm border " + (
              filtre === f.id
                ? "bg-cyan-600 text-white border-cyan-600"
                : "bg-white text-stone-600 border-stone-200 hover:border-cyan-400"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={"text-xs p-2 rounded-sm border " + (msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
          {msg.text}
        </div>
      )}

      {mandats.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <Inbox size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">Aucun mandat dans cette catégorie</div>
          <div className="text-xs text-stone-400 mt-1">
            Les banques vous transmettront les dossiers de saisie ici
          </div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4">Référence</th>
                <th className="text-left py-3 px-4">Banque</th>
                <th className="text-left py-3 px-4">Parcelle</th>
                <th className="text-right py-3 px-4">Montant</th>
                <th className="text-left py-3 px-4">Reçu le</th>
                <th className="text-left py-3 px-4">Statut</th>
                <th className="text-right py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {mandats.map((m) => (
                <tr key={m.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4 font-mono text-xs font-semibold">{m.reference}</td>
                  <td className="py-3 px-4 text-xs">{m.banque_nom}</td>
                  <td className="py-3 px-4 font-mono text-xs">{m.parcelle_id}</td>
                  <td className="py-3 px-4 text-xs font-mono text-right">{fmt(m.montant_du)}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">
                    {new Date(m.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="py-3 px-4">
                    <span className={"text-xs px-2 py-0.5 rounded-sm font-medium " + (STATUT_INFO[m.statut]?.couleur || "bg-stone-100 text-stone-700")}>
                      {STATUT_INFO[m.statut]?.label || m.statut}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelected(m)}
                      className="text-xs px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-sm inline-flex items-center gap-1"
                    >
                      <FileText size={11} />
                      {m.statut === "en_attente" ? "Examiner" : "Voir"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-cyan-50 border border-cyan-200 rounded-sm p-4 text-xs text-cyan-900">
        <strong>Procédure :</strong> lorsqu'une banque vous transmet un mandat de saisie, examinez les pièces jointes (contrat, échéancier, mise en demeure). Si le dossier est complet, acceptez-le — vous pourrez alors créer le commandement de payer correspondant et le soumettre au TGI.
      </div>

      {selected && (
        <ModalMandat
          mandat={selected}
          onClose={() => setSelected(null)}
          onDone={apresDecision}
        />
      )}
    </div>
  );
}

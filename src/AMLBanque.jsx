import { useState, useEffect } from "react";
import { ShieldCheck, AlertTriangle, Loader2, Eye, X, Check, RefreshCw, Send } from "lucide-react";
import { supabase } from "./lib/db";

const TYPE_INFO = {
  CONSULT_MASSIVE: { label: "Consultations massives", couleur: "bg-amber-100 text-amber-800", icone: Eye },
  GAGE_ELEVE: { label: "Gage de montant eleve", couleur: "bg-orange-100 text-orange-800", icone: AlertTriangle },
  SIGNALEMENTS_MULTIPLES: { label: "Signalements multiples", couleur: "bg-red-100 text-red-800", icone: AlertTriangle },
  TENTATIVES_BLOQUEES: { label: "Tentatives bloquees", couleur: "bg-purple-100 text-purple-800", icone: ShieldCheck },
};

const NIVEAU_INFO = {
  faible: "bg-stone-100 text-stone-700",
  moyen: "bg-amber-100 text-amber-800",
  eleve: "bg-orange-100 text-orange-800",
  critique: "bg-red-100 text-red-800",
};

const STATUT_INFO = {
  nouvelle: "bg-red-100 text-red-800",
  en_analyse: "bg-amber-100 text-amber-800",
  signalee: "bg-purple-100 text-purple-800",
  classee: "bg-stone-100 text-stone-700",
};

function ModalAction({ alerte, onClose, onDone }) {
  const [commentaire, setCommentaire] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [mode, setMode] = useState("anif");

  async function valider() {
    if (!commentaire.trim()) { setErr("Commentaire obligatoire"); return; }
    setLoading(true);
    try {
      const rpc = mode === "anif" ? "signaler_anif" : "classer_alerte";
      const { data, error } = await supabase.rpc(rpc, {
        p_alerte_id: alerte.id,
        p_commentaire: commentaire,
      });
      if (error) throw error;
      if (!data.ok) { setErr("Erreur : " + data.raison); }
      else { onDone(); }
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-lg my-4">
        <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Traiter l'alerte AML</div>
          <button onClick={onClose} className="text-stone-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs space-y-1">
            <div><span className="text-stone-500">Type :</span> <strong>{TYPE_INFO[alerte.type]?.label || alerte.type}</strong></div>
            <div><span className="text-stone-500">Niveau :</span> <strong>{alerte.niveau}</strong></div>
            <div><span className="text-stone-500">Description :</span> {alerte.description}</div>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-2">Decision</label>
            <div className="space-y-2">
              <label className={"flex items-start gap-2 p-3 border rounded-sm cursor-pointer " + (mode === "anif" ? "border-purple-500 bg-purple-50" : "border-stone-200")}>
                <input type="radio" name="mode" value="anif" checked={mode === "anif"} onChange={(e) => setMode(e.target.value)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Signaler a l'ANIF</div>
                  <div className="text-xs text-stone-500">Transmission de l'alerte a l'Agence Nationale d'Investigation Financiere</div>
                </div>
              </label>
              <label className={"flex items-start gap-2 p-3 border rounded-sm cursor-pointer " + (mode === "classer" ? "border-stone-500 bg-stone-50" : "border-stone-200")}>
                <input type="radio" name="mode" value="classer" checked={mode === "classer"} onChange={(e) => setMode(e.target.value)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Classer sans suite</div>
                  <div className="text-xs text-stone-500">Aucune action requise — motif documente</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Commentaire obligatoire</label>
            <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={3}
              placeholder="Motivation, pieces examinees, decisions prises..."
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
          </div>

          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button onClick={valider} disabled={loading || !commentaire.trim()}
            className="text-xs px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {loading ? "Traitement..." : mode === "anif" ? "Signaler" : "Classer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AMLBanque({ compteId, nomBanque }) {
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState(null);

  async function charger() {
    if (!compteId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("alertes_aml")
        .select("*")
        .eq("compte_id", compteId)
        .order("date_creation", { ascending: false });
      if (error) throw error;
      setAlertes(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function analyser() {
    if (!compteId) return;
    setScanning(true);
    setMsg(null);
    try {
      const { data, error } = await supabase.rpc("detecter_alertes_aml", { p_compte_id: compteId });
      if (error) throw error;
      if (data.nb_alertes_crees > 0) {
        setMsg({ ok: true, text: data.nb_alertes_crees + " nouvelle(s) alerte(s) detectee(s)" });
      } else {
        setMsg({ ok: true, text: "Aucune nouvelle alerte — comportement conforme" });
      }
      await charger();
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    finally { setScanning(false); setTimeout(() => setMsg(null), 4000); }
  }

  async function apresTraitement() {
    setSelected(null);
    await charger();
    setMsg({ ok: true, text: "Alerte traitee" });
    setTimeout(() => setMsg(null), 3000);
  }

  useEffect(() => { charger(); }, [compteId]);

  const nbNouvelles = alertes.filter((a) => a.statut === "nouvelle").length;
  const nbCritiques = alertes.filter((a) => a.niveau === "critique" || a.niveau === "eleve").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-indigo-700" size={26} />
            <div className="text-2xl font-semibold text-stone-900">Conformite AML</div>
          </div>
          <div className="text-sm text-stone-500 mt-1">
            Detection des schemas suspects et signalement ANIF — {nomBanque || "Banque"}
          </div>
        </div>
        <button onClick={analyser} disabled={scanning}
          className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1.5">
          {scanning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {scanning ? "Analyse..." : "Analyser maintenant"}
        </button>
      </div>

      {/* PERIMETRE D'ANALYSE */}
      <div className="bg-stone-50 border border-stone-300 rounded-sm p-4 space-y-3">
        <div className="text-xs font-mono text-stone-500 uppercase">Perimetre d'analyse</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-3 space-y-1.5">
            <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Donnees analysees
            </div>
            <ul className="text-emerald-800 space-y-1 pl-3.5 list-disc">
              <li>Consultations de titres et cartes par vos agents</li>
              <li>Gages poses sur le registre central</li>
              <li>Signalements d'impayes transmis au Ministere</li>
              <li>Tentatives de double gage refusees</li>
              <li>Mouvements de votre portefeuille</li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 space-y-1.5">
            <div className="font-semibold text-amber-900 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span> Hors perimetre actuel
            </div>
            <ul className="text-amber-800 space-y-1 pl-3.5 list-disc">
              <li>Transactions hors plateforme (especes, informel)</li>
              <li>Operations d'autres institutions non partenaires</li>
              <li>Donnees fiscales (DGI) et douanieres</li>
              <li>Flux bancaires internes a votre etablissement</li>
              <li>Signalements en temps reel avec l'ANIF</li>
            </ul>
          </div>
        </div>

        <div className="text-[11px] text-stone-500 pt-2 border-t border-stone-200">
          <strong>Extension prevue (phase 3) :</strong> interconnexion ANIF, DGI, COBAC et registre national d'identite pour une surveillance a l'echelle nationale.
        </div>
      </div>

      {nbNouvelles > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-sm p-4 flex items-center gap-3">
          <AlertTriangle className="text-red-700" size={20} />
          <div className="text-sm text-red-900">
            <strong>{nbNouvelles} alerte{nbNouvelles > 1 ? "s" : ""}</strong> en attente de traitement — {nbCritiques} de niveau eleve ou critique
          </div>
        </div>
      )}

      {msg && (
        <div className={"text-xs p-2 rounded-sm border " + (msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
          {msg.text}
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="text-xs font-mono text-stone-500 uppercase">Total alertes</div>
          <div className="text-2xl font-semibold text-stone-900 mt-1">{alertes.length}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="text-xs font-mono text-stone-500 uppercase">Nouvelles</div>
          <div className="text-2xl font-semibold text-red-700 mt-1">{nbNouvelles}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="text-xs font-mono text-stone-500 uppercase">Signalees ANIF</div>
          <div className="text-2xl font-semibold text-purple-700 mt-1">{alertes.filter((a) => a.statut === "signalee").length}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="text-xs font-mono text-stone-500 uppercase">Classees</div>
          <div className="text-2xl font-semibold text-stone-700 mt-1">{alertes.filter((a) => a.statut === "classee").length}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm">
          <Loader2 className="animate-spin" size={16} /> Chargement...
        </div>
      ) : alertes.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <ShieldCheck size={32} className="text-emerald-500 mx-auto mb-3" />
          <div className="text-sm text-stone-700">Aucune alerte enregistree</div>
          <div className="text-xs text-stone-400 mt-1">Cliquez sur "Analyser maintenant" pour detecter les schemas suspects</div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Niveau</th>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-left py-3 px-4">Statut</th>
                <th className="text-right py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {alertes.map((a) => {
                const t = TYPE_INFO[a.type] || { label: a.type, couleur: "bg-stone-100 text-stone-700" };
                const Icone = t.icone || AlertTriangle;
                return (
                  <tr key={a.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 px-4 text-xs text-stone-500">
                      {new Date(a.date_creation).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="py-3 px-4">
                      <span className={"inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-sm font-medium " + t.couleur}>
                        <Icone size={11} /> {t.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={"text-xs px-2 py-0.5 rounded-sm font-medium " + (NIVEAU_INFO[a.niveau] || "bg-stone-100")}>
                        {a.niveau}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-700 max-w-md">{a.description}</td>
                    <td className="py-3 px-4">
                      <span className={"text-xs px-2 py-0.5 rounded-sm font-medium " + (STATUT_INFO[a.statut] || "bg-stone-100")}>
                        {a.statut}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {(a.statut === "nouvelle" || a.statut === "en_analyse") && (
                        <button onClick={() => setSelected(a)}
                          className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm">
                          Traiter
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-200 rounded-sm p-4 text-xs text-indigo-900">
        <strong>Conformite reglementaire :</strong> les alertes ne sont pas des accusations. Chaque detection doit etre examinee par un agent habilite avant tout signalement a l'ANIF. Le signalement lui-meme est journalise et irreversible.
      </div>

      {selected && <ModalAction alerte={selected} onClose={() => setSelected(null)} onDone={apresTraitement} />}
    </div>
  );
}

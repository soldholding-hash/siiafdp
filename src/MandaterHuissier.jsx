import { useState, useEffect } from "react";
import {
  Search, UserCheck, X, Upload, Loader2, Check, AlertTriangle, FileText
} from "lucide-react";
import {
  listerHuissiersActifs,
  chercherHuissierParCode,
  creerMandat,
  uploaderPieceBanque,
} from "./lib/mandats";

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n || 0) + " FCFA";

export default function MandaterHuissier({
  parcelle, banqueCompteId, banqueNom, onClose, onDone
}) {
  const [mode, setMode] = useState("liste"); // "liste" | "code"
  const [huissiers, setHuissiers] = useState([]);
  const [huissierChoisi, setHuissierChoisi] = useState(null);
  const [codeRecherche, setCodeRecherche] = useState("");
  const [rechercheLoading, setRechercheLoading] = useState(false);
  const [errRecherche, setErrRecherche] = useState(null);

  const [form, setForm] = useState({
    debiteur_nom: parcelle.proprietaire || "",
    debiteur_nin: "",
    montant_du: "",
    motif_dette: "",
    reference_contrat: "",
    date_impaye_debut: "",
  });

  const [fichiers, setFichiers] = useState({
    contrat: null,
    echeancier: null,
    mise_demeure: null,
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    listerHuissiersActifs().then(setHuissiers);
  }, []);

  async function rechercherParCode() {
    if (!codeRecherche.trim()) return;
    setRechercheLoading(true);
    setErrRecherche(null);
    const h = await chercherHuissierParCode(codeRecherche.trim());
    setRechercheLoading(false);
    if (!h) {
      setErrRecherche("Aucun huissier trouvé avec ce code.");
      return;
    }
    setHuissierChoisi(h);
  }

  async function valider() {
    if (!huissierChoisi) { setErr("Veuillez sélectionner un huissier"); return; }
    if (!form.debiteur_nom.trim()) { setErr("Nom du débiteur obligatoire"); return; }
    if (!form.montant_du) { setErr("Montant dû obligatoire"); return; }
    setLoading(true);
    try {
      // Upload des pièces
      let contrat_url = null;
      let echeancier_url = null;
      let mise_demeure_url = null;

      if (fichiers.contrat) {
        const up = await uploaderPieceBanque(fichiers.contrat, `mandats/${banqueCompteId}/contrats`);
        if (up.ok) contrat_url = up.url;
      }
      if (fichiers.echeancier) {
        const up = await uploaderPieceBanque(fichiers.echeancier, `mandats/${banqueCompteId}/echeanciers`);
        if (up.ok) echeancier_url = up.url;
      }
      if (fichiers.mise_demeure) {
        const up = await uploaderPieceBanque(fichiers.mise_demeure, `mandats/${banqueCompteId}/mises_demeure`);
        if (up.ok) mise_demeure_url = up.url;
      }

      const res = await creerMandat({
        banque_compte_id: banqueCompteId,
        banque_nom: banqueNom,
        huissier_id: huissierChoisi.id,
        huissier_code_siiafdp: huissierChoisi.code_siiafdp,
        parcelle_id: parcelle.id,
        debiteur_nom: form.debiteur_nom.trim(),
        debiteur_nin: form.debiteur_nin.trim() || null,
        montant_du: parseFloat(form.montant_du),
        motif_dette: form.motif_dette.trim() || null,
        reference_contrat: form.reference_contrat.trim() || null,
        date_impaye_debut: form.date_impaye_debut || null,
        contrat_url,
        echeancier_url,
        mise_demeure_url,
      });

      setLoading(false);
      if (!res.ok) { setErr(res.raison); return; }
      onDone(res.mandat);
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-2xl my-4">
        {/* En-tête */}
        <div className="bg-indigo-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck size={18} />
            <div className="text-sm font-semibold">Mandater un huissier de justice</div>
          </div>
          <button onClick={onClose} className="text-indigo-200 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Parcelle */}
          <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs">
            <div className="text-stone-500">Parcelle concernée</div>
            <div className="font-mono font-medium text-stone-800 mt-0.5">
              {parcelle.id} — {parcelle.proprietaire || "Non affecté"}
            </div>
          </div>

          {/* ÉTAPE 1 : Choisir l'huissier */}
          {!huissierChoisi && (
            <>
              <div>
                <div className="text-sm font-semibold text-stone-800 mb-3">
                  1. Choisir un huissier de justice
                </div>

                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setMode("liste")}
                    className={"text-xs px-3 py-1.5 rounded-sm border " + (mode === "liste" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-stone-600 border-stone-300")}
                  >
                    Liste des huissiers
                  </button>
                  <button
                    onClick={() => setMode("code")}
                    className={"text-xs px-3 py-1.5 rounded-sm border " + (mode === "code" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-stone-600 border-stone-300")}
                  >
                    Code SIIAFDP
                  </button>
                </div>

                {mode === "liste" && (
                  <div className="border border-stone-200 rounded-sm max-h-60 overflow-y-auto">
                    {huissiers.length === 0 ? (
                      <div className="p-4 text-xs text-stone-500 text-center">
                        Aucun huissier actif sur la plateforme
                      </div>
                    ) : (
                      huissiers.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => setHuissierChoisi(h)}
                          className="w-full text-left px-4 py-3 border-b border-stone-100 hover:bg-indigo-50"
                        >
                          <div className="text-sm font-medium text-stone-800">{h.nom_complet}</div>
                          <div className="text-xs text-stone-500 font-mono mt-0.5">
                            {h.code_siiafdp} • {h.numero_etude} • {h.juridiction_rattachement}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {mode === "code" && (
                  <div>
                    <div className="flex gap-2">
                      <input
                        value={codeRecherche}
                        onChange={(e) => setCodeRecherche(e.target.value)}
                        placeholder="Ex: SIIAFDP-HUI-2026-0001"
                        className="flex-1 border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono"
                      />
                      <button
                        onClick={rechercherParCode}
                        disabled={rechercheLoading}
                        className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-sm inline-flex items-center gap-1"
                      >
                        {rechercheLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                        Rechercher
                      </button>
                    </div>
                    {errRecherche && (
                      <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2 mt-2">
                        {errRecherche}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Fiche huissier sélectionné */}
          {huissierChoisi && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <UserCheck className="text-emerald-700 mt-0.5" size={20} />
                  <div>
                    <div className="text-sm font-semibold text-emerald-900">{huissierChoisi.nom_complet}</div>
                    <div className="text-xs text-emerald-800 mt-1 font-mono">
                      {huissierChoisi.code_siiafdp}
                    </div>
                    <div className="text-xs text-emerald-700 mt-1">
                      Étude {huissierChoisi.numero_etude} • {huissierChoisi.juridiction_rattachement}
                    </div>
                    <div className="text-xs text-emerald-700">
                      Agrément {huissierChoisi.numero_agrement} • Habilitation {huissierChoisi.habilitation_sigef}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setHuissierChoisi(null)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 underline"
                >
                  Changer
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : Détails du dossier */}
          {huissierChoisi && (
            <>
              <div>
                <div className="text-sm font-semibold text-stone-800 mb-3">
                  2. Détails du dossier
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono text-stone-500 block mb-1">Débiteur</label>
                    <input value={form.debiteur_nom}
                      onChange={(e) => setForm({ ...form, debiteur_nom: e.target.value })}
                      className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-stone-500 block mb-1">NIN (optionnel)</label>
                    <input value={form.debiteur_nin}
                      onChange={(e) => setForm({ ...form, debiteur_nin: e.target.value })}
                      placeholder="CG1980..."
                      className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs font-mono text-stone-500 block mb-1">Montant dû (FCFA)</label>
                    <input type="number" value={form.montant_du}
                      onChange={(e) => setForm({ ...form, montant_du: e.target.value })}
                      placeholder="Ex: 1800000"
                      className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-stone-500 block mb-1">Référence contrat</label>
                    <input value={form.reference_contrat}
                      onChange={(e) => setForm({ ...form, reference_contrat: e.target.value })}
                      placeholder="Ex: LCB/DEX/0131"
                      className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs font-mono text-stone-500 block mb-1">Date début impayé</label>
                    <input type="date" value={form.date_impaye_debut}
                      onChange={(e) => setForm({ ...form, date_impaye_debut: e.target.value })}
                      className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-mono text-stone-500 block mb-1">Motif de la dette</label>
                    <input value={form.motif_dette}
                      onChange={(e) => setForm({ ...form, motif_dette: e.target.value })}
                      placeholder="Ex: Impayé Sécuri-Gage 6 mensualités"
                      className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>

              {/* ÉTAPE 3 : Pièces jointes */}
              <div>
                <div className="text-sm font-semibold text-stone-800 mb-3">
                  3. Pièces jointes au mandat
                </div>
                <div className="space-y-2">
                  {[
                    { key: "contrat", label: "Contrat de prêt" },
                    { key: "echeancier", label: "Échéancier" },
                    { key: "mise_demeure", label: "Mise en demeure préalable" },
                  ].map((p) => (
                    <div key={p.key} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-sm p-3">
                      <div className="text-xs">
                        <div className="font-medium text-stone-700">{p.label}</div>
                        {fichiers[p.key] && (
                          <div className="text-emerald-700 mt-0.5 flex items-center gap-1">
                            <Check size={11} /> {fichiers[p.key].name}
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        onChange={(e) => setFichiers({ ...fichiers, [p.key]: e.target.files?.[0] || null })}
                        className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-sm file:border-0 file:text-xs file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {err && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2 flex items-center gap-2">
                  <AlertTriangle size={14} /> {err}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pied */}
        {huissierChoisi && (
          <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
            <button onClick={onClose} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">
              Annuler
            </button>
            <button
              onClick={valider}
              disabled={loading}
              className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-sm inline-flex items-center gap-1"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              {loading ? "Transmission..." : "Transmettre à l'huissier"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

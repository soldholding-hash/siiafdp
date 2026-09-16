import { useState } from "react";
import { CheckCircle2, Loader2, AlertCircle, ShieldCheck, Gavel } from "lucide-react";
import { validerParcelleMinistere } from "./lib/ministere";
import FicheParcelle from "./FicheParcelle";
import { telechargerPlanBornage } from "./lib/pdfPlanBornage";

export default function ValidationMinistere({ parcelles, onRafraichir }) {
  const [selected, setSelected] = useState(null);
  const [validation, setValidation] = useState(false);
  const [msg, setMsg] = useState(null);

  const enAttente = (parcelles || []).filter((p) => {
    const data = p.data || p;
    return data.statut === "en_attente_ministre";
  });

  async function approuver() {
    const id = selected.id || selected.data?.id;
    setValidation(true);
    try {
      const res = await validerParcelleMinistere(id);
      if (!res.ok) {
        setMsg({ ok: false, text: "Erreur : " + res.raison });
      } else {
        setMsg({ ok: true, text: "Titre approuvé définitivement !" });
        setTimeout(() => {
          setSelected(null);
          setMsg(null);
          if (onRafraichir) onRafraichir();
        }, 1800);
      }
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setValidation(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Gavel className="text-purple-700" size={26} />
          <div className="text-2xl font-semibold text-stone-900">Validation Ministère</div>
        </div>
        <div className="text-sm text-stone-500 mt-1">
          Approuvez les titres fonciers validés techniquement par la Conservation
        </div>
      </div>

      {enAttente.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-sm p-4 flex items-center gap-3">
          <AlertCircle className="text-purple-700" size={20} />
          <div className="text-sm text-purple-900">
            <strong>{enAttente.length} titre{enAttente.length > 1 ? "s" : ""}</strong> en attente d'approbation ministérielle
          </div>
        </div>
      )}

      {enAttente.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <ShieldCheck size={32} className="text-emerald-500 mx-auto mb-3" />
          <div className="text-sm text-stone-700">Aucun titre en attente d'approbation</div>
          <div className="text-xs text-stone-400 mt-1">Tous les dossiers sont traités</div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4">Parcelle</th>
                <th className="text-left py-3 px-4">N° Titre</th>
                <th className="text-left py-3 px-4">Propriétaire</th>
                <th className="text-left py-3 px-4">Arrondissement</th>
                <th className="text-left py-3 px-4">Surface</th>
                <th className="text-right py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {enAttente.map((p) => {
                const data = p.data || p;
                return (
                  <tr key={data.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono text-xs font-medium">{data.id}</td>
                    <td className="py-3 px-4 font-mono text-xs text-purple-700 font-semibold">{data.numero_titre || "—"}</td>
                    <td className="py-3 px-4 text-stone-700">{data.proprietaire || "—"}</td>
                    <td className="py-3 px-4 text-stone-700">{data.arrondissement || "—"}</td>
                    <td className="py-3 px-4 font-mono text-stone-700">
                      {Math.round(data.surface_m2 || data.superficie || 0).toLocaleString("fr-FR")} m²
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => { setSelected(p); setMsg(null); }}
                        className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-sm">
                        Approuver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-sm w-full max-w-2xl my-4">
            <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Approbation du titre {selected.numero_titre || selected.data?.numero_titre}</div>
                <div className="text-xs text-stone-400 font-mono">{selected.id || selected.data?.id}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-stone-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-sm p-4 space-y-1 text-sm">
                <div><span className="text-stone-500">Propriétaire :</span> <strong>{selected.proprietaire || selected.data?.proprietaire || "—"}</strong></div>
                <div><span className="text-stone-500">Arrondissement :</span> <strong>{selected.arrondissement || selected.data?.arrondissement || "—"}</strong></div>
                <div><span className="text-stone-500">Quartier :</span> <strong>{selected.quartier || selected.data?.quartier || "—"}</strong></div>
                <div><span className="text-stone-500">Surface :</span> <strong>{Math.round(selected.surface_m2 || selected.data?.surface_m2 || 0).toLocaleString("fr-FR")} m²</strong></div>
                <div><span className="text-stone-500">Bornes :</span> <strong>{(selected.polygone || selected.data?.polygone)?.length || 0}</strong></div>
              </div>

              <div className="text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-sm p-3">
                <strong>En approuvant :</strong> le titre devient définitif, la parcelle passe en statut "titre" et peut être imprimée avec QR code + signature.
              </div>

              {msg && (
                <div className={"text-xs p-2 rounded-sm border " + (msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
                  {msg.text}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
              <button onClick={() => setSelected(null)} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
              <button onClick={approuver} disabled={validation}
                className="text-xs px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1">
                {validation ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {validation ? "Approbation..." : "Approuver définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

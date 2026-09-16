import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, User, AlertCircle, FileText } from "lucide-react";
import NouveauProprietaire from "./NouveauProprietaire";
import { chargerProprietaires, validerParcelle } from "./lib/proprietaires";

export default function ParcellesEnAttente({ parcelles, onRafraichir }) {
  const [proprietaires, setProprietaires] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proprioId, setProprioId] = useState("");
  const [nouveau, setNouveau] = useState(false);
  const [msg, setMsg] = useState(null);
  const [validation, setValidation] = useState(false);

  async function charger() {
    setLoading(true);
    try {
      setProprietaires(await chargerProprietaires());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { charger(); }, []);

  const enAttente = (parcelles || []).filter((p) => {
    const data = p.data || p;
    return data.statut === "en_attente" && (data.polygone?.length >= 3);
  });

  async function valider() {
    if (!proprioId) { setMsg({ ok: false, text: "Sélectionnez un propriétaire" }); return; }
    setValidation(true);
    try {
      const res = await validerParcelle(selected.id || selected.data?.id, proprioId);
      if (!res.ok) {
        setMsg({ ok: false, text: "Erreur : " + res.raison });
      } else {
        setMsg({ ok: true, text: "Parcelle validée ! Titre : " + res.numero_titre });
        setTimeout(() => {
          setSelected(null);
          setProprioId("");
          setMsg(null);
          if (onRafraichir) onRafraichir();
        }, 2000);
      }
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setValidation(false);
    }
  }

  async function apresCreationProprio(id) {
    setNouveau(false);
    await charger();
    setProprioId(id);
    setMsg({ ok: true, text: "Propriétaire créé. Vous pouvez valider." });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <FileText className="text-emerald-700" size={26} />
          <div className="text-2xl font-semibold text-stone-900">Parcelles en attente de validation</div>
        </div>
        <div className="text-sm text-stone-500 mt-1">
          Validez techniquement les parcelles bornées par la brigade topographique
        </div>
      </div>

      {enAttente.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 flex items-center gap-3">
          <AlertCircle className="text-amber-700" size={20} />
          <div className="text-sm text-amber-900">
            <strong>{enAttente.length} parcelle{enAttente.length > 1 ? "s" : ""}</strong> en attente de validation technique
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm">
          <Loader2 className="animate-spin" size={16} /> Chargement...
        </div>
      ) : enAttente.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
          <div className="text-sm text-stone-700">Toutes les parcelles sont validées</div>
          <div className="text-xs text-stone-400 mt-1">Aucune action en attente</div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4">Référence</th>
                <th className="text-left py-3 px-4">Arrondissement</th>
                <th className="text-left py-3 px-4">Quartier</th>
                <th className="text-left py-3 px-4">Surface</th>
                <th className="text-left py-3 px-4">Bornes</th>
                <th className="text-right py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {enAttente.map((p) => {
                const data = p.data || p;
                return (
                  <tr key={data.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono text-xs font-medium text-stone-800">{data.id}</td>
                    <td className="py-3 px-4 text-stone-700">{data.arrondissement || "—"}</td>
                    <td className="py-3 px-4 text-stone-700">{data.quartier || "—"}</td>
                    <td className="py-3 px-4 font-mono text-stone-700">
                      {Math.round(data.surface_m2 || data.superficie || 0).toLocaleString("fr-FR")} m²
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-600">{data.polygone?.length || 0}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => { setSelected(p); setProprioId(""); setMsg(null); }}
                        className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm">
                        Valider
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de validation */}
      {selected && !nouveau && (
        <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-sm w-full max-w-lg my-4">
            <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Valider la parcelle {selected.id || selected.data?.id}</div>
              <button onClick={() => setSelected(null)} className="text-stone-400 hover:text-white">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs space-y-1">
                <div><span className="text-stone-500">Arrondissement :</span> <strong>{selected.arrondissement || selected.data?.arrondissement || "—"}</strong></div>
                <div><span className="text-stone-500">Quartier :</span> <strong>{selected.quartier || selected.data?.quartier || "—"}</strong></div>
                <div><span className="text-stone-500">Surface :</span> <strong>{Math.round(selected.surface_m2 || selected.data?.surface_m2 || 0).toLocaleString("fr-FR")} m²</strong></div>
                <div><span className="text-stone-500">Bornes :</span> <strong>{(selected.polygone || selected.data?.polygone)?.length || 0}</strong></div>
              </div>

              <div>
                <label className="text-xs font-mono text-stone-500 block mb-2">Propriétaire</label>
                <div className="space-y-2">
                  <select value={proprioId} onChange={(e) => setProprioId(e.target.value)}
                    className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm">
                    <option value="">— Sélectionner un propriétaire existant —</option>
                    {proprietaires.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.nom} {pr.prenom || ""} {pr.nin ? "(" + pr.nin + ")" : pr.rccm ? "(" + pr.rccm + ")" : ""}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => setNouveau(true)}
                    className="w-full flex items-center justify-center gap-2 text-xs py-2 border-2 border-dashed border-purple-300 text-purple-700 hover:bg-purple-50 rounded-sm">
                    <User size={14} /> Créer un nouveau propriétaire
                  </button>
                </div>
              </div>

              {msg && (
                <div className={"text-xs p-2 rounded-sm border " + (msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
                  {msg.text}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
              <button onClick={() => setSelected(null)} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
              <button onClick={valider} disabled={validation || !proprioId}
                className="text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1">
                {validation ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {validation ? "Validation..." : "Valider et générer le titre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {nouveau && <NouveauProprietaire onClose={() => setNouveau(false)} onCree={apresCreationProprio} />}
    </div>
  );
}

import { useState } from "react";
import { X, User, Building2, Check } from "lucide-react";
import { creerProprietaire } from "./lib/proprietaires";

export default function NouveauProprietaire({ onClose, onCree }) {
  const [type, setType] = useState("physique");
  const [form, setForm] = useState({
    nom: "", prenom: "", nin: "", rccm: "", date_naissance: "",
    lieu_naissance: "", profession: "", situation_matrimoniale: "",
    adresse: "", telephone: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function valider() {
    if (!form.nom) { setErr("Le nom est obligatoire"); return; }
    if (type === "physique" && !form.nin) { setErr("Le NIN est obligatoire pour une personne physique"); return; }
    if (type === "morale" && !form.rccm) { setErr("Le RCCM est obligatoire pour une personne morale"); return; }
    setLoading(true);
    try {
      const res = await creerProprietaire({ type, ...form });
      if (!res.ok) { setErr("Erreur : " + res.raison); }
      else { onCree(res.proprietaire_id); }
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-2xl my-4">
        <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Nouveau propriétaire</div>
          <button onClick={onClose} className="text-stone-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Type */}
          <div className="flex gap-2">
            <button onClick={() => setType("physique")}
              className={"flex-1 flex items-center justify-center gap-2 py-3 border-2 rounded-sm text-sm " + (type === "physique" ? "bg-purple-50 border-purple-500 text-purple-800 font-semibold" : "border-stone-300 text-stone-600")}>
              <User size={16} /> Personne physique
            </button>
            <button onClick={() => setType("morale")}
              className={"flex-1 flex items-center justify-center gap-2 py-3 border-2 rounded-sm text-sm " + (type === "morale" ? "bg-purple-50 border-purple-500 text-purple-800 font-semibold" : "border-stone-300 text-stone-600")}>
              <Building2 size={16} /> Personne morale
            </button>
          </div>

          {/* Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">{type === "morale" ? "Raison sociale *" : "Nom *"}</label>
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" autoFocus />
            </div>
            {type === "physique" && (
              <div>
                <label className="text-xs font-mono text-stone-500 block mb-1">Prénom</label>
                <input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
              </div>
            )}
          </div>

          {/* NIN ou RCCM */}
          {type === "physique" ? (
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">NIN * (ex : CG197804120017)</label>
              <input value={form.nin} onChange={(e) => setForm({ ...form, nin: e.target.value.toUpperCase() })}
                placeholder="CG197804120017"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
            </div>
          ) : (
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">RCCM * (ex : CG-BZV-01-2020-B12-00456)</label>
              <input value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value.toUpperCase() })}
                placeholder="CG-BZV-01-2020-B12-00456"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
            </div>
          )}

          {type === "physique" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-stone-500 block mb-1">Date de naissance</label>
                  <input type="date" value={form.date_naissance} onChange={(e) => setForm({ ...form, date_naissance: e.target.value })}
                    className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-mono text-stone-500 block mb-1">Lieu de naissance</label>
                  <input value={form.lieu_naissance} onChange={(e) => setForm({ ...form, lieu_naissance: e.target.value })}
                    className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-stone-500 block mb-1">Profession</label>
                  <input value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })}
                    className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-mono text-stone-500 block mb-1">Situation matrimoniale</label>
                  <select value={form.situation_matrimoniale} onChange={(e) => setForm({ ...form, situation_matrimoniale: e.target.value })}
                    className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm">
                    <option value="">—</option>
                    <option value="Célibataire">Célibataire</option>
                    <option value="Marié(e)">Marié(e)</option>
                    <option value="Divorcé(e)">Divorcé(e)</option>
                    <option value="Veuf(ve)">Veuf(ve)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Adresse</label>
              <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Téléphone</label>
              <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
            </div>
          </div>

          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button onClick={valider} disabled={loading}
            className="text-xs px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1">
            <Check size={14} /> {loading ? "Création..." : "Créer le propriétaire"}
          </button>
        </div>
      </div>
    </div>
  );
}

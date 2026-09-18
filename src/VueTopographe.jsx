import React, { useState, useEffect } from "react";
import { supabase } from "./lib/db"; 
import { validerLeveTopographe } from "./lib/demandes";
import { Loader2, Inbox, MapPin, CheckCircle } from "lucide-react";

export default function VueTopographe({ currentUser }) {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rapportUrl, setRapportUrl] = useState("");
  const [observations, setObservations] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [msg, setMsg] = useState(null);

  async function charger() {
    setLoading(true);
    const { data, error } = await supabase
      .from("demandes")
      .select("*")
      .eq("statut", "transmis_topographe")
      .order("updated_at", { ascending: false });

    if (!error) setDemandes(data || []);
    setLoading(false);
  }

  useEffect(() => { charger(); }, []);

  async function valider(e) {
    e.preventDefault();
    if (!selected) return;
    setEnCours(true);
    const res = await validerLeveTopographe(
      selected.id,
      currentUser?.nom || "Topographe",
      rapportUrl,
      observations
    );
    setEnCours(false);

    if (res.ok) {
      setMsg({ ok: true, text: "Levé validé et transmis à la conservation." });
      setSelected(null); setRapportUrl(""); setObservations("");
      await charger();
    } else {
      setMsg({ ok: false, text: "Erreur : " + res.raison });
    }
    setTimeout(() => setMsg(null), 4000);
  }

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">Brigade Topographique</h2>
        <button onClick={charger} className="text-xs px-3 py-1.5 border rounded-sm hover:bg-stone-50">
          Actualiser
        </button>
      </div>

      {msg && (
        <div className={"p-3 rounded-sm text-sm " + (msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800")}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm p-6">
          <Loader2 className="animate-spin" size={16} /> Chargement des dossiers...
        </div>
      ) : demandes.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <Inbox size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">Aucun dossier en attente de levé topographique</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {demandes.map((d) => (
            <div key={d.id} className="bg-white border border-stone-200 rounded-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm font-semibold text-stone-900">{d.reference}</div>
                <span className="text-xs px-2 py-0.5 rounded-sm font-medium bg-blue-100 text-blue-800">
                  En attente de levé
                </span>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Demandeur</span>
                  <span className="font-semibold">{d.demandeur_prenom} {d.demandeur_nom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Type</span>
                  <span>{d.type_demande}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Localisation</span>
                  <span>{d.commune || "Non spécifiée"}</span>
                </div>
              </div>
              <button
                onClick={() => setSelected(d)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm inline-flex items-center justify-center gap-1.5 text-xs font-medium"
              >
                <MapPin size={12} /> Effectuer le levé
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm p-5 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-stone-900">Levé topographique : {selected.reference}</h3>
            <form onSubmit={valider} className="space-y-3">
              <div>
                <label className="text-xs text-stone-500 block mb-1">Lien du rapport / plan de bornage (URL)</label>
                <input
                  type="text"
                  value={rapportUrl}
                  onChange={(e) => setRapportUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-stone-200 rounded-sm px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Observations techniques</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={3}
                  className="w-full border border-stone-200 rounded-sm px-3 py-2 text-sm"
                  placeholder="Superficie, coordonnées, remarques..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setSelected(null)} className="px-3 py-2 text-xs border rounded-sm">
                  Annuler
                </button>
                <button type="submit" disabled={enCours} className="px-3 py-2 text-xs bg-emerald-600 text-white rounded-sm inline-flex items-center gap-1.5">
                  {enCours ? <Loader2 className="animate-spin" size={12} /> : <CheckCircle size={12} />}
                  Valider le levé
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { supabase } from "./lib/db";
import { validerLeveTopographe } from "./lib/demandes";
import { Loader2, Inbox, MapPin, CheckCircle, Crosshair } from "lucide-react";

export default function VueTopographe({ currentUser, onOuvrirModeTerrain }) {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [msg, setMsg] = useState(null);

  // Champs du levé topographique
  const [coords, setCoords] = useState({ lat: "", lng: "" });
  const [superficie, setSuperficie] = useState("");
  const [observations, setObservations] = useState("");
  const [rapportUrl, setRapportUrl] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsErr, setGpsErr] = useState(null);

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

  function capturerPosition() {
    setGpsErr(null);
    if (!navigator.geolocation) {
      setGpsErr("La géolocalisation n'est pas supportée par cet appareil.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        });
        setGpsLoading(false);
      },
      (err) => {
        setGpsErr("Impossible d'obtenir la position : " + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function ouvrirLeve(d) {
    setSelected(d);
    setCoords({ lat: "", lng: "" });
    setSuperficie("");
    setObservations("");
    setRapportUrl("");
    setGpsErr(null);
  }

  async function valider(e) {
    e.preventDefault();
    if (!selected) return;
    setEnCours(true);

    // Construire les observations complètes
    let obsFinales = "";
    if (coords.lat && coords.lng) {
      obsFinales += "Coordonnées GPS : " + coords.lat + ", " + coords.lng + "\n";
    }
    if (superficie) {
      obsFinales += "Superficie : " + superficie + " m²\n";
    }
    obsFinales += observations || "";

    const res = await validerLeveTopographe(
      selected.id,
      currentUser?.nom || "Topographe",
      rapportUrl || ("levé-" + selected.reference + "-" + new Date().toISOString().slice(0, 10)),
      obsFinales
    );
    setEnCours(false);

    if (res.ok) {
      setMsg({ ok: true, text: "Levé validé et transmis à la conservation." });
      setSelected(null);
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
          <Loader2 className="animate-spin" size={16} /> Chargement...
        </div>
      ) : demandes.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <Inbox size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">Aucun dossier en attente de levé</div>
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
                onClick={() => onOuvrirModeTerrain ? onOuvrirModeTerrain(d) : ouvrirLeve(d)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm inline-flex items-center justify-center gap-1.5 text-xs font-medium"
              >
                <MapPin size={12} /> Effectuer le levé
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-sm p-5 w-full max-w-lg space-y-4 my-4">
            <div>
              <h3 className="font-semibold text-stone-900">Levé topographique</h3>
              <div className="text-xs text-stone-500 font-mono mt-0.5">{selected.reference} — {selected.demandeur_prenom} {selected.demandeur_nom}</div>
            </div>

            <form onSubmit={valider} className="space-y-3">
              {/* GPS */}
              <div className="border border-stone-200 rounded-sm p-3 space-y-2 bg-stone-50">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-stone-700">Position GPS</div>
                  <button type="button" onClick={capturerPosition} disabled={gpsLoading}
                    className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm inline-flex items-center gap-1">
                    {gpsLoading ? <Loader2 className="animate-spin" size={12} /> : <Crosshair size={12} />}
                    {gpsLoading ? "Localisation..." : "Capturer ma position"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={coords.lat} onChange={(e) => setCoords({ ...coords, lat: e.target.value })}
                    placeholder="Latitude" className="border border-stone-300 rounded-sm px-2 py-1.5 text-xs font-mono" />
                  <input type="text" value={coords.lng} onChange={(e) => setCoords({ ...coords, lng: e.target.value })}
                    placeholder="Longitude" className="border border-stone-300 rounded-sm px-2 py-1.5 text-xs font-mono" />
                </div>
                {gpsErr && <div className="text-xs text-red-700">{gpsErr}</div>}
              </div>

              {/* Superficie */}
              <div>
                <label className="text-xs text-stone-500 block mb-1">Superficie (m²)</label>
                <input type="number" value={superficie} onChange={(e) => setSuperficie(e.target.value)}
                  placeholder="Ex: 500" className="w-full border border-stone-200 rounded-sm px-3 py-2 text-sm" />
              </div>

              {/* Observations */}
              <div>
                <label className="text-xs text-stone-500 block mb-1">Observations techniques</label>
                <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3}
                  placeholder="Bornes plantées, remarques, voisinage..."
                  className="w-full border border-stone-200 rounded-sm px-3 py-2 text-sm" />
              </div>

              {/* Rapport URL (optionnel) */}
              <div>
                <label className="text-xs text-stone-500 block mb-1">Lien du plan de bornage (optionnel)</label>
                <input type="text" value={rapportUrl} onChange={(e) => setRapportUrl(e.target.value)}
                  placeholder="https://..." className="w-full border border-stone-200 rounded-sm px-3 py-2 text-sm" />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-stone-200">
                <button type="button" onClick={() => setSelected(null)} className="px-3 py-2 text-xs border rounded-sm">
                  Annuler
                </button>
                <button type="submit" disabled={enCours}
                  className="px-3 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm inline-flex items-center gap-1.5">
                  {enCours ? <Loader2 className="animate-spin" size={12} /> : <CheckCircle size={12} />}
                  Valider et transmettre à la conservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

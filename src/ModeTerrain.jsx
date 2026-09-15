import { useEffect, useRef, useState } from "react";
import { Navigation, MapPin, Play, Square, RotateCcw, Check, Save } from "lucide-react";

function calculerSurfaceM2(points) {
  if (points.length < 3) return 0;
  const R = 6371000;
  const lat0 = (points.reduce((s, p) => s + p[0], 0) / points.length) * Math.PI / 180;
  const pts = points.map((p) => [
    ((p[1] - points[0][1]) * Math.PI / 180) * R * Math.cos(lat0),
    ((p[0] - points[0][0]) * Math.PI / 180) * R,
  ]);
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return Math.abs(area / 2);
}

export default function ModeTerrain({ onEnregistrer }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerMe = useRef(null);
  const layersRef = useRef([]);
  const watchRef = useRef(null);

  const [position, setPosition] = useState(null);
  const [precision, setPrecision] = useState(null);
  const [bornes, setBornes] = useState([]);
  const [suivi, setSuivi] = useState(false);
  const [erreur, setErreur] = useState(null);

  // Init carte
  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current).setView([-4.2634, 15.2429], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 21,
    }).addTo(map);

    mapInstance.current = map;
    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Démarrer le suivi GPS
  function demarrer() {
    if (!navigator.geolocation) {
      setErreur("GPS non disponible sur cet appareil");
      return;
    }
    setErreur(null);
    setSuivi(true);

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = [pos.coords.latitude, pos.coords.longitude];
        setPosition(p);
        setPrecision(pos.coords.accuracy);

        const L = window.L;
        if (!mapInstance.current) return;

        // Point bleu qui suit le topographe
        if (markerMe.current) {
          markerMe.current.setLatLng(p);
        } else {
          markerMe.current = L.circleMarker(p, {
            radius: 8,
            color: "#ffffff",
            weight: 3,
            fillColor: "#2563eb",
            fillOpacity: 1,
          }).addTo(mapInstance.current);
          markerMe.current.bindTooltip("Vous êtes ici", { permanent: false });
        }

        // Centrer la carte sur la position
        mapInstance.current.setView(p, 18);
      },
      (err) => {
        setErreur("Erreur GPS : " + err.message);
        setSuivi(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  }

  function arreter() {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setSuivi(false);
  }

  useEffect(() => {
    return () => { if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  // Enregistrer une borne à la position actuelle
  function enregistrerBorne() {
    if (!position) {
      alert("Attendez d'avoir une position GPS valide");
      return;
    }
    const nouvelle = [...bornes, position];
    setBornes(nouvelle);

    const L = window.L;
    L.circleMarker(position, {
      radius: 6, color: "#7c3aed", weight: 3,
      fillColor: "#a78bfa", fillOpacity: 1,
    }).bindTooltip(`Borne ${nouvelle.length}`).addTo(mapInstance.current);

    // Redessiner le polygone
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];
    if (nouvelle.length >= 3) {
      const poly = L.polygon(nouvelle, {
        color: "#7c3aed", weight: 3, fillColor: "#a78bfa", fillOpacity: 0.3,
      }).addTo(mapInstance.current);
      layersRef.current.push(poly);
    }
  }

  function annulerDerniere() {
    if (bornes.length === 0) return;
    if (!confirm("Annuler la dernière borne ?")) return;
    setBornes(bornes.slice(0, -1));
    window.location.reload(); // simple : on recharge pour nettoyer les marqueurs
  }

  function effacerTout() {
    if (!confirm("Effacer toutes les bornes ?")) return;
    setBornes([]);
    window.location.reload();
  }

  const surface = calculerSurfaceM2(bornes);
  const precM = precision ? Math.round(precision) : null;

  return (
    <div className="flex flex-col h-screen bg-stone-900">
      {/* Bandeau haut */}
      <div className="bg-stone-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="text-purple-400" size={18} />
          <div className="text-sm font-semibold">Mode Terrain</div>
        </div>
        <div className="text-xs text-stone-400">
          {position ? `${position[0].toFixed(6)}, ${position[1].toFixed(6)}` : "En attente GPS…"}
        </div>
      </div>

      {/* Info précision */}
      {position && (
        <div className="bg-stone-800 text-xs text-stone-300 px-4 py-2 flex justify-between">
          <span>Précision : {precM !== null ? `± ${precM} m` : "—"}</span>
          <span>{suivi ? "🟢 Suivi actif" : "🔴 Suivi arrêté"}</span>
        </div>
      )}

      {/* Erreur */}
      {erreur && (
        <div className="bg-red-900 text-red-100 text-xs px-4 py-2">{erreur}</div>
      )}

      {/* Carte plein écran */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="absolute inset-0" style={{ zIndex: 0 }}></div>

        {/* Compteur overlay */}
        <div className="absolute top-3 left-3 bg-white rounded-sm shadow-md px-3 py-2 z-[400] text-xs">
          <div className="font-semibold text-stone-800">{bornes.length} borne{bornes.length > 1 ? "s" : ""}</div>
          {bornes.length >= 3 && (
            <div className="text-purple-700 font-mono">
              {Math.round(surface).toLocaleString("fr-FR")} m²
            </div>
          )}
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="bg-white border-t border-stone-200 p-3 space-y-2">
        {/* Bouton Suivi GPS */}
        {!suivi ? (
          <button onClick={demarrer}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm py-3 rounded-sm font-medium">
            <Play size={16} /> Démarrer le GPS
          </button>
        ) : (
          <button onClick={arreter}
            className="w-full flex items-center justify-center gap-2 bg-stone-700 hover:bg-stone-800 text-white text-sm py-3 rounded-sm font-medium">
            <Square size={16} /> Arrêter le GPS
          </button>
        )}

        {/* Bouton Enregistrer borne */}
        <button onClick={enregistrerBorne} disabled={!position || !suivi}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-base py-4 rounded-sm font-semibold">
          <MapPin size={20} /> ENREGISTRER UNE BORNE
        </button>

        {/* Actions secondaires */}
        <div className="flex gap-2">
          <button onClick={annulerDerniere} disabled={bornes.length === 0}
            className="flex-1 flex items-center justify-center gap-1 text-xs py-2 border border-stone-300 text-stone-700 rounded-sm disabled:opacity-40">
            <RotateCcw size={12} /> Annuler
          </button>
          <button onClick={effacerTout} disabled={bornes.length === 0}
            className="flex-1 text-xs py-2 border border-red-300 text-red-700 rounded-sm disabled:opacity-40">
            Tout effacer
          </button>
        </div>

        {/* Bouton Valider */}
        {bornes.length >= 3 && (
          <button onClick={() => onEnregistrer && onEnregistrer({ bornes, surface })}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm py-3 rounded-sm font-semibold">
            <Check size={16} /> Valider la parcelle ({bornes.length} bornes, {Math.round(surface).toLocaleString("fr-FR")} m²)
          </button>
        )}
      </div>
    </div>
  );
}

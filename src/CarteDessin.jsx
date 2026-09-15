import { useEffect, useRef, useState } from "react";
import { Locate, Trash2, Loader2, Play, Square } from "lucide-react";

const VILLES_COORDS = {
  Brazzaville: [-4.2634, 15.2429],
  "Pointe-Noire": [-4.7889, 11.8653],
  Dolisie: [-4.1997, 12.673],
  Nkayi: [-4.183, 13.288],
  Owando: [-0.4819, 15.8998],
};

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

export default function CarteDessin({ ville = "Brazzaville", points = [], onChange }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layersRef = useRef([]);
  const watchId = useRef(null);
  const [localPoints, setLocalPoints] = useState(points);
  const [mode, setMode] = useState("clic");
  const [tracking, setTracking] = useState(false);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [saisie, setSaisie] = useState("");

  function setPoints(next) {
    setLocalPoints(next);
    if (onChange) onChange(next);
  }

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;
    const L = window.L;
    if (!L) return;
    const centre = VILLES_COORDS[ville] || VILLES_COORDS.Brazzaville;
    const map = L.map(mapRef.current).setView(centre, 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    map.on("click", (e) => {
      if (mode !== "clic") return;
      setPoints([...localPoints, [e.latlng.lat, e.latlng.lng]]);
    });
    mapInstance.current = map;
    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [mode, localPoints]);

  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstance.current) return;
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];
    localPoints.forEach((p, i) => {
      const m = L.circleMarker(p, {
        radius: 6,
        color: "#7c3aed",
        fillColor: "#7c3aed",
        fillOpacity: 1,
        weight: 2,
      })
        .bindTooltip("Borne " + (i + 1))
        .addTo(mapInstance.current);
      layersRef.current.push(m);
    });
    if (localPoints.length >= 3) {
      const poly = L.polygon(localPoints, {
        color: "#7c3aed",
        weight: 3,
        fillOpacity: 0.25,
        fillColor: "#a78bfa",
      }).addTo(mapInstance.current);
      layersRef.current.push(poly);
    } else if (localPoints.length === 2) {
      const line = L.polyline(localPoints, { color: "#7c3aed", weight: 3 }).addTo(mapInstance.current);
      layersRef.current.push(line);
    }
  }, [localPoints]);

  function maPosition() {
    setLoadingGPS(true);
    if (!navigator.geolocation) {
      alert("GPS non disponible");
      setLoadingGPS(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = [pos.coords.latitude, pos.coords.longitude];
        mapInstance.current.setView(p, 17);
        setLoadingGPS(false);
      },
      (err) => {
        alert("Erreur GPS : " + err.message);
        setLoadingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function demarrerTracking() {
    if (!navigator.geolocation) {
      alert("GPS non disponible");
      return;
    }
    setTracking(true);
    let dernier = null;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = [pos.coords.latitude, pos.coords.longitude];
        if (dernier) {
          const R = 6371000;
          const dLat = ((p[0] - dernier[0]) * Math.PI) / 180;
          const dLng = ((p[1] - dernier[1]) * Math.PI) / 180;
          const dist = Math.sqrt((dLat * R) ** 2 + (dLng * R * Math.cos((p[0] * Math.PI) / 180)) ** 2);
          if (dist < 3) return;
        }
        dernier = p;
        setLocalPoints((prev) => {
          const next = [...prev, p];
          if (onChange) onChange(next);
          return next;
        });
        mapInstance.current.setView(p, 18);
      },
      (err) => {
        alert("Erreur GPS : " + err.message);
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }

  function arreterTracking() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);
  }

  function ajouterParSaisie() {
    const parts = saisie.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
      alert("Format attendu : latitude, longitude");
      return;
    }
    setPoints([...localPoints, [parts[0], parts[1]]]);
    setSaisie("");
  }

  function effacerTout() {
    if (!confirm("Effacer tous les points ?")) return;
    setPoints([]);
  }

  function annulerDernier() {
    if (localPoints.length === 0) return;
    setPoints(localPoints.slice(0, -1));
  }

  const surface = calculerSurfaceM2(localPoints);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode("clic")} className={"text-xs px-3 py-1.5 rounded-sm border " + (mode === "clic" ? "bg-purple-600 text-white border-purple-600" : "border-stone-300 text-stone-600")}>
          Clic sur carte
        </button>
        <button type="button" onClick={() => setMode("gps")} className={"text-xs px-3 py-1.5 rounded-sm border " + (mode === "gps" ? "bg-purple-600 text-white border-purple-600" : "border-stone-300 text-stone-600")}>
          Parcours GPS
        </button>
        <button type="button" onClick={() => setMode("saisie")} className={"text-xs px-3 py-1.5 rounded-sm border " + (mode === "saisie" ? "bg-purple-600 text-white border-purple-600" : "border-stone-300 text-stone-600")}>
          Saisie coordonnées
        </button>
      </div>

      {mode === "clic" && (
        <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-sm p-2">
          Cliquez sur la carte pour ajouter les bornes dans l'ordre du tour.
        </div>
      )}

      {mode === "gps" && (
        <div className="flex gap-2">
          {!tracking ? (
            <button type="button" onClick={demarrerTracking} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white text-xs py-2 rounded-sm">
              <Play size={14} /> Démarrer le parcours GPS
            </button>
          ) : (
            <button type="button" onClick={arreterTracking} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white text-xs py-2 rounded-sm">
              <Square size={14} /> Arrêter ({localPoints.length} points)
            </button>
          )}
        </div>
      )}

      {mode === "saisie" && (
        <div className="flex gap-2">
          <input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="-4.2634, 15.2429" className="flex-1 border border-stone-300 rounded-sm px-3 py-2 text-xs font-mono" />
          <button type="button" onClick={ajouterParSaisie} className="text-xs px-3 py-2 bg-purple-600 text-white rounded-sm">
            Ajouter
          </button>
        </div>
      )}

      <div ref={mapRef} className="w-full h-80 rounded-sm border border-stone-300" style={{ zIndex: 0 }}></div>

      <button type="button" onClick={maPosition} disabled={loadingGPS} className="w-full flex items-center justify-center gap-2 text-xs py-2 border border-stone-300 text-stone-700 rounded-sm">
        {loadingGPS ? <Loader2 className="animate-spin" size={14} /> : <Locate size={14} />}
        Centrer sur ma position
      </button>

      <div className="bg-purple-50 border border-purple-200 rounded-sm p-3 space-y-1">
        <div className="text-xs text-purple-900">
          <strong>{localPoints.length}</strong> borne(s) enregistrée(s)
        </div>
        {localPoints.length >= 3 && (
          <div className="text-xs text-purple-900">
            Surface calculée : <strong>{Math.round(surface).toLocaleString("fr-FR")} m²</strong>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={annulerDernier} disabled={localPoints.length === 0} className="flex-1 text-xs py-2 border border-stone-300 text-stone-700 rounded-sm">
          Annuler le dernier
        </button>
        <button type="button" onClick={effacerTout} disabled={localPoints.length === 0} className="flex-1 text-xs py-2 border border-red-300 text-red-700 rounded-sm flex items-center justify-center gap-1">
          <Trash2 size={12} /> Tout effacer
        </button>
      </div>
    </div>
  );
}

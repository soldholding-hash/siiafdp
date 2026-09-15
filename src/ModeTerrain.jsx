import { useEffect, useRef, useState } from "react";
import { Navigation, MapPin, Play, Square, RotateCcw, Check } from "lucide-react";

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

  // Init carte (satellite par défaut)
  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, { zoomControl: false }).setView([-4.2634, 15.2429], 18);
    L.control.zoom({ position: "topright" }).addTo(map);

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "© Esri, Maxar", maxZoom: 21 }
    );
    const plan = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 21,
    });

    satellite.addTo(map);
    L.control.layers({ "Satellite": satellite, "Plan": plan }, {}, { position: "topright", collapsed: true }).addTo(map);

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

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

        if (markerMe.current) {
          markerMe.current.setLatLng(p);
        } else {
          markerMe.current = L.circleMarker(p, {
            radius: 8, color: "#ffffff", weight: 3,
            fillColor: "#2563eb", fillOpacity: 1,
          }).addTo(mapInstance.current);
        }
        mapInstance.current.setView(p, 19);
      },
      (err) => {
        const msgs = {
          1: "Permission refusée — autorisez la localisation dans Chrome",
          2: "Position indisponible (GPS faible)",
          3: "Délai dépassé — réessayez",
        };
        setErreur("Erreur GPS : " + (msgs[err.code] || err.message));
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

  function enregistrerBorne() {
    if (!position) { alert("Attendez d'avoir une position GPS valide"); return; }
    const nouvelle = [...bornes, position];
    setBornes(nouvelle);

    const L = window.L;
    L.circleMarker(position, {
      radius: 6, color: "#7c3aed", weight: 3,
      fillColor: "#a78bfa", fillOpacity: 1,
    }).bindTooltip(`Borne ${nouvelle.length}`).addTo(mapInstance.current);

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
  }

  function effacerTout() {
    if (!confirm("Effacer toutes les bornes ?")) return;
    setBornes([]);
  }

  const surface = calculerSurfaceM2(bornes);
  const precM = precision ? Math.round(precision) : null;

  return (
    <div className="flex flex-col h-screen bg-stone-100">
      {/* En-tête */}
      <div className="bg-stone-900 text-white px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Navigation className="text-purple-400" size={16} />
          <div className="text-sm font-semibold">Mode Terrain</div>
        </div>
        <div className="text-xs text-stone-400 font-mono truncate ml-2">
          {position ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : "En attente GPS…"}
        </div>
      </div>

      {/* Bandeau précision */}
      {(position || erreur) && (
        <div className={"text-xs px-4 py-1.5 flex justify-between shrink-0 " + (erreur ? "bg-red-900 text-red-100" : "bg-stone-800 text-stone-300")}>
          {erreur ? (
            <span>{erreur}</span>
          ) : (
            <>
              <span>Précision : {precM !== null ? `± ${precM} m` : "—"}</span>
              <span>{suivi ? "🟢 Suivi actif" : "🔴 Arrêté"}</span>
            </>
          )}
        </div>
      )}

      {/* Carte — 55% de la hauteur */}
      <div className="relative shrink-0" style={{ height: "55vh" }}>
        <div ref={mapRef} className="absolute inset-0" style={{ zIndex: 0 }}></div>

        {/* Compteur flottant */}
        <div className="absolute top-3 left-3 bg-white rounded-sm shadow-md px-3 py-2 z-[400] text-xs">
          <div className="font-semibold text-stone-800">{bornes.length} borne{bornes.length > 1 ? "s" : ""}</div>
          {bornes.length >= 3 && (
            <div className="text-purple-700 font-mono">
              {Math.round(surface).toLocaleString("fr-FR")} m²
            </div>
          )}
        </div>
      </div>

      {/* Panneau de contrôle — scrollable */}
      <div className="flex-1 bg-white border-t border-stone-200 overflow-y-auto">
        <div className="p-3 space-y-2">
          {/* GPS */}
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

          {/* Enregistrer borne */}
          <button onClick={enregistrerBorne} disabled={!position || !suivi}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-base py-4 rounded-sm font-semibold">
            <MapPin size={20} /> ENREGISTRER UNE BORNE
          </button>

          {/* Secondaires */}
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

          {/* Info bornes */}
          {bornes.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-sm p-3">
              <div className="text-xs text-purple-900 font-medium">
                {bornes.length} borne{bornes.length > 1 ? "s" : ""} enregistrée{bornes.length > 1 ? "s" : ""}
              </div>
              {bornes.length >= 3 ? (
                <div className="text-xs text-purple-700 mt-1">
                  Surface calculée : <strong>{Math.round(surface).toLocaleString("fr-FR")} m²</strong>
                </div>
              ) : (
                <div className="text-xs text-amber-700 mt-1">
                  Il faut au moins 3 bornes pour fermer le polygone
                </div>
              )}
            </div>
          )}

          {/* Valider */}
          {bornes.length >= 3 && (
            <button onClick={() => onEnregistrer && onEnregistrer({ bornes, surface })}
              className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm py-3 rounded-sm font-semibold">
              <Check size={16} /> Valider la parcelle ({bornes.length} bornes, {Math.round(surface).toLocaleString("fr-FR")} m²)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

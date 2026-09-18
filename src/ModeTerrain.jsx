import { useEffect, useRef, useState } from "react";
import { Navigation, MapPin, Play, Square, RotateCcw, Check, Ruler } from "lucide-react";

function calculerSurfaceM2(points) {
  if (points.length < 3) return 0;
  const R = 6371000;
  const getLat = (p) => Array.isArray(p) ? p[0] : p.lat;
  const getLng = (p) => Array.isArray(p) ? p[1] : p.lng;
  const lat0 = (points.reduce((s, p) => s + getLat(p), 0) / points.length) * Math.PI / 180;
  const pts = points.map((p) => [
    ((getLng(p) - getLng(points[0])) * Math.PI / 180) * R * Math.cos(lat0),
    ((getLat(p) - getLat(points[0])) * Math.PI / 180) * R,
  ]);
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return Math.abs(area / 2);
}

// Lettres pour nommer les bornes : A, B, C...
const lettre = (i) => String.fromCharCode(65 + (i % 26));

export default function ModeTerrain({ onEnregistrer, onRetour, demandeTopo, onValiderLeve }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerMe = useRef(null);
  const layersRef = useRef([]);
  const watchRef = useRef(null);

  const [position, setPosition] = useState(null);
  const [precision, setPrecision] = useState(null);
  const [bornes, setBornes] = useState([]);
  const [distances, setDistances] = useState({});
  const [suivi, setSuivi] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [arrondissement, setArrondissement] = useState("");
  const [quartier, setQuartier] = useState("");
  const [section, setSection] = useState("");
  const [lot, setLot] = useState("");

  const ARRONDISSEMENTS = [
    "Makélékélé", "Bacongo", "Poto-Poto", "Moungali", "Ouenzé",
    "Talangaï", "Mfilou", "Madibou", "Djiri"
  ];

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
    if (!navigator.geolocation) { setErreur("GPS non disponible"); return; }
    setErreur(null);
    setSuivi(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = [pos.coords.latitude, pos.coords.longitude];
        p.altitude = pos.coords.altitude;
        p.accuracy = pos.coords.accuracy;
        p.altitudeAccuracy = pos.coords.altitudeAccuracy;
        p.heading = pos.coords.heading;
        p.speed = pos.coords.speed;
        p.timestamp = pos.timestamp;
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
        const msgs = { 1: "Permission refusée", 2: "Position indisponible", 3: "Délai dépassé" };
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

  // Redessiner les bornes, les lignes, et les étiquettes des distances
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstance.current) return;
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];

    // Helper : extraire lat/lng peu importe le format (array ou objet)
    const getLat = (p) => Array.isArray(p) ? p[0] : p.lat;
    const getLng = (p) => Array.isArray(p) ? p[1] : p.lng;

    // 1. Dessiner les marqueurs de bornes
    bornes.forEach((p, i) => {
      const coords = [getLat(p), getLng(p)];
      const m = L.circleMarker(coords, {
        radius: 6, color: "#7c3aed", weight: 3,
        fillColor: "#a78bfa", fillOpacity: 1,
      }).bindTooltip(`Borne ${lettre(i)}`).addTo(mapInstance.current);
      layersRef.current.push(m);
    });

    // 2. Dessiner les lignes entre bornes + étiquettes
    for (let i = 0; i < bornes.length - 1; i++) {
      const cle = `${i}-${i + 1}`;
      const dist = distances[cle];
      const label = dist ? ` ${dist} m ` : "?";
      const p1 = [getLat(bornes[i]), getLng(bornes[i])];
      const p2 = [getLat(bornes[i + 1]), getLng(bornes[i + 1])];

      const line = L.polyline([p1, p2], {
        color: "#7c3aed", weight: 3,
      }).addTo(mapInstance.current);
      layersRef.current.push(line);

      // Étiquette au milieu du segment (utilise getLat/getLng)
      const mid = [
        (getLat(bornes[i]) + getLat(bornes[i + 1])) / 2,
        (getLng(bornes[i]) + getLng(bornes[i + 1])) / 2,
      ];
      const txt = L.marker(mid, {
        icon: L.divIcon({
          className: "dist-label",
          html: `<div style="background:#7c3aed;color:white;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600;white-space:nowrap;">${label}</div>`,
          iconAnchor: [20, 10],
        }),
      }).addTo(mapInstance.current);
      layersRef.current.push(txt);
    }

    // 3. Polygone fermé
    if (bornes.length >= 3) {
      const coordsPoly = bornes.map((p) => [getLat(p), getLng(p)]);
      const poly = L.polygon(coordsPoly, {
        color: "#7c3aed", weight: 2, fillColor: "#a78bfa", fillOpacity: 0.25,
      }).addTo(mapInstance.current);
      layersRef.current.push(poly);
    }
  }, [bornes, distances]);

  function enregistrerBorne() {
    if (!position) { alert("Attendez d'avoir une position GPS valide"); return; }

    // Capture TOUTES les métadonnées satellites disponibles
    const gpsMeta = {
      lat: position[0],
      lng: position[1],
      altitude: position.altitude !== null && position.altitude !== undefined ? position.altitude : null,
      accuracy: position.accuracy !== null && position.accuracy !== undefined ? position.accuracy : null,
      altitudeAccuracy: position.altitudeAccuracy !== null && position.altitudeAccuracy !== undefined ? position.altitudeAccuracy : null,
      heading: position.heading !== null && position.heading !== undefined ? position.heading : null,
      speed: position.speed !== null && position.speed !== undefined ? position.speed : null,
      timestamp: position.timestamp || Date.now(),
      source: "GPS_GNSS",
      datum: "WGS84",
    };

    setBornes([...bornes, gpsMeta]);
  }

  function annulerDerniere() {
    if (bornes.length === 0) return;
    if (!confirm("Annuler la dernière borne ?")) return;
    const nouvelles = bornes.slice(0, -1);
    // Nettoyer les distances liées
    const cle = `${nouvelles.length - 1}-${nouvelles.length}`;
    const d = { ...distances };
    delete d[cle];
    setDistances(d);
    setBornes(nouvelles);
  }

  function effacerTout() {
    if (!confirm("Effacer toutes les bornes ?")) return;
    setBornes([]);
    setDistances({});
  }

  function setDistance(cle, valeur) {
    setDistances({ ...distances, [cle]: valeur });
  }

  // Le polygone est "complet" si toutes les distances sont remplies
  const nbSegments = bornes.length >= 3 ? bornes.length : Math.max(0, bornes.length - 1);
  const distancesRemplies = Object.keys(distances).filter((k) => distances[k]).length;
  const complet = nbSegments > 0 && distancesRemplies >= nbSegments;
  const surfaceGPS = calculerSurfaceM2(bornes);

  const surfaceMano = (() => {
    // Surface calculée à partir des distances saisies (approximation pour polygone fermé simple)
    // On utilise la formule de Bretschneider pour quad, sinon on garde surfaceGPS
    if (bornes.length === 4 && complet) {
      const a = parseFloat(distances["0-1"]) || 0;
      const b = parseFloat(distances["1-2"]) || 0;
      const c = parseFloat(distances["2-3"]) || 0;
      const d = parseFloat(distances["3-0"]) || 0;
      // Approximation : polygone presque rectangle
      const s = (a + b + c + d) / 2;
      return Math.sqrt((s - a) * (s - b) * (s - c) * (s - d));
    }
    return surfaceGPS;
  })();

  return (
    <div className="flex flex-col h-screen bg-stone-100">
      {/* En-tête */}
      <div className="bg-stone-900 text-white px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {onRetour && (
            <button onClick={onRetour} className="text-stone-300 hover:text-white p-1 -ml-1" title="Retour">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
          )}
          <Navigation className="text-purple-400" size={16} />
          <div className="text-sm font-semibold">Mode Terrain</div>
        </div>
        <div className="text-xs text-stone-400 font-mono truncate ml-2">
          {position ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : "En attente GPS…"}
        </div>
      </div>

      {demandeTopo && (
        <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between shrink-0">
          <div className="text-xs">
            <div className="font-semibold">📍 Levé en cours</div>
            <div className="font-mono">{demandeTopo.reference} — {demandeTopo.demandeur_prenom} {demandeTopo.demandeur_nom}</div>
          </div>
          <button onClick={onRetour} className="text-xs px-3 py-1 border border-white/40 rounded-sm hover:bg-white/10">
            Annuler
          </button>
        </div>
      )}

      {(position || erreur) && (
        <div className={"text-xs px-4 py-1.5 flex justify-between shrink-0 " + (erreur ? "bg-red-900 text-red-100" : "bg-stone-800 text-stone-300")}>
          {erreur ? <span>{erreur}</span> : (
            <>
              <span>Précision : {precision ? `± ${Math.round(precision)} m` : "—"}</span>
              <span>{suivi ? "🟢 Suivi actif" : "🔴 Arrêté"}</span>
            </>
          )}
        </div>
      )}

      {/* Carte — 45% */}
      <div className="relative shrink-0" style={{ height: "45vh" }}>
        <div ref={mapRef} className="absolute inset-0" style={{ zIndex: 0 }}></div>
        <div className="absolute top-3 left-3 bg-white rounded-sm shadow-md px-3 py-2 z-[400] text-xs">
          <div className="font-semibold text-stone-800">{bornes.length} borne{bornes.length > 1 ? "s" : ""}</div>
          {complet && (
            <div className="text-purple-700 font-mono">
              ~{Math.round(surfaceMano).toLocaleString("fr-FR")} m²
            </div>
          )}
        </div>
      </div>

      {/* Panneau de contrôle — 55% */}
      <div className="flex-1 bg-white border-t border-stone-200 overflow-y-auto">
        <div className="p-3 space-y-2">
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

          <button onClick={enregistrerBorne} disabled={!position || !suivi}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-base py-4 rounded-sm font-semibold">
            <MapPin size={20} /> ENREGISTRER BORNE {lettre(bornes.length)}
          </button>

          {demandeTopo && bornes.length >= 3 && (
            <button onClick={() => onValiderLeve && onValiderLeve({ bornes, surface: surfaceMano, observations: "" })} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-base py-4 rounded-sm font-semibold mt-2">
              <Check size={20} /> TRANSMETTRE À LA CONSERVATION
            </button>
          )}

          {/* Tableau des segments à mesurer */}
          {bornes.length >= 2 && (
            <div className="bg-purple-50 border border-purple-200 rounded-sm p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-900">
                <Ruler size={14} />
                Distances mesurées (mètre ruban)
              </div>
              <div className="space-y-1.5">
                {Array.from({ length: bornes.length >= 3 ? bornes.length : bornes.length - 1 }).map((_, i) => {
                  const cle = `${i}-${(i + 1) % bornes.length}`;
                  const estFermeture = i === bornes.length - 1;
                  return (
                    <div key={cle} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-purple-800 w-20">
                        {lettre(i)} → {lettre((i + 1) % bornes.length)}
                        {estFermeture ? " 🔒" : ""}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={distances[cle] || ""}
                        onChange={(e) => setDistance(cle, e.target.value)}
                        className="flex-1 border border-purple-300 rounded-sm px-2 py-1 text-xs font-mono"
                      />
                      <span className="text-xs text-purple-700">m</span>
                    </div>
                  );
                })}
              </div>
              {!complet && (
                <div className="text-[11px] text-amber-700">
                  Remplissez toutes les distances pour fermer le polygone
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={annulerDerniere} disabled={bornes.length === 0}
              className="flex-1 flex items-center justify-center gap-1 text-xs py-2 border border-stone-300 text-stone-700 rounded-sm disabled:opacity-40">
              <RotateCcw size={12} /> Annuler dernière
            </button>
            <button onClick={effacerTout} disabled={bornes.length === 0}
              className="flex-1 text-xs py-2 border border-red-300 text-red-700 rounded-sm disabled:opacity-40">
              Tout effacer
            </button>
          </div>

          {complet && (
            <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 space-y-2">
              <div className="text-xs font-semibold text-amber-900 mb-1">Identité cadastrale de la parcelle</div>

              <div>
                <label className="text-xs text-amber-800 block mb-1">Arrondissement *</label>
                <select value={arrondissement} onChange={(e) => setArrondissement(e.target.value)}
                  className="w-full border border-amber-300 rounded-sm px-2 py-2 text-xs bg-white">
                  <option value="">— Sélectionner —</option>
                  {ARRONDISSEMENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-amber-800 block mb-1">Quartier</label>
                <input type="text" value={quartier} onChange={(e) => setQuartier(e.target.value)}
                  placeholder="Ex : Mpila, Diata, Moukondo..."
                  className="w-full border border-amber-300 rounded-sm px-2 py-2 text-xs bg-white" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-amber-800 block mb-1">Section cadastrale</label>
                  <input type="text" value={section} onChange={(e) => setSection(e.target.value)}
                    placeholder="Ex : A-12"
                    className="w-full border border-amber-300 rounded-sm px-2 py-2 text-xs bg-white" />
                </div>
                <div>
                  <label className="text-xs text-amber-800 block mb-1">N° de lot</label>
                  <input type="text" value={lot} onChange={(e) => setLot(e.target.value)}
                    placeholder="Ex : 042"
                    className="w-full border border-amber-300 rounded-sm px-2 py-2 text-xs bg-white" />
                </div>
              </div>

              <button onClick={() => {
                if (!arrondissement) { alert("Sélectionnez un arrondissement"); return; }
                onEnregistrer && onEnregistrer({ bornes, distances, surface: surfaceMano, arrondissement, quartier, section, lot });
              }}
                className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm py-3 rounded-sm font-semibold mt-2">
                <Check size={16} /> Valider la parcelle ({bornes.length} bornes, ~{Math.round(surfaceMano).toLocaleString("fr-FR")} m²)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

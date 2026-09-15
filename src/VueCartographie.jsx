import { useEffect, useRef, useState } from "react";
import { Map, Layers, Loader2, TrendingUp } from "lucide-react";

export default function VueCartographie({ parcelles }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layersRef = useRef([]);
  const [stats, setStats] = useState({ total: 0, surface: 0, arrondissements: {} });

  // Init carte
  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;
    const L = window.L;
    if (!L) { console.error("Leaflet non chargé"); return; }

    const map = L.map(mapRef.current).setView([-4.2634, 15.2429], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Afficher les parcelles
  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstance.current) return;
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];

    let totalSurface = 0;
    const arr = {};

    parcelles.forEach((p) => {
      const poly = p.polygone;
      if (!poly || poly.length < 3) return;

      const statut = p.statut || "libre";
      const couleurs = {
        titre: { color: "#059669", fill: "#10b981" },
        litige: { color: "#dc2626", fill: "#ef4444" },
        domaine: { color: "#d97706", fill: "#f59e0b" },
        libre: { color: "#78716c", fill: "#a8a29e" },
        gage: { color: "#7c3aed", fill: "#8b5cf6" },
        gel_judiciaire: { color: "#4338ca", fill: "#6366f1" },
      };
      const c = couleurs[statut] || couleurs.libre;

      const polygon = L.polygon(poly, {
        color: c.color, fillColor: c.fill, fillOpacity: 0.4, weight: 2,
      }).addTo(mapInstance.current);

      polygon.bindPopup(
        '<div style="font-family: sans-serif; font-size: 12px;">' +
        '<div style="font-weight: 600; margin-bottom: 4px;">' + p.id + '</div>' +
        '<div>' + (p.proprietaire || "Non affecté") + '</div>' +
        (p.arrondissement ? '<div style="color: #666;">' + p.arrondissement + '</div>' : "") +
        (p.surface_m2 ? '<div style="color: #666;">' + Math.round(p.surface_m2).toLocaleString("fr-FR") + ' m²</div>' : "") +
        '<div style="margin-top: 4px;"><span style="background: ' + c.fill + '; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">' + statut + '</span></div>' +
        '</div>'
      );
      layersRef.current.push(polygon);

      totalSurface += p.surface_m2 || 0;
      const a = p.arrondissement || "Inconnu";
      arr[a] = (arr[a] || 0) + 1;
    });

    // Ajuster la vue aux parcelles si présentes
    if (layersRef.current.length > 0) {
      const group = L.featureGroup(layersRef.current);
      mapInstance.current.fitBounds(group.getBounds(), { padding: [50, 50] });
    }

    setStats({ total: parcelles.length, surface: totalSurface, arrondissements: arr });
  }, [parcelles]);

  const nbAvecPoly = parcelles.filter((p) => p.polygone && p.polygone.length >= 3).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Map className="text-purple-700" size={26} />
          <div className="text-2xl font-semibold text-stone-900">Cartographie foncière</div>
        </div>
        <div className="text-sm text-stone-500 mt-1">
          Vue globale des parcelles numérisées sur le territoire
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="text-xs font-mono text-stone-500 uppercase">Parcelles numérisées</div>
          <div className="text-2xl font-semibold text-stone-900 mt-2">{nbAvecPoly}</div>
          <div className="text-xs text-stone-500 mt-1">sur {parcelles.length} enregistrées</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="text-xs font-mono text-stone-500 uppercase">Surface totale</div>
          <div className="text-2xl font-semibold text-stone-900 mt-2">
            {Math.round(stats.surface).toLocaleString("fr-FR")} m²
          </div>
          <div className="text-xs text-stone-500 mt-1">
            ≈ {(stats.surface / 10000).toFixed(2)} hectares
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="text-xs font-mono text-stone-500 uppercase">Arrondissements couverts</div>
          <div className="text-2xl font-semibold text-stone-900 mt-2">
            {Object.keys(stats.arrondissements).length}
          </div>
          <div className="text-xs text-stone-500 mt-1">sur le territoire</div>
        </div>
      </div>

      {/* Carte */}
      <div ref={mapRef} className="w-full h-[500px] rounded-sm border border-stone-300" style={{ zIndex: 0 }}></div>

      {/* Légende */}
      <div className="bg-stone-50 border border-stone-200 rounded-sm p-4">
        <div className="text-xs font-mono text-stone-500 uppercase mb-3">Légende</div>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#10b981" }}></span> Titré</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#ef4444" }}></span> En litige</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#f59e0b" }}></span> Domaine public</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#a8a29e" }}></span> Libre</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#8b5cf6" }}></span> Sous gage</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#6366f1" }}></span> Gel judiciaire</div>
        </div>
      </div>

      {/* Détail arrondissements */}
      {Object.keys(stats.arrondissements).length > 0 && (
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="text-sm font-semibold mb-3">Répartition par arrondissement</div>
          <div className="space-y-2">
            {Object.entries(stats.arrondissements)
              .sort((a, b) => b[1] - a[1])
              .map(([arr, n]) => (
                <div key={arr} className="flex items-center gap-3 text-sm">
                  <div className="w-40 text-stone-700">{arr}</div>
                  <div className="flex-1 bg-stone-100 rounded-sm h-2 overflow-hidden">
                    <div className="bg-purple-600 h-full rounded-sm"
                      style={{ width: (n / Math.max(...Object.values(stats.arrondissements)) * 100) + "%" }} />
                  </div>
                  <div className="w-12 text-right font-mono text-xs text-stone-500">{n}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

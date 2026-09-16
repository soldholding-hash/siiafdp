import { useEffect, useRef, useState } from "react";
import { Map, Search, Loader2, Globe } from "lucide-react";
import FicheParcelle from "./FicheParcelle";
import { telechargerPlanBornage } from "./lib/pdfPlanBornage";

const getLat = (b) => (Array.isArray(b) ? b[0] : b.lat);
const getLng = (b) => (Array.isArray(b) ? b[1] : b.lng);

const VILLES = [
  { id: "Brazzaville", nom: "Brazzaville", centre: [-4.2634, 15.2429], zoom: 12 },
  { id: "Pointe-Noire", nom: "Pointe-Noire", centre: [-4.7889, 11.8653], zoom: 13 },
  { id: "Dolisie", nom: "Dolisie", centre: [-4.1997, 12.6730], zoom: 13 },
  { id: "Nkayi", nom: "Nkayi", centre: [-4.1830, 13.2880], zoom: 13 },
  { id: "Owando", nom: "Owando", centre: [-0.4819, 15.8998], zoom: 13 },
];

export default function VueCartographie({ parcelles }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layersRef = useRef([]);
  const [stats, setStats] = useState({ total: 0, surface: 0, villes: {} });
  const [selectedParcelle, setSelectedParcelle] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [message, setMessage] = useState(null);
  const [villeFiltre, setVilleFiltre] = useState("toutes");

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;
    const L = window.L;
    if (!L) return;
    const map = L.map(mapRef.current).setView([-4.2634, 15.2429], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Filtre les parcelles selon la ville sélectionnée
  const parcellesAffichees = villeFiltre === "toutes"
    ? parcelles
    : parcelles.filter((p) => {
        const v = p.ville || (p.data && p.data.ville) || "Brazzaville";
        return v === villeFiltre;
      });

  useEffect(() => {
    const L = window.L;
    if (!L || !mapInstance.current) return;
    layersRef.current.forEach((l) => l.remove());
    layersRef.current = [];

    let totalSurface = 0;
    const villesStats = {};

    parcellesAffichees.forEach((p) => {
      const poly = p.polygone || (p.data && p.data.polygone);
      if (!poly || poly.length < 3) return;

      const statut = p.statut || (p.data && p.data.statut) || "libre";
      const couleurs = {
        titre: { color: "#059669", fill: "#10b981" },
        litige: { color: "#dc2626", fill: "#ef4444" },
        domaine: { color: "#d97706", fill: "#f59e0b" },
        libre: { color: "#78716c", fill: "#a8a29e" },
        gage: { color: "#7c3aed", fill: "#8b5cf6" },
        gel_judiciaire: { color: "#4338ca", fill: "#6366f1" },
        en_attente: { color: "#eab308", fill: "#fde047" },
        en_attente_ministre: { color: "#a855f7", fill: "#d8b4fe" },
      };
      const c = couleurs[statut] || couleurs.libre;

      const coords = poly.map((b) => [getLat(b), getLng(b)]);
      const polygon = L.polygon(coords, {
        color: c.color, fillColor: c.fill, fillOpacity: 0.45, weight: 2,
      }).addTo(mapInstance.current);

      polygon.on("click", () => setSelectedParcelle(p));
      layersRef.current.push(polygon);

      totalSurface += (p.surface_m2 || (p.data && p.data.surface_m2) || 0);
      const v = p.ville || (p.data && p.data.ville) || "Brazzaville";
      villesStats[v] = (villesStats[v] || 0) + 1;
    });

    // Vue : soit centrée sur la ville choisie, soit fitBounds sur les parcelles
    if (villeFiltre === "toutes") {
      if (layersRef.current.length > 0) {
        const group = L.featureGroup(layersRef.current);
        mapInstance.current.fitBounds(group.getBounds(), { padding: [80, 80], maxZoom: 15 });
      } else {
        mapInstance.current.setView([-4.2634, 15.2429], 12);
      }
    } else {
      const v = VILLES.find((x) => x.id === villeFiltre);
      if (v) mapInstance.current.setView(v.centre, v.zoom);
    }

    setStats({ total: parcelles.length, surface: totalSurface, villes: villesStats });
  }, [parcelles, villeFiltre]);

  function chercher() {
    const q = recherche.trim().toUpperCase();
    setMessage(null);
    if (!q) return;
    const L = window.L;
    if (!L || !mapInstance.current) return;

    const ref = parcelles.find((p) => (p.id || "").toUpperCase() === q);
    if (ref) {
      const poly = ref.polygone || (ref.data && ref.data.polygone);
      if (poly && poly.length >= 3) {
        const coords = poly.map((b) => [getLat(b), getLng(b)]);
        mapInstance.current.fitBounds(L.latLngBounds(coords), { maxZoom: 19, padding: [60, 60] });
      } else {
        const lat = ref.centre_lat || (ref.data && ref.data.centre_lat);
        const lng = ref.centre_lng || (ref.data && ref.data.centre_lng);
        if (lat && lng) mapInstance.current.setView([lat, lng], 19);
      }
      setSelectedParcelle(ref);
      setMessage({ ok: true, text: "Parcelle trouvée : " + ref.id });
      return;
    }

    const parts = q.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const [lat, lng] = parts;
      mapInstance.current.setView([lat, lng], 19);
      setMessage({ ok: true, text: "Centré sur " + lat.toFixed(5) + ", " + lng.toFixed(5) });
      return;
    }

    setMessage({ ok: false, text: "Tapez une référence (P-04140) ou des coordonnées (-4.28, 15.25)" });
  }

  const nbAvecPoly = parcellesAffichees.filter((p) => (p.polygone || (p.data && p.data.polygone))?.length >= 3).length;

  return (
    <div className="p-6 space-y-5">
      <div>
        <div className="flex items-center gap-3">
          <Globe className="text-purple-700" size={26} />
          <div className="text-2xl font-semibold text-stone-900">Cartographie nationale</div>
        </div>
        <div className="text-sm text-stone-500 mt-1">Vue consolidée des parcelles numérisées sur le territoire</div>
      </div>

      {/* Sélecteur de ville + Recherche */}
      <div className="bg-white border-2 border-purple-300 rounded-sm p-4 shadow-sm space-y-3">
        <div>
          <label className="text-xs font-mono text-stone-500 uppercase block mb-2">Ville / Département</label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setVilleFiltre("toutes")}
              className={"text-xs px-3 py-2 rounded-sm border " + (villeFiltre === "toutes" ? "bg-purple-600 text-white border-purple-600 font-semibold" : "border-stone-300 text-stone-600 hover:bg-stone-50")}>
              Toutes ({parcelles.length})
            </button>
            {VILLES.map((v) => {
              const nb = parcelles.filter((p) => (p.ville || (p.data && p.data.ville) || "Brazzaville") === v.id).length;
              return (
                <button key={v.id} onClick={() => setVilleFiltre(v.id)}
                  className={"text-xs px-3 py-2 rounded-sm border " + (villeFiltre === v.id ? "bg-purple-600 text-white border-purple-600 font-semibold" : "border-stone-300 text-stone-600 hover:bg-stone-50")}>
                  {v.nom} ({nb})
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-stone-200">
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && chercher()}
            placeholder="Rechercher (P-04140) ou coordonnées (-4.28, 15.25)"
            className="flex-1 border border-stone-300 rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button onClick={chercher}
            className="text-sm px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-sm flex items-center gap-2 font-medium">
            <Search size={16} /> Localiser
          </button>
        </div>

        {message && (
          <div className={"text-xs p-2 rounded-sm border " + (message.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800")}>
            {message.text}
          </div>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="text-xs font-mono text-stone-500 uppercase">Parcelles affichées</div>
          <div className="text-2xl font-semibold text-stone-900 mt-2">{nbAvecPoly}</div>
          <div className="text-xs text-stone-500 mt-1">
            {villeFiltre === "toutes" ? "sur " + parcelles.length + " au total" : "pour " + villeFiltre}
          </div>
        </div>
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="text-xs font-mono text-stone-500 uppercase">Surface totale</div>
          <div className="text-2xl font-semibold text-stone-900 mt-2">{Math.round(stats.surface).toLocaleString("fr-FR")} m²</div>
          <div className="text-xs text-stone-500 mt-1">≈ {(stats.surface / 10000).toFixed(2)} hectares</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="text-xs font-mono text-stone-500 uppercase">Villes couvertes</div>
          <div className="text-2xl font-semibold text-stone-900 mt-2">{Object.keys(stats.villes).length}</div>
          <div className="text-xs text-stone-500 mt-1">sur le territoire national</div>
        </div>
      </div>

      {/* CARTE */}
      <div ref={mapRef} className="w-full h-[500px] rounded-sm border border-stone-300" style={{ zIndex: 0 }}></div>

      {/* LÉGENDE */}
      <div className="bg-stone-50 border border-stone-200 rounded-sm p-4">
        <div className="text-xs font-mono text-stone-500 uppercase mb-3">Légende</div>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#10b981" }}></span> Titré</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#fde047" }}></span> En attente</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#d8b4fe" }}></span> Attente Ministère</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#ef4444" }}></span> En litige</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#f59e0b" }}></span> Domaine public</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#a8a29e" }}></span> Libre</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#8b5cf6" }}></span> Sous gage</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ background: "#6366f1" }}></span> Gel judiciaire</div>
        </div>
      </div>

      {/* Répartition par ville */}
      {Object.keys(stats.villes).length > 0 && (
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="text-sm font-semibold mb-3">Répartition par ville</div>
          <div className="space-y-2">
            {Object.entries(stats.villes).sort((a, b) => b[1] - a[1]).map(([v, n]) => (
              <div key={v} className="flex items-center gap-3 text-sm">
                <div className="w-40 text-stone-700">{v}</div>
                <div className="flex-1 bg-stone-100 rounded-sm h-2 overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-sm" style={{ width: (n / Math.max(...Object.values(stats.villes)) * 100) + "%" }} />
                </div>
                <div className="w-12 text-right font-mono text-xs text-stone-500">{n}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedParcelle && (
        <FicheParcelle
          parcelle={selectedParcelle}
          onClose={() => setSelectedParcelle(null)}
          onTelecharger={telechargerPlanBornage}
        />
      )}
    </div>
  );
}

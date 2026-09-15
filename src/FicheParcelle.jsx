import { useState } from "react";
import { X, Download, MapPin, Ruler, Calendar, User, Hash, FileText } from "lucide-react";

// Nomme les bornes A, B, C, D...
const lettre = (i) => String.fromCharCode(65 + (i % 26));

// Distance en mètres entre 2 points GPS
function distanceEntre(p1, p2) {
  const R = 6371000;
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const dLng = ((p2[1] - p1[1]) * Math.PI) / 180;
  const lat0 = ((p1[0] + p2[0]) / 2) * Math.PI / 180;
  return Math.sqrt((dLat * R) ** 2 + (dLng * R * Math.cos(lat0)) ** 2);
}

// Normalise un polygone GPS en coordonnées SVG dans un viewBox 600x400
function normaliserPolygone(bornes) {
  if (!bornes || bornes.length < 2) return [];
  const lats = bornes.map((b) => b[0]);
  const lngs = bornes.map((b) => b[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const largeur = maxLng - minLng || 0.0001;
  const hauteur = maxLat - minLat || 0.0001;

  const pad = 60;
  const W = 600, H = 400;

  // Ajuster l'échelle pour garder les proportions
  const scaleX = (W - 2 * pad) / largeur;
  const scaleY = (H - 2 * pad) / hauteur;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (W - largeur * scale) / 2;
  const offsetY = (H - hauteur * scale) / 2;

  return bornes.map((b) => [
    offsetX + (b[1] - minLng) * scale,
    // Inverser Y (lat augmente vers le haut)
    H - offsetY - (b[0] - minLat) * scale,
  ]);
}

// Plan de bornage SVG
function PlanBornage({ bornes, distances }) {
  if (!bornes || bornes.length < 3) {
    return (
      <div className="p-8 text-center text-stone-500 text-sm">
        Le plan de bornage nécessite au moins 3 bornes
      </div>
    );
  }

  const points = normaliserPolygone(bornes);
  const pathD = points.map((p, i) => (i === 0 ? "M" : "L") + p[0] + "," + p[1]).join(" ") + " Z";

  // Milieu de chaque segment pour placer l'étiquette de distance
  const etiquettes = [];
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const midX = (points[i][0] + points[j][0]) / 2;
    const midY = (points[i][1] + points[j][1]) / 2;
    const cle = `${i}-${j}`;
    const cleInv = `${i}-${i + 1}`;
    const dist = distances[cleInv] || distances[`${i}-${i+1}`] || distances[cle] || distances[`${j}-${i}`];
    etiquettes.push({ x: midX, y: midY, label: dist ? `${dist} m` : "?", i, j });
  }

  return (
    <div className="bg-white border border-stone-300 rounded-sm">
      <div className="bg-stone-100 border-b border-stone-300 px-4 py-2 text-xs font-mono text-stone-600 flex justify-between">
        <span>PLAN DE BORNAGE</span>
        <span>Échelle indicative</span>
      </div>
      <svg viewBox="0 0 600 400" className="w-full bg-white">
        {/* Grille de fond */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="600" height="400" fill="url(#grid)" />

        {/* Polygone */}
        <path d={pathD} fill="#e9d5ff" fillOpacity="0.35" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Étiquettes de distances au milieu des côtés */}
        {etiquettes.map((e, k) => (
          <g key={k}>
            <rect
              x={e.x - 22} y={e.y - 9}
              width="44" height="18"
              fill="#7c3aed" rx="3"
              opacity="0.9"
            />
            <text
              x={e.x} y={e.y + 4}
              fill="white" fontSize="11" fontWeight="600"
              textAnchor="middle" fontFamily="monospace"
            >
              {e.label}
            </text>
          </g>
        ))}

        {/* Sommets (bornes) */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="8" fill="white" stroke="#7c3aed" strokeWidth="3" />
            <text
              x={p[0]} y={p[1] - 14}
              fill="#4c1d95" fontSize="14" fontWeight="700"
              textAnchor="middle"
            >
              {lettre(i)}
            </text>
          </g>
        ))}

        {/* Nord */}
        <g transform="translate(560, 40)">
          <line x1="0" y1="20" x2="0" y2="-5" stroke="#333" strokeWidth="2" />
          <polygon points="0,-10 -5,0 5,0" fill="#333" />
          <text x="0" y="35" fontSize="12" textAnchor="middle" fontWeight="600">N</text>
        </g>
      </svg>
    </div>
  );
}

export default function FicheParcelle({ parcelle, onClose, onTelecharger }) {
  if (!parcelle) return null;
  const data = parcelle.data || {};
  const bornes = data.polygone || [];
  const distances = data.distances || {};
  const surface = data.surface_m2 || data.superficie || 0;

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-3 overflow-y-auto">
      <div className="bg-stone-50 rounded-sm w-full max-w-3xl my-4">
        {/* En-tête */}
        <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-amber-400" />
            <div>
              <div className="text-sm font-semibold">Fiche technique de bornage</div>
              <div className="text-xs text-stone-400 font-mono">{parcelle.id}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Infos générales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-stone-200 rounded-sm p-3">
              <div className="text-xs text-stone-500 flex items-center gap-1"><Hash size={11} /> Référence</div>
              <div className="text-sm font-mono font-medium text-stone-800 mt-1">{parcelle.id}</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-sm p-3">
              <div className="text-xs text-stone-500 flex items-center gap-1"><MapPin size={11} /> Arrondissement</div>
              <div className="text-sm font-medium text-stone-800 mt-1">{data.arrondissement || "—"}</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-sm p-3">
              <div className="text-xs text-stone-500 flex items-center gap-1"><Ruler size={11} /> Surface</div>
              <div className="text-sm font-medium text-stone-800 mt-1">
                {Math.round(surface).toLocaleString("fr-FR")} m²
              </div>
            </div>
            <div className="bg-white border border-stone-200 rounded-sm p-3">
              <div className="text-xs text-stone-500">Statut</div>
              <div className="text-sm font-medium text-stone-800 mt-1 capitalize">
                {data.statut === "en_attente" ? "En attente" : data.statut || "—"}
              </div>
            </div>
          </div>

          {/* Plan de bornage */}
          <PlanBornage bornes={bornes} distances={distances} />

          {/* Tableau des bornes GPS */}
          {bornes.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
              <div className="bg-stone-100 border-b border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700">
                Coordonnées GPS des bornes
              </div>
              <table className="w-full text-xs">
                <thead className="bg-stone-50 text-stone-500 font-mono">
                  <tr>
                    <th className="text-left py-2 px-4">Borne</th>
                    <th className="text-left py-2 px-4">Latitude</th>
                    <th className="text-left py-2 px-4">Longitude</th>
                  </tr>
                </thead>
                <tbody>
                  {bornes.map((b, i) => (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="py-2 px-4 font-semibold text-purple-700">{lettre(i)}</td>
                      <td className="py-2 px-4 font-mono">{b[0].toFixed(6)}</td>
                      <td className="py-2 px-4 font-mono">{b[1].toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tableau des distances */}
          {Object.keys(distances).length > 0 && (
            <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
              <div className="bg-stone-100 border-b border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700">
                Distances mesurées (mètre ruban)
              </div>
              <table className="w-full text-xs">
                <thead className="bg-stone-50 text-stone-500 font-mono">
                  <tr>
                    <th className="text-left py-2 px-4">Segment</th>
                    <th className="text-left py-2 px-4">Distance mesurée</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(distances).map(([cle, val]) => {
                    const [i] = cle.split("-").map(Number);
                    const j = (i + 1) % bornes.length;
                    return (
                      <tr key={cle} className="border-b border-stone-100">
                        <td className="py-2 px-4 font-mono text-stone-700">
                          {lettre(i)} → {lettre(j)}
                        </td>
                        <td className="py-2 px-4 font-mono text-stone-700">{val} m</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Métadonnées */}
          <div className="bg-stone-100 border border-stone-200 rounded-sm p-3 text-xs text-stone-600 space-y-1">
            <div className="flex items-center gap-2"><User size={11} /> Enregistré par : <strong>{data.enregistre_par || "—"}</strong></div>
            <div className="flex items-center gap-2"><Calendar size={11} /> Le : <strong>{data.enregistre_le || "—"}</strong></div>
            <div className="flex items-center gap-2"><Hash size={11} /> Nombre de bornes : <strong>{bornes.length}</strong></div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button onClick={onClose}
              className="text-xs px-4 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-sm">
              Fermer
            </button>
            <button onClick={() => onTelecharger && onTelecharger(parcelle)}
              className="text-xs px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-sm flex items-center gap-2">
              <Download size={14} /> Télécharger le plan de bornage PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

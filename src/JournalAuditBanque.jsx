import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, Filter, Eye, Lock, TrendingUp, FileText } from "lucide-react";
import { chargerTousContentieux } from "./lib/contentieux";
import { chargerGagesActifs } from "./lib/gages";
import { chargerMouvements } from "./lib/portefeuille";

const TYPE_ICONE = {
  consultation: { icone: Eye, couleur: "text-blue-600 bg-blue-50" },
  gage: { icone: Lock, couleur: "text-purple-600 bg-purple-50" },
  recharge: { icone: TrendingUp, couleur: "text-emerald-600 bg-emerald-50" },
  prolongation: { icone: Lock, couleur: "text-amber-600 bg-amber-50" },
  realisation: { icone: Lock, couleur: "text-red-600 bg-red-50" },
  signalement: { icone: FileText, couleur: "text-orange-600 bg-orange-50" },
};

export default function JournalAuditBanque({ compteId, nomBanque }) {
  const [mouvements, setMouvements] = useState([]);
  const [gages, setGages] = useState([]);
  const [contentieux, setContentieux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("tous");
  const [tri, setTri] = useState("desc"); // desc = plus récent en premier

  async function charger() {
    if (!compteId) return;
    setLoading(true);
    try {
      const [m, g, c] = await Promise.all([
        chargerMouvements(compteId),
        chargerGagesActifs(compteId),
        chargerTousContentieux(),
      ]);
      setMouvements(m || []);
      setGages(g || []);
      setContentieux((c || []).filter((x) => x.banque_id === compteId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { charger(); }, [compteId]);

  // Fusionner toutes les sources en une seule chronologie
  const evenements = [];

  mouvements.forEach((m) => {
    evenements.push({
      type: m.type,
      date: m.created_at,
      libelle: m.libelle,
      montant: m.montant,
      solde_apres: m.solde_apres,
      user_email: m.user_email,
    });
  });

  gages.forEach((g) => {
    evenements.push({
      type: "gage",
      date: g.date_pose,
      libelle: "Pose de gage " + g.parcelle_id,
      montant: -100000,
      details: "Dossier " + (g.dossier_credit || "—"),
      user_email: g.user_email,
    });
  });

  contentieux.forEach((c) => {
    evenements.push({
      type: "signalement",
      date: c.date_signalement,
      libelle: "Signalement impayé " + c.parcelle_id,
      montant: 0,
      details: "Motif : " + (c.motif || "—"),
      user_email: c.user_email,
    });
  });

  evenements.sort((a, b) => {
    const diff = new Date(a.date) - new Date(b.date);
    return tri === "asc" ? diff : -diff;
  });

  const affiches = filtre === "tous" ? evenements : evenements.filter((e) => e.type === filtre);

  const totalActions = evenements.length;
  const totalConsultations = evenements.filter((e) => e.type === "consultation").length;
  const totalGages = evenements.filter((e) => e.type === "gage").length;
  const totalDebits = evenements.filter((e) => e.montant < 0).reduce((s, e) => s + Math.abs(e.montant), 0);

  function fmt(n) {
    return new Intl.NumberFormat("fr-FR").format(Math.abs(n)) + " FCFA";
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-blue-700" size={26} />
          <div className="text-2xl font-semibold text-stone-900">Journal d'audit — {nomBanque || "Banque"}</div>
        </div>
        <div className="text-sm text-stone-500 mt-1">
          Traçabilité complète de toutes les opérations menées depuis ce compte
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="text-xs font-mono text-stone-500 uppercase">Actions totales</div>
          <div className="text-2xl font-semibold text-stone-900 mt-1">{totalActions}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="text-xs font-mono text-stone-500 uppercase">Consultations</div>
          <div className="text-2xl font-semibold text-blue-700 mt-1">{totalConsultations}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="text-xs font-mono text-stone-500 uppercase">Gages posés</div>
          <div className="text-2xl font-semibold text-purple-700 mt-1">{totalGages}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-sm p-4">
          <div className="text-xs font-mono text-stone-500 uppercase">Total facturé</div>
          <div className="text-2xl font-semibold text-amber-700 mt-1">{fmt(totalDebits)}</div>
        </div>
      </div>

      {/* Tri */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-stone-500">Tri :</span>
        <button onClick={() => setTri("desc")}
          className={"text-xs px-3 py-1.5 rounded-sm border " + (tri === "desc" ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-600 hover:bg-stone-50")}>
          ↓ Plus récent
        </button>
        <button onClick={() => setTri("asc")}
          className={"text-xs px-3 py-1.5 rounded-sm border " + (tri === "asc" ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-600 hover:bg-stone-50")}>
          ↑ Plus ancien
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {["tous", "consultation", "gage", "recharge", "prolongation", "realisation", "signalement"].map((f) => (
          <button key={f} onClick={() => setFiltre(f)}
            className={"text-xs px-3 py-1.5 rounded-sm border " + (filtre === f ? "bg-stone-900 text-white border-stone-900" : "border-stone-300 text-stone-600 hover:bg-stone-50")}>
            {f === "tous" ? "Tous" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm">
          <Loader2 className="animate-spin" size={16} /> Chargement du journal...
        </div>
      ) : affiches.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <ShieldCheck size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">Aucune activité pour l'instant</div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <div className="bg-stone-100 border-b border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 flex items-center gap-2">
            <Filter size={12} /> {affiches.length} événement{affiches.length > 1 ? "s" : ""}
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 bg-stone-50">
              <tr>
                <th className="text-left py-3 px-4">Date & heure</th>
                <th className="text-left py-3 px-4">Par qui</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-right py-3 px-4">Montant</th>
                <th className="text-right py-3 px-4">Solde après</th>
              </tr>
            </thead>
            <tbody>
              {affiches.map((e, i) => {
                const style = TYPE_ICONE[e.type] || { icone: ShieldCheck, couleur: "text-stone-600 bg-stone-50" };
                const Icone = style.icone;
                return (
                  <tr key={i} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 px-4 text-xs text-stone-500">
                      {new Date(e.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="py-3 px-4 text-xs text-stone-600 font-mono">
                      {e.user_email || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={"inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-sm font-medium " + style.couleur}>
                        <Icone size={11} /> {e.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-700">
                      {e.libelle}
                      {e.details && <div className="text-xs text-stone-500 mt-0.5">{e.details}</div>}
                    </td>
                    <td className={"py-3 px-4 text-right font-mono text-xs " + (e.montant < 0 ? "text-red-700" : e.montant > 0 ? "text-emerald-700" : "text-stone-500")}>
                      {e.montant === 0 ? "—" : (e.montant > 0 ? "+" : "-") + fmt(e.montant)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-stone-600">
                      {e.solde_apres ? fmt(e.solde_apres) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 text-xs text-blue-900">
        <strong>Journal scellé :</strong> chaque action est enregistrée avec horodatage serveur. Cette trace ne peut pas être modifiée ni supprimée, même par un administrateur. Elle sert de preuve en cas de contrôle réglementaire ou de litige.
      </div>
    </div>
  );
}

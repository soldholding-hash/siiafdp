import { useState, useEffect } from "react";
import { Wallet, TrendingUp, Lock, AlertTriangle, Loader2, BarChart3, MapPin } from "lucide-react";
import { chargerTableauBord } from "./lib/tableau";

function fmt(n) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

function CarteKPI({ label, valeur, sous, icone: Icone, couleur }) {
  const couleurs = {
    amber: "text-amber-600 bg-amber-50 border-amber-200",
    purple: "text-purple-600 bg-purple-50 border-purple-200",
    red: "text-red-600 bg-red-50 border-red-200",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-200",
    blue: "text-blue-600 bg-blue-50 border-blue-200",
  };
  const c = couleurs[couleur] || couleurs.amber;
  return (
    <div className="bg-white border border-stone-200 rounded-sm p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs font-mono text-stone-500 uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-semibold text-stone-900 mt-2">{valeur}</div>
          {sous && <div className="text-xs text-stone-500 mt-1">{sous}</div>}
        </div>
        <div className={"p-2.5 rounded-sm border " + c}>
          <Icone size={18} />
        </div>
      </div>
    </div>
  );
}

export default function TableauDeBord({ compteId, nomBanque }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function charger() {
    if (!compteId) return;
    setLoading(true);
    try {
      setData(await chargerTableauBord(compteId));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { charger(); }, [compteId]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-stone-500 text-sm">
        <Loader2 className="animate-spin" size={16} /> Chargement du tableau de bord...
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm text-red-800">
          Erreur : {err || "Données indisponibles"}
        </div>
      </div>
    );
  }

  const communes = Object.entries(data.gages_par_commune || {}).sort((a, b) => b[1] - a[1]);
  const maxCommune = Math.max(...communes.map((c) => c[1]), 1);

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <BarChart3 className="text-amber-600" size={26} />
          <div className="text-2xl font-semibold text-stone-900">Tableau de bord</div>
        </div>
        <div className="text-sm text-stone-500 mt-1">{nomBanque || "Vue consolidée de vos garanties foncières"}</div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CarteKPI
          label="Solde portefeuille"
          valeur={fmt(data.solde)}
          sous="Disponible pour opérations"
          icone={Wallet}
          couleur={data.solde < 20000 ? "red" : "emerald"}
        />
        <CarteKPI
          label="Encours garanti"
          valeur={fmt(data.encours_total)}
          sous={`${data.gages_actifs} gage${data.gages_actifs > 1 ? "s" : ""} actif${data.gages_actifs > 1 ? "s" : ""}`}
          icone={TrendingUp}
          couleur="purple"
        />
        <CarteKPI
          label="Gages échus"
          valeur={data.gages_echus}
          sous={data.gages_echus === 0 ? "Aucune échéance dépassée" : "Action requise"}
          icone={AlertTriangle}
          couleur={data.gages_echus > 0 ? "red" : "emerald"}
        />
        <CarteKPI
          label="Contentieux actifs"
          valeur={data.contentieux_actifs}
          sous="Dossiers en cours"
          icone={Lock}
          couleur={data.contentieux_actifs > 0 ? "amber" : "emerald"}
        />
      </div>

      {/* Répartition géographique */}
      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="text-purple-600" size={16} />
          <div className="text-sm font-semibold">Répartition géographique des gages actifs</div>
        </div>
        {communes.length === 0 ? (
          <div className="text-xs text-stone-400 py-4 text-center">Aucun gage actif</div>
        ) : (
          <div className="space-y-3">
            {communes.map(([commune, nb]) => (
              <div key={commune}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-stone-700">{commune}</span>
                  <span className="text-stone-500 font-mono text-xs">{nb} gage{nb > 1 ? "s" : ""}</span>
                </div>
                <div className="bg-stone-100 rounded-sm h-2 overflow-hidden">
                  <div
                    className="bg-purple-600 h-full rounded-sm transition-all"
                    style={{ width: (nb / maxCommune * 100) + "%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Facturation du mois */}
      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="text-sm font-semibold mb-3">Facturation API du mois en cours</div>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-semibold text-amber-700">{fmt(data.facturation_mois)}</div>
          <div className="text-xs text-stone-500">consommé ce mois</div>
        </div>
        <div className="text-xs text-stone-500 mt-2">
          Consultations, gages, prolongations et réalisations facturés à l'usage.
        </div>
      </div>

      {/* Résumé chiffré */}
      <div className="bg-stone-50 border border-stone-200 rounded-sm p-5">
        <div className="text-xs font-mono text-stone-500 uppercase mb-3">Résumé opérationnel</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-stone-500">Solde net</div>
            <div className="font-mono font-medium text-stone-800 mt-0.5">{fmt(data.solde)}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Gages actifs</div>
            <div className="font-mono font-medium text-stone-800 mt-0.5">{data.gages_actifs}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Encours garanti</div>
            <div className="font-mono font-medium text-stone-800 mt-0.5">{fmt(data.encours_total)}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Dossiers contentieux</div>
            <div className="font-mono font-medium text-stone-800 mt-0.5">{data.contentieux_actifs}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

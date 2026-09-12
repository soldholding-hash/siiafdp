import { useState, useEffect } from "react";
import { Wallet, Loader2 } from "lucide-react";
import { chargerComptes, chargerMouvements } from "./lib/portefeuille";

function fmt(n) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

export default function MonPortefeuille({ compteId }) {
  const [compte, setCompte] = useState(null);
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);

  async function charger() {
    setLoading(true);
    try {
      const tous = await chargerComptes();
      const mien = tous.find((c) => c.id === compteId);
      setCompte(mien || null);
      if (mien) setMouvements(await chargerMouvements(mien.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { charger(); }, [compteId]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-stone-500 text-sm">
        <Loader2 className="animate-spin" size={16} /> Chargement du portefeuille...
      </div>
    );
  }

  if (!compte) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm text-red-800">
          Aucun portefeuille associé à votre compte. Contactez l'administrateur.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-2xl font-semibold text-stone-900">Mon portefeuille</div>
        <div className="text-sm text-stone-500 mt-1">{compte.nom}</div>
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-mono text-stone-500 uppercase">{compte.segment}</div>
            <div className="text-sm text-stone-700 mt-1">Solde disponible</div>
          </div>
          <Wallet size={24} className="text-amber-600" />
        </div>
        <div className={"text-3xl font-semibold mt-3 " + (compte.solde < 20000 ? "text-red-700" : "text-stone-900")}>
          {fmt(compte.solde)}
        </div>
        {compte.solde < 20000 && (
          <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2.5">
            Solde faible. Contactez l'administration pour recharger votre compte.
          </div>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-sm p-5">
        <div className="font-semibold mb-4">Historique de mes opérations</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 border-b border-stone-200">
              <tr>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Libellé</th>
                <th className="text-right py-2">Montant</th>
                <th className="text-right py-2">Solde</th>
              </tr>
            </thead>
            <tbody>
              {mouvements.map((m) => (
                <tr key={m.id} className="border-b border-stone-100">
                  <td className="py-2 text-stone-500 text-xs">{new Date(m.created_at).toLocaleString("fr-FR")}</td>
                  <td className="py-2">
                    <span className={"text-xs px-2 py-0.5 rounded-sm " + (m.montant >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800")}>
                      {m.type}
                    </span>
                  </td>
                  <td className="py-2 text-stone-700">{m.libelle}</td>
                  <td className={"py-2 text-right font-mono " + (m.montant >= 0 ? "text-emerald-700" : "text-red-700")}>
                    {m.montant >= 0 ? "+" : ""}{fmt(m.montant)}
                  </td>
                  <td className="py-2 text-right font-mono text-stone-600">{fmt(m.solde_apres)}</td>
                </tr>
              ))}
              {mouvements.length === 0 && (
                <tr><td colSpan="5" className="py-4 text-center text-stone-400 text-xs">Aucune opération pour l'instant</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

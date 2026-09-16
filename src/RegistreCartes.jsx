import { useState, useEffect } from "react";
import { CreditCard, Loader2, User, FileStack, Search } from "lucide-react";
import { supabase } from "./lib/db";

export default function CartesFoncieres() {
  const [cartes, setCartes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState("");

  async function charger() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cartes")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setCartes(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { charger(); }, []);

  const affichees = cartes.filter((c) => {
    const d = c.data || c;
    if (!recherche) return true;
    const q = recherche.toLowerCase();
    return (
      (d.id || "").toLowerCase().includes(q) ||
      (d.titulaire || "").toLowerCase().includes(q) ||
      (d.nin || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <CreditCard className="text-purple-700" size={26} />
          <div className="text-2xl font-semibold text-stone-900">Cartes foncières citoyennes</div>
        </div>
        <div className="text-sm text-stone-500 mt-1">
          Registre des cartes délivrées aux propriétaires fonciers
        </div>
      </div>

      {/* Recherche */}
      <div className="bg-white border border-stone-200 rounded-sm p-4">
        <div className="flex gap-2">
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par numéro de carte, nom ou NIN..."
            className="flex-1 border border-stone-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <div className="flex items-center gap-2 px-3 text-xs text-stone-500">
            <Search size={14} /> {affichees.length} carte{affichees.length > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm">
          <Loader2 className="animate-spin" size={16} /> Chargement...
        </div>
      ) : affichees.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <CreditCard size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">Aucune carte foncière pour l'instant</div>
          <div className="text-xs text-stone-400 mt-1">
            Les cartes sont créées automatiquement lors de l'approbation d'un titre par le Ministère
          </div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4">N° Carte</th>
                <th className="text-left py-3 px-4">Titulaire</th>
                <th className="text-left py-3 px-4">NIN / RCCM</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-center py-3 px-4">Parcelles</th>
                <th className="text-left py-3 px-4">Émise le</th>
                <th className="text-left py-3 px-4">Expire le</th>
                <th className="text-center py-3 px-4">Statut</th>
              </tr>
            </thead>
            <tbody>
              {affichees.map((c) => {
                const d = c.data || c;
                const dateEmission = d.date_emission ? new Date(d.date_emission).toLocaleDateString("fr-FR") : "—";
                const dateExpiration = d.date_expiration ? new Date(d.date_expiration).toLocaleDateString("fr-FR") : "—";
                const parcelleIds = d.parcelle_ids || [];
                return (
                  <tr key={d.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-purple-700">{d.id}</td>
                    <td className="py-3 px-4 text-stone-800 font-medium">{d.titulaire || "—"}</td>
                    <td className="py-3 px-4 font-mono text-xs text-stone-600">{d.nin || d.rccm || "—"}</td>
                    <td className="py-3 px-4 text-xs">
                      <span className={"px-2 py-0.5 rounded-sm " + (d.type === "morale" ? "bg-blue-100 text-blue-800" : "bg-stone-100 text-stone-700")}>
                        {d.type === "morale" ? "Morale" : "Physique"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-stone-700">{parcelleIds.length}</td>
                    <td className="py-3 px-4 text-xs text-stone-500">{dateEmission}</td>
                    <td className="py-3 px-4 text-xs text-stone-500">{dateExpiration}</td>
                    <td className="py-3 px-4 text-center">
                      {d.revoquee ? (
                        <span className="text-xs px-2 py-0.5 rounded-sm bg-red-100 text-red-800 font-medium">Révoquée</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 font-medium">Active</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

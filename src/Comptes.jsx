import { useState, useEffect } from "react";
import { Wallet, Plus, X, Loader2 } from "lucide-react";
import { chargerComptes, chargerMouvements, recharger } from "./lib/portefeuille";

function fmt(n) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

function ModalRecharge({ compte, onClose, onDone }) {
  const [montant, setMontant] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function valider() {
    const m = Number(montant);
    if (!m || m <= 0) { setErr("Montant invalide"); return; }
    setLoading(true);
    try {
      await recharger(compte.id, m, note);
      onDone();
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="text-base font-semibold">Recharger {compte.nom}</div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Montant (FCFA)</label>
            <input type="number" value={montant} onChange={(e) => setMontant(e.target.value)}
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" autoFocus />
          </div>
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Note (optionnel)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
          </div>
          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button onClick={valider} disabled={loading}
            className="text-xs px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-sm">
            {loading ? "..." : "Recharger"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Comptes() {
  const [comptes, setComptes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recharge, setRecharge] = useState(null);

  async function rafraichir() {
    setLoading(true);
    try { setComptes(await chargerComptes()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { rafraichir(); }, []);

  useEffect(() => {
    if (!selected) return;
    chargerMouvements(selected.id).then(setMouvements).catch(console.error);
  }, [selected]);

  async function apresRecharge() {
    setRecharge(null);
    await rafraichir();
    if (selected) setMouvements(await chargerMouvements(selected.id));
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-2xl font-semibold text-stone-900">Comptes partenaires</div>
        <div className="text-sm text-stone-500 mt-1">Portefeuilles Sécuri-Gage · Notaires · Justice</div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm">
          <Loader2 className="animate-spin" size={16} /> Chargement...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comptes.map((c) => (
            <div key={c.id} className="bg-white border border-stone-200 rounded-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono text-stone-500 uppercase">{c.segment}</div>
                  <div className="text-base font-semibold text-stone-900 mt-1">{c.nom}</div>
                </div>
                <Wallet size={20} className="text-amber-600" />
              </div>
              <div className="mt-4">
                <div className="text-xs text-stone-500">Solde</div>
                <div className={"text-2xl font-semibold " + (c.solde < 10000 ? "text-red-700" : "text-stone-900")}>
                  {fmt(c.solde)}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setRecharge(c)}
                  className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-sm flex items-center gap-1">
                  <Plus size={12} /> Recharger
                </button>
                <button onClick={() => setSelected(c)}
                  className="text-xs px-3 py-1.5 border border-stone-300 hover:bg-stone-50 rounded-sm">
                  Historique
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="bg-white border border-stone-200 rounded-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Historique — {selected.nom}</div>
            <button onClick={() => setSelected(null)} className="text-stone-400 hover:text-stone-700"><X size={16} /></button>
          </div>
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
                  <tr><td colSpan="5" className="py-4 text-center text-stone-400 text-xs">Aucun mouvement</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recharge && <ModalRecharge compte={recharge} onClose={() => setRecharge(null)} onDone={apresRecharge} />}
    </div>
  );
}

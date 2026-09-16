import { useState, useEffect } from "react";
import { Wallet, Plus, Loader2, Check, TrendingUp } from "lucide-react";
import { chargerComptes, recharger } from "./lib/portefeuille";

function fmt(n) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

export default function RechargerPartenaire() {
  const [comptes, setComptes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [montant, setMontant] = useState("");
  const [note, setNote] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [msg, setMsg] = useState(null);

  async function charger() {
    setLoading(true);
    try {
      setComptes(await chargerComptes());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { charger(); }, []);

  async function valider() {
    const m = Number(montant);
    if (!selected || !m || m <= 0) {
      setMsg({ ok: false, text: "Sélectionnez un partenaire et un montant valide" });
      return;
    }
    setEnvoi(true);
    try {
      await recharger(selected.id, m, note);
      setMsg({ ok: true, text: fmt(m) + " crédités sur " + selected.nom });
      setMontant("");
      setNote("");
      await charger();
      setTimeout(() => { setMsg(null); setSelected(null); }, 2000);
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <TrendingUp className="text-emerald-700" size={26} />
          <div className="text-2xl font-semibold text-stone-900">Recharge des partenaires</div>
        </div>
        <div className="text-sm text-stone-500 mt-1">
          Alimenter les portefeuilles des banques, notaires et tribunaux partenaires
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm">
          <Loader2 className="animate-spin" size={16} /> Chargement...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comptes.map((c) => (
            <div key={c.id}
              onClick={() => setSelected(c)}
              className={"bg-white border-2 rounded-sm p-5 cursor-pointer transition " + (selected?.id === c.id ? "border-emerald-500 shadow-md" : "border-stone-200 hover:border-stone-300")}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono text-stone-500 uppercase">{c.segment}</div>
                  <div className="text-base font-semibold text-stone-900 mt-1">{c.nom}</div>
                </div>
                <Wallet size={20} className="text-emerald-600" />
              </div>
              <div className="mt-4">
                <div className="text-xs text-stone-500">Solde actuel</div>
                <div className={"text-2xl font-semibold " + (c.solde < 20000 ? "text-red-700" : "text-stone-900")}>
                  {fmt(c.solde)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="bg-white border border-stone-200 rounded-sm p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
            <Plus size={16} className="text-emerald-600" /> Recharger <strong>{selected.nom}</strong>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Montant (FCFA)</label>
            <input type="number" value={montant} onChange={(e) => setMontant(e.target.value)}
              placeholder="500000"
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" autoFocus />
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Note (optionnel)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Ex : Recharge trimestrielle T1 2026"
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
          </div>

          {msg && (
            <div className={"text-xs p-2 rounded-sm border " + (msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
              {msg.text}
            </div>
          )}

          <button onClick={valider} disabled={envoi || !montant}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm py-3 rounded-sm font-semibold">
            {envoi ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {envoi ? "Traitement..." : "Recharger le compte"}
          </button>
        </div>
      )}
    </div>
  );
}

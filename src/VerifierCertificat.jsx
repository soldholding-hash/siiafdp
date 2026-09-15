import { useState, useEffect } from "react";
import { ShieldCheck, ShieldX, Search, Loader2, ExternalLink } from "lucide-react";
import { verifierCertificatPublic } from "./lib/certificat";

export default function VerifierCertificat({ codeInitial, BlasonCongo }) {
  const [code, setCode] = useState(codeInitial || "");
  const [resultat, setResultat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function verifier(c) {
    const q = (c || code).trim().toUpperCase();
    if (!q) return;
    setLoading(true);
    setErr(null);
    setResultat(null);
    try {
      const res = await verifierCertificatPublic(q);
      if (!res.ok) setErr("Certificat introuvable dans le registre.");
      else setResultat(res);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (codeInitial) verifier(codeInitial); }, [codeInitial]);

  return (
    <div className="min-h-screen bg-stone-100 py-8 px-4" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            {BlasonCongo ? <BlasonCongo size={70} /> : <div style={{width:70,height:70}} />}
          </div>
          <div className="text-amber-700 text-xs tracking-widest uppercase font-mono mb-1">République du Congo</div>
          <div className="text-2xl font-semibold text-stone-900">Vérification de certificat</div>
          <div className="text-sm text-stone-500 mt-1">Ministère des Affaires Foncières — SIGEF-AFDP</div>
        </div>

        <div className="bg-white rounded-sm border border-stone-200 p-6 mb-6">
          <label className="text-xs font-mono text-stone-500 block mb-2">Code de vérification</label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && verifier()}
              placeholder="Ex : BD17A3F8"
              className="flex-1 border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button onClick={() => verifier()} disabled={loading || !code.trim()}
              className="text-xs px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1.5">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Vérifier
            </button>
          </div>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm text-red-800 flex items-center gap-2">
            <ShieldX size={18} /> {err}
          </div>
        )}

        {resultat && (
          <div className={"rounded-sm border-2 p-6 " + (resultat.valide ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300")}>
            <div className="flex items-center gap-3 mb-4">
              {resultat.valide ? <ShieldCheck className="text-emerald-600" size={32} /> : <ShieldX className="text-red-600" size={32} />}
              <div>
                <div className={"text-lg font-bold " + (resultat.valide ? "text-emerald-800" : "text-red-800")}>
                  {resultat.valide ? "CERTIFICAT VALIDE" : "CERTIFICAT INVALIDE"}
                </div>
                <div className={"text-xs " + (resultat.valide ? "text-emerald-700" : "text-red-700")}>
                  {resultat.valide ? "Signature cryptographique vérifiée" : "La signature ne correspond pas"}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-sm p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Type</span><span className="font-medium">{resultat.type}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Référence</span><span className="font-mono font-medium">{resultat.reference}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Parcelle</span><span className="font-mono font-medium">{resultat.parcelle_id}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Banque bénéficiaire</span><span className="font-medium">{resultat.banque_nom}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Montant garanti</span><span className="font-medium">{Number(resultat.montant).toLocaleString("fr-FR")} FCFA</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Dossier crédit</span><span className="font-mono">{resultat.dossier_credit}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Date de pose</span><span>{new Date(resultat.date_pose).toLocaleDateString("fr-FR")}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Échéance</span><span>{resultat.date_echeance ? new Date(resultat.date_echeance).toLocaleDateString("fr-FR") : "—"}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Statut actuel</span>
                <span className={"text-xs px-2 py-0.5 rounded-sm font-medium " + (resultat.statut === "actif" ? "bg-purple-100 text-purple-800" : "bg-stone-100 text-stone-700")}>
                  {resultat.statut === "actif" ? "Gage actif" : resultat.statut}
                </span>
              </div>
            </div>

            <div className="mt-4 text-xs text-stone-600">
              <div className="font-mono text-stone-500 mb-1">Signature SHA-256 :</div>
              <div className="font-mono break-all bg-white p-2 rounded-sm border border-stone-200 text-[10px]">
                {resultat.hash_signature}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-stone-400">
          Ce service de vérification est public et gratuit. Toute personne peut vérifier l'authenticité d'un certificat émis par le SIGEF.
        </div>
      </div>
    </div>
  );
}

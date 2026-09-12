import { useState, useEffect } from "react";
import { Users, Plus, X, Loader2, CheckCircle2 } from "lucide-react";
import { chargerMesAgents, creerAgent } from "./lib/agents";
import { supabase } from "./lib/db";

function ModalAjout({ onClose, onDone }) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("agent_gestion");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function valider() {
    if (!nom || !email || !password) { setErr("Tous les champs sont obligatoires"); return; }
    if (password.length < 6) { setErr("Mot de passe : 6 caractères minimum"); return; }
    setLoading(true);
    try {
      const res = await creerAgent(email, password, nom, role);
      if (!res.ok) { setErr("Erreur : " + res.raison); }
      else { onDone(); }
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="text-base font-semibold">Ajouter un agent</div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Nom complet</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)}
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" autoFocus />
          </div>
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Email professionnel</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@mucodec.cg"
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Mot de passe provisoire</label>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Rôle</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm">
              <option value="agent_gestion">Agent de gestion — peut consulter, gager, lever</option>
              <option value="agent_lecture">Agent lecture seule — peut seulement consulter</option>
            </select>
          </div>
          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button onClick={valider} disabled={loading}
            className="text-xs px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-sm">
            {loading ? "Création..." : "Créer l'agent"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MesAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAjout, setShowAjout] = useState(false);
  const [monId, setMonId] = useState(null);

  async function charger() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setMonId(user?.id);
      if (user) setAgents(await chargerMesAgents(user.id));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { charger(); }, []);

  async function apresAjout() {
    setShowAjout(false);
    await charger();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-semibold text-stone-900">Mes agents</div>
          <div className="text-sm text-stone-500 mt-1">
            Créez des agents qui opèrent sur votre portefeuille partagé
          </div>
        </div>
        <button onClick={() => setShowAjout(true)}
          className="text-xs px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-sm flex items-center gap-1.5">
          <Plus size={14} /> Ajouter un agent
        </button>
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-sm p-4">
        <div className="text-xs text-stone-600">
          <strong>Comment ça marche :</strong> tous les agents que vous créez partagent le même solde que vous.
          Un agent de gestion peut consulter des biens et poser des gages, dont les frais sont débités de votre compte.
          Un agent en lecture seule peut uniquement consulter.
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm">
          <Loader2 className="animate-spin" size={16} /> Chargement...
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <Users size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">Aucun agent pour l'instant</div>
          <div className="text-xs text-stone-400 mt-1">Cliquez sur « Ajouter un agent » pour commencer</div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4">Nom</th>
                <th className="text-left py-3 px-4">Rôle</th>
                <th className="text-left py-3 px-4">Créé le</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-b border-stone-100">
                  <td className="py-3 px-4 font-medium text-stone-800">{a.nom_complet || "—"}</td>
                  <td className="py-3 px-4">
                    <span className={"text-xs px-2 py-0.5 rounded-sm " + (
                      a.role === "agent_gestion" ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-700"
                    )}>
                      {a.role === "agent_gestion" ? "Gestion" : "Lecture seule"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-stone-500">
                    {new Date(a.created_at).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAjout && <ModalAjout onClose={() => setShowAjout(false)} onDone={apresAjout} />}
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  Mail, MailOpen, Send, Inbox, Trash2, RefreshCw, Loader2, X,
  Paperclip, AlertCircle, CheckCheck, Plus, Search, User, Users, Building2
} from "lucide-react";
import {
  listerMessagesRecus, listerMessagesEnvoyes, marquerMessageLu,
  supprimerMessage, envoyerMessage, uploaderPieceJointe
} from "./lib/messagerie";

const PRIORITE_INFO = {
  basse: { label: "Basse", couleur: "bg-stone-100 text-stone-700" },
  normale: { label: "Normale", couleur: "bg-blue-100 text-blue-800" },
  haute: { label: "Haute", couleur: "bg-amber-100 text-amber-800" },
  urgente: { label: "Urgente", couleur: "bg-red-100 text-red-800" },
};

const TYPE_INFO = {
  message: { label: "Message", icone: Mail },
  notification: { label: "Notification", icone: AlertCircle },
  circulaire: { label: "Circulaire", icone: Users },
  demande: { label: "Demande", icone: Inbox },
  reponse: { label: "Réponse", icone: CheckCheck },
  systeme: { label: "Système", icone: AlertCircle },
};

// Destinataires disponibles (rôles de services)
const DESTINATAIRES_ROLES = [
  { value: "topographie", label: "Brigade Topographique" },
  { value: "conservation", label: "Conservation foncière" },
  { value: "domaine", label: "Direction du Domaine Public" },
  { value: "guichet", label: "Guichet unique" },
  { value: "contentieux", label: "Contentieux" },
  { value: "tresor", label: "Trésor / DAF" },
  { value: "inspection", label: "Inspection Générale" },
  { value: "rh", label: "Ressources Humaines" },
  { value: "direction", label: "Direction Générale" },
  { value: "justice", label: "Tribunal (TGI)" },
  { value: "banque", label: "Banques partenaires" },
  { value: "notaire", label: "Notaires" },
  { value: "huissier", label: "Huissiers de justice" },
  { value: "principal", label: "Administrateur" },
];

// ---------- Modal : Composer un message ----------
function ModalComposer({ onClose, onDone }) {
  const [form, setForm] = useState({
    sujet: "",
    corps: "",
    type: "message",
    priorite: "normale",
  });
  const [destinataires, setDestinataires] = useState([]);
  const [fichiers, setFichiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  function ajouterDestinataire(role) {
    if (!destinataires.includes(role)) {
      setDestinataires([...destinataires, role]);
    }
  }

  function retirerDestinataire(role) {
    setDestinataires(destinataires.filter((d) => d !== role));
  }

  async function valider() {
    if (destinataires.length === 0) { setErr("Au moins un destinataire requis"); return; }
    if (!form.sujet.trim()) { setErr("Sujet obligatoire"); return; }
    if (!form.corps.trim()) { setErr("Corps du message obligatoire"); return; }
    setLoading(true);
    try {
      const payload = destinataires.map((r) => ({ role: r }));
      const res = await envoyerMessage({
        sujet: form.sujet.trim(),
        corps: form.corps.trim(),
        type: form.type,
        priorite: form.priorite,
        destinataires: payload,
      });
      if (!res.ok) { setErr(res.raison); setLoading(false); return; }

      // Upload des pièces jointes
      if (fichiers.length > 0 && res.message_id) {
        for (const f of fichiers) {
          await uploaderPieceJointe(f, res.message_id);
        }
      }
      onDone();
    } catch (e) { setErr(e.message); setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-2xl my-4">
        <div className="bg-indigo-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send size={18} />
            <div className="text-sm font-semibold">Nouveau message</div>
          </div>
          <button onClick={onClose} className="text-indigo-200 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Destinataires */}
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-2">
              Destinataires ({destinataires.length})
            </label>
            {destinataires.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {destinataires.map((r) => {
                  const info = DESTINATAIRES_ROLES.find((d) => d.value === r);
                  return (
                    <span key={r} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-indigo-100 text-indigo-800 rounded-sm">
                      {info?.label || r}
                      <button onClick={() => retirerDestinataire(r)} className="hover:text-red-600">
                        <X size={11} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="border border-stone-200 rounded-sm max-h-40 overflow-y-auto">
              {DESTINATAIRES_ROLES.filter((d) => !destinataires.includes(d.value)).map((d) => (
                <button
                  key={d.value}
                  onClick={() => ajouterDestinataire(d.value)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 border-b border-stone-100"
                >
                  + {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Sujet</label>
            <input
              value={form.sujet}
              onChange={(e) => setForm({ ...form, sujet: e.target.value })}
              placeholder="Ex: Nouveau dossier à instruire"
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm"
              >
                <option value="message">Message</option>
                <option value="demande">Demande</option>
                <option value="notification">Notification</option>
                <option value="circulaire">Circulaire</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Priorité</label>
              <select
                value={form.priorite}
                onChange={(e) => setForm({ ...form, priorite: e.target.value })}
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm"
              >
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Message</label>
            <textarea
              value={form.corps}
              onChange={(e) => setForm({ ...form, corps: e.target.value })}
              rows={6}
              placeholder="Bonjour,&#10;&#10;Un nouveau dossier vous est transmis..."
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">
              <Paperclip size={11} className="inline" /> Pièces jointes (optionnel)
            </label>
            <input
              type="file"
              multiple
              onChange={(e) => setFichiers(Array.from(e.target.files || []))}
              className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
            />
            {fichiers.length > 0 && (
              <div className="text-xs text-emerald-700 mt-1">
                {fichiers.length} fichier(s) prêt(s) à l'envoi
              </div>
            )}
          </div>

          {err && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2 flex items-center gap-2">
              <AlertCircle size={14} /> {err}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">
            Annuler
          </button>
          <button
            onClick={valider}
            disabled={loading}
            className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-sm inline-flex items-center gap-1"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {loading ? "Envoi..." : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Modal : Lire un message ----------
function ModalLire({ message, onClose, onMarquerLu }) {
  const [marque, setMarque] = useState(message.lu || false);

  useEffect(() => {
    if (!marque && message._dest_id) {
      marquerMessageLu(message._dest_id).then(() => {
        setMarque(true);
        if (onMarquerLu) onMarquerLu();
      });
    }
  }, []);

  const TypeIcone = TYPE_INFO[message.type]?.icone || Mail;

  return (
    <div className="fixed inset-0 bg-stone-900/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-3xl my-4">
        <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TypeIcone size={18} />
            <div className="text-sm font-semibold truncate">{message.sujet}</div>
          </div>
          <button onClick={onClose} className="text-stone-300 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex items-start justify-between border-b border-stone-200 pb-3">
            <div>
              <div className="text-sm font-semibold text-stone-800">{message.expediteur_nom || "Inconnu"}</div>
              <div className="text-xs text-stone-500">{message.expediteur_role || "—"}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-stone-500">
                {new Date(message.created_at).toLocaleString("fr-FR")}
              </div>
              <span className={"inline-block mt-1 text-xs px-2 py-0.5 rounded-sm " + (PRIORITE_INFO[message.priorite]?.couleur || "")}>
                {PRIORITE_INFO[message.priorite]?.label || "Normale"}
              </span>
            </div>
          </div>
          <div className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
            {message.corps}
          </div>
          {message.reference_dossier && (
            <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-sm p-2">
              Dossier lié : <strong>{message.reference_dossier}</strong>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-4 py-2 bg-stone-700 hover:bg-stone-800 text-white rounded-sm">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Composant principal ----------
export default function Messagerie({ currentUser }) {
  const [onglet, setOnglet] = useState("recus");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageOuvert, setMessageOuvert] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [recherche, setRecherche] = useState("");

  async function charger() {
    setLoading(true);
    let data = [];
    if (onglet === "recus") data = await listerMessagesRecus("tous", currentUser?.username);
    else if (onglet === "non_lus") data = await listerMessagesRecus("non_lus", currentUser?.username);
    else if (onglet === "envoyes") data = await listerMessagesEnvoyes();
    setMessages(data);
    setLoading(false);
  }

  useEffect(() => { charger(); }, [onglet]);

  async function supprimer(destId, e) {
    e.stopPropagation();
    if (!confirm("Supprimer ce message ?")) return;
    await supprimerMessage(destId);
    setMsg({ ok: true, text: "Message supprimé" });
    await charger();
    setTimeout(() => setMsg(null), 3000);
  }

  async function apresEnvoi() {
    setComposeOpen(false);
    setMsg({ ok: true, text: "Message envoyé" });
    await charger();
    setTimeout(() => setMsg(null), 3000);
  }

  const filtres = [
    { id: "recus", label: "Reçus", icone: Inbox },
    { id: "non_lus", label: "Non lus", icone: Mail },
    { id: "envoyes", label: "Envoyés", icone: Send },
  ];

  const messagesFiltres = messages.filter((m) => {
    if (!recherche.trim()) return true;
    const r = recherche.toLowerCase();
    return (
      (m.sujet || "").toLowerCase().includes(r) ||
      (m.corps || "").toLowerCase().includes(r) ||
      (m.expediteur_nom || "").toLowerCase().includes(r)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Mail className="text-indigo-700" size={26} />
            <div className="text-2xl font-semibold text-stone-900">Messagerie interne</div>
          </div>
          <div className="text-sm text-stone-500 mt-1">
            Communications entre services du SIIAFDP
          </div>
        </div>
        <button
          onClick={() => setComposeOpen(true)}
          className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm inline-flex items-center gap-1.5"
        >
          <Plus size={14} /> Nouveau message
        </button>
      </div>

      {msg && (
        <div className={"text-xs p-2 rounded-sm border " + (msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
          {msg.text}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {filtres.map((f) => {
          const Icone = f.icone;
          return (
            <button
              key={f.id}
              onClick={() => setOnglet(f.id)}
              className={"text-xs px-3 py-2 rounded-sm border inline-flex items-center gap-1.5 " + (
                onglet === f.id
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-stone-600 border-stone-200 hover:border-indigo-400"
              )}
            >
              <Icone size={12} /> {f.label}
            </button>
          );
        })}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" size={13} />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher..."
            className="w-full border border-stone-200 rounded-sm pl-7 pr-3 py-1.5 text-xs"
          />
        </div>
        <button onClick={charger} className="text-xs p-2 text-stone-500 hover:text-indigo-600">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm p-6">
          <Loader2 className="animate-spin" size={16} /> Chargement...
        </div>
      ) : messagesFiltres.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <Inbox size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">
            {onglet === "envoyes" ? "Aucun message envoyé" : onglet === "non_lus" ? "Aucun message non lu" : "Aucun message reçu"}
          </div>
          <div className="text-xs text-stone-400 mt-1">
            Cliquez sur "Nouveau message" pour commencer
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {messagesFiltres.map((m) => {
            const TypeIcone = TYPE_INFO[m.type]?.icone || Mail;
            const nonLu = !m.lu && onglet !== "envoyes";
            return (
              <div
                key={m.id + (m._dest_id || "")}
                onClick={() => setMessageOuvert(m)}
                className={"bg-white border rounded-sm p-4 cursor-pointer hover:border-indigo-400 transition-colors " + (nonLu ? "border-indigo-300 bg-indigo-50/30" : "border-stone-200")}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-sm bg-indigo-100 flex items-center justify-center shrink-0">
                    <TypeIcone className="text-indigo-700" size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {nonLu && <span className="w-2 h-2 bg-indigo-600 rounded-full shrink-0" />}
                      <div className={"text-sm truncate " + (nonLu ? "font-semibold text-stone-900" : "font-medium text-stone-700")}>
                        {m.sujet}
                      </div>
                    </div>
                    <div className="text-xs text-stone-500 mb-1">
                      <User size={10} className="inline" /> {m.expediteur_nom || "Inconnu"} — {m.expediteur_role || "—"}
                    </div>
                    <div className="text-xs text-stone-400 line-clamp-1">
                      {m.corps?.slice(0, 100)}...
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-stone-400">
                      {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="mt-1 flex items-center justify-end gap-1">
                      <span className={"inline-block text-[10px] px-1.5 py-0.5 rounded-sm " + (PRIORITE_INFO[m.priorite]?.couleur || "")}>
                        {PRIORITE_INFO[m.priorite]?.label}
                      </span>
                      {onglet !== "envoyes" && (
                        <button
                          onClick={(e) => supprimer(m._dest_id, e)}
                          className="text-stone-400 hover:text-red-600 ml-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {messageOuvert && (
        <ModalLire
          message={messageOuvert}
          onClose={() => setMessageOuvert(null)}
          onMarquerLu={charger}
        />
      )}
      {composeOpen && (
        <ModalComposer onClose={() => setComposeOpen(false)} onDone={apresEnvoi} />
      )}
    </div>
  );
}

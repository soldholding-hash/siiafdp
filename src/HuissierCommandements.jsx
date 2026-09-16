import { useState, useEffect } from "react";
import {
  FileText, Plus, Loader2, X, Upload, Bell, Calendar, Check,
  ExternalLink, AlertCircle, Award
} from "lucide-react";
import {
  chargerMonProfilHuissier,
  listerMesCommandements,
  creerCommandement,
  uploaderDocumentHuissier,
  notifierCommandement,
  enregistrerCertificat,
  uploaderBlobHuissier,
} from "./lib/huissier";
import { genererCertificatCommandement } from "./lib/pdfCertificatHuissier";

const STATUT_INFO = {
  actif: { label: "Actif", couleur: "bg-orange-100 text-orange-800" },
  notifie: { label: "Notifié", couleur: "bg-blue-100 text-blue-800" },
  converti_saisie: { label: "Converti en saisie", couleur: "bg-red-100 text-red-800" },
  mainleve: { label: "Main-levée", couleur: "bg-emerald-100 text-emerald-800" },
  expire: { label: "Expiré", couleur: "bg-stone-100 text-stone-700" },
};

const MODES = [
  { id: "main_propre", label: "Remise en main propre" },
  { id: "sms", label: "SMS" },
  { id: "email", label: "Email" },
  { id: "huissier", label: "Signification par huissier" },
  { id: "affichage", label: "Affichage public" },
];

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n || 0) + " FCFA";

// ---------- Modal : créer un commandement ----------
function ModalCreation({ huissierId, onClose, onDone }) {
  const [form, setForm] = useState({
    parcelle_id: "",
    creancier_nom: "",
    debiteur_nom: "",
    montant_pretendu: "",
    reference_acte: "",
    date_commandement: new Date().toISOString().slice(0, 10),
    date_expiration: "",
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function valider() {
    if (!form.parcelle_id.trim()) { setErr("Parcelle obligatoire"); return; }
    if (!form.creancier_nom.trim()) { setErr("Créancier obligatoire"); return; }
    if (!form.debiteur_nom.trim()) { setErr("Débiteur obligatoire"); return; }
    if (!form.montant_pretendu) { setErr("Montant obligatoire"); return; }
    setLoading(true);
    try {
      let document_pdf_url = null;
      if (file) {
        const up = await uploaderDocumentHuissier(file, `commandements/${huissierId}`);
        if (!up.ok) { setErr("Upload PDF : " + up.raison); setLoading(false); return; }
        document_pdf_url = up.url;
      }
      const res = await creerCommandement({
        huissier_id: huissierId,
        parcelle_id: form.parcelle_id.trim(),
        creancier_nom: form.creancier_nom.trim(),
        debiteur_nom: form.debiteur_nom.trim(),
        montant_pretendu: parseFloat(form.montant_pretendu),
        reference_acte: form.reference_acte.trim() || null,
        date_commandement: form.date_commandement,
        date_expiration: form.date_expiration || null,
        statut: "actif",
        document_pdf_url,
      });
      if (!res.ok) { setErr(res.raison); setLoading(false); return; }
      onDone();
    } catch (e) { setErr(e.message); setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-lg my-4">
        <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Nouveau commandement de payer</div>
          <button onClick={onClose} className="text-stone-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Parcelle (P-XXXXX)</label>
            <input value={form.parcelle_id}
              onChange={(e) => setForm({ ...form, parcelle_id: e.target.value })}
              placeholder="Ex: P-04129"
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Créancier</label>
              <input value={form.creancier_nom}
                onChange={(e) => setForm({ ...form, creancier_nom: e.target.value })}
                placeholder="Ex: Banque MUCODEC"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Débiteur</label>
              <input value={form.debiteur_nom}
                onChange={(e) => setForm({ ...form, debiteur_nom: e.target.value })}
                placeholder="Ex: SCI Malanda"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Montant (FCFA)</label>
              <input type="number" value={form.montant_pretendu}
                onChange={(e) => setForm({ ...form, montant_pretendu: e.target.value })}
                placeholder="Ex: 2500000"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Référence acte</label>
              <input value={form.reference_acte}
                onChange={(e) => setForm({ ...form, reference_acte: e.target.value })}
                placeholder="Ex: NOT-2026-0142"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Date commandement</label>
              <input type="date" value={form.date_commandement}
                onChange={(e) => setForm({ ...form, date_commandement: e.target.value })}
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Date expiration</label>
              <input type="date" value={form.date_expiration}
                onChange={(e) => setForm({ ...form, date_expiration: e.target.value })}
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Document PDF (acte signé)</label>
            <input type="file" accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:bg-orange-600 file:text-white hover:file:bg-orange-700" />
            {file && <div className="text-xs text-emerald-700 mt-1">📎 {file.name}</div>}
          </div>
          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button onClick={valider} disabled={loading}
            className="text-xs px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {loading ? "Création..." : "Créer le commandement"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Modal : notifier le commandement ----------
function ModalNotification({ commandement, onClose, onDone }) {
  const [notifie_a, setNotifieA] = useState("debiteur");
  const [mode_notification, setMode] = useState("main_propre");
  const [observation, setObservation] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function valider() {
    setLoading(true);
    try {
      let document_pdf_url = commandement.document_pdf_url;
      if (file) {
        const up = await uploaderDocumentHuissier(file, `commandements/${commandement.huissier_id}`);
        if (!up.ok) { setErr("Upload : " + up.raison); setLoading(false); return; }
        document_pdf_url = up.url;
      }
      const res = await notifierCommandement(commandement.id, {
        notifie_a, mode_notification, document_pdf_url, observation,
      });
      if (!res.ok) { setErr(res.raison); setLoading(false); return; }
      onDone();
    } catch (e) { setErr(e.message); setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-lg my-4">
        <div className="bg-blue-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Notifier le commandement</div>
          <button onClick={onClose} className="text-blue-200 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs">
            <div><strong>Parcelle :</strong> <span className="font-mono">{commandement.parcelle_id}</span></div>
            <div><strong>Créancier :</strong> {commandement.creancier_nom}</div>
            <div><strong>Débiteur :</strong> {commandement.debiteur_nom}</div>
            <div><strong>Montant :</strong> {fmt(commandement.montant_pretendu)}</div>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-2">Notifier à</label>
            <div className="space-y-1.5">
              {[{id:"debiteur",label:"Débiteur uniquement"},{id:"creancier",label:"Créancier uniquement"},{id:"les_deux",label:"Débiteur ET créancier"}].map((o) => (
                <label key={o.id} className={"flex items-center gap-2 p-2 border rounded-sm cursor-pointer text-sm " + (notifie_a === o.id ? "border-blue-500 bg-blue-50" : "border-stone-200")}>
                  <input type="radio" name="notifie_a" checked={notifie_a === o.id} onChange={() => setNotifieA(o.id)} />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Mode de notification</label>
            <select value={mode_notification} onChange={(e) => setMode(e.target.value)}
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm">
              {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Justificatif (PDF / image)</label>
            <input type="file" accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:bg-blue-600 file:text-white hover:file:bg-blue-700" />
            {file && <div className="text-xs text-emerald-700 mt-1">📎 {file.name}</div>}
            {commandement.document_pdf_url && !file && (
              <div className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                <Check size={12} className="text-emerald-600" /> Document déjà joint au dossier
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Observation</label>
            <textarea value={observation} onChange={(e) => setObservation(e.target.value)}
              rows={2} placeholder="Ex: refus de signer, absence..."
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
          </div>

          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button onClick={valider} disabled={loading}
            className="text-xs px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            {loading ? "Notification..." : "Marquer comme notifié"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Composant principal ----------
export default function HuissierCommandements() {
  const [profil, setProfil] = useState(null);
  const [commandements, setCommandements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreation, setShowCreation] = useState(false);
  const [notifCible, setNotifCible] = useState(null);
  const [msg, setMsg] = useState(null);

  async function charger() {
    setLoading(true);
    const p = await chargerMonProfilHuissier();
    setProfil(p);
    if (p) setCommandements(await listerMesCommandements(p.id));
    setLoading(false);
  }

  useEffect(() => { charger(); }, []);

  async function apresCreation() {
    setShowCreation(false);
    setMsg({ ok: true, text: "Commandement enregistré." });
    await charger();
    setTimeout(() => setMsg(null), 3000);
  }

  async function delivrerCertificat(c, typeCertificat) {
    if (!profil) return;
    try {
      setMsg({ ok: true, text: "Génération du certificat..." });
      const { doc, hash } = await genererCertificatCommandement({
        huissier: profil,
        commandement: c,
        typeCertificat,
      });
      // Générer le blob PDF
      const blob = doc.output("blob");
      // Upload vers Storage
      const up = await uploaderBlobHuissier(blob, `commandements/${profil.id}`);
      if (up.ok) {
        await enregistrerCertificat(c.id, up.url, hash);
      }
      // Télécharger localement
      doc.save(`certificat-${c.parcelle_id}-${hash}.pdf`);
      setMsg({ ok: true, text: `Certificat délivré — réf. HUIS-${hash}` });
      await charger();
      setTimeout(() => setMsg(null), 5000);
    } catch (e) {
      setMsg({ ok: false, text: "Erreur certificat : " + e.message });
    }
  }

  async function apresNotification() {
    setNotifCible(null);
    setMsg({ ok: true, text: "Commandement notifié." });
    await charger();
    setTimeout(() => setMsg(null), 3000);
  }

  if (loading) return <div className="flex items-center gap-2 text-stone-500 text-sm p-6"><Loader2 className="animate-spin" size={16} /> Chargement...</div>;
  if (!profil) return <div className="p-6"><div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-sm text-amber-900">Aucun profil huissier lié à ce compte.</div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FileText className="text-orange-700" size={26} />
            <div className="text-2xl font-semibold text-stone-900">Commandements de payer</div>
          </div>
          <div className="text-sm text-stone-500 mt-1">Commandements valant saisie immobilière — préalable à la criée</div>
        </div>
        <button onClick={() => setShowCreation(true)}
          className="text-xs px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-sm flex items-center gap-1.5">
          <Plus size={14} /> Nouveau commandement
        </button>
      </div>

      {msg && (
        <div className={"text-xs p-2 rounded-sm border " + (msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
          {msg.text}
        </div>
      )}

      {commandements.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <FileText size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">Aucun commandement enregistré</div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4">Parcelle</th>
                <th className="text-left py-3 px-4">Créancier → Débiteur</th>
                <th className="text-right py-3 px-4">Montant</th>
                <th className="text-left py-3 px-4">Référence</th>
                <th className="text-left py-3 px-4">Statut</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {commandements.map((c) => (
                <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4 font-mono text-xs font-semibold">{c.parcelle_id}</td>
                  <td className="py-3 px-4 text-xs">
                    <div>{c.creancier_nom}</div>
                    <div className="text-stone-400">→ {c.debiteur_nom}</div>
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-right">{fmt(c.montant_pretendu)}</td>
                  <td className="py-3 px-4 font-mono text-xs">{c.reference_acte || "—"}</td>
                  <td className="py-3 px-4">
                    <span className={"text-xs px-2 py-0.5 rounded-sm font-medium " + (STATUT_INFO[c.statut]?.couleur || "bg-stone-100 text-stone-700")}>
                      {STATUT_INFO[c.statut]?.label || c.statut}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {c.document_pdf_url && (
                        <a href={c.document_pdf_url} target="_blank" rel="noreferrer"
                          className="text-xs px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-sm inline-flex items-center gap-1"
                          title="Voir le document">
                          <ExternalLink size={11} />
                        </a>
                      )}
                      {c.statut === "actif" && (
                        <button onClick={() => setNotifCible(c)}
                          className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-sm inline-flex items-center gap-1">
                          <Bell size={11} /> Notifier
                        </button>
                      )}
                      {c.statut === "notifie" && (
                        <button onClick={() => delivrerCertificat(c, "non_contestation")}
                          className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm inline-flex items-center gap-1"
                          title="Délivrer un certificat de non-contestation">
                          <Award size={11} /> Certificat
                        </button>
                      )}
                      {c.statut === "notifie" && c.notifie_le && (
                        <div className="text-xs text-stone-500 inline-flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(c.notifie_le).toLocaleDateString("fr-FR")}
                        </div>
                      )}
                      {c.certificat_url && (
                        <a href={c.certificat_url} target="_blank" rel="noreferrer"
                          className="text-xs px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-sm inline-flex items-center gap-1"
                          title="Certificat délivré">
                          <Award size={11} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 text-xs text-blue-900">
        <strong>Procédure légale :</strong> le commandement doit être signifié au débiteur (ou affiché) avant toute saisie.
        Joignez le justificatif de notification (acte signé, PV d'huissier, capture SMS/email) pour rendre l'acte opposable devant le TGI.
      </div>

      {showCreation && <ModalCreation huissierId={profil.id} onClose={() => setShowCreation(false)} onDone={apresCreation} />}
      {notifCible && <ModalNotification commandement={notifCible} onClose={() => setNotifCible(null)} onDone={apresNotification} />}
    </div>
  );
}

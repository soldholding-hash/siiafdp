import { useState, useEffect } from "react";
import {
  Gavel, FileText, Wallet, Building2, Camera, Scale, Inbox,
  Loader2, ChevronRight, AlertTriangle
} from "lucide-react";
import { chargerMonProfilHuissier, chargerKpiHuissier } from "./lib/huissier";
import { compterMandatsEnAttente } from "./lib/mandats";

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n || 0) + " FCFA";

function Tuile({ icone: Icone, titre, sousTitre, valeur, couleur, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-stone-200 rounded-sm p-5 text-left hover:border-indigo-400 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={"w-10 h-10 rounded-sm flex items-center justify-center " + couleur}>
          <Icone size={20} className="text-white" />
        </div>
        <ChevronRight size={16} className="text-stone-300 group-hover:text-indigo-500 transition-colors" />
      </div>
      <div className="text-sm font-semibold text-stone-900 mb-1">{titre}</div>
      <div className="text-xs text-stone-500 mb-3">{sousTitre}</div>
      <div className="text-xl font-bold text-stone-900">{valeur}</div>
    </button>
  );
}

export default function HuissierDashboard({ onNaviguer }) {
  const [profil, setProfil] = useState(null);
  const [kpi, setKpi] = useState(null);
  const [nbMandats, setNbMandats] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const p = await chargerMonProfilHuissier();
      setProfil(p);
      if (p) {
        const k = await chargerKpiHuissier(p.id);
        setKpi(k);
        const nb = await compterMandatsEnAttente(p.id);
        setNbMandats(nb);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-stone-500 text-sm p-6">
        <Loader2 className="animate-spin" size={16} /> Chargement du tableau de bord...
      </div>
    );
  }

  if (!profil) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-700 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-amber-900">
            <strong>Aucun profil huissier trouve.</strong>
            <div className="mt-1 text-xs">
              Votre compte n'est pas encore lie a une etude d'huissier. Contactez l'administrateur du SIGEF.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Gavel className="text-indigo-700" size={26} />
            <div className="text-2xl font-semibold text-stone-900">
              {profil.nom_complet}
            </div>
          </div>
          <div className="text-sm text-stone-500 mt-1">
            {profil.numero_etude && <>Etude {profil.numero_etude} — </>}
            {profil.juridiction_rattachement || "Juridiction non precisee"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-stone-400">AGREMENT</div>
          <div className="text-sm font-mono text-stone-700">{profil.numero_agrement || "—"}</div>
        </div>
      </div>

      {/* Bandeau séquestre */}
      {kpi && kpi.sequestre > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="text-emerald-700" size={22} />
            <div>
              <div className="text-xs font-mono text-emerald-700 uppercase">Compte sequestre</div>
              <div className="text-lg font-semibold text-emerald-900">{fmt(kpi.sequestre)}</div>
            </div>
          </div>
          <button
            onClick={() => onNaviguer("huissier_sequestre")}
            className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm"
          >
            Voir le compte
          </button>
        </div>
      )}

      {/* 5 tuiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Tuile
          icone={Inbox}
          titre="Mandats des banques"
          sousTitre="Dossiers de saisie transmis"
          valeur={nbMandats}
          couleur="bg-cyan-600"
          onClick={() => onNaviguer("huissier_mandats")}
        />
        <Tuile
          icone={Gavel}
          titre="Mesures conservatoires"
          sousTitre="Gels et saisies sur parcelles"
          valeur={kpi?.mesures ?? 0}
          couleur="bg-red-600"
          onClick={() => onNaviguer("huissier_mesures")}
        />
        <Tuile
          icone={FileText}
          titre="Commandements"
          sousTitre="Commandements de payer valant saisie"
          valeur={kpi?.commandements ?? 0}
          couleur="bg-orange-600"
          onClick={() => onNaviguer("huissier_commandements")}
        />
        <Tuile
          icone={Wallet}
          titre="Compte sequestre"
          sousTitre="Fonds consignes et mouvements"
          valeur={fmt(kpi?.sequestre)}
          couleur="bg-emerald-600"
          onClick={() => onNaviguer("huissier_sequestre")}
        />
        <Tuile
          icone={Building2}
          titre="Ventes aux encheres"
          sousTitre="Ventes immobilieres judiciaires"
          valeur={kpi?.ventes ?? 0}
          couleur="bg-indigo-600"
          onClick={() => onNaviguer("huissier_encheres")}
        />
        <Tuile
          icone={Camera}
          titre="Constats numeriques"
          sousTitre="PV geolocalises sur parcelles"
          valeur={kpi?.constats ?? 0}
          couleur="bg-purple-600"
          onClick={() => onNaviguer("huissier_constats")}
        />
        <Tuile
          icone={Scale}
          titre="Dossiers TGI"
          sousTitre="Liaison avec le tribunal"
          valeur="—"
          couleur="bg-stone-700"
          onClick={() => onNaviguer("huissier_tgi")}
        />
      </div>

      {/* Note légale */}
      <div className="bg-stone-50 border border-stone-200 rounded-sm p-4 text-xs text-stone-600">
        <strong>Note :</strong> toutes les actions realisees par l'huissier (pose/levee de gel,
        commandements, constats, ventes) sont journalisees et opposables devant le TGI de
        {" "}{profil.juridiction_rattachement || "Brazzaville"}.
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import Peer from "peerjs";
import { supabase } from "./lib/db";
import {
  Phone, PhoneOff, PhoneCall, Mic, MicOff, Volume2,
  X, Users, Circle, Loader2, User, Radio
} from "lucide-react";

let AGENTS = [];

async function chargerAnnuaire() {
  const { data, error } = await supabase
    .from("numeros_voip")
    .select("numero, username, nom_complet, service, type_compte")
    .eq("actif", true)
    .order("numero");
  if (error) { console.error(error); return []; }
  return (data || []).map((r) => ({
    id: r.username,
    numero: r.numero,
    nom: r.nom_complet,
    service: r.service,
    type: r.type_compte,
  }));
}

export default function AppelVoIP({ currentUser }) {
  const [ouvert, setOuvert] = useState(false);
  const [annuaire, setAnnuaire] = useState([]);
  const [monNumero, setMonNumero] = useState(null);
  const [monPeerId, setMonPeerId] = useState(null);
  const [statut, setStatut] = useState("inactif");
  const [appelEnCours, setAppelEnCours] = useState(null);
  const [appelEntrant, setAppelEntrant] = useState(null);
  const [microActif, setMicroActif] = useState(true);
  const [erreur, setErreur] = useState(null);

  const peerRef = useRef(null);
  const appelRef = useRef(null);
  const audioRef = useRef(null);
  const monId = currentUser?.username?.split("@")[0] || "anonyme";

  useEffect(() => {
    chargerAnnuaire().then((liste) => {
      AGENTS = liste;
      setAnnuaire(liste);
      const moi = liste.find((a) => a.id === monId);
      if (moi) setMonNumero(moi.numero);
    });
  }, [monId]);

  useEffect(() => {
    const peer = new Peer("siiafdp-" + monId, { debug: 1 });
    peer.on("open", (id) => {
      setMonPeerId(id);
      setStatut("en_ligne");
    });
    peer.on("error", (err) => {
      if (err.type === "unavailable-id") {
        setErreur("Vous êtes déjà connecté ailleurs.");
      } else {
        setErreur("Erreur VoIP : " + err.message);
      }
    });
    peer.on("call", (call) => {
      const expId = call.peer.replace("siiafdp-", "");
      const expInfo = AGENTS.find((a) => a.id === expId);
      setAppelEntrant({
        call,
        de: expInfo?.nom || expId,
        deId: expId,
        deNumero: expInfo?.numero,
      });
    });
    peerRef.current = peer;
    return () => { if (peerRef.current) peerRef.current.destroy(); };
  }, [monId]);

  function appelerAgent(agent) {
    if (!peerRef.current || !monPeerId) {
      setErreur("VoIP pas encore prêt.");
      return;
    }
    setErreur(null);
    setStatut("appel");
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const call = peerRef.current.call("siiafdp-" + agent.id, stream);
        appelRef.current = call;
        setAppelEnCours({ avec: agent.nom, numero: agent.numero });
        call.on("stream", (remote) => {
          if (audioRef.current) {
            audioRef.current.srcObject = remote;
            audioRef.current.play().catch(() => {});
          }
        });
        call.on("close", terminerAppel);
        call.on("error", terminerAppel);
      })
      .catch((err) => {
        setErreur("Micro inaccessible : " + err.message);
        setStatut("en_ligne");
      });
  }

  function repondreAppel() {
    if (!appelEntrant) return;
    const call = appelEntrant.call;
    setStatut("en_ligne");
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        call.answer(stream);
        appelRef.current = call;
        setAppelEnCours({ avec: appelEntrant.de, numero: appelEntrant.deNumero });
        call.on("stream", (remote) => {
          if (audioRef.current) {
            audioRef.current.srcObject = remote;
            audioRef.current.play().catch(() => {});
          }
        });
        call.on("close", terminerAppel);
        setAppelEntrant(null);
      })
      .catch((err) => {
        setErreur("Micro inaccessible : " + err.message);
        refuserAppel();
      });
  }

  function refuserAppel() {
    if (appelEntrant?.call) try { appelEntrant.call.close(); } catch(e){}
    setAppelEntrant(null);
  }

  function terminerAppel() {
    if (appelRef.current) try { appelRef.current.close(); } catch(e){}
    appelRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    setAppelEnCours(null);
    setStatut("en_ligne");
  }

  function toggleMicro() {
    if (appelRef.current?.peerConnection) {
      appelRef.current.peerConnection.getSenders().forEach((s) => {
        if (s.track) s.track.enabled = !microActif;
      });
    }
    setMicroActif(!microActif);
  }

  const autresAgents = annuaire.filter((a) => a.id !== monId);

  return (
    <>
      <audio ref={audioRef} autoPlay />

      <button
        onClick={() => setOuvert(!ouvert)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center"
      >
        {appelEnCours ? <PhoneCall size={24} className="animate-pulse" /> : <Phone size={24} />}
        {appelEntrant && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />}
      </button>

      {appelEntrant && (
        <div className="fixed inset-0 bg-stone-900/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-sm w-full max-w-md p-6 text-center">
            <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <PhoneCall className="text-emerald-700" size={36} />
            </div>
            <div className="text-2xl font-semibold text-stone-900 mb-2">Appel entrant</div>
            <div className="text-sm text-stone-500 mb-1">{appelEntrant.de}</div>
            {appelEntrant.deNumero && (
              <div className="text-xs text-stone-400 font-mono mb-6">{appelEntrant.deNumero}</div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={refuserAppel} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-sm flex items-center justify-center gap-2 text-sm">
                <PhoneOff size={18} /> Refuser
              </button>
              <button onClick={repondreAppel} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm flex items-center justify-center gap-2 text-sm">
                <Phone size={18} /> Répondre
              </button>
            </div>
          </div>
        </div>
      )}

      {ouvert && !appelEnCours && !appelEntrant && (
        <div className="fixed bottom-24 right-6 z-40 w-80 bg-white rounded-sm border border-stone-200 shadow-2xl overflow-hidden">
          <div className="bg-emerald-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio size={16} />
              <div className="text-sm font-semibold">Appels VoIP</div>
            </div>
            <button onClick={() => setOuvert(false)} className="text-emerald-200 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="px-4 py-2 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              {statut === "en_ligne" ? (
                <><Circle size={8} className="fill-emerald-500 text-emerald-500" /><span className="text-emerald-700 font-medium">En ligne</span></>
              ) : (
                <><Loader2 size={10} className="animate-spin text-amber-600" /><span className="text-amber-700">Connexion...</span></>
              )}
            </div>
            <div className="text-stone-700 font-mono text-[11px] font-semibold">
              {monNumero || "—"}
            </div>
          </div>
          {erreur && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">{erreur}</div>
          )}
          <div className="max-h-80 overflow-y-auto">
            <div className="px-4 py-2 text-[10px] font-mono text-stone-500 bg-stone-50 border-b border-stone-100 flex items-center gap-1">
              <Users size={10} /> ANNUAIRE ({autresAgents.length})
            </div>
            {autresAgents.map((a) => (
              <button
                key={a.id}
                onClick={() => appelerAgent(a)}
                disabled={statut !== "en_ligne"}
                className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-stone-100 disabled:opacity-40 flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                    <User size={14} className="text-stone-500" />
                  </div>
                  <div className="text-xs">
                    <div className="font-medium text-stone-800">{a.nom}</div>
                    <div className="text-stone-500 text-[11px] font-mono">{a.numero}</div>
                  </div>
                </div>
                <Phone size={14} className="text-stone-300 group-hover:text-emerald-600" />
              </button>
            ))}
          </div>
        </div>
      )}

      {appelEnCours && (
        <div className="fixed inset-0 bg-gradient-to-br from-emerald-800 to-emerald-950 flex items-center justify-center z-50 p-4">
          <div className="text-center text-white max-w-md w-full">
            <div className="w-24 h-24 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <PhoneCall size={48} />
            </div>
            <div className="text-3xl font-semibold mb-2">{appelEnCours.avec}</div>
            {appelEnCours.numero && (
              <div className="text-emerald-200 text-sm font-mono mb-8">{appelEnCours.numero}</div>
            )}
            <div className="text-emerald-200 text-sm mb-12">En communication...</div>
            <div className="flex items-center justify-center gap-6">
              <button onClick={toggleMicro} className={"w-14 h-14 rounded-full flex items-center justify-center " + (microActif ? "bg-white/20" : "bg-red-600")}>
                {microActif ? <Mic size={22} /> : <MicOff size={22} />}
              </button>
              <button onClick={terminerAppel} className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center">
                <PhoneOff size={32} />
              </button>
              <button className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <Volume2 size={22} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

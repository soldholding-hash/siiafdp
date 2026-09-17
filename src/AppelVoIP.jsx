import { useState, useEffect, useRef } from "react";
import Peer from "peerjs";
import { supabase } from "./lib/db";
import {
  Phone, PhoneOff, PhoneCall, Mic, MicOff, Volume2,
  X, Circle, Loader2, Delete
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
  }));
}

export default function AppelVoIP({ currentUser }) {
  const [ouvert, setOuvert] = useState(false);
  const [annuaire, setAnnuaire] = useState([]);
  const [monNumero, setMonNumero] = useState(null);
  const [statut, setStatut] = useState("inactif");
  const [appelEnCours, setAppelEnCours] = useState(null);
  const [appelEntrant, setAppelEntrant] = useState(null);
  const [microActif, setMicroActif] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [numeroTape, setNumeroTape] = useState("");

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
    peer.on("open", () => setStatut("en_ligne"));
    peer.on("error", (err) => {
      if (err.type === "unavailable-id") setErreur("Déjà connecté ailleurs");
      else setErreur("Erreur VoIP : " + err.message);
    });
    peer.on("call", (call) => {
      const expId = call.peer.replace("siiafdp-", "");
      const expInfo = AGENTS.find((a) => a.id === expId);
      setAppelEntrant({
        call,
        de: expInfo?.nom || expId,
        deNumero: expInfo?.numero,
      });
    });
    peerRef.current = peer;
    return () => { if (peerRef.current) peerRef.current.destroy(); };
  }, [monId]);

  function taperChiffre(chiffre) {
    if (numeroTape.length < 12) setNumeroTape(numeroTape + chiffre);
  }

  function effacerDernier() {
    setNumeroTape(numeroTape.slice(0, -1));
  }

  function appelerNumero() {
    if (numeroTape.length < 10) {
      setErreur("Numéro incomplet (10 chiffres requis)");
      return;
    }
    const contact = annuaire.find((a) => a.numero === numeroTape && a.id !== monId);
    if (!contact) {
      setErreur("Ce numéro n'est pas dans l'annuaire");
      return;
    }
    if (!peerRef.current) {
      setErreur("VoIP pas prêt");
      return;
    }
    setErreur(null);
    setStatut("appel");
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const call = peerRef.current.call("siiafdp-" + contact.id, stream);
      appelRef.current = call;
      setAppelEnCours({ avec: contact.nom, numero: contact.numero, service: contact.service });
      call.on("stream", (remote) => {
        if (audioRef.current) {
          audioRef.current.srcObject = remote;
          audioRef.current.play().catch(() => {});
        }
      });
      call.on("close", terminerAppel);
      call.on("error", terminerAppel);
    }).catch(() => {
      setErreur("Micro inaccessible");
      setStatut("en_ligne");
    });
  }

  function repondreAppel() {
    if (!appelEntrant) return;
    const call = appelEntrant.call;
    setStatut("en_ligne");
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
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
    }).catch(() => {
      setErreur("Micro inaccessible");
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
    setNumeroTape("");
  }

  function toggleMicro() {
    if (appelRef.current?.peerConnection) {
      appelRef.current.peerConnection.getSenders().forEach((s) => {
        if (s.track) s.track.enabled = !microActif;
      });
    }
    setMicroActif(!microActif);
  }

  function formaterNumero(n) {
    if (!n) return "";
    if (n.length <= 3) return n;
    if (n.length <= 6) return n.slice(0, 3) + " " + n.slice(3);
    if (n.length <= 10) return n.slice(0, 3) + " " + n.slice(3, 6) + " " + n.slice(6);
    return n.slice(0, 3) + " " + n.slice(3, 6) + " " + n.slice(6, 10) + " " + n.slice(10);
  }

  const TOUCHES = [
    ["1", ""], ["2", "ABC"], ["3", "DEF"],
    ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
    ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
    ["*", ""], ["0", "+"], ["#", ""],
  ];

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
            <div className="text-sm text-stone-600 font-medium">{appelEntrant.de}</div>
            {appelEntrant.deNumero && (
              <div className="text-xs text-stone-400 font-mono mt-1">{appelEntrant.deNumero}</div>
            )}
            <div className="flex gap-3 mt-6">
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
              <Phone size={16} />
              <div className="text-sm font-semibold">Appels VoIP</div>
            </div>
            <button onClick={() => setOuvert(false)} className="text-emerald-200 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="px-4 py-2 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              {statut === "en_ligne" ? (
                <>
                  <Circle size={8} className="fill-emerald-500 text-emerald-500" />
                  <span className="text-emerald-700 font-medium">En ligne</span>
                </>
              ) : (
                <>
                  <Loader2 size={10} className="animate-spin text-amber-600" />
                  <span className="text-amber-700">Connexion...</span>
                </>
              )}
            </div>
            <div className="text-stone-700 font-mono text-[11px] font-semibold">
              Mon n° : {monNumero || "—"}
            </div>
          </div>

          {/* Affichage du numéro SANS le nom */}
          <div className="px-4 py-6 bg-white border-b border-stone-200 min-h-[100px] flex flex-col items-center justify-center">
            <div className="text-3xl font-mono text-stone-900 tracking-widest min-h-[40px]">
              {numeroTape ? formaterNumero(numeroTape) : <span className="text-stone-300 text-lg">Composez un numéro</span>}
            </div>
            {numeroTape.length > 0 && numeroTape.length < 10 && (
              <div className="mt-2 text-xs text-stone-400">
                {10 - numeroTape.length} chiffre{10 - numeroTape.length > 1 ? "s" : ""} restant{10 - numeroTape.length > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {erreur && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">{erreur}</div>
          )}

          <div className="p-3 grid grid-cols-3 gap-1.5 bg-stone-50">
            {TOUCHES.map(([chiffre, lettres]) => (
              <button
                key={chiffre}
                onClick={() => taperChiffre(chiffre)}
                disabled={statut !== "en_ligne"}
                className="aspect-square rounded-sm bg-white hover:bg-emerald-50 border border-stone-200 flex flex-col items-center justify-center disabled:opacity-40 transition-colors active:bg-emerald-100"
              >
                <div className="text-xl font-semibold text-stone-800">{chiffre}</div>
                {lettres && <div className="text-[9px] text-stone-400 font-mono">{lettres}</div>}
              </button>
            ))}
          </div>

          <div className="p-3 flex gap-2 border-t border-stone-200 bg-white">
            <button
              onClick={effacerDernier}
              disabled={numeroTape.length === 0}
              className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 rounded-sm flex items-center justify-center gap-1.5 text-xs font-medium"
            >
              <Delete size={14} /> Effacer
            </button>
            <button
              onClick={appelerNumero}
              disabled={numeroTape.length < 10 || statut !== "en_ligne"}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-sm flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              <Phone size={14} /> Appeler
            </button>
          </div>

          <div className="px-3 py-2 bg-amber-50 border-t border-amber-200 text-[10px] text-amber-800">
            💡 Astuce : 033-100-XXXX (services) · 033-200-XXXX (banques) · 033-300-XXXX (justice) · 033-900-XXXX (direction)
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
            {appelEnCours.service && (
              <div className="text-emerald-200 text-xs mb-1">{appelEnCours.service}</div>
            )}
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

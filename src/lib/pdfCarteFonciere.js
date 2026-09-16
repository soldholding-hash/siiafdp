import jsPDF from "jspdf";
import QRCode from "qrcode";

async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function chargerBlason() {
  try {
    const resp = await fetch("/blason-congo.png");
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) { return null; }
}

export async function telechargerCarteFonciere(carte) {
  const data = carte.data || carte || {};
  const numCarte = data.id || "CF-0000";
  const titulaire = data.titulaire || "—";
  const nin = data.nin || data.rccm || "—";
  const pin = data.pin || "----";
  const parcelles = data.parcelle_ids || [];
  const dateEmission = data.date_emission ? new Date(data.date_emission).toLocaleDateString("fr-FR") : "—";
  const dateExpiration = data.date_expiration ? new Date(data.date_expiration).toLocaleDateString("fr-FR") : "—";

  const codeVerif = "CF" + numCarte.replace(/[^0-9]/g, "").padEnd(6, "0");
  const urlVerif = `https://siiafdp.onrender.com/?verif=${codeVerif}`;

  const hash = await sha256([numCarte, titulaire, nin, parcelles.join(",")].join("#"));

  let qrDataUrl = null;
  try {
    qrDataUrl = await QRCode.toDataURL(urlVerif, { width: 300, margin: 1 });
  } catch (e) {}

  const blason = await chargerBlason();

  // Format carte bancaire : 85.6 x 54 mm
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 54] });
  const W = 85.6, H = 54;

  // Fond dégradé simulé
  doc.setFillColor(245, 240, 255);
  doc.rect(0, 0, W, H, "F");

  // Bande violette en haut
  doc.setFillColor(120, 60, 200);
  doc.rect(0, 0, W, 8, "F");

  // Blason
  if (blason) {
    try { doc.addImage(blason, "PNG", 2, 1.5, 5, 5); } catch (e) {}
  }

  // En-tête
  doc.setFont("times", "bold");
  doc.setFontSize(4.5);
  doc.setTextColor(255, 255, 255);
  doc.text("RÉPUBLIQUE DU CONGO", 9, 4, { align: "left" });
  doc.setFontSize(3);
  doc.setFont("times", "normal");
  doc.text("Carte foncière citoyenne", 9, 6.5, { align: "left" });

  // Numéro de carte en haut à droite
  doc.setFont("courier", "bold");
  doc.setFontSize(5);
  doc.setTextColor(255, 255, 255);
  doc.text(numCarte, W - 2, 5.5, { align: "right" });

  // Cadre blanc principal
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(2, 10, W - 4, H - 12, 1, 1, "F");

  // Colonne gauche : photo placeholder
  doc.setFillColor(230, 230, 230);
  doc.rect(4, 12, 20, 25, "F");
  doc.setFont("times", "italic");
  doc.setFontSize(3);
  doc.setTextColor(120, 120, 120);
  doc.text("PHOTO", 14, 25, { align: "center" });

  // Infos à droite de la photo
  let y = 15;
  doc.setFont("times", "normal");
  doc.setFontSize(3);
  doc.setTextColor(120, 120, 120);
  doc.text("TITULAIRE", 27, y);
  doc.setFont("times", "bold");
  doc.setFontSize(4.5);
  doc.setTextColor(20, 20, 20);
  doc.text(titulaire.substring(0, 35), 27, y + 3);

  y += 8;
  doc.setFont("times", "normal");
  doc.setFontSize(3);
  doc.setTextColor(120, 120, 120);
  doc.text("NIN / RCCM", 27, y);
  doc.setFont("courier", "bold");
  doc.setFontSize(4);
  doc.setTextColor(20, 20, 20);
  doc.text(nin, 27, y + 3);

  y += 8;
  doc.setFont("times", "normal");
  doc.setFontSize(3);
  doc.setTextColor(120, 120, 120);
  doc.text("NOMBRE DE PARCELLES", 27, y);
  doc.setFont("courier", "bold");
  doc.setFontSize(4);
  doc.setTextColor(120, 60, 200);
  doc.text(String(parcelles.length) + " parcelle(s)", 27, y + 3);

  // Bas de carte : dates + PIN
  doc.setDrawColor(200, 200, 200);
  doc.line(2, H - 15, W - 2, H - 15);

  doc.setFont("times", "normal");
  doc.setFontSize(2.5);
  doc.setTextColor(120, 120, 120);
  doc.text("ÉMISE LE", 4, H - 11);
  doc.setFont("courier", "bold");
  doc.setFontSize(3.5);
  doc.setTextColor(20, 20, 20);
  doc.text(dateEmission, 4, H - 8);

  doc.setFont("times", "normal");
  doc.setFontSize(2.5);
  doc.setTextColor(120, 120, 120);
  doc.text("EXPIRE LE", 30, H - 11);
  doc.setFont("courier", "bold");
  doc.setFontSize(3.5);
  doc.setTextColor(20, 20, 20);
  doc.text(dateExpiration, 30, H - 8);

  // PIN visible (dans un petit cadre à droite)
  doc.setFillColor(245, 235, 255);
  doc.roundedRect(W - 22, H - 13, 18, 9, 1, 1, "F");
  doc.setFont("times", "normal");
  doc.setFontSize(2.5);
  doc.setTextColor(120, 120, 120);
  doc.text("CODE PIN", W - 13, H - 10.5, { align: "center" });
  doc.setFont("courier", "bold");
  doc.setFontSize(5);
  doc.setTextColor(120, 60, 200);
  doc.text(pin, W - 13, H - 6, { align: "center" });

  // QR code en bas à gauche de la zone info (juste sous la photo)
  if (qrDataUrl) {
    try { doc.addImage(qrDataUrl, "PNG", 4, 39, 12, 12); } catch (e) {}
  }

  // Hash sous le QR
  doc.setFont("courier", "normal");
  doc.setFontSize(1.8);
  doc.setTextColor(140, 100, 200);
  doc.text(hash.substring(0, 32), 18, 42);
  doc.text(hash.substring(32, 64), 18, 44);

  // Code de vérification
  doc.setFont("courier", "bold");
  doc.setFontSize(3.5);
  doc.setTextColor(120, 60, 200);
  doc.text(codeVerif, 18, 48);

  doc.save(`carte-fonciere-${numCarte}.pdf`);
}

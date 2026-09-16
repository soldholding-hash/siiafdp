
async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function chargerBlason() {
  try {
    const resp = await fetch("/blason-congo.png");
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) { return null; }
}

export async function telechargerTitreFoncier(parcelle) {
  const { default: jsPDF } = await import("jspdf");
  const { default: QRCode } = await import("qrcode");
  const data = parcelle.data || parcelle || {};
  const numTitre = data.numero_titre || "NON-DEFINI";
  const proprietaire = data.proprietaire || "À identifier";
  const proprietaireInfo = data.proprietaire_info || {};
  const surface = Math.round(data.surface_m2 || data.superficie || 0);
  const arrondissement = data.arrondissement || "—";
  const quartier = data.quartier || "—";
  const section = data.section || "—";
  const lot = data.lot || "—";

  // Code de vérification
  const codeVerif = "TF" + numTitre.replace(/[^0-9]/g, "").slice(-6).padEnd(6, "0");
  const urlVerif = `https://siiafdp.onrender.com/?verif=${codeVerif}`;

  // Hash
  const chaine = [numTitre, parcelle.id, proprietaire, surface.toFixed(2)].join("#");
  const hash = await sha256(chaine);

  let qrDataUrl = null;
  try {
    qrDataUrl = await QRCode.toDataURL(urlVerif, { width: 300, margin: 1 });
  } catch (e) {}

  const blason = await chargerBlason();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, M = 15;

  // Cadre
  doc.setDrawColor(120, 90, 20);
  doc.setLineWidth(1.5);
  doc.rect(8, 8, W - 16, 281);

  // Blason
  if (blason) {
    try { doc.addImage(blason, "PNG", W / 2 - 12, 12, 24, 24); } catch (e) {}
  }

  // En-tête
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(120, 90, 20);
  doc.text("RÉPUBLIQUE DU CONGO", W / 2, 42, { align: "center" });
  doc.setFontSize(9);
  doc.text("MINISTÈRE DES AFFAIRES FONCIÈRES ET DU DOMAINE PUBLIC", W / 2, 47, { align: "center" });
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Direction Générale de la Conservation Foncière", W / 2, 51, { align: "center" });

  doc.setDrawColor(120, 90, 20);
  doc.line(M + 20, 55, W - M - 20, 55);

  // Titre
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  doc.text("TITRE FONCIER", W / 2, 68, { align: "center" });

  doc.setFont("courier", "bold");
  doc.setFontSize(14);
  doc.setTextColor(120, 60, 200);
  doc.text(numTitre, W / 2, 78, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Code de vérification : " + codeVerif, W / 2, 84, { align: "center" });

  doc.setDrawColor(180, 180, 180);
  doc.line(M + 30, 88, W - M - 30, 88);

  // Corps juridique
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  const intro = "Le Conservateur foncier de la République du Congo certifie, au vu du registre central numérique et après approbation du Ministère des Affaires Foncières, que la parcelle désignée ci-dessous est la propriété légale et exclusive du titulaire mentionné.";
  const introLines = doc.splitTextToSize(intro, W - 2 * M);
  doc.text(introLines, M, 98);

  // Tableau infos
  let y = 118;
  const ligne = (label, val, bold = false) => {
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(label, M, y);
    doc.setFont("times", bold ? "bold" : "normal");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(String(val || "—"), M + 60, y);
    y += 8;
  };

  ligne("Numéro de titre", numTitre, true);
  ligne("Référence parcelle", parcelle.id, true);
  ligne("Titulaire", proprietaire, true);
  if (proprietaireInfo.nin) ligne("NIN", proprietaireInfo.nin);
  if (proprietaireInfo.rccm) ligne("RCCM", proprietaireInfo.rccm);
  ligne("Arrondissement", arrondissement);
  ligne("Quartier", quartier);
  ligne("Section cadastrale", section);
  ligne("N° de lot", lot);
  ligne("Superficie officielle", surface.toLocaleString("fr-FR") + " m²");
  ligne("Date de délivrance", data.date_approbation || data.date_validation_technique || new Date().toLocaleDateString("fr-FR"));

  // Mention
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(M, y, W - M, y);
  y += 6;

  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const mention = "Le présent titre foncier est un document officiel, inaliénable et imprescriptible. Il confère à son titulaire la pleine propriété du bien désigné. Toute modification, vente, hypothèque ou cession doit être enregistrée auprès de la Conservation foncière et fait l'objet d'une inscription au registre central. Toute altération ou falsification de ce document est passible des peines prévues par la loi.";
  const mentionLines = doc.splitTextToSize(mention, W - 2 * M);
  doc.text(mentionLines, M, y);

  // QR code
  try {
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", M, 210, 40, 40);
    }
  } catch (e) {}

  // Bloc hash
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("SIGNATURE CRYPTOGRAPHIQUE (SHA-256)", M + 48, 220);
  doc.setFont("courier", "normal");
  doc.setFontSize(6);
  doc.setTextColor(60, 20, 120);
  const hashLines = doc.splitTextToSize(hash, W - M - 48 - M);
  doc.text(hashLines, M + 48, 226);

  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Scannez le QR code pour vérifier l'authenticité en ligne.", M + 48, 248);

  // Signatures
  y = 260;
  doc.setDrawColor(120, 90, 20);
  doc.line(M, y, W - M, y);
  y += 8;

  const sigW = (W - 2 * M - 20) / 3;
  const labels = ["Conservateur foncier", "Ministre de tutelle", "Inspection Générale"];
  labels.forEach((lab, i) => {
    const x = M + i * (sigW + 10);
    doc.setDrawColor(150, 150, 150);
    doc.rect(x, y, sigW, 25);
    doc.setFont("times", "italic");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(lab, x + sigW / 2, y + 28, { align: "center" });
  });

  // Pied
  doc.setFont("times", "italic");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Titre émis le ${new Date().toLocaleString("fr-FR")} — SIGEF-AFDP — ${numTitre}`,
    W / 2, 292, { align: "center" }
  );

  doc.save(`titre-foncier-${numTitre}.pdf`);
}

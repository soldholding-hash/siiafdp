// ============================================
// Génération de certificats d'huissier (PDF)
// ============================================

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16).toUpperCase().padStart(8, "0");
}

export async function genererCertificatCommandement({
  huissier, commandement, typeCertificat
}) {
  const { default: jsPDF } = await import("jspdf");
  const { default: QRCode } = await import("qrcode");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margeX = 20;
  let y = 20;

  // ---------- En-tête ----------
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("RÉPUBLIQUE DU CONGO", margeX, 12);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SIGEF — SYSTÈME INTÉGRÉ DE GESTION FONCIÈRE", margeX, 20);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Gestion & enregistrement foncier", margeX, 26);

  y = 45;

  // ---------- Titre ----------
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const titre = typeCertificat === "non_paiement"
    ? "CERTIFICAT DE NON-PAIEMENT"
    : typeCertificat === "non_contestation"
    ? "CERTIFICAT DE NON-CONTESTATION"
    : "PROCÈS-VERBAL DE NOTIFICATION";
  doc.text(titre, W / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(`Référence : ${commandement.id.slice(0, 8).toUpperCase()}`, W / 2, y, { align: "center" });
  y += 12;

  // ---------- Cadre huissier ----------
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.rect(margeX, y, W - 2 * margeX, 22, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("ÉTUDE D'HUISSIER DE JUSTICE", margeX + 4, y + 6);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(huissier.nom_complet, margeX + 4, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `N° étude : ${huissier.numero_etude || "—"}  •  Juridiction : ${huissier.juridiction_rattachement || "—"}`,
    margeX + 4, y + 17
  );
  y += 30;

  // ---------- Corps ----------
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);

  const contenu = typeCertificat === "non_paiement"
    ? [
        `Nous, huissier de justice soussigné, certifions que le commandement de payer ci-dessous désigné a été régulièrement signifié au débiteur et que, malgré cette signification, le débiteur n'a pas procédé au paiement dans les délais légaux.`,
        `En conséquence, la procédure de saisie immobilière peut être engagée sur la parcelle visée.`,
      ]
    : typeCertificat === "non_contestation"
    ? [
        `Nous, huissier de justice soussigné, certifions qu'aucune opposition ni contestation n'a été formée par le débiteur dans les délais légaux suivant la signification du commandement de payer ci-dessous désigné.`,
        `Le présent certificat est délivré pour servir et valoir ce que de droit.`,
      ]
    : [
        `Nous, huissier de justice soussigné, attestons avoir procédé à la signification du commandement de payer ci-dessous désigné au débiteur, conformément aux dispositions légales en vigueur.`,
        `La présente attestation vaut preuve de notification et est opposable devant le Tribunal de Grande Instance.`,
      ];

  contenu.forEach((p) => {
    const lignes = doc.splitTextToSize(p, W - 2 * margeX);
    doc.text(lignes, margeX, y);
    y += lignes.length * 5 + 4;
  });

  y += 4;

  // ---------- Tableau détails ----------
  doc.setFillColor(240, 240, 240);
  doc.rect(margeX, y, W - 2 * margeX, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DÉTAILS DU COMMANDEMENT", margeX + 3, y + 5);
  y += 10;

  const lignes = [
    ["Parcelle concernée", commandement.parcelle_id],
    ["Créancier", commandement.creancier_nom],
    ["Débiteur", commandement.debiteur_nom],
    ["Montant prétendu", new Intl.NumberFormat("fr-FR").format(commandement.montant_pretendu) + " FCFA"],
    ["Référence acte", commandement.reference_acte || "—"],
    ["Date du commandement", commandement.date_commandement ? new Date(commandement.date_commandement).toLocaleDateString("fr-FR") : "—"],
    ["Statut", commandement.statut],
  ];

  if (commandement.notifie_le) {
    lignes.push(["Date de notification", new Date(commandement.notifie_le).toLocaleString("fr-FR")]);
    lignes.push(["Notifié à", commandement.notifie_a === "les_deux" ? "Débiteur et créancier" : commandement.notifie_a]);
    lignes.push(["Mode", commandement.mode_notification || "—"]);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  lignes.forEach(([label, valeur]) => {
    doc.setTextColor(100, 100, 100);
    doc.text(label, margeX + 2, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(String(valeur), margeX + 65, y);
    doc.setFont("helvetica", "normal");
    y += 6;
  });

  y += 8;

  // ---------- QR code de vérification ----------
  const hash = hashString(
    commandement.id + commandement.parcelle_id + commandement.statut + Date.now()
  );
  const verifUrl = `https://siiafdp.onrender.com/verifier/HUIS-${hash}`;
  const qrDataUrl = await QRCode.toDataURL(verifUrl, { width: 200, margin: 1 });

  doc.addImage(qrDataUrl, "PNG", W - margeX - 30, y, 30, 30);

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Vérification en ligne", W - margeX - 30, y + 33);
  doc.setFont("courier", "normal");
  doc.text(`HUIS-${hash}`, W - margeX - 30, y + 37);

  // ---------- Mention légale ----------
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const mention = "Document officiel généré électroniquement par la plateforme SIGEF. Toute modification du présent document constitue un faux et usage de faux au sens du Code pénal congolais.";
  const mentionLignes = doc.splitTextToSize(mention, W - 2 * margeX - 40);
  doc.text(mentionLignes, margeX, y);

  // ---------- Pied de page ----------
  y = 275;
  doc.setDrawColor(200, 200, 200);
  doc.line(margeX, y, W - margeX, y);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(`Délivré le ${new Date().toLocaleString("fr-FR")}`, margeX, y + 5);
  doc.text(`Fait à ${huissier.juridiction_rattachement || "Brazzaville"}`, W - margeX, y + 5, { align: "right" });

  return { doc, hash };
}

export async function telechargerCertificatHuissier(params) {
  const { doc, hash } = await genererCertificatCommandement(params);
  const filename = `certificat-${params.commandement.id.slice(0, 8)}.pdf`;
  doc.save(filename);
  return { ok: true, hash, filename };
}

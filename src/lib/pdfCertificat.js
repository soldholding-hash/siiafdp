import jsPDF from "jspdf";
import QRCode from "qrcode";

export async function telechargerCertificat(data) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const M = 20;

  // Cadre doré
  doc.setDrawColor(180, 130, 30);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, W - 20, 277);

  doc.setDrawColor(180, 130, 30);
  doc.setLineWidth(0.3);
  doc.rect(13, 13, W - 26, 271);

  // En-tête
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(120, 90, 20);
  doc.text("RÉPUBLIQUE DU CONGO", W / 2, 25, { align: "center" });
  doc.setFontSize(9);
  doc.text("MINISTÈRE DES AFFAIRES FONCIÈRES ET DU DOMAINE PUBLIC", W / 2, 31, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Système d'Information Intégré des Affaires Foncières et du Domaine Public", W / 2, 36, { align: "center" });

  // Titre
  doc.setDrawColor(180, 130, 30);
  doc.setLineWidth(0.5);
  doc.line(M + 30, 43, W - M - 30, 43);

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text("CERTIFICAT DE GAGE FONCIER", W / 2, 55, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("times", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(`Référence : ${data.reference}`, W / 2, 63, { align: "center" });

  doc.setDrawColor(180, 130, 30);
  doc.line(M + 30, 68, W - M - 30, 68);

  // Corps
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  const intro = "Le Conservateur foncier de la République du Congo certifie, au vu du registre central numérique, les informations suivantes :";
  const introLines = doc.splitTextToSize(intro, W - 2 * M);
  doc.text(introLines, M, 80);

  // Tableau des infos
  let y = 100;
  const ligne = (label, valeur, bold = false) => {
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(label, M, y);
    doc.setFont("times", bold ? "bold" : "normal");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(String(valeur), M + 60, y);
    y += 10;
  };

  ligne("Référence du gage", data.reference || "—", true);
  ligne("Parcelle concernée", data.parcelle_id || "—", true);
  ligne("Institution bancaire", data.banque_nom || "—", true);
  ligne("Montant garanti", `${Number(data.montant || 0).toLocaleString("fr-FR")} FCFA`);
  ligne("Dossier de crédit", data.dossier_credit || "—");
  ligne("Date de constitution", new Date(data.date_pose).toLocaleDateString("fr-FR"));
  ligne("Date d'échéance", data.date_echeance ? new Date(data.date_echeance).toLocaleDateString("fr-FR") : "—");

  // Mention finale
  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(M, y, W - M, y);
  y += 8;

  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const mention = "Ce certificat atteste que la parcelle désignée ci-dessus est grevée d'un gage foncier au profit de l'institution mentionnée. Il peut être vérifié à tout moment par tout tiers via le code de vérification ci-dessous. Toute modification ultérieure du statut du bien est notifiée automatiquement.";
  const mentionLines = doc.splitTextToSize(mention, W - 2 * M);
  doc.text(mentionLines, M, y);

  // QR code
  try {
    const qrDataUrl = await QRCode.toDataURL(data.url, { width: 200, margin: 1 });
    doc.addImage(qrDataUrl, "PNG", M, 210, 45, 45);
  } catch (e) { console.error("QR:", e); }

  // Bloc code + hash
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("CODE DE VÉRIFICATION", M + 55, 218);
  doc.setFont("courier", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(data.code, M + 55, 228);

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("SIGNATURE CRYPTOGRAPHIQUE (SHA-256)", M + 55, 240);

  doc.setFont("courier", "normal");
  doc.setFontSize(6);
  doc.setTextColor(60, 60, 60);
  const hashLines = doc.splitTextToSize(data.hash, W - M - 60 - M);
  doc.text(hashLines, M + 55, 246);

  doc.setFontSize(8);
  doc.setFont("times", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("Scannez le QR code pour vérifier l'authenticité en ligne.", M + 55, 260);

  // Pied de page
  doc.setDrawColor(180, 130, 30);
  doc.setLineWidth(0.5);
  doc.line(M, 275, W - M, 275);
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Émis le ${new Date().toLocaleString("fr-FR")} — SIGEF-AFDP`, W / 2, 281, { align: "center" });

  doc.save(`${data.reference}.pdf`);
}

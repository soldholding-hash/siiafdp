import jsPDF from "jspdf";

const lettre = (i) => String.fromCharCode(65 + (i % 26));

function normaliserPolygone(bornes) {
  if (!bornes || bornes.length < 2) return [];
  const lats = bornes.map((b) => b[0]);
  const lngs = bornes.map((b) => b[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const largeur = maxLng - minLng || 0.0001;
  const hauteur = maxLat - minLat || 0.0001;
  const pad = 30, W = 400, H = 300;
  const scale = Math.min((W - 2 * pad) / largeur, (H - 2 * pad) / hauteur);
  const offsetX = (W - largeur * scale) / 2;
  const offsetY = (H - hauteur * scale) / 2;
  return bornes.map((b) => [
    offsetX + (b[1] - minLng) * scale,
    H - offsetY - (b[0] - minLat) * scale,
  ]);
}

export function telechargerPlanBornage(parcelle) {
  const data = parcelle.data || parcelle || {};
  const bornes = data.polygone || [];
  const distances = data.distances || {};
  const surface = data.surface_m2 || data.superficie || 0;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, M = 15;

  // Cadre
  doc.setDrawColor(120, 90, 20);
  doc.setLineWidth(1);
  doc.rect(8, 8, W - 16, 281);

  // En-tête
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(120, 90, 20);
  doc.text("RÉPUBLIQUE DU CONGO", W / 2, 18, { align: "center" });
  doc.setFontSize(9);
  doc.text("MINISTÈRE DES AFFAIRES FONCIÈRES ET DU DOMAINE PUBLIC", W / 2, 24, { align: "center" });

  doc.setDrawColor(120, 90, 20);
  doc.line(M + 20, 28, W - M - 20, 28);

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text("PLAN DE BORNAGE", W / 2, 38, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Référence : " + parcelle.id, W / 2, 44, { align: "center" });

  // Infos
  let y = 54;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text("Arrondissement :", M, y);
  doc.setFont("times", "normal");
  doc.text(data.arrondissement || "—", M + 40, y);
  y += 6;
  doc.setFont("times", "bold");
  doc.text("Surface :", M, y);
  doc.setFont("times", "normal");
  doc.text(Math.round(surface).toLocaleString("fr-FR") + " m²", M + 40, y);
  y += 6;
  doc.setFont("times", "bold");
  doc.text("Nombre de bornes :", M, y);
  doc.setFont("times", "normal");
  doc.text(String(bornes.length), M + 40, y);
  y += 6;
  doc.setFont("times", "bold");
  doc.text("Statut :", M, y);
  doc.setFont("times", "normal");
  doc.text(data.statut === "en_attente" ? "En attente de validation" : (data.statut || "—"), M + 40, y);

  // Plan de bornage (dessin vectoriel)
  y += 10;
  const pts = normaliserPolygone(bornes);
  const offsetY = y;
  const factor = (W - 2 * M) / 400;  // largeur en mm / largeur SVG

  if (pts.length >= 3) {
    // Convertir SVG → mm
    const toMm = (p) => [M + p[0] * factor, offsetY + p[1] * factor * 0.75];

    // Dessiner le polygone
    doc.setDrawColor(120, 60, 200);
    doc.setLineWidth(0.6);
    doc.setFillColor(245, 235, 255);
    const lines = pts.map((p, i) => {
      const next = pts[(i + 1) % pts.length];
      const a = toMm(p);
      const b = toMm(next);
      return { a, b };
    });

    // Fond du polygone
    const poly = pts.map((p) => toMm(p));
    doc.lines(poly.slice(1), poly[0][0], poly[0][1], [1, 1], "FD", true);

    // Cotes (distances)
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    lines.forEach((l, i) => {
      const cle = `${i}-${(i + 1) % pts.length}`;
      const dist = distances[cle];
      const label = dist ? `${dist} m` : "?";
      const midX = (l.a[0] + l.b[0]) / 2;
      const midY = (l.a[1] + l.b[1]) / 2;
      doc.setFillColor(120, 60, 200);
      doc.rect(midX - 8, midY - 3, 16, 5, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(label, midX, midY + 0.5, { align: "center" });
    });

    // Sommets
    pts.forEach((p, i) => {
      const pt = toMm(p);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(120, 60, 200);
      doc.circle(pt[0], pt[1], 2, "FD");
      doc.setTextColor(60, 20, 100);
      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.text(lettre(i), pt[0] - 1, pt[1] - 3);
    });

    // Nord
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    const nordX = W - M - 8;
    const nordY = offsetY + 10;
    doc.line(nordX, nordY + 6, nordX, nordY);
    doc.line(nordX, nordY, nordX - 2, nordY + 3);
    doc.line(nordX, nordY, nordX + 2, nordY + 3);
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.text("N", nordX - 1.5, nordY - 2);
  }

  // Tableau des coordonnées GPS
  y = offsetY + 240;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text("Coordonnées GPS des bornes", M, y);
  y += 6;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  bornes.forEach((b, i) => {
    doc.text(
      `${lettre(i)} : ${b[0].toFixed(6)}, ${b[1].toFixed(6)}`,
      M,
      y + i * 4
    );
  });

  // Pied de page
  doc.setDrawColor(120, 90, 20);
  doc.line(M, 275, W - M, 275);
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Émis le ${new Date().toLocaleString("fr-FR")} — SIGEF-AFDP — Enregistré par ${data.enregistre_par || "—"}`,
    W / 2, 280, { align: "center" }
  );

  doc.save(`plan-bornage-${parcelle.id}.pdf`);
}

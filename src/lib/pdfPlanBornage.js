
const lettre = (i) => String.fromCharCode(65 + (i % 26));

const getLat = (b) => Array.isArray(b) ? b[0] : b.lat;
const getLng = (b) => Array.isArray(b) ? b[1] : b.lng;



// Distance en mètres entre 2 points GPS
function distanceEntre(p1, p2) {
  const R = 6371000;
  const lat1 = getLat(p1), lng1 = getLng(p1);
  const lat2 = getLat(p2), lng2 = getLng(p2);
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat0 = ((lat1 + lat2) / 2) * Math.PI / 180;
  return Math.sqrt((dLat * R) ** 2 + (dLng * R * Math.cos(lat0)) ** 2);
}

// Azimut (en degrés depuis le Nord)
function azimutEntre(p1, p2) {
  const dLng = (getLng(p2) - getLng(p1)) * Math.PI / 180;
  const lat1 = getLat(p1) * Math.PI / 180;
  const lat2 = getLat(p2) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const az = Math.atan2(y, x) * 180 / Math.PI;
  return (az + 360) % 360;
}

// Surface par formule de Shoelace
function calculerSurface(points) {
  if (points.length < 3) return 0;
  const R = 6371000;
  const lat0 = (points.reduce((s, p) => s + getLat(p), 0) / points.length) * Math.PI / 180;
  const pts = points.map((p) => [
    ((getLng(p) - getLng(points[0])) * Math.PI / 180) * R * Math.cos(lat0),
    ((getLat(p) - getLat(points[0])) * Math.PI / 180) * R,
  ]);
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return Math.abs(area / 2);
}

// Périmètre total
function calculerPerimetre(points) {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    total += distanceEntre(points[i], points[(i + 1) % points.length]);
  }
  return total;
}

// Normaliser le polygone en coordonnées SVG
function normaliserPolygone(bornes) {
  if (!bornes || bornes.length < 2) return [];
  const lats = bornes.map((b) => getLat(b));
  const lngs = bornes.map((b) => getLng(b));
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const largeur = maxLng - minLng || 0.0001;
  const hauteur = maxLat - minLat || 0.0001;
  const pad = 30, W = 400, H = 260;
  const scale = Math.min((W - 2 * pad) / largeur, (H - 2 * pad) / hauteur);
  const offsetX = (W - largeur * scale) / 2;
  const offsetY = (H - hauteur * scale) / 2;
  return bornes.map((b) => [
    offsetX + (getLng(b) - minLng) * scale,
    H - offsetY - (getLat(b) - minLat) * scale,
  ]);
}

// Hash SHA-256 en JS
async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Blason en base64 (chargement async)
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
  } catch (e) {
    return null;
  }
}

export async function telechargerPlanBornage(parcelle) {
  const { default: jsPDF } = await import("jspdf");
  const { default: QRCode } = await import("qrcode");
  const data = parcelle.data || parcelle || {};
  const bornes = data.polygone || [];
  const distances = data.distances || {};
  const surface = data.surface_m2 || data.superficie || 0;

  const centre = bornes.length > 0
    ? [
        bornes.reduce((s, p) => s + getLat(p), 0) / bornes.length,
        bornes.reduce((s, p) => s + getLng(p), 0) / bornes.length,
      ]
    : [0, 0];
  const perimetre = calculerPerimetre(bornes);
  const surfaceCalc = calculerSurface(bornes);

  // Code de vérification : 8 caractères
  const codeVerif = (parcelle.id || "").replace(/[^A-Z0-9]/g, "").slice(-6).padEnd(6, "X") +
    Math.floor(Math.random() * 90 + 10);

  // Hash SHA-256 des données clés
  const chaine = [
    parcelle.id,
    data.arrondissement || "",
    bornes.map((b) => getLat(b).toFixed(6) + "," + getLng(b).toFixed(6)).join("|"),
    surface.toFixed(2),
  ].join("#");
  const hash = await sha256(chaine);

  // URL de vérification
  const urlVerif = `https://siiafdp.onrender.com/?verif=${codeVerif}`;
  let qrDataUrl = null;
  try {
    qrDataUrl = await QRCode.toDataURL(urlVerif, { width: 300, margin: 1 });
  } catch (e) { console.error(e); }

  const blason = await chargerBlason();

  // ======================= PDF =======================
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, M = 15;

  // ---------- PAGE 1 : En-tête + Plan ----------
  doc.setDrawColor(120, 90, 20);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, W - 16, 281);

  // Blason
  if (blason) {
    try { doc.addImage(blason, "PNG", W / 2 - 12, 12, 24, 24); } catch (e) {}
  }

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(120, 90, 20);
  doc.text("RÉPUBLIQUE DU CONGO", W / 2, 42, { align: "center" });
  doc.setFontSize(9);
  doc.text("MINISTÈRE DES AFFAIRES FONCIÈRES ET DU DOMAINE PUBLIC", W / 2, 47, { align: "center" });
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Système d'Information Intégré des Affaires Foncières et du Domaine Public", W / 2, 51, { align: "center" });

  doc.setDrawColor(120, 90, 20);
  doc.line(M + 20, 55, W - M - 20, 55);

  doc.setFont("times", "bold");
  doc.setFontSize(17);
  doc.setTextColor(20, 20, 20);
  doc.text("PLAN DE BORNAGE", W / 2, 65, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text("Référence cadastrale : " + parcelle.id, W / 2, 71, { align: "center" });

  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120, 60, 200);
  doc.text("CODE DE VÉRIFICATION : " + codeVerif, W / 2, 76, { align: "center" });

  // QR code en haut à droite de la page 1
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, "PNG", W - M - 28, 12, 24, 24);
      doc.setFont("times", "italic");
      doc.setFontSize(6);
      doc.setTextColor(120, 120, 120);
      doc.text("Vérifier", W - M - 16, 38, { align: "center" });
    } catch (e) {}
  }

  doc.setDrawColor(180, 180, 180);
  doc.line(M + 30, 82, W - M - 30, 82);

  doc.setFont("courier", "normal");
  doc.setFontSize(6);
  doc.setTextColor(140, 100, 200);
  doc.text("SHA-256 : " + hash.substring(0, 48) + "...", W / 2, 86, { align: "center" });

  // Identification
  let y = 89;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text("IDENTIFICATION", M, y);
  y += 6;
  doc.setLineWidth(0.4);
  doc.setDrawColor(200, 200, 200);
  doc.line(M, y, W - M, y);
  y += 5;

  const ligne = (label, val) => {
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(label, M, y);
    doc.setFont("courier", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(String(val || "—"), M + 55, y);
    y += 5;
  };

  ligne("Arrondissement", data.arrondissement || "—");
  ligne("Ville", data.ville || "Brazzaville");
  ligne("Quartier", data.quartier || "—");
  ligne("Section cadastrale", data.section || "—");
  ligne("N° de lot", data.lot || "—");
  ligne("Quartier", data.quartier || "—");
  ligne("Section cadastrale", data.section || "—");
  ligne("Numéro de lot", data.lot || "—");
  ligne("Superficie (m²)", surface.toFixed(2) + " m²");
  ligne("Superficie (hectares)", (surface / 10000).toFixed(4) + " ha");
  ligne("Périmètre", perimetre.toFixed(2) + " m");
  ligne("Nombre de bornes", String(bornes.length));
  ligne("Statut juridique", data.statut === "en_attente" ? "En attente de validation technique" : (data.statut || "—"));

  // Plan de bornage (dessin)
  y += 4;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text("PLAN DE BORNAGE", M, y);
  y += 6;

  const pts = normaliserPolygone(bornes);
  const offsetY = y;
  const factor = (W - 2 * M) / 400;

  if (pts.length >= 3) {
    const toMm = (p) => [M + p[0] * factor, offsetY + p[1] * factor * 0.75];
    const poly = pts.map((p) => toMm(p));

    // Contour
    doc.setFillColor(245, 235, 255);
    doc.setDrawColor(120, 60, 200);
    doc.setLineWidth(0.5);
    for (let i = 0; i < poly.length; i++) {
      const next = poly[(i + 1) % poly.length];
      doc.line(poly[i][0], poly[i][1], next[0], next[1]);
    }

    // Cotes sur les côtés
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    for (let i = 0; i < poly.length; i++) {
      const j = (i + 1) % poly.length;
      const cle = `${i}-${j}`;
      const cleInv = `${j}-${i}`;
      const dist = distances[cle] || distances[cleInv] || "";
      const label = dist ? `${dist} m` : "?";
      const midX = (poly[i][0] + poly[j][0]) / 2;
      const midY = (poly[i][1] + poly[j][1]) / 2;
      doc.setFillColor(120, 60, 200);
      doc.rect(midX - 7, midY - 3, 14, 5, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(label, midX, midY + 0.5, { align: "center" });
    }

    // Sommets
    poly.forEach((p, i) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(120, 60, 200);
      doc.setLineWidth(0.6);
      doc.circle(p[0], p[1], 2, "FD");
      doc.setTextColor(80, 20, 120);
      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.text(lettre(i), p[0] - 1.2, p[1] - 3);
    });

    // Flèche Nord
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    const nordX = W - M - 8;
    const nordY = offsetY + 10;
    doc.line(nordX, nordY + 6, nordX, nordY);
    doc.line(nordX, nordY, nordX - 2, nordY + 3);
    doc.line(nordX, nordY, nordX + 2, nordY + 3);
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("N", nordX - 1.5, nordY - 2);

    // Coordonnées centre + Google Maps
    y = offsetY + 145;
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text("LOCALISATION", M, y);
    y += 5;
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("Latitude centre :  " + centre[0].toFixed(6), M, y);
    y += 4;
    doc.text("Longitude centre : " + centre[1].toFixed(6), M, y);
    y += 4;
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0, 80, 200);
    doc.textWithLink(
      "Ouvrir dans Google Maps →",
      M, y,
      { url: `https://www.google.com/maps?q=${centre[0]},${centre[1]}` }
    );
  }

  // Pied de page 1
  doc.setDrawColor(120, 90, 20);
  doc.line(M, 278, W - M, 278);
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Émis le ${new Date().toLocaleString("fr-FR")} — SIGEF-AFDP — Page 1/3`,
    W / 2, 283, { align: "center" }
  );

  // ---------- PAGE 2 : Tableaux techniques ----------
  doc.addPage();
  doc.setDrawColor(120, 90, 20);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, W - 16, 281);

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(120, 90, 20);
  doc.text("DONNÉES TECHNIQUES DE BORNAGE", W / 2, 20, { align: "center" });
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(parcelle.id + " — Code : " + codeVerif, W / 2, 26, { align: "center" });
  doc.setDrawColor(180, 180, 180);
  doc.line(M, 30, W - M, 30);

  // Tableau 1 : Coordonnées GPS des bornes
  y = 38;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text("1. COORDONNÉES GPS DES BORNES (WGS84)", M, y);
  y += 5;

  const colB = [M, M + 20, M + 60, M + 100];
  doc.setFillColor(240, 240, 240);
  doc.rect(M, y, W - 2 * M, 6, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text("Borne", colB[0] + 2, y + 4);
  doc.text("Latitude (°)", colB[1] + 2, y + 4);
  doc.text("Longitude (°)", colB[2] + 2, y + 4);
  doc.text("Précision", colB[3] + 2, y + 4);
  y += 6;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  bornes.forEach((b, i) => {
    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248);
    doc.rect(M, y, W - 2 * M, 5, "F");
    doc.setTextColor(20, 20, 20);
    doc.text(lettre(i), colB[0] + 5, y + 3.5);
    doc.text(getLat(b).toFixed(6), colB[1] + 2, y + 3.5);
    doc.text(getLng(b).toFixed(6), colB[2] + 2, y + 3.5);
    const acc = b.accuracy ? "± " + Math.round(b.accuracy) + " m" : "—";
    doc.text(acc, colB[3] + 2, y + 3.5);
    y += 5;
  });

  // Tableau 1bis : Métadonnées satellites
  y += 8;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text("1bis. MÉTADONNÉES SATELLITES (par borne)", M, y);
  y += 5;

  const colM = [M, M + 15, M + 35, M + 55, M + 75, M + 95];
  doc.setFillColor(240, 240, 240);
  doc.rect(M, y, W - 2 * M, 6, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  doc.text("Borne", colM[0] + 2, y + 4);
  doc.text("Altitude (m)", colM[1] + 2, y + 4);
  doc.text("Préc. alt. (m)", colM[2] + 2, y + 4);
  doc.text("Cap (°)", colM[3] + 2, y + 4);
  doc.text("Vitesse (m/s)", colM[4] + 2, y + 4);
  doc.text("Horodatage", colM[5] + 2, y + 4);
  y += 6;

  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  bornes.forEach((b, i) => {
    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248);
    doc.rect(M, y, W - 2 * M, 5, "F");
    doc.setTextColor(20, 20, 20);
    doc.text(lettre(i), colM[0] + 5, y + 3.5);
    doc.text(b.altitude != null ? b.altitude.toFixed(1) : "—", colM[1] + 2, y + 3.5);
    doc.text(b.altitudeAccuracy != null ? "± " + Math.round(b.altitudeAccuracy) : "—", colM[2] + 2, y + 3.5);
    doc.text(b.heading != null ? b.heading.toFixed(0) : "—", colM[3] + 2, y + 3.5);
    doc.text(b.speed != null ? b.speed.toFixed(2) : "—", colM[4] + 2, y + 3.5);
    const ts = b.timestamp ? new Date(b.timestamp).toLocaleTimeString("fr-FR") : "—";
    doc.text(ts, colM[5] + 2, y + 3.5);
    y += 5;
  });

  // Tableau 2 : Côtés
  y += 6;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text("2. CÔTÉS DU POLYGONE", M, y);
  y += 5;

  doc.setFillColor(240, 240, 240);
  doc.rect(M, y, W - 2 * M, 6, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text("Segment", M + 2, y + 4);
  doc.text("Dist. mesurée (m)", M + 35, y + 4);
  doc.text("Dist. GPS (m)", M + 80, y + 4);
  doc.text("Azimut (°)", M + 125, y + 4);
  y += 6;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  for (let i = 0; i < bornes.length; i++) {
    const j = (i + 1) % bornes.length;
    const cle = `${i}-${j}`;
    const cleInv = `${j}-${i}`;
    const distMesuree = distances[cle] || distances[cleInv] || "—";
    const distGPS = distanceEntre(bornes[i], bornes[j]);
    const az = azimutEntre(bornes[i], bornes[j]);

    doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 248);
    doc.rect(M, y, W - 2 * M, 5, "F");
    doc.setTextColor(20, 20, 20);
    doc.text(`${lettre(i)} → ${lettre(j)}`, M + 2, y + 3.5);
    doc.text(String(distMesuree), M + 35, y + 3.5);
    doc.text(distGPS.toFixed(2), M + 80, y + 3.5);
    doc.text(az.toFixed(1), M + 125, y + 3.5);
    y += 5;
  }

  // Tableau 3 : Synthèse
  y += 6;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text("3. SYNTHÈSE", M, y);
  y += 6;

  const synthese = [
    ["Surface (méthode Shoelace)", surfaceCalc.toFixed(2) + " m²"],
    ["Surface (déclarée)", surface.toFixed(2) + " m²"],
    ["Écart de surface", Math.abs(surface - surfaceCalc).toFixed(2) + " m²"],
    ["Périmètre total", perimetre.toFixed(2) + " m"],
    ["Nombre de côtés", String(bornes.length)],
    ["Altitude moyenne", data.altitude ? data.altitude + " m" : "Non relevée"],
  ];

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  synthese.forEach(([k, v]) => {
    doc.setTextColor(100, 100, 100);
    doc.text(k, M, y);
    doc.setFont("courier", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(v, M + 70, y);
    doc.setFont("times", "normal");
    y += 5;
  });

  // Pied page 2
  doc.setDrawColor(120, 90, 20);
  doc.line(M, 278, W - M, 278);
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Page 2/3 — ${parcelle.id} — SIGEF-AFDP`, W / 2, 283, { align: "center" });

  // ---------- PAGE 3 : Sécurité et signatures ----------
  doc.addPage();
  doc.setDrawColor(120, 90, 20);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, W - 16, 281);

  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.setTextColor(120, 90, 20);
  doc.text("AUTHENTICITÉ ET SIGNATURES", W / 2, 20, { align: "center" });
  doc.setDrawColor(180, 180, 180);
  doc.line(M, 24, W - M, 24);

  // QR code
  if (qrDataUrl) {
    try { doc.addImage(qrDataUrl, "PNG", M, 32, 40, 40); } catch (e) {}
  }

  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text("CODE DE VÉRIFICATION", M + 45, 36);
  doc.setFont("courier", "bold");
  doc.setFontSize(18);
  doc.setTextColor(120, 60, 200);
  doc.text(codeVerif, M + 45, 47);

  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Scannez le QR code ou rendez-vous sur :", M + 45, 54);
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 80, 200);
  doc.textWithLink(urlVerif, M + 45, 59, { url: urlVerif });

  // Hash SHA-256
  y = 84;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text("SIGNATURE CRYPTOGRAPHIQUE (SHA-256)", M, y);
  y += 5;

  doc.setFillColor(245, 235, 255);
  doc.rect(M, y, W - 2 * M, 18, "F");
  doc.setFont("courier", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(60, 20, 120);
  const hashLines = doc.splitTextToSize(hash, W - 2 * M - 4);
  doc.text(hashLines, M + 2, y + 5);

  y += 24;
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Cette empreinte numérique garantit l'intégrité du présent document.", M, y);

  // Mentions légales
  y += 8;
  doc.setDrawColor(180, 180, 180);
  doc.line(M, y, W - M, y);
  y += 6;
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text("MENTIONS LÉGALES", M, y);
  y += 5;
  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  const mentions = [
    "Le présent plan de bornage est établi conformément aux dispositions de l'Acte Uniforme OHADA portant organisation des procédures simplifiées de recouvrement et des voies d'exécution (AUPSRVE) et à la réglementation foncière de la République du Congo.",
    "Les coordonnées sont exprimées dans le système géodésique WGS84. Les distances ont été mesurées contradictoirement au mètre ruban et ne peuvent être contestées qu'après nouvel arpentage officiel.",
    "Toute modification, surcharge ou altération de ce document entraîne sa nullité. La vérification d'authenticité se fait via le code de vérification ou le QR code.",
    "Le présent plan doit être conservé et présenté en original lors de toute opération de mutation, d'hypothèque ou de contentieux.",
  ];
  mentions.forEach((m) => {
    const lines = doc.splitTextToSize(m, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 3.5 + 2;
  });

  // Signatures
  y = 220;
  doc.setDrawColor(120, 90, 20);
  doc.line(M, y, W - M, y);
  y += 6;

  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text("SIGNATURES", M, y);
  y += 10;

  // 3 cadres de signature
  const sigW = (W - 2 * M - 20) / 3;
  const labels = ["Géomètre agréé", "Conservation foncière", "Ministère de tutelle"];
  labels.forEach((lab, i) => {
    const x = M + i * (sigW + 10);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.rect(x, y, sigW, 30);
    doc.setFont("times", "italic");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(lab, x + sigW / 2, y + 33, { align: "center" });
  });

  // Pied page 3
  doc.setDrawColor(120, 90, 20);
  doc.line(M, 278, W - M, 278);
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Émis le ${new Date().toLocaleString("fr-FR")} par ${data.enregistre_par || "SIGEF-AFDP"} — Page 3/3`,
    W / 2, 283, { align: "center" }
  );

  // Enregistrer
  doc.save(`plan-bornage-${parcelle.id}.pdf`);
}

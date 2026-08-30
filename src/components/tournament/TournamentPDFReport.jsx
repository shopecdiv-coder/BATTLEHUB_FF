import jsPDF from "jspdf";

/* ══════════════════════════════════════════════════════════════════
   BATTLEHUB — Official Tournament PDF Report Generator
   Full dark-themed esports report with team-by-team deep breakdown
   ══════════════════════════════════════════════════════════════════ */

// ─── Color Palette (Cyberpunk Gold & Electric Cyan Theme) ─────────
let globalBhLogo = null;
const C = {
  bg:       [10, 14, 23],       // Deep Space Navy (#0A0E17)
  card:     [19, 27, 46],       // Slate Carbon (#131B2E)
  cardAlt:  [15, 22, 38],       // Darker Carbon (#0F1626)
  accent:   [255, 184, 0],      // Electric Gold / Neon Amber (#FFB800)
  cyan:     [0, 229, 255],      // Cyber Cyan (#00E5FF)
  orange:   [255, 85, 0],       // Fire Orange (#FF5500)
  white:    [255, 255, 255],
  muted:    [148, 163, 184],    // gray text
  dim:      [100, 116, 139],    // dimmer gray
  green:    [34, 197, 94],      // qualified / success
  red:      [239, 68, 68],      // eliminated / error
  yellow:   [255, 184, 0],      // warning / gold
  gold:     [255, 184, 0],      // 1st place Electric Gold
  silver:   [203, 213, 225],    // 2nd place
  bronze:   [217, 119, 6],      // 3rd place
  divider:  [30, 41, 59],
  rowOdd:   [15, 22, 38],       // #0F1626
  rowEven:  [19, 27, 46],       // #131B2E
};

// A4 dimensions in mm
const PG = { w: 210, h: 297, m: 15 };
const CW = PG.w - PG.m * 2; // content width = 180mm

// ─── Utility Functions ───────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return "N/A";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "N/A"; }
}

function fmtDateTime(iso) {
  if (!iso) return "N/A";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch { return "N/A"; }
}

function trunc(str, max = 30) {
  if (!str) return "";
  str = String(str);
  return str.length > max ? str.substring(0, max - 2) + ".." : str;
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

async function loadImageElement(url) {
  if (!url) return null;
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(null);
      }
    }, 8000); // 8.0s timeout to allow large banners to load

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(img);
      }
    };
    img.onerror = () => {
      if (done) return;
      // If direct CORS load fails (common with unconfigured Firebase buckets),
      // fallback to a CORS proxy so we can still draw it to canvas without tainting!
      const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(url);
      const img2 = new Image();
      img2.crossOrigin = 'Anonymous'; 
      img2.onload = () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(img2);
        }
      };
      img2.onerror = () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(null);
        }
      };
      img2.src = proxyUrl;
    };
    img.src = url;
  });
}

// ─── Data Preparation ────────────────────────────────────────────

function prepareTeamData(leaderboardRows = [], registrations = []) {
  const regMap = {};
  registrations.forEach(r => {
    const key = r.team_leader_id || r.user_id;
    if (key) regMap[key] = r;
  });

  const teams = leaderboardRows.map((lb, idx) => {
    const reg = regMap[lb.user_id] || {};
    const groupNum = lb.group_number !== undefined ? lb.group_number : (reg.group_number || reg.group);

    return {
      // Identity
      team_name: reg.team_name || lb.team_name || "Unknown Team",
      team_logo_url: reg.team_logo_url || lb.team_logo_url || "",
      unique_id: lb.unique_id || "",
      // Leader
      leader_ign: reg.team_leader_ign || lb.player_ign || "",
      leader_uid: reg.team_leader_uid || lb.player_uid || "",
      leader_phone: reg.team_leader_phone || "",
      leader_id: reg.team_leader_id || lb.user_id || "",
      // Members
      team_members: (() => {
        let members = (lb.team_members && lb.team_members.length > 0) ? lb.team_members : (reg.team_members || []);
        if (members === lb.team_members && reg.team_members && reg.team_members.length > 0) {
          members = members.map(lbMem => {
            const regMem = reg.team_members.find(rm => rm.uid === lbMem.uid || rm.ign === lbMem.ign || rm.name === lbMem.name);
            return regMem ? { ...regMem, ...lbMem } : lbMem;
          });
        }
        
        // Compute total kills from match_results
        const matchResults = lb.match_results || reg.match_results || [];
        if (matchResults.length > 0) {
          const totalPlayerKills = {};
          matchResults.forEach(mr => {
            const pKills = mr.player_kills || mr.memberKills || mr.member_kills || [];
            if (Array.isArray(pKills)) {
              pKills.forEach((pk, i) => {
                const key = pk.ign || `P${i+1}`;
                totalPlayerKills[key] = (totalPlayerKills[key] || 0) + (parseInt(pk.kills) || 0);
              });
            }
          });
          
          members = members.map((m, i) => {
            const key = m.ign || `P${i+1}`;
            return { ...m, kills: totalPlayerKills[key] || m.kills || 0 };
          });
        }
        
        return members;
      })(),
      // Slot & Group
      slot: reg.slot_number || reg.slot || String(idx + 1),
      group: groupNum !== undefined && groupNum !== null && String(groupNum) !== "" ? String(groupNum) : String(Math.floor(idx / 12) + 1),
      group_match_time: reg.group_match_time || "",
      // Performance
      kills: lb.kills !== undefined ? lb.kills : (reg.total_kills || 0),
      wins: lb.wins || 0,
      points: lb.points !== undefined ? lb.points : (reg.total_points || 0),
      placement: lb.placement || 0,
      rank: lb.manual_rank || lb.rank || (idx + 1),
      // Status
      status: reg.status || "Registered",
      is_qualified: lb.is_qualified || reg.is_qualified || false,
      moved_to: lb.moved_to || "",
      stage: reg.stage || lb.stage || "",
      // Registration
      payment_status: reg.payment_status || "",
      payment_method: reg.payment_method || "",
      created_date: reg.created_date || "",
      semifinal_group: reg.semifinal_group || "",
      // Match results
      match_results: lb.match_results || reg.match_results || [],
      // Admin
      admin_message: lb.admin_message || "",
      is_finalized: lb.is_finalized || false,
    };
  });


  // Sort by points desc, then wins desc, then kills desc
  teams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.kills !== a.kills) return b.kills - a.kills;
    return (a.placement || 999) - (b.placement || 999);
  });

  // Assign computed rank
  teams.forEach((t, i) => { t.computedRank = i + 1; });

  return teams;
}

function findMVP(teams) {
  let mvp = null;
  let maxKills = 0;
  teams.forEach(t => {
    (t.team_members || []).forEach(m => {
      const k = m.kills || 0;
      if (k > maxKills) {
        maxKills = k;
        mvp = { ign: m.ign || "Unknown", uid: m.uid || "", kills: k, team: t.team_name };
      }
    });
  });
  return mvp;
}

// ─── Drawing Helpers ─────────────────────────────────────────────

function fillBg(pdf) {
  pdf.setFillColor(...C.bg);
  pdf.rect(0, 0, PG.w, PG.h, "F");
}

function drawWatermark(pdf) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(55);
  pdf.setTextColor(30, 42, 60); // Made slightly more visible
  pdf.text("BATTLEHUB", PG.w / 2, PG.h / 2 - 10, { align: "center", angle: 35 });
  pdf.text("OFFICIAL", PG.w / 2, PG.h / 2 + 15, { align: "center", angle: 35 });
}

function drawPageHeader(pdf, title, pageNum) {
  // Header bar
  pdf.setFillColor(...C.card);
  pdf.rect(0, 0, PG.w, 13, "F");
  // Orange accent bottom line
  pdf.setFillColor(...C.accent);
  pdf.rect(0, 13, PG.w, 0.8, "F");

  // BH branding
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...C.accent);
  pdf.text("BATTLEHUB", PG.m, 8.5);

  // Section title
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...C.muted);
  pdf.text(trunc(title, 75), PG.w / 2, 8.5, { align: "center" });

  // Top right BattleHub Logo
  if (globalBhLogo) {
    const safeBhLogo = getSafeLogoImage(globalBhLogo, "B");
    if (safeBhLogo) {
      try {
        pdf.addImage(safeBhLogo, "PNG", PG.w - PG.m - 8, 2.5, 8, 8);
      } catch (e) {}
    }
  } else {
    // Page number
    pdf.setTextColor(...C.dim);
    pdf.text("Page " + pageNum, PG.w - PG.m, 8.5, { align: "right" });
  }
}

function drawPageFooter(pdf, pageNum) {
  pdf.setFillColor(...C.card);
  pdf.rect(0, PG.h - 10, PG.w, 10, "F");
  pdf.setFillColor(...C.accent);
  pdf.rect(0, PG.h - 10, PG.w, 0.4, "F");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5.5);
  pdf.setTextColor(...C.dim);
  pdf.text(
    "BATTLEHUB OFFICIAL ESPORTS REPORT  |  Generated: " + new Date().toLocaleString("en-IN"),
    PG.w / 2, PG.h - 4, { align: "center" }
  );

  if (globalBhLogo && pageNum) {
    pdf.text("Page " + pageNum, PG.w - PG.m, PG.h - 4, { align: "right" });
  }
}

function initPage(pdf, headerTitle, pageNum) {
  fillBg(pdf);
  drawWatermark(pdf);
  drawPageHeader(pdf, headerTitle, pageNum);
  drawPageFooter(pdf, pageNum);
}

function drawSectionTitle(pdf, title, y) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...C.accent);
  pdf.text(title, PG.m, y);
  // Underline
  pdf.setDrawColor(...C.accent);
  pdf.setLineWidth(0.5);
  pdf.line(PG.m, y + 1.5, PG.m + pdf.getTextWidth(title), y + 1.5);
  return y + 6;
}

function drawInfoPair(pdf, label, value, x, y, labelW = 32) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...C.muted);
  pdf.text(label, x, y);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...C.white);
  pdf.text(trunc(String(value || "N/A"), 80), x + labelW, y);
}

function drawBadge(pdf, text, x, y, bgColor, textColor = C.white) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  const tw = pdf.getTextWidth(text) + 6;
  pdf.setFillColor(...bgColor);
  pdf.rect(x, y - 3.5, tw, 5, "F");
  pdf.setTextColor(...textColor);
  pdf.text(text, x + 3, y);
}

function drawDivider(pdf, y, color = C.divider) {
  pdf.setDrawColor(...color);
  pdf.setLineWidth(0.3);
  pdf.line(PG.m, y, PG.w - PG.m, y);
}

function getStatusColor(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("qualif")) return C.green;
  if (s.includes("eliminat") || s.includes("reject")) return C.red;
  if (s.includes("disqualif")) return C.yellow;
  return C.cyan;
}

function getStatusLabel(team) {
  const s = (team.status || "Registered").toUpperCase();
  const stageStr = team.stage ? String(team.stage).toUpperCase() : "STAGE";
  
  if (s === "QUALIFIED") {
    if (team.moved_to) return "QUALIFIED FOR " + trunc(String(team.moved_to).toUpperCase(), 14);
    return "QUALIFIED";
  }
  
  if (s === "ELIMINATED" || s === "DISQUALIFIED" || s === "REJECTED") {
    return trunc(s + " IN " + stageStr, 22);
  }
  
  return s;
}

function generateDefaultTeamBadge(name = "T") {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    
    // Background Dark Slate Carbon Circle
    ctx.fillStyle = "#1E293B";
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Gold Accent Border
    ctx.strokeStyle = "#FFB800";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Text letter
    ctx.fillStyle = "#FFB800";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const nameStr = String(name || "T");
    const letter = nameStr.trim().charAt(0).toUpperCase() || "T";
    ctx.fillText(letter, 32, 33);

    return canvas.toDataURL("image/png");
  } catch(e) {
    return null;
  }
}

function getSafeLogoImage(img, name) {
  if (!img) return generateDefaultTeamBadge(name);
  try {
    const canvas = document.createElement("canvas");
    // Resize down to 64x64 for the PDF to prevent out-of-memory crashes on large uploaded logos
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    
    // Smooth scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    
    ctx.drawImage(img, 0, 0, 64, 64);
    return canvas.toDataURL("image/png");
  } catch(e) {
    // If canvas is tainted by CORS, cleanly fallback to default emblem badge
    return generateDefaultTeamBadge(name);
  }
}

// ─── Table Drawing ───────────────────────────────────────────────

function drawTable(pdf, headers, rows, startX, startY, colWidths, options = {}) {
  const rowH = options.rowHeight || 6.5;
  const fs = options.fontSize || 6.5;
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  let y = startY;

  // Header row
  pdf.setFillColor(...C.card);
  pdf.rect(startX, y, totalW, rowH + 1, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(fs);
  pdf.setTextColor(...C.accent);
  let cx = startX;
  headers.forEach((h, i) => {
    const align = options.alignRight?.includes(i) ? "right" : "left";
    const tx = align === "right" ? cx + colWidths[i] - 2 : cx + 2;
    pdf.text(String(h), tx, y + rowH * 0.7, { align });
    cx += colWidths[i];
  });
  y += rowH + 1;

  // Data rows
  pdf.setFont("helvetica", "normal");
  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? C.rowOdd : C.rowEven;
    pdf.setFillColor(...bg);
    pdf.rect(startX, y, totalW, rowH, "F");

    cx = startX;
    row.forEach((cell, ci) => {
      // Color special columns
      if (options.colorFn) {
        const clr = options.colorFn(ri, ci, cell);
        if (clr) pdf.setTextColor(...clr);
        else pdf.setTextColor(...C.white);
      } else {
        pdf.setTextColor(...C.white);
      }
      pdf.setFontSize(fs);
      const align = options.alignRight?.includes(ci) ? "right" : "left";
      
      if (typeof cell === "object" && cell !== null && cell.img) {
        // Draw image
        try {
          pdf.addImage(cell.img, 'PNG', cx + 2, y + (rowH - cell.h) / 2, cell.w, cell.h);
        } catch(e) {}
        // Draw text next to image
        const tx = cx + 2 + cell.w + 2;
        const maxChars = Math.floor((colWidths[ci] - cell.w - 4) / (fs * 0.22));
        pdf.text(trunc(String(cell.text ?? ""), maxChars), tx, y + rowH * 0.7, { align: "left" });
      } else {
        const tx = align === "right" ? cx + colWidths[ci] - 2 : cx + 2;
        const maxChars = Math.floor(colWidths[ci] / (fs * 0.22));
        pdf.text(trunc(String(cell ?? ""), maxChars), tx, y + rowH * 0.7, { align });
      }
      cx += colWidths[ci];
    });
    y += rowH;
  });

  // Bottom border
  pdf.setDrawColor(...C.divider);
  pdf.setLineWidth(0.3);
  pdf.line(startX, y, startX + totalW, y);

  return y;
}

// ═══════════════════════════════════════════════════════════════════
// PAGE BUILDERS
// ═══════════════════════════════════════════════════════════════════

// ─── COVER PAGE ──────────────────────────────────────────────────

function drawCoverPage(pdf, tournament, totalTeams, logoMap, selectedStage, selectedGroup) {
  const t = tournament || {};
  fillBg(pdf);
  drawWatermark(pdf);

  // Big accent block at top
  pdf.setFillColor(...C.accent);
  pdf.rect(0, 0, PG.w, 4, "F");

  let y = 10;
  
  const rawBanner = t.banner_url ? (logoMap || {})[t.banner_url] : null;
  const getSafeBannerImage = (img) => {
    if (!img) return null;
    try {
      const canvas = document.createElement("canvas");
      let w = img.naturalWidth || img.width || 800;
      let h = img.naturalHeight || img.height || 400;
      // Cap size to prevent massive data URLs
      if (w > 800) { h = Math.round(h * (800 / w)); w = 800; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      return { data: canvas.toDataURL("image/jpeg", 0.8), w, h };
    } catch(e) {
      return null;
    }
  };

  const safeBanner = getSafeBannerImage(rawBanner);
  if (safeBanner && safeBanner.data) {
    try {
      let bannerW = CW;
      let bannerH = 50;
      if (safeBanner.w && safeBanner.h) {
        const aspect = safeBanner.w / safeBanner.h;
        bannerH = CW / aspect;
        if (bannerH > 100) {
          bannerH = 100;
          bannerW = bannerH * aspect;
        }
      }
      const bannerX = PG.m + (CW - bannerW) / 2;
      pdf.addImage(safeBanner.data, "JPEG", bannerX, y, bannerW, bannerH, undefined, "FAST");
      y += bannerH + 5;
    } catch(e) {}
  } else {
    y = 35;
    // "OFFICIAL ESPORTS REPORT" badge
    pdf.setFillColor(...C.card);
    pdf.rect(PG.m, y - 8, CW, 16, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...C.accent);
    pdf.text("OFFICIAL ESPORTS REPORT", PG.w / 2, y - 1, { align: "center" });
    pdf.setFontSize(6);
    pdf.setTextColor(...C.muted);
    pdf.text(new Date().toLocaleString(), PG.w / 2, y + 4, { align: "center" });
    y += 18;
  }

  // Filter Subtitle if downloading specific group
  if ((selectedStage && selectedStage !== "all") || (selectedGroup && selectedGroup !== "all")) {
    const stageStr = selectedStage && selectedStage !== "all" ? (selectedStage === "qualified" ? "Qualified Teams" : `Stage: ${selectedStage}`) : "";
    const groupStr = selectedGroup && selectedGroup !== "all" ? `Group ${selectedGroup}` : "";
    const filterText = [stageStr, groupStr].filter(Boolean).join(" | ");
    
    pdf.setFillColor(...C.card);
    pdf.rect(PG.m, y, CW, 10, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...C.accent);
    pdf.text(filterText.toUpperCase(), PG.w / 2, y + 7, { align: "center" });
    y += 16;
  }

  // Tournament Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(...C.white);
  const titleLines = pdf.splitTextToSize(t.title || "Tournament Report", CW);
  titleLines.forEach((line, i) => {
    pdf.text(line, PG.w / 2, y + i * 10, { align: "center" });
  });
  y += titleLines.length * 10 + 5;

  // Subtitle: Game & Mode
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(...C.cyan);
  const subtitle = [t.game, t.mode, t.tournament_type].filter(Boolean).join("  |  ");
  pdf.text(subtitle || "Esports Tournament", PG.w / 2, y, { align: "center" });

  // Divider
  y += 12;
  pdf.setDrawColor(...C.accent);
  pdf.setLineWidth(0.6);
  pdf.line(PG.w / 2 - 30, y, PG.w / 2 + 30, y);

  // Info Grid
  y += 14;
  const leftX = PG.m + 5;
  const rightX = PG.w / 2 + 5;
  const gap = 10;

  const infoPairs = [
    ["Status", t.status || "N/A", leftX],
    ["Date", fmtDate(t.start_time || t.date_time), rightX],
    ["Total Teams", totalTeams + (t.max_teams ? " / " + t.max_teams : ""), leftX],
    ["Entry Fee", t.entry_fee === 0 || t.entry_fee === "0" || t.entry_fee === "Free" ? "FREE" : (t.entry_fee + " BH Coins"), rightX],
    ["Prize Pool", t.prize_pool ? (t.prize_pool + " BH Coins") : "N/A", leftX],
    ["Organizer", t.organizer_name || "BattleHub Admin", rightX],
  ];

  // Info card background
  pdf.setFillColor(...C.card);
  pdf.rect(PG.m, y - 5, CW, infoPairs.length / 2 * gap + 8, "F");

  infoPairs.forEach((pair, i) => {
    const row = Math.floor(i / 2);
    drawInfoPair(pdf, pair[0], pair[1], pair[2], y + row * gap, 28);
  });

  y += (infoPairs.length / 2) * gap + 15;

  // Stages Section
  const stages = t.stages || ["Qualifiers", "Semifinals", "Grand Final"];
  if (stages.length > 0) {
    y += 5;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...C.accent);
    pdf.text("TOURNAMENT STAGES", PG.w / 2, y, { align: "center" });
    y += 8;

    const maxStagesPerRow = 4;
    const stageW = 38;
    const gapX = 6;
    const gapY = 14;

    stages.forEach((s, i) => {
      const row = Math.floor(i / maxStagesPerRow);
      const col = i % maxStagesPerRow;
      const stageName = typeof s === "object" ? (s.name || s.id || "Stage") : String(s);
      
      const numInRow = Math.min(maxStagesPerRow, stages.length - row * maxStagesPerRow);
      const rowStartX = PG.w / 2 - (numInRow * stageW + (numInRow - 1) * gapX) / 2;
      const sx = rowStartX + col * (stageW + gapX);
      const sy = y + row * gapY;
      
      const isActive = (t.current_stage || t.stage || "").toLowerCase().includes(stageName.toLowerCase());

      // Stage box
      pdf.setFillColor(...(isActive ? C.accent : C.card));
      pdf.rect(sx, sy, stageW, 9, "F");

      // Stage text
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5);
      pdf.setTextColor(...(isActive ? [255, 255, 255] : C.muted));
      pdf.text(trunc(stageName, 22), sx + stageW / 2, sy + 6, { align: "center" });

      // Arrow between stages
      if (col < numInRow - 1 && i < stages.length - 1) {
        pdf.setTextColor(...C.dim);
        pdf.setFontSize(8);
        pdf.text(">", sx + stageW + 2, sy + 6);
      }
    });
    
    const timelineRows = Math.ceil(stages.length / maxStagesPerRow);
    y += timelineRows * gapY + 5;
  }

  // Prize Distribution
  y += 5;
  const pd = t.prize_distribution;
  if (pd) {
    const val1 = Number(pd.first || pd.pos_1 || pd["1st"]) || 0;
    const val2 = Number(pd.second || pd.pos_2 || pd["2nd"]) || 0;
    const val3 = Number(pd.third || pd.pos_3 || pd["3rd"]) || 0;

    if (val1 > 0 || val2 > 0 || val3 > 0) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...C.accent);
      pdf.text("PRIZE DISTRIBUTION", PG.w / 2, y, { align: "center" });
      y += 8;

      const prizes = [
        { label: "1st Place", value: val1, color: C.gold },
        { label: "2nd Place", value: val2, color: C.silver },
        { label: "3rd Place", value: val3, color: C.bronze },
      ];

      const prizeW = 50;
      const prizeStartX = PG.w / 2 - (prizes.length * prizeW + (prizes.length - 1) * 8) / 2;

      prizes.forEach((p, i) => {
        const px = prizeStartX + i * (prizeW + 8);
        pdf.setFillColor(...C.card);
        pdf.rect(px, y, prizeW, 18, "F");

        // Colored top bar
        pdf.setFillColor(...p.color);
        pdf.rect(px, y, prizeW, 2, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(...p.color);
        pdf.text(p.label, px + prizeW / 2, y + 8, { align: "center" });

        pdf.setFontSize(9);
        pdf.setTextColor(...C.white);
        pdf.text(String(p.value) + " Coins", px + prizeW / 2, y + 14, { align: "center" });
      });
    }
  }

  drawPageFooter(pdf);
}

// ─── PODIUM & MVP PAGE ──────────────────────────────────────────

function drawPodiumPage(pdf, tournament, teams, mvp, selectedStage, selectedGroup, logoMap) {
  initPage(pdf, tournament?.title || "Podium", 2);

  let y = 22;
  
  let sectionTitle = "PODIUM — TOP 3 FINISHERS";
  if ((selectedStage && selectedStage !== "all") || (selectedGroup && selectedGroup !== "all")) {
    const stageStr = selectedStage && selectedStage !== "all" ? (selectedStage === "qualified" ? "Qualified Teams" : `Stage: ${selectedStage}`) : "";
    const groupStr = selectedGroup && selectedGroup !== "all" ? `Group ${selectedGroup}` : "";
    sectionTitle += " (" + [stageStr, groupStr].filter(Boolean).join(" | ") + ")";
  }

  y = drawSectionTitle(pdf, sectionTitle, y);
  y += 4;

  const podiumData = [
    { rank: 1, label: "CHAMPION", color: C.gold, accent: [250, 204, 21] },
    { rank: 2, label: "RUNNER-UP", color: C.silver, accent: [203, 213, 225] },
    { rank: 3, label: "2ND RUNNER-UP", color: C.bronze, accent: [217, 119, 6] },
  ];

  podiumData.forEach((p, i) => {
    const team = teams[i];
    if (!team) return;

    // Card background
    pdf.setFillColor(...C.card);
    pdf.rect(PG.m, y, CW, 32, "F");
    // Accent left bar
    pdf.setFillColor(...p.color);
    pdf.rect(PG.m, y, 3, 32, "F");

    // Rank badge
    pdf.setFillColor(...p.accent);
    pdf.rect(PG.m + 7, y + 4, 18, 10, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...C.bg);
    pdf.text("#" + p.rank, PG.m + 16, y + 11, { align: "center" });

    // Label
    pdf.setFontSize(6.5);
    pdf.setTextColor(...p.color);
    pdf.text(p.label, PG.m + 7, y + 19);

    // Team Logo Badge
    const rawLogo = team.team_logo_url ? logoMap[team.team_logo_url] : null;
    const logoImg = getSafeLogoImage(rawLogo, team.team_name);

    if (logoImg) {
      try {
        pdf.addImage(logoImg, "PNG", PG.m + 27, y + 7, 18, 18);
      } catch(e) {}
    }

    // Team Name
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...C.white);
    pdf.text(trunc(team.team_name, 25), PG.m + 48, y + 12);

    // Leader IGN
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...C.muted);
    pdf.text("Captain: " + trunc(team.leader_ign, 20), PG.m + 48, y + 18);

    // Stats on right
    const rx = PG.w - PG.m - 5;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(...C.white);
    pdf.text(String(team.points) + " PTS", rx, y + 12, { align: "right" });

    pdf.setFontSize(7);
    pdf.setTextColor(...C.cyan);
    pdf.text(team.kills + " Kills  |  " + team.wins + " Booyah", rx, y + 19, { align: "right" });

    // Status
    const sc = getStatusColor(team.status);
    pdf.setFontSize(6.5);
    pdf.setTextColor(...sc);
    pdf.text(getStatusLabel(team), PG.m + 48, y + 24);

    y += 36;
  });

  // MVP Section
  if (mvp) {
    y += 6;
    y = drawSectionTitle(pdf, "MVP — MOST VALUABLE PLAYER", y);
    y += 4;

    pdf.setFillColor(...C.card);
    pdf.rect(PG.m, y, CW, 28, "F");
    pdf.setFillColor(...C.gold);
    pdf.rect(PG.m, y, 3, 28, "F");

    // Star badge
    pdf.setFillColor(...C.gold);
    pdf.rect(PG.m + 7, y + 5, 16, 8, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...C.bg);
    pdf.text("MVP", PG.m + 15, y + 10.5, { align: "center" });

    // Player info
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...C.white);
    pdf.text(trunc(mvp.ign, 25), PG.m + 28, y + 10);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...C.muted);
    pdf.text("Team: " + trunc(mvp.team, 25), PG.m + 28, y + 17);
    if (mvp.uid) {
      pdf.text("UID: " + mvp.uid, PG.m + 28, y + 22);
    }

    // Kill count
    const rx = PG.w - PG.m - 5;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(...C.gold);
    pdf.text(String(mvp.kills), rx, y + 12, { align: "right" });
    pdf.setFontSize(7);
    pdf.setTextColor(...C.muted);
    pdf.text("KILLS", rx, y + 18, { align: "right" });
  }
}

// ─── POINTS SYSTEM PAGE ───────────────────────────────────────────

function drawPointsSystemPage(pdf, tournament, pageNum) {
  initPage(pdf, tournament?.title + " — Points System", pageNum);

  let y = 30;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...C.accent);
  pdf.text("OFFICIAL POINTS SYSTEM & RULES", PG.w / 2, y, { align: "center" });
  y += 15;

  // Kill Points Card
  pdf.setFillColor(...C.card);
  pdf.rect(PG.m, y, CW, 25, "F");
  pdf.setFillColor(...C.red);
  pdf.rect(PG.m, y, 3, 25, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(...C.white);
  pdf.text("KILL POINTS", PG.m + 10, y + 10);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...C.muted);
  pdf.text("Every individual kill secured by a team grants", PG.m + 10, y + 18);
  
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(...C.red);
  pdf.text("1 POINT", PG.w - PG.m - 10, y + 16, { align: "right" });

  y += 35;

  // Placement Points Card
  pdf.setFillColor(...C.cardAlt);
  pdf.rect(PG.m, y, CW, 100, "F");
  pdf.setFillColor(...C.cyan);
  pdf.rect(PG.m, y, CW, 3, "F");
  y += 12;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(...C.white);
  pdf.text("PLACEMENT POINTS", PG.w / 2, y, { align: "center" });
  y += 8;

  const placements = [
    { rank: "1st (BOOYAH)", pts: 12, c: C.gold },
    { rank: "2nd Place", pts: 9, c: C.silver },
    { rank: "3rd Place", pts: 8, c: C.bronze },
    { rank: "4th Place", pts: 7, c: C.white },
    { rank: "5th Place", pts: 6, c: C.white },
    { rank: "6th Place", pts: 5, c: C.white },
    { rank: "7th Place", pts: 4, c: C.white },
    { rank: "8th Place", pts: 3, c: C.white },
    { rank: "9th Place", pts: 2, c: C.white },
    { rank: "10th Place", pts: 1, c: C.white },
    { rank: "11th-12th Place", pts: 0, c: C.muted },
  ];

  const col1 = placements.slice(0, 6);
  const col2 = placements.slice(6);
  
  const drawList = (list, startX, startY) => {
    list.forEach((p, i) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(...p.c);
      pdf.text(p.rank, startX, startY + i * 11);
      
      pdf.setFontSize(10);
      pdf.setTextColor(...C.accent);
      pdf.text(p.pts + " PTS", startX + 50, startY + i * 11, { align: "right" });

      pdf.setDrawColor(...C.divider);
      pdf.setLineWidth(0.2);
      pdf.line(startX, startY + i * 11 + 3, startX + 50, startY + i * 11 + 3);
    });
  };

  drawList(col1, PG.m + 20, y + 5);
  drawList(col2, PG.w / 2 + 20, y + 5);

  y += 80;

  // Tiebreaker Rules
  y = drawSectionTitle(pdf, "TIEBREAKER RULES", y);
  y += 2;

  pdf.setFillColor(...C.card);
  pdf.rect(PG.m, y, CW, 35, "F");
  
  const rules = [
    "1. Teams tied on total points will be ranked by TOTAL BOOYAHS (Wins).",
    "2. If still tied, the team with TOTAL KILLS will be ranked higher.",
    "3. If still tied, the team's placement in the FINAL MATCH will determine the rank.",
  ];

  rules.forEach((r, i) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...C.white);
    pdf.text(r, PG.m + 8, y + 10 + (i * 9));
  });
}

// ─── MASTER LEADERBOARD PAGES ────────────────────────────────────

function drawLeaderboardPages(pdf, tournament, teams, startPageNum, logoMap, selectedStage, selectedGroup) {
  let pageNum = startPageNum;
  initPage(pdf, tournament?.title + " — Leaderboard", pageNum);

  let y = 22;
  
  let sectionTitle = "MASTER LEADERBOARD — ALL TEAMS STANDINGS";
  if ((selectedStage && selectedStage !== "all") || (selectedGroup && selectedGroup !== "all")) {
    const stageStr = selectedStage && selectedStage !== "all" ? (selectedStage === "qualified" ? "Qualified Teams" : `Stage: ${selectedStage}`) : "";
    const groupStr = selectedGroup && selectedGroup !== "all" ? `Group ${selectedGroup}` : "";
    sectionTitle += " (" + [stageStr, groupStr].filter(Boolean).join(" | ") + ")";
  }

  y = drawSectionTitle(pdf, sectionTitle, y);
  y += 3;

  // Summary line
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...C.muted);
  pdf.text("Total Teams: " + teams.length + "  |  Sorted by: Points > Booyah > Kills > Placement", PG.m, y);
  y += 6;

  const headers = ["#", "TEAM NAME", "GROUP", "SLOT", "KILLS", "POS", "PTS", "BOOYAH", "STATUS"];
  const colW = [10, 44, 15, 11, 16, 16, 17, 18, 33];
  const maxRowsFirstPage = 30;
  const maxRowsNextPage = 35;

  let rowIndex = 0;
  let pageRowLimit = maxRowsFirstPage;

  while (rowIndex < teams.length) {
    if (rowIndex > 0) {
      pdf.addPage();
      pageNum++;
      initPage(pdf, tournament?.title + " — Leaderboard", pageNum);
      y = 22;
      pageRowLimit = maxRowsNextPage;
    }

    // Draw table header
    const endIndex = Math.min(rowIndex + pageRowLimit, teams.length);
    const pageRows = [];

    for (let i = rowIndex; i < endIndex; i++) {
      const t = teams[i];
      const rawLogo = t.team_logo_url ? logoMap[t.team_logo_url] : null;
      const logoImg = getSafeLogoImage(rawLogo, t.team_name);
      
      const teamNameCell = { img: logoImg, w: 4, h: 4, text: t.team_name };
      
      const posPoints = t.placement_points !== undefined ? t.placement_points : Math.max(0, (t.points || 0) - (t.kills || 0));
      const statusLabel = getStatusLabel(t);

      const formatGroup = (g) => {
        if (!g) return "-";
        const str = String(g).trim();
        const lower = str.toLowerCase();
        if (lower === "sf_a") return "Group A";
        if (lower === "sf_b") return "Group B";
        if (lower === "gf") return "Final";
        if (lower.startsWith("g_")) return "Group " + str.substring(2);
        if (lower.startsWith("group")) return str.charAt(0).toUpperCase() + str.slice(1);
        if (/^\d+$/.test(str)) return "Group " + str;
        return str;
      };

      pageRows.push([
        "#" + t.computedRank,
        teamNameCell,
        formatGroup(t.group),
        t.slot || "-",
        String(t.kills),
        String(posPoints),
        String(t.points),
        String(t.wins),
        trunc(statusLabel, 18),
      ]);
    }

    y = drawTable(pdf, headers, pageRows, PG.m, y, colW, {
      rowHeight: 6,
      fontSize: 6,
      alignRight: [4, 5, 6, 7],
      colorFn: (ri, ci, cell) => {
        if (ci === 8) {
          const t = teams[rowIndex + ri];
          return getStatusColor(t?.status);
        }
        if (ci === 0) return C.accent;
        return null;
      }
    });

    rowIndex = endIndex;
  }

  return pageNum;
}

// ─── TEAM DETAIL PAGE ────────────────────────────────────────────

function drawTeamDetailPage(pdf, tournament, team, teamIndex, totalTeams, pageNum, logoMap) {
  initPage(pdf, tournament?.title + " — Team #" + teamIndex, pageNum);

  let y = 22;

  // ── Team Header Card ──
  pdf.setFillColor(...C.card);
  pdf.rect(PG.m, y, CW, 30, "F");
  // Left accent bar with status color
  const sc = getStatusColor(team.status);
  pdf.setFillColor(...sc);
  pdf.rect(PG.m, y, 3, 30, "F");

  // Rank badge
  pdf.setFillColor(...(team.computedRank <= 3 ?
    (team.computedRank === 1 ? C.gold : team.computedRank === 2 ? C.silver : C.bronze) : C.accent));
  pdf.rect(PG.m + 7, y + 3, 16, 12, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...C.bg);
  pdf.text("#" + team.computedRank, PG.m + 15, y + 11, { align: "center" });
  
  // Team Logo
  const rawLogo = team.team_logo_url ? logoMap[team.team_logo_url] : null;
  const logoImg = getSafeLogoImage(rawLogo, team.team_name);
  let textStartX = PG.m + 28;
  if (logoImg) {
    try {
      pdf.addImage(logoImg, 'PNG', textStartX, y + 5, 12, 12);
      textStartX += 16;
    } catch(e) {}
  }

  // Team Name
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...C.white);
  pdf.text(trunc(team.team_name, 25), textStartX, y + 10);

  // BH ID
  if (team.unique_id) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...C.cyan);
    pdf.text("ID: " + team.unique_id, textStartX, y + 16);
  }

  // Team # / Total
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...C.dim);
  pdf.text("Team " + teamIndex + " of " + totalTeams, textStartX, y + 22);

  // Big points on right
  const rx = PG.w - PG.m - 5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(...C.white);
  pdf.text(String(team.points) + " PTS", rx, y + 11, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...C.cyan);
  pdf.text(team.kills + " Kills  |  " + team.wins + " Booyah", rx, y + 18, { align: "right" });

  // Status badge on right bottom
  drawBadge(pdf, getStatusLabel(team), PG.w - PG.m - pdf.getTextWidth(getStatusLabel(team)) - 10, y + 26, sc);

  y += 35;

  // ── Registration & Leader Info ──
  y = drawSectionTitle(pdf, "REGISTRATION DETAILS", y);
  y += 2;

  const regStartY = y;
  pdf.setFillColor(...C.cardAlt);
  pdf.rect(PG.m, regStartY, CW, 20, "F"); 
  
  const leftX = PG.m + 5;
  const rightX = PG.w / 2 + 5;

  drawInfoPair(pdf, "Leader IGN", team.leader_ign, leftX, regStartY + 4, 26);
  drawInfoPair(pdf, "Leader UID", team.leader_uid || "N/A", rightX, regStartY + 4, 26);
  const maskedPhone = team.leader_phone && team.leader_phone.length >= 2
    ? "*".repeat(team.leader_phone.length > 8 ? 8 : (team.leader_phone.length - 2 > 0 ? team.leader_phone.length - 2 : 0)) + team.leader_phone.slice(-2)
    : "Hidden";

  drawInfoPair(pdf, "Phone", maskedPhone, leftX, regStartY + 8, 26);
  drawInfoPair(pdf, "Registered", fmtDate(team.created_date), rightX, regStartY + 8, 26);
  drawInfoPair(pdf, "Slot", team.slot ? "Slot #" + team.slot : "N/A", leftX, regStartY + 12, 26);
  
  const formatGroup = (g) => {
    if (!g) return "N/A";
    const str = String(g).trim();
    const lower = str.toLowerCase();
    if (lower === "sf_a") return "Group A";
    if (lower === "sf_b") return "Group B";
    if (lower === "gf") return "Final";
    if (lower.startsWith("g_")) return "Group " + str.substring(2);
    if (lower.startsWith("group")) return str.charAt(0).toUpperCase() + str.slice(1);
    if (/^\d+$/.test(str)) return "Group " + str;
    return str;
  };
  
  drawInfoPair(pdf, "Group", formatGroup(team.group), rightX, regStartY + 12, 26);
  drawInfoPair(pdf, "Payment", (team.payment_status || "N/A") + " (" + (team.payment_method || "N/A") + ")", leftX, regStartY + 16, 26);
  drawInfoPair(pdf, "Match Time", fmtDateTime(team.group_match_time), rightX, regStartY + 16, 26);

  y = regStartY + 24; // 20 + 4 margin

  // ── Stage Journey & Status ──
  y = drawSectionTitle(pdf, "TOURNAMENT STATUS & STAGE JOURNEY", y);
  y += 2;

  const stages = tournament?.stages || ["Qualifiers", "Semifinals", "Grand Final"];
  const teamStage = (team.stage || "").toLowerCase();
  const teamStatus = (team.status || "Registered").toUpperCase();

  // Calculate timeline rows based on max 4 stages per row
  const maxStagesPerRow = 4;
  const timelineRows = Math.ceil(stages.length / maxStagesPerRow);
  const stageCardH = (timelineRows * 14) + 12; // 14mm rows
  
  pdf.setFillColor(...C.cardAlt);
  pdf.rect(PG.m, y, CW, stageCardH, "F");

  // Status bar with color
  pdf.setFillColor(...sc);
  pdf.rect(PG.m, y, CW, 2, "F");
  y += 4;

  // Find current stage index
  let currentStageIdx = stages.findIndex(s => {
    const sName = typeof s === "object" ? (s.name || s.id) : String(s);
    return sName.toLowerCase() === teamStage;
  });
  if (currentStageIdx === -1) currentStageIdx = 0;

  // Draw Visual Timeline (Wrapped)
  const stageW = 38;
  const gapX = 6;
  const gapY = 12;

  stages.forEach((s, i) => {
    const stageName = typeof s === "object" ? (s.name || s.id || "Stage") : String(s);
    const row = Math.floor(i / maxStagesPerRow);
    const col = i % maxStagesPerRow;
    const stagesInThisRow = Math.min(maxStagesPerRow, stages.length - (row * maxStagesPerRow));
    const rowStartX = PG.m + (CW - (stagesInThisRow * stageW + (stagesInThisRow - 1) * gapX)) / 2;
    const sx = rowStartX + col * (stageW + gapX);
    const sy = y + (row * gapY);
    
    let boxColor = C.card;
    let textColor = C.muted;
    
    if (i < currentStageIdx) {
      boxColor = C.green;
      textColor = C.white;
    } else if (i === currentStageIdx) {
      if (team.is_qualified) {
        boxColor = C.green;
        textColor = C.white;
      } else if (teamStatus === "ELIMINATED" || teamStatus === "REJECTED") {
        boxColor = C.red;
        textColor = C.white;
      } else if (teamStatus === "DISQUALIFIED") {
        boxColor = C.yellow;
        textColor = C.bg;
      } else {
        boxColor = C.accent;
        textColor = C.white;
      }
    }

    pdf.setFillColor(...boxColor);
    pdf.rect(sx, sy, stageW, 9, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5); // Smaller font for timeline text
    pdf.setTextColor(...textColor);
    pdf.text(trunc(stageName, 22), sx + stageW / 2, sy + 6, { align: "center" });

    if (col < maxStagesPerRow - 1 && i < stages.length - 1) {
      pdf.setTextColor(...C.dim);
      pdf.setFontSize(8);
      pdf.text(">", sx + stageW + 2, sy + 6);
    }
  });

  y += (timelineRows * gapY) + 2;

  // Journey summary text below timeline
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  
  const currentStageObj = stages[currentStageIdx];
  const currentStageText = currentStageObj ? (typeof currentStageObj === "object" ? (currentStageObj.name || currentStageObj.id || "STAGE") : String(currentStageObj)).toUpperCase() : "THIS STAGE";

  if (team.is_qualified && team.moved_to) {
    pdf.setTextColor(...C.green);
    pdf.text(`>> QUALIFIED for ${team.moved_to.toUpperCase()} with ${team.points} Points and ${team.kills} Kills`, PG.w / 2, y, { align: "center" });
  } else if (teamStatus === "ELIMINATED" || teamStatus === "REJECTED") {
    pdf.setTextColor(...C.red);
    pdf.text(`>> ELIMINATED IN ${currentStageText} — Insufficient Score (${team.points} Pts, Rank #${team.computedRank})`, PG.w / 2, y, { align: "center" });
  } else if (teamStatus === "DISQUALIFIED") {
    pdf.setTextColor(...C.yellow);
    const reason = team.admin_message || "Rule Violation";
    pdf.text(`>> DISQUALIFIED IN ${currentStageText} — Reason: ${trunc(reason, 60)}`, PG.w / 2, y, { align: "center" });
  } else {
    pdf.setTextColor(...C.cyan);
    pdf.text(`>> CURRENTLY IN ${currentStageText} — ${team.points} Pts, Rank #${team.computedRank}`, PG.w / 2, y, { align: "center" });
  }

  y += 4; // Bottom padding for card

  // ── Player Roster ──
  y = drawSectionTitle(pdf, "SQUAD ROSTER", y);
  y += 2;

  const members = team.team_members || [];

  if (members.length > 0) {
    const cardW = (CW - 5) / 2;
    for (let i = 0; i < members.length; i += 2) {
      const pair = members.slice(i, i + 2);
      pair.forEach((m, colIdx) => {
        const mx = PG.m + (colIdx * (cardW + 5));
        
        pdf.setFillColor(...C.cardAlt);
        pdf.rect(mx, y, cardW, 12, "F");
        
        // Role badge
        const isLeader = m.isLeader || m.role === "Leader" || m.role === "Captain";
        pdf.setFillColor(...(isLeader ? C.gold : C.divider));
        pdf.rect(mx + 3, y + 3, 6, 6, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(5.5);
        pdf.setTextColor(...(isLeader ? C.bg : C.white));
        pdf.text(isLeader ? "IGL" : "P", mx + 6, y + 7.2, { align: "center" });

        // Player Avatar / Placeholder
        const avatarUrl = m.avatar_url || m.avatar || m.dp || m.photoURL;
        const rawAvatar = avatarUrl ? (logoMap || {})[avatarUrl] : null;
        const safeAvatarData = getSafeLogoImage(rawAvatar, m.in_game_name || m.name || "P");
        
        if (safeAvatarData) {
          try {
            pdf.addImage(safeAvatarData, "PNG", mx + 10.5, y + 2.5, 7, 7, undefined, "FAST");
          } catch(e) {}
        } else {
          const initial = m.ign ? String(m.ign).charAt(0).toUpperCase() : "?";
          pdf.setFillColor(40, 45, 65);
          pdf.circle(mx + 14, y + 6, 3.5, "F");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(5);
          pdf.setTextColor(200, 200, 200);
          pdf.text(initial, mx + 14, y + 7.5, { align: "center" });
        }

        // IGN
        pdf.setFontSize(7);
        pdf.setTextColor(...C.white);
        pdf.text(trunc(m.ign || "Unknown", 18), mx + 20, y + 7.5);

        // Kills
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...C.red);
        pdf.text((m.kills || 0) + " KILLS", mx + cardW - 4, y + 7.5, { align: "right" });
      });
      y += 14; // Increased from 11 to avoid overlapping rows (card height is 12)
    }
    const totalMemberKills = members.reduce((s, m) => s + (m.kills || 0), 0);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...C.dim);
    pdf.text("Total Squad Kills: " + totalMemberKills, PG.w - PG.m, y, { align: "right" });
    y += 5;
  } else {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...C.dim);
    pdf.text("No player roster data available.", PG.m + 5, y + 5);
    y += 10;
  }

  y += 5;

  // ── Performance Summary ──
  if (y < PG.h - 40) { // Reduced threshold to ensure it prints on the same page
    y = drawSectionTitle(pdf, "PERFORMANCE SUMMARY", y);
    y += 2;

    const perfStartY = y;
    pdf.setFillColor(...C.cardAlt);
    pdf.rect(PG.m, perfStartY, CW, 20, "F");

    const statW = CW / 5;
    const stats = [
      { label: "RANK", value: "#" + team.computedRank, color: C.accent },
      { label: "TOTAL POINTS", value: String(team.points), color: C.white },
      { label: "TOTAL KILLS", value: String(team.kills), color: C.cyan },
      { label: "BOOYAH", value: String(team.wins), color: C.gold },
      { label: "PLACEMENT", value: team.placement ? ordinal(team.placement) : "N/A", color: C.muted },
    ];

    stats.forEach((s, i) => {
      const sx = PG.m + i * statW + statW / 2;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(...s.color);
      pdf.text(s.value, sx, perfStartY + 9, { align: "center" });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(5.5);
      pdf.setTextColor(...C.dim);
      pdf.text(s.label, sx, perfStartY + 15, { align: "center" });
    });

    y = perfStartY + 24; // 20 + 4 margin
  }

  // ── Match-by-Match Results ──
  if (team.match_results && team.match_results.length > 0 && y < PG.h - 20) {
    y = drawSectionTitle(pdf, "MATCH BREAKDOWN (" + team.match_results.length + " matches)", y);
    y += 2;

    const cardW = (CW - 5) / 2; // 2 columns, 5mm gap
    
    // Group matches into rows of 2
    for (let i = 0; i < team.match_results.length; i += 2) {
      const matchPair = team.match_results.slice(i, i + 2);
      
      // Calculate max height needed for this row
      let maxPlayersInRow = 0;
      matchPair.forEach(mr => {
        const pk = mr.player_kills || [];
        if (pk.length > maxPlayersInRow) maxPlayersInRow = pk.length;
      });
      const pRows = Math.ceil(maxPlayersInRow / 2); // 2 players per line inside the card
      const cardH = 16 + (pRows > 0 ? (pRows * 5) + 2 : 0); // Ultra compact match card

      // Check page boundary (only page break if completely out of space to keep team on one page)
      if (y + cardH > PG.h - 8) {
        pdf.addPage();
        pageNum++;
        initPage(pdf, tournament?.title + " — Team #" + teamIndex + " (Matches)", pageNum);
        y = 22;
      }

      matchPair.forEach((mr, colIdx) => {
        const mx = PG.m + (colIdx * (cardW + 5));
        const isBooyah = mr.placement === 1;

        // Card bg
        pdf.setFillColor(...C.cardAlt);
        pdf.rect(mx, y, cardW, cardH, "F");
        
        // Left Accent
        pdf.setFillColor(...(isBooyah ? C.gold : C.accent));
        pdf.rect(mx, y, 1.5, cardH, "F");

        // Header (Match 1       Booyah/Rank)
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(...C.white);
        pdf.text("Match " + (mr.match_number || (i + colIdx + 1)), mx + 4, y + 5);

        pdf.setFontSize(6.5);
        pdf.setTextColor(...(isBooyah ? C.gold : C.muted));
        pdf.text(isBooyah ? "Booyah" : "Rank #" + (mr.placement || "?"), mx + cardW - 4, y + 5, { align: "right" });

        // Stats (Kills: 12      Pts: 24)
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);
        pdf.setTextColor(...C.dim);
        pdf.text("Kills:", mx + 4, y + 9);
        
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...C.red);
        pdf.text(String(mr.kills || 0), mx + 12, y + 9);

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...C.dim);
        pdf.text("Pts:", mx + cardW - 14, y + 9, { align: "right" });

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...C.cyan);
        pdf.text(String(mr.points || 0), mx + cardW - 4, y + 9, { align: "right" });

        // Divider line
        pdf.setDrawColor(...C.divider);
        pdf.setLineWidth(0.2);
        pdf.line(mx + 4, y + 11, mx + cardW - 4, y + 11);

        // Player Kills (2 columns inside the card)
        const pKills = mr.player_kills || [];
        if (pKills.length > 0) {
          const pkColW = (cardW - 8) / 2;
          pKills.forEach((pk, pkIdx) => {
            const pkCol = pkIdx % 2;
            const pkRow = Math.floor(pkIdx / 2);
            const px = mx + 4 + (pkCol * pkColW);
            const py = y + 15 + (pkRow * 5); // 5mm gap per row

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(5);
            pdf.setTextColor(...C.muted);
            pdf.text(trunc(pk.ign || "Player", 12), px, py);

            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...C.red);
            pdf.text((pk.kills || 0) + " Kills", px + pkColW - 2, py, { align: "right" });
          });
        } else {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(5);
          pdf.setTextColor(...C.dim);
          pdf.text("No player data.", mx + 4, y + 15);
        }
      });
      
      y += cardH + 2; // Reduced from 3
    }
  }

  return pageNum;
}

// ─── VERIFICATION PAGE ───────────────────────────────────────────

function drawVerificationPage(pdf, tournament, totalTeams, totalPages, pageNum) {
  initPage(pdf, "Official Document", pageNum);

  let y = 50;
  
  let numericId = "896063";
  if (tournament?.created_date) {
    const timeMs = new Date(tournament.created_date).getTime();
    if (!isNaN(timeMs)) numericId = String(timeMs).slice(-6);
  } else if (tournament?.id) {
    const clean = String(tournament.id).replace(/\D/g, "");
    if (clean.length >= 6) numericId = clean.slice(-6);
    else if (clean.length > 0) numericId = clean.padStart(6, "0");
  }

  // Centered verification block
  pdf.setFillColor(...C.card);
  pdf.rect(PG.m + 15, y, CW - 30, 130, "F");

  // Orange accent top
  pdf.setFillColor(...C.accent);
  pdf.rect(PG.m + 15, y, CW - 30, 3, "F");

  y += 15;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...C.accent);
  pdf.text("AUTHENTICITY CERTIFICATE", PG.w / 2, y, { align: "center" });

  y += 10;
  pdf.setFontSize(8);
  pdf.setTextColor(...C.white);
  pdf.text("This is an officially generated tournament report from BattleHub.", PG.w / 2, y, { align: "center" });

  y += 15;

  const cx = PG.w / 2 - 30;
  const vPairs = [
    ["Tournament", tournament?.title || "N/A"],
    ["Tournament ID", "#" + numericId],
    ["Game", tournament?.game || "N/A"],
    ["Total Teams", String(totalTeams)],
    ["Total Pages", String(totalPages)],
    ["Generated On", new Date().toLocaleString("en-IN")],
    ["Platform", "BattleHub"],
  ];

  vPairs.forEach((vp, i) => {
    drawInfoPair(pdf, vp[0], vp[1], cx, y + i * 8, 32);
  });

  y += vPairs.length * 8 + 12;

  // Seal
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...C.accent);
  pdf.text("BATTLEHUB VERIFIED", PG.w / 2, y, { align: "center" });

  y += 8;

  // Policy Text
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6);
  pdf.setTextColor(...C.dim);
  const policyText = "This document is the intellectual property of BattleHub. Any unauthorized alteration, forgery, \nor misrepresentation of this document's contents is strictly prohibited and subject to administrative action. \nThis document is computer-generated and does not require a physical signature.";
  pdf.text(policyText, PG.w / 2, y, { align: "center" });
}

// ═══════════════════════════════════════════════════════════════════
// MAIN BUILD FUNCTION
// ═══════════════════════════════════════════════════════════════════

export async function buildTournamentPDFDocument({
  tournament,
  leaderboardRows = [],
  registrations = [],
  matches = [],
  selectedStage = "all",
  selectedGroup = "all",
  onProgress = () => {}
}) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let teams = prepareTeamData(leaderboardRows, registrations);

  // Apply UI Filters for Download
  if (selectedStage && selectedStage !== "all" && selectedStage !== "qualified") {
    const stagesList = (tournament?.stages || []).map((st, i) => {
      if (typeof st === 'string') return { id: st.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name: st };
      return { id: st.id || `stage_${i}`, name: st.name || st.id || `Stage ${i+1}` };
    });
    const stObj = stagesList.find(s => s.id === selectedStage || s.name === selectedStage);
    const targetName = (stObj?.name || selectedStage).toLowerCase();
    const targetId = (stObj?.id || selectedStage).toLowerCase();

    teams = teams.filter(t => {
      const tStage = (t.stage || "").toLowerCase();
      if (!tStage) return false;
      return tStage.includes(targetName) || targetName.includes(tStage) ||
             tStage.includes(targetId) || targetId.includes(tStage);
    });
  } else if (selectedStage === "qualified") {
    teams = teams.filter(t => t.is_qualified || (t.status || "").toLowerCase() === "qualified");
  }

  if (selectedGroup && selectedGroup !== "all") {
    teams = teams.filter(t => 
      String(t.group) === String(selectedGroup) || 
      String(t.semifinal_group) === String(selectedGroup)
    );
  }

  const mvp = findMVP(teams);
  const totalTeams = teams.length;
  
  if (!globalBhLogo) {
    try {
      globalBhLogo = await loadImageElement("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee96b6cabd2c2d7af587d0/08567b05d_bf31fa0a1_logo.png");
    } catch(e) {}
  }

  // Pre-load all team logos concurrently in batches
  const logoMap = {};
  
  const uniqueUrls = new Set(teams.map(t => t.team_logo_url).filter(Boolean));
  if (tournament?.banner_url) uniqueUrls.add(tournament.banner_url);
  
  teams.forEach(t => {
    (t.team_members || []).forEach(m => {
      const avatar = m.avatar_url || m.avatar || m.dp || m.photoURL;
      if (avatar) uniqueUrls.add(avatar);
    });
  });

  const uniqueUrlsArr = [...uniqueUrls];
  const BATCH_SIZE = 100; // Increased batch size for massive tournaments
  
  for (let i = 0; i < uniqueUrlsArr.length; i += BATCH_SIZE) {
    const batch = uniqueUrlsArr.slice(i, i + BATCH_SIZE);
    
    // Update progress dynamically so it doesn't look stuck
    const loadPct = Math.round((i / uniqueUrlsArr.length) * 10) + 5; // 5% to 15%
    onProgress({ 
      page: 0, 
      totalPages: 1, 
      percentage: loadPct, 
      estimatedMb: "0.1", 
      remainingSec: "2", 
      title: `Loading Assets (${i}/${uniqueUrlsArr.length})...` 
    });

    await Promise.all(batch.map(async (url) => {
      try {
        logoMap[url] = await loadImageElement(url);
      } catch (e) {
        console.error("Failed to load logo", url);
      }
    }));
  }

  // Estimate total pages
  const leaderboardPages = Math.max(1, Math.ceil(teams.length / 30));
  const estTotalPages = 3 + leaderboardPages + teams.length + 1; // cover + points + podium + LB + teams + verification

  const emit = (pg, title) => {
    const pct = Math.min(99, Math.max(10, Math.round((pg / estTotalPages) * 100)));
    const estMb = (pg * 0.08).toFixed(1);
    const remaining = Math.max(1, Math.ceil((estTotalPages - pg) * 0.3));
    onProgress({
      page: pg,
      totalPages: estTotalPages,
      percentage: pct,
      estimatedMb: estMb,
      remainingSec: remaining,
      title
    });
  };

  let pageNum = 1;

  // ── PAGE 1: Cover ──
  emit(pageNum, "Drawing Cover Page...");
  drawCoverPage(pdf, tournament, totalTeams, logoMap, selectedStage, selectedGroup);
  
  // ── PAGE 2: Points System ──
  pdf.addPage();
  pageNum++;
  emit(pageNum, "Drawing Points System...");
  drawPointsSystemPage(pdf, tournament, pageNum);

  // ── PAGE 3: Podium & MVP ──
  pdf.addPage();
  pageNum++;
  emit(pageNum, "Drawing Podium & MVP...");
  drawPodiumPage(pdf, tournament, teams, mvp, selectedStage, selectedGroup, logoMap);

  // ── PAGE 4+: Master Leaderboard ──
  pdf.addPage();
  pageNum++;
  emit(pageNum, "Drawing Master Leaderboard...");
  pageNum = drawLeaderboardPages(pdf, tournament, teams, pageNum, logoMap, selectedStage, selectedGroup);

  // ── TEAM DETAIL PAGES ──
  for (let i = 0; i < teams.length; i++) {
    pdf.addPage();
    pageNum++;
    emit(pageNum, "Team " + (i + 1) + "/" + totalTeams + ": " + trunc(teams[i].team_name, 20));
    drawTeamDetailPage(pdf, tournament, teams[i], i + 1, totalTeams, pageNum, logoMap);

    // Small async yield every 10 teams to keep UI responsive without artificial delay
    if (i % 10 === 9) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  // ── VERIFICATION PAGE ──
  pdf.addPage();
  pageNum++;
  emit(pageNum, "Adding Verification...");
  drawVerificationPage(pdf, tournament, totalTeams, pageNum, pageNum);

  // Final progress
  onProgress({
    page: pageNum,
    totalPages: pageNum,
    percentage: 100,
    estimatedMb: (pageNum * 0.08).toFixed(1),
    remainingSec: 0,
    title: "Complete!"
  });

  return pdf;
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS (Same API as before)
// ═══════════════════════════════════════════════════════════════════

export async function generateTournamentPDF(props) {
  const pdf = await buildTournamentPDFDocument(props);
  const titleSlug = (props.tournament?.title || "tournament").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  pdf.save(`${titleSlug}_esports_report.pdf`);
  return pdf;
}

export async function getTournamentPDFFile(props) {
  const pdf = await buildTournamentPDFDocument(props);
  const pdfBlob = pdf.output("blob");
  const titleSlug = (props.tournament?.title || "tournament").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return new File([pdfBlob], `${titleSlug}_esports_report.pdf`, { type: "application/pdf" });
}

export async function generateLeaderboardPosterPNG({ tournament, leaderboardRows = [] }) {
  // PNG poster generation — placeholder for future implementation
  console.log("Poster generation not yet implemented");
}

export function PDFProgressModal({ open, progress }) {
  if (!open || !progress) return null;
  return null;
}

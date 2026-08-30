const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ManageKillsStagesDrawer.jsx', 'utf8');

const regex = /let groupNames = (?:new Set\(\)|\[\]);[\s\S]*?rawId:\s*gName(?: \/\/ keep the original DB id just in case)?\s*\}\);\s*\}\);/m;

const newCode = \      let groupNames = new Set();
      const groupTeamsMap = new Map();

      // Helper to normalize group names
      const normalizeGroup = (gStr) => {
        if (!gStr) return "";
        const num = String(gStr).replace(/[^0-9]/g, '');
        if (num) return 'g_' + num;
        return String(gStr).toLowerCase().trim();
      };

      // 1. Distribute teams
      filtered.forEach(r => {
        const raw = r._lbGroup || r.group || "";
        let g = normalizeGroup(raw);
        
        // If NO explicit group, fallback to original registration index
        if (!g) {
          const originalIndex = registrations.findIndex(reg => reg.id === r.id);
          const safeIndex = originalIndex >= 0 ? originalIndex : 0;
          g = 'g_' + (Math.floor(safeIndex / 12) + 1);
        }
        
        r._normalizedGroup = g;
        groupNames.add(g);
        
        if (!groupTeamsMap.has(g)) groupTeamsMap.set(g, []);
        groupTeamsMap.get(g).push(r);
      });

      // 2. Sort the collected groups
      const sortedGroupNames = Array.from(groupNames).sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
        if (numA && numB) return numA - numB;
        return a.localeCompare(b);
      });

      // 3. Build final groups array
      sortedGroupNames.forEach((gName) => {
        const tms = groupTeamsMap.get(gName) || [];
        
        const numIdx = parseInt(gName.replace(/[^0-9]/g, '')) || 1;
        const arrayIdx = numIdx - 1;
        
        let displayName = gName;
        const sched = groupSchedules[arrayIdx];
        if (sched && sched.group_name) {
          displayName = sched.group_name;
        } else {
          const lower = String(gName).toLowerCase();
          if (lower.startsWith("g_")) displayName = "Group " + gName.substring(2);
          else if (/^\\d+$/.test(lower)) displayName = "Group " + gName;
          else if (lower === "sf_a") displayName = "Group A";
          else if (lower === "sf_b") displayName = "Group B";
          else if (lower === "gf") displayName = "Final";
          else if (lower.startsWith("group")) displayName = gName.charAt(0).toUpperCase() + gName.slice(1);
        }

        grps.push({
          id: gName,
          name: displayName,
          teams: tms,
          rawId: gName
        });
      });\;

if(regex.test(code)) {
    code = code.replace(regex, newCode);
    fs.writeFileSync('src/components/admin/ManageKillsStagesDrawer.jsx', code);
    console.log('ManageKills update success');
} else {
    console.log('Regex failed ManageKills');
}

let code2 = fs.readFileSync('src/components/admin/StageMovementDrawer.jsx', 'utf8');
if(regex.test(code2)) {
    code2 = code2.replace(regex, newCode);
    fs.writeFileSync('src/components/admin/StageMovementDrawer.jsx', code2);
    console.log('StageMovement update success');
} else {
    console.log('Regex failed StageMovement');
}

// Ranking utility for tournament leaderboards. v2
// Qualifier / Semifinal = single-match tournaments
// Grand Final = 2 or 3 match tournaments

export const PLACEMENT_POINTS = { 1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1 };

const WORST_PLACE = 9999;

export function computeTeamStats(matchResults, killPointsPerKill) {
  if (!matchResults) matchResults = [];
  if (!killPointsPerKill) killPointsPerKill = 1;
  let totalPoints = 0, placementPoints = 0, killPoints = 0, totalKills = 0, booyah = 0;
  const byMatch = {};

  matchResults.forEach(function(r) {
    const place = parseInt(r.placement) || 0;
    const kills = parseInt(r.kills) || 0;
    const placePts = PLACEMENT_POINTS[place] || 0;
    const kPts = kills * killPointsPerKill;
    const pts = r.points != null ? r.points : placePts + kPts;
    totalPoints += pts;
    placementPoints += placePts;
    killPoints += kPts;
    totalKills += kills;
    if (place === 1) booyah += 1;
    byMatch[r.match_number] = { placement: place, kills: kills, points: pts, placementPoints: placePts, killPoints: kPts };
  });

  return { totalPoints: totalPoints, placementPoints: placementPoints, killPoints: killPoints, totalKills: totalKills, booyah: booyah, byMatch: byMatch };
}

// Qualifier / Semifinal (single-match) ranking
// 1. Total Points DESC  2. Placement ASC  3. Kills DESC  4. Manual rank ASC
export function rankTeamsSingleMatch(teams, killPointsPerKill) {
  if (!teams) teams = [];
  if (!killPointsPerKill) killPointsPerKill = 1;

  const withStats = teams.map(function(t) {
    return Object.assign({}, t, {
      _stats: computeTeamStats(t.match_results || [], killPointsPerKill),
      _singlePlacement: parseInt(t.placement) || WORST_PLACE,
      _singleKills: parseInt(t.kills) || 0,
      _singlePoints: parseInt(t.points) || 0,
    });
  });

  withStats.sort(function(a, b) {
    if (b._singlePoints !== a._singlePoints) return b._singlePoints - a._singlePoints;
    if (a._singlePlacement !== b._singlePlacement) return a._singlePlacement - b._singlePlacement;
    if (b._singleKills !== a._singleKills) return b._singleKills - a._singleKills;
    const ma = a.manual_rank != null ? a.manual_rank : WORST_PLACE;
    const mb = b.manual_rank != null ? b.manual_rank : WORST_PLACE;
    return ma - mb;
  });

  const result = withStats.map(function(t) { return Object.assign({}, t, { _isTie: false }); });
  for (let i = 0; i < result.length - 1; i++) {
    const a = result[i], b = result[i + 1];
    const tied = a._singlePoints === b._singlePoints &&
      a._singlePlacement === b._singlePlacement &&
      a._singleKills === b._singleKills &&
      a.manual_rank == null && b.manual_rank == null;
    if (tied) { result[i]._isTie = true; result[i + 1]._isTie = true; }
  }
  return result;
}

// Grand Final (multi-match) ranking
// 1. Total Points DESC  2. Booyah DESC  3. Total Kills DESC
// 4. Last Match Points DESC  5. Last Match Placement ASC  6. Manual rank ASC
export function rankTeamsGrandFinal(teams, killPointsPerKill, matchCount) {
  if (!teams) teams = [];
  if (!killPointsPerKill) killPointsPerKill = 1;
  if (!matchCount) matchCount = 3;

  const lastMatch = 'M' + matchCount;

  const withStats = teams.map(function(t) {
    return Object.assign({}, t, {
      _stats: computeTeamStats(t.match_results || [], killPointsPerKill),
    });
  });

  function placeOf(s, m) {
    const p = s.byMatch[m] && s.byMatch[m].placement;
    return (p && p > 0) ? p : WORST_PLACE;
  }
  function matchPts(s, m) {
    return (s.byMatch[m] && s.byMatch[m].points) || 0;
  }

  withStats.sort(function(a, b) {
    const A = a._stats, B = b._stats;
    if (B.totalPoints !== A.totalPoints) return B.totalPoints - A.totalPoints;
    if (B.booyah !== A.booyah) return B.booyah - A.booyah;
    if (B.totalKills !== A.totalKills) return B.totalKills - A.totalKills;
    if (matchPts(B, lastMatch) !== matchPts(A, lastMatch)) return matchPts(B, lastMatch) - matchPts(A, lastMatch);
    if (placeOf(A, lastMatch) !== placeOf(B, lastMatch)) return placeOf(A, lastMatch) - placeOf(B, lastMatch);
    const ma = a.manual_rank != null ? a.manual_rank : WORST_PLACE;
    const mb = b.manual_rank != null ? b.manual_rank : WORST_PLACE;
    return ma - mb;
  });

  const result = withStats.map(function(t) { return Object.assign({}, t, { _isTie: false }); });
  for (let i = 0; i < result.length - 1; i++) {
    const a = result[i], b = result[i + 1];
    const A = a._stats, B = b._stats;
    const tied = A.totalPoints === B.totalPoints &&
      A.booyah === B.booyah &&
      A.totalKills === B.totalKills &&
      matchPts(A, lastMatch) === matchPts(B, lastMatch) &&
      placeOf(A, lastMatch) === placeOf(B, lastMatch) &&
      a.manual_rank == null && b.manual_rank == null;
    if (tied) { result[i]._isTie = true; result[i + 1]._isTie = true; }
  }
  return result;
}

// Legacy alias
export function rankTeams(teams, killPointsPerKill) {
  return rankTeamsSingleMatch(teams, killPointsPerKill);
}

export function isPerfectTie(a, b) {
  if (a._singlePoints !== b._singlePoints) return false;
  if (a._singlePlacement !== b._singlePlacement) return false;
  if (a._singleKills !== b._singleKills) return false;
  const ma = a.manual_rank != null ? a.manual_rank : 9999;
  const mb = b.manual_rank != null ? b.manual_rank : 9999;
  return ma === mb;
}
/**
 * Quick entry — R32 pre-filled with likely teams.
 * Left-click a team to advance them one round.
 * Right-click to undo (remove from their highest round).
 */

import { BracketRenderer } from './alt-bracket-renderer.js';

let renderer;
let structure = {};
let picks = {};       // matchId -> { top: country, bot: country }
let champion = '';
let entryId = '';

// Most likely 32 teams mapped to their bracket position labels
const POSITION_TEAMS = {
  '1A': 'Mexico',    '2A': 'South Korea',
  '1B': 'Canada',    '2B': 'Switzerland',
  '1C': 'Brazil',    '2C': 'Morocco',
  '1D': 'USA',       '2D': 'Paraguay',
  '1E': 'Germany',   '2E': 'Ecuador',
  '1F': 'Netherlands','2F': 'Japan',
  '1G': 'Belgium',   '2G': 'Iran',
  '1H': 'Spain',     '2H': 'Uruguay',
  '1I': 'France',    '2I': 'Senegal',
  '1J': 'Argentina', '2J': 'Austria',
  '1K': 'Portugal',  '2K': 'Colombia',
  '1L': 'England',   '2L': 'Croatia',
};

// Fill bye slots (empty bot positions) with 3rd-place qualifiers / fun picks
const BYE_FILL = {
  'M74': { bot: 'Ivory Coast' },   // 1E bye
  'M77': { bot: 'Norway' },        // 1I bye
  'M81': { bot: 'Australia' },     // 1D bye
  'M82': { bot: 'Egypt' },         // 1G bye
  'M79': { bot: 'Scotland' },      // 1A bye
  'M80': { bot: 'Panama' },        // 1L bye
  'M85': { bot: 'Qatar' },         // 1B bye
  'M87': { bot: 'Uzbekistan' },    // 1K bye
};

const ROUND_ORDER = ['R32', 'R16', 'QF', 'SF', 'Final', 'champion'];

const STAR_PLAYERS = [
  'Lamine', 'Messi', 'Neymar', 'vanDijk', 'Pele', 'Maradona', 'Ronaldo',
  'Ronaldinho', 'Zidane', 'Zico', 'Kaka', 'Romario', 'Eusebio', 'Xavi',
  'Iniesta', 'Garrincha', 'Figo', 'Cafu', 'Rivaldo', 'Socrates', 'Mbappe',
  'Haaland', 'Rudiger', 'Bellingham', 'Zlatan',
];

function generateId() {
  const name = STAR_PLAYERS[Math.floor(Math.random() * STAR_PLAYERS.length)];
  const num = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return `${name}-${num}`;
}

function getMatchRound(matchId) {
  if (matchId === 'champion') return 'champion';
  return structure.matches[matchId]?.round || null;
}

// Find where a country currently is at its highest round
function findHighestPlacement(country) {
  let highest = null;
  let highestIdx = -1;
  for (const [mid, p] of Object.entries(picks)) {
    const round = getMatchRound(mid);
    const idx = ROUND_ORDER.indexOf(round);
    if (p.top === country && idx > highestIdx) {
      highest = { matchId: mid, position: 'top' };
      highestIdx = idx;
    }
    if (p.bot === country && idx > highestIdx) {
      highest = { matchId: mid, position: 'bot' };
      highestIdx = idx;
    }
    if (p.pick === country && idx > highestIdx) {
      highest = { matchId: mid, position: 'pick' };
      highestIdx = idx;
    }
  }
  if (country === champion) {
    highest = { matchId: 'champion', position: 'pick' };
    highestIdx = ROUND_ORDER.indexOf('champion');
  }
  return highest ? { ...highest, roundIdx: highestIdx } : null;
}

// Find the next slot this country should advance to
function findNextSlot(country) {
  const current = findHighestPlacement(country);
  if (!current) return null;

  const currentMatchId = current.matchId;
  if (currentMatchId === 'champion') return null; // already champion

  // If currently champion pick, nowhere to go
  if (current.position === 'pick') return null;

  const match = structure.matches[currentMatchId];
  if (!match) return null;

  // If this is the Final (M103), next is champion
  if (currentMatchId === 'M103') {
    return { matchId: 'champion', position: 'pick' };
  }

  // Otherwise, follow the feeds chain
  const nextMatchId = match.feeds;
  if (!nextMatchId) return null;

  const nextMatch = structure.matches[nextMatchId];
  if (!nextMatch || !nextMatch.from) return null;

  const position = nextMatch.from[0] === currentMatchId ? 'top' : 'bot';
  return { matchId: nextMatchId, position };
}

// Advance a country one round
function advanceCountry(country) {
  const next = findNextSlot(country);
  if (!next) return;

  // Place in next slot
  if (!picks[next.matchId]) picks[next.matchId] = { top: '', bot: '' };

  // Clear whoever was previously in that slot
  const prevOccupant = picks[next.matchId][next.position];
  if (prevOccupant && prevOccupant !== country) {
    // Cascade-remove the previous occupant from this round and beyond
    undoFromRound(prevOccupant, next.matchId);
  }

  picks[next.matchId][next.position] = country;
  renderer.setSlotText(next.matchId, next.position, country);
  renderer.setSlotFilled(next.matchId, next.position, true);

  if (next.matchId === 'champion') {
    champion = country;
  }

  saveToLocalStorage();
  updateProgress();
}

// Undo: remove country from its highest round and everything above
function undoCountry(country) {
  const current = findHighestPlacement(country);
  if (!current) return;

  // Don't undo R32 — those are pre-filled
  if (current.roundIdx <= 0) return;

  undoFromRound(country, current.matchId);
  saveToLocalStorage();
  updateProgress();
}

// Remove a country from a specific match and all later rounds
function undoFromRound(country, fromMatchId) {
  const fromIdx = ROUND_ORDER.indexOf(getMatchRound(fromMatchId));

  for (const [mid, p] of Object.entries(picks)) {
    const round = getMatchRound(mid);
    const idx = ROUND_ORDER.indexOf(round);
    if (idx < fromIdx) continue;

    if (p.top === country) {
      p.top = '';
      renderer.setSlotText(mid, 'top', '');
      renderer.setSlotFilled(mid, 'top', false);
    }
    if (p.bot === country) {
      p.bot = '';
      renderer.setSlotText(mid, 'bot', '');
      renderer.setSlotFilled(mid, 'bot', false);
    }
    if (p.pick === country) {
      p.pick = '';
      renderer.setSlotText(mid, 'pick', '');
      renderer.setSlotFilled(mid, 'pick', false);
      if (mid === 'champion') champion = '';
    }
  }
}

// --- Init ---

async function init() {
  const resp = await fetch('data/bracket-structure.json');
  structure = await resp.json();

  // Restore or generate ID
  const saved = localStorage.getItem('bracket-wip-quick');
  if (saved) {
    try {
      const s = JSON.parse(saved);
      picks = s.picks || {};
      champion = s.champion || '';
      entryId = s.entryId || '';
    } catch { /* ignore */ }
  }

  if (!entryId || /[^a-zA-Z0-9-]/.test(entryId)) {
    entryId = generateId();
  }
  document.getElementById('entry-id').textContent = entryId;

  // Render bracket
  renderer = new BracketRenderer(document.getElementById('bracket-area'));
  await renderer.load('data/bracket-structure.json');
  renderer.render();

  // Pre-fill R32 with likely teams
  prefillR32();

  // Restore saved picks on top of pre-fill
  restorePicks();

  // Set up click handlers
  renderer.onSlotClick = handleLeftClick;
  setupRightClick();

  updateProgress();
  document.getElementById('btn-export').addEventListener('click', exportPicks);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  document.getElementById('name-input').addEventListener('input', updateProgress);
  document.getElementById('nickname-input').addEventListener('input', updateProgress);
}

function prefillR32() {
  const r32Ids = [...(structure.left_r32_order || []), ...(structure.right_r32_order || [])];
  for (const matchId of r32Ids) {
    const match = structure.matches[matchId];
    if (!picks[matchId]) picks[matchId] = { top: '', bot: '' };

    for (const pos of ['top', 'bot']) {
      let team = null;
      const label = match[pos];
      if (label) {
        team = POSITION_TEAMS[label];
      } else if (BYE_FILL[matchId]?.[pos]) {
        team = BYE_FILL[matchId][pos];
      }
      if (!team) continue;

      if (!picks[matchId][pos]) {
        picks[matchId][pos] = team;
      }
      renderer.setSlotText(matchId, pos, picks[matchId][pos]);
      renderer.setSlotFilled(matchId, pos, true);
    }
  }
  saveToLocalStorage();
}

function restorePicks() {
  for (const [matchId, p] of Object.entries(picks)) {
    if (getMatchRound(matchId) === 'R32') continue; // already handled by prefill
    if (p.top) {
      renderer.setSlotText(matchId, 'top', p.top);
      renderer.setSlotFilled(matchId, 'top', true);
    }
    if (p.bot) {
      renderer.setSlotText(matchId, 'bot', p.bot);
      renderer.setSlotFilled(matchId, 'bot', true);
    }
    if (p.pick) {
      renderer.setSlotText(matchId, 'pick', p.pick);
      renderer.setSlotFilled(matchId, 'pick', true);
    }
  }
}

function handleLeftClick(matchId, position) {
  const p = picks[matchId];
  const country = p?.[position];
  if (!country) return;

  advanceCountry(country);
}

function setupRightClick() {
  const area = document.getElementById('bracket-area');
  area.addEventListener('contextmenu', e => {
    e.preventDefault();

    // Find which slot was right-clicked via SVG element
    const target = e.target;
    if (!target) return;

    // Walk up to find the slot group
    const g = target.closest?.('g') || target.parentElement;
    if (!g) return;

    // Find the rect with data-match attribute
    const rect = g.querySelector?.('rect[data-match]');
    if (!rect) return;

    const matchId = rect.getAttribute('data-match');
    const pos = rect.getAttribute('data-pos');
    if (!matchId || !pos) return;

    const country = picks[matchId]?.[pos];
    if (!country) return;

    undoCountry(country);
  });
}

function updateProgress() {
  let totalFilled = 0;
  for (const p of Object.values(picks)) {
    if (p.top) totalFilled++;
    if (p.bot) totalFilled++;
    if (p.pick) totalFilled++;
  }

  document.getElementById('total-picks').textContent = totalFilled;

  const name = document.getElementById('name-input').value.trim();
  const nickname = document.getElementById('nickname-input').value.trim();
  document.getElementById('btn-export').disabled = !name || !nickname || !champion;
}

function saveToLocalStorage() {
  localStorage.setItem('bracket-wip-quick', JSON.stringify({
    picks, champion, entryId,
  }));
}

function clearAll() {
  if (!confirm('Reset all picks? R32 will be restored to defaults.')) return;
  picks = {};
  champion = '';
  localStorage.removeItem('bracket-wip-quick');

  for (const [matchId, slots] of Object.entries(renderer.textElements)) {
    for (const pos of Object.keys(slots)) {
      renderer.setSlotText(matchId, pos, '');
      renderer.setSlotFilled(matchId, pos, false);
    }
  }

  prefillR32();
  updateProgress();
}

async function exportPicks() {
  const name = document.getElementById('name-input').value.trim();
  const nickname = document.getElementById('nickname-input').value.trim();
  if (!name || !nickname) return alert('Enter your name and nickname first.');

  const entry = {
    id: entryId,
    name,
    nickname,
    paid: false,
    submitted: new Date().toISOString().slice(0, 10),
    picks: { R32: {}, R16: {}, QF: {}, SF: {}, Final: {} },
    champion,
  };

  for (const [matchId, p] of Object.entries(picks)) {
    const match = structure.matches[matchId];
    if (!match) continue;
    if (match.round && entry.picks[match.round] !== undefined) {
      if (p.top) entry.picks[match.round][matchId] = p.top;
    }
  }

  const btn = document.getElementById('btn-export');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    const resp = await fetch('/worldcup/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (resp.ok) {
      const result = await resp.json();
      const verb = result.action === 'updated' ? 'updated' : 'submitted';
      alert(`Bracket ${verb}! Your ID is ${entry.id}.`);
      localStorage.removeItem('bracket-wip-quick');
    } else {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Server error (${resp.status})`);
    }
  } catch (e) {
    console.warn('Submit failed:', e.message);
    const json = JSON.stringify(entry, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      alert(`Could not reach server (${e.message}). Entry copied to clipboard.`);
    } catch {
      alert(`Submit failed: ${e.message}`);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit';
  }
}

init();

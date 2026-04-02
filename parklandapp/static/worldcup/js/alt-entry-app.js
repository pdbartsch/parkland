/**
 * Alt entry page controller — fixes champion slot, round-aware advancement,
 * group-aware drag highlighting, and auto-fill path from champion pick.
 */

import { BracketRenderer } from './alt-bracket-renderer.js';

let renderer;
let groups = {};
let structure = {};
let picks = {};       // matchId -> { top: country, bot: country }
let champion = '';
let placedCountries = new Set();  // Only tracks R32 placements
let entryId = '';

// Maps group letter -> list of R32 slot positions [{matchId, position}]
let groupSlotMap = {};

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

// --- Round-aware helpers ---

function getMatchRound(matchId) {
  if (matchId === 'champion') return 'champion';
  return structure.matches[matchId]?.round || null;
}

function getTeamsInMatch(matchId) {
  const teams = [];
  const p = picks[matchId];
  if (p?.top) teams.push(p.top);
  if (p?.bot) teams.push(p.bot);
  return teams;
}

function getCandidatesForSlot(matchId, position) {
  if (matchId === 'champion') {
    return getTeamsInMatch('M103');
  }
  const match = structure.matches[matchId];
  if (!match || !match.from) return [];
  // top slot gets winner from first feeder, bot from second
  if (position === 'top') {
    return getTeamsInMatch(match.from[0]);
  } else if (position === 'bot') {
    return getTeamsInMatch(match.from[1]);
  }
  return [];
}

function cascadeClear(country) {
  for (const [mid, p] of Object.entries(picks)) {
    const round = getMatchRound(mid);
    if (round === 'R32') continue;
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

// --- Group slot mapping ---
// Build a map from group letter to the R32 slots where that group's teams can play,
// AND their full path through the bracket (R16, QF, SF, Final, Champion).

// groupSlotMap: group letter -> [{matchId, position}] for R32 only
// groupFullPathMap: group letter -> [{matchId, position}] for ALL rounds including R32

let groupFullPathMap = {};

function buildGroupSlotMap() {
  groupSlotMap = {};
  groupFullPathMap = {};
  const r32Ids = [...(structure.left_r32_order || []), ...(structure.right_r32_order || [])];
  for (const matchId of r32Ids) {
    const match = structure.matches[matchId];
    for (const pos of ['top', 'bot']) {
      const label = match[pos];
      if (!label) continue;
      const groupLetter = label.slice(-1);
      if (!groupSlotMap[groupLetter]) groupSlotMap[groupLetter] = [];
      groupSlotMap[groupLetter].push({ matchId, position: pos });

      // Trace the full path from this R32 slot
      if (!groupFullPathMap[groupLetter]) groupFullPathMap[groupLetter] = [];
      groupFullPathMap[groupLetter].push({ matchId, position: pos });
      const path = tracePathForward(matchId, pos);
      for (const step of path) {
        // Avoid duplicates (multiple R32 slots may converge on same later-round slot)
        const exists = groupFullPathMap[groupLetter].some(
          s => s.matchId === step.matchId && s.position === step.position
        );
        if (!exists) groupFullPathMap[groupLetter].push(step);
      }
      // Add champion
      const hasChamp = groupFullPathMap[groupLetter].some(s => s.matchId === 'champion');
      if (!hasChamp) {
        groupFullPathMap[groupLetter].push({ matchId: 'champion', position: 'pick' });
      }
    }
  }
}

// --- Path tracing for auto-fill ---
// Given a country placed in R32, trace the path forward through the bracket.
// Returns array of {matchId, position} for each round the team would play.

function tracePathForward(startMatchId, startPosition) {
  const path = [];
  let currentMatchId = startMatchId;

  while (currentMatchId) {
    const match = structure.matches[currentMatchId];
    if (!match || !match.feeds) break;

    const nextMatchId = match.feeds;
    const nextMatch = structure.matches[nextMatchId];
    if (!nextMatch || !nextMatch.from) break;

    // Determine position in next round: top if from first feeder, bot if from second
    const position = nextMatch.from[0] === currentMatchId ? 'top' : 'bot';
    path.push({ matchId: nextMatchId, position });
    currentMatchId = nextMatchId;
  }

  return path;
}

// Find which R32 match and position a country is placed in
function findCountryInR32(country) {
  const r32Ids = [...(structure.left_r32_order || []), ...(structure.right_r32_order || [])];
  for (const matchId of r32Ids) {
    const p = picks[matchId];
    if (p?.top === country) return { matchId, position: 'top' };
    if (p?.bot === country) return { matchId, position: 'bot' };
  }
  return null;
}

// Auto-fill a country's path from R32 through to a target round (or champion if no target).
// If targetMatchId is given, fill up to and including that match.
// If not given, fill all the way to champion.
function autoFillPath(country, targetMatchId) {
  const r32Slot = findCountryInR32(country);
  if (!r32Slot) return;

  const path = tracePathForward(r32Slot.matchId, r32Slot.position);
  const fillToChampion = !targetMatchId || targetMatchId === 'champion';

  for (const step of path) {
    if (!picks[step.matchId]) picks[step.matchId] = { top: '', bot: '' };
    picks[step.matchId][step.position] = country;
    renderer.setSlotText(step.matchId, step.position, country);
    renderer.setSlotFilled(step.matchId, step.position, true);

    // Stop here if this is the target
    if (!fillToChampion && step.matchId === targetMatchId) break;
  }

  if (fillToChampion) {
    champion = country;
    if (!picks['champion']) picks['champion'] = { top: '', bot: '', pick: '' };
    picks['champion']['pick'] = country;
    renderer.setSlotText('champion', 'pick', country);
    renderer.setSlotFilled('champion', 'pick', true);
  }

  saveToLocalStorage();
  updateProgress();
}

// Auto-fill from an R32 slot placement through to a specific later-round slot.
// Used when dropping a team directly onto a highlighted later-round slot.
function autoFillFromDrop(country, groupLetter, targetMatchId) {
  // First, find a valid R32 slot for this group and place the team there
  const validSlots = groupSlotMap[groupLetter] || [];
  // Prefer the R32 slot that leads to the target match
  let bestR32Slot = null;
  for (const slot of validSlots) {
    const path = tracePathForward(slot.matchId, slot.position);
    const reachesTarget = targetMatchId === 'champion'
      ? true  // any path reaches champion
      : path.some(s => s.matchId === targetMatchId);
    if (reachesTarget && !placedCountries.has(picks[slot.matchId]?.[slot.position])) {
      bestR32Slot = slot;
      break;
    }
  }
  if (!bestR32Slot) return;

  // Place in R32 first
  placeCountry(bestR32Slot.matchId, bestR32Slot.position, country);

  // Now auto-fill the path
  autoFillPath(country, targetMatchId);
}

// --- Init ---

async function init() {
  const [groupsResp, structResp] = await Promise.all([
    fetch('data/groups.json'),
    fetch('data/bracket-structure.json'),
  ]);
  groups = await groupsResp.json();
  structure = await structResp.json();

  buildGroupSlotMap();

  // Restore WIP from localStorage
  const saved = localStorage.getItem('bracket-wip-alt');
  if (saved) {
    try {
      const s = JSON.parse(saved);
      picks = s.picks || {};
      champion = s.champion || '';
      entryId = s.entryId || '';
      // Rebuild placedCountries from R32 picks only
      placedCountries = new Set();
      const r32Ids = [...(structure.left_r32_order || []), ...(structure.right_r32_order || [])];
      for (const id of r32Ids) {
        if (picks[id]?.top) placedCountries.add(picks[id].top);
        if (picks[id]?.bot) placedCountries.add(picks[id].bot);
      }
    } catch { /* ignore bad data */ }
  }

  if (!entryId || /[^a-zA-Z0-9-]/.test(entryId)) {
    entryId = generateId();
    saveToLocalStorage();
  }
  document.getElementById('entry-id').textContent = entryId;

  renderer = new BracketRenderer(document.getElementById('bracket-area'));
  await renderer.load('data/bracket-structure.json');
  renderer.render();
  renderer.onSlotClick = handleSlotClick;

  buildPalette();
  restorePicks();
  updateProgress();

  document.getElementById('btn-export').addEventListener('click', exportPicks);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  document.getElementById('name-input').addEventListener('input', updateProgress);
  document.getElementById('nickname-input').addEventListener('input', updateProgress);
}

function buildPalette() {
  const palette = document.getElementById('tile-palette');
  palette.innerHTML = '<h3>Countries</h3>';

  for (const [letter, teams] of Object.entries(groups)) {
    const section = document.createElement('div');
    section.className = 'group-section';
    section.innerHTML = `<div class="group-label">Group ${letter}</div>`;

    teams.forEach(country => {
      const tile = document.createElement('div');
      tile.className = 'country-tile';
      tile.draggable = true;
      tile.dataset.country = country;
      tile.dataset.group = letter;

      if (placedCountries.has(country)) {
        tile.classList.add('placed');
      }

      tile.innerHTML = `
        <span class="group-tag">${letter}</span>
        <span>${country}</span>
      `;

      tile.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', country);
        e.dataTransfer.setData('application/x-group', letter);
        tile.style.opacity = '0.5';

        // Highlight valid R32 slots for this group
        highlightGroupSlots(letter, true);
      });
      tile.addEventListener('dragend', () => {
        tile.style.opacity = '';
        highlightGroupSlots(letter, false);
      });

      section.appendChild(tile);
    });

    palette.appendChild(section);
  }
}

function highlightGroupSlots(groupLetter, active) {
  // Only highlight R32 slots — we can't know the path until group placement is decided
  const slots = groupSlotMap[groupLetter] || [];
  for (const { matchId, position } of slots) {
    renderer.setSlotHighlight(matchId, position, 'group-highlight', active);
  }
}

function handleSlotClick(matchId, position) {
  const round = getMatchRound(matchId);

  // For champion slot, show the two finalists as choices
  if (matchId === 'champion') {
    const candidates = getTeamsInMatch('M103');
    if (candidates.length === 0) {
      showTooltip('Fill the Final match first');
      return;
    }
    showPickerForSlot(matchId, position, candidates);
    return;
  }

  // For non-R32 rounds, show feeder match teams as picker
  if (round !== 'R32') {
    const candidates = getCandidatesForSlot(matchId, position);
    if (candidates.length === 0) {
      showTooltip('Fill the earlier round first');
      return;
    }
    showPickerForSlot(matchId, position, candidates);
    return;
  }

  // R32: regular type-in
  const slotRect = renderer.slotElements[matchId]?.[position];
  if (!slotRect) return;
  const svgRect = slotRect.node().getBoundingClientRect();
  showTypeIn(svgRect.left, svgRect.top, matchId, position);
}

function showTooltip(msg) {
  removeTypeIn();
  const div = document.createElement('div');
  div.className = 'type-in-list';
  div.style.position = 'fixed';
  div.style.left = '50%';
  div.style.top = '50%';
  div.style.transform = 'translate(-50%, -50%)';
  div.style.width = 'auto';
  div.style.padding = '12px 20px';
  div.style.zIndex = '1000';
  div.innerHTML = `<div style="color:var(--muted);font-size:0.85em;">${msg}</div>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2000);
}

function showPickerForSlot(matchId, position, candidates) {
  removeTypeIn();

  const slotRect = renderer.slotElements[matchId]?.[position];
  if (!slotRect) return;
  const svgRect = slotRect.node().getBoundingClientRect();

  const list = document.createElement('div');
  list.className = 'type-in-list';
  list.style.left = svgRect.left + 'px';
  list.style.top = (svgRect.top + 28) + 'px';
  list.style.width = '180px';

  candidates.forEach(country => {
    const groupLetter = Object.entries(groups).find(([, teams]) => teams.includes(country))?.[0] || '';
    const opt = document.createElement('div');
    opt.className = 'option';
    opt.textContent = `${country} (${groupLetter})`;
    opt.addEventListener('mousedown', e => {
      e.preventDefault();
      placeCountry(matchId, position, country);
      removeTypeIn();
    });
    list.appendChild(opt);
  });

  // Auto-fill options: pick this team and fill their path to champion
  const r32Candidates = candidates.filter(c => findCountryInR32(c));
  if (r32Candidates.length > 0) {
    const divider = document.createElement('div');
    divider.style.cssText = 'border-top:1px solid var(--border);margin:4px 0;';
    list.appendChild(divider);

    const label = document.createElement('div');
    label.style.cssText = 'padding:3px 8px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;';
    label.textContent = 'Auto-fill to champion';
    list.appendChild(label);

    r32Candidates.forEach(country => {
      const opt = document.createElement('div');
      opt.className = 'option';
      opt.style.color = 'var(--accent)';
      opt.style.fontWeight = 'bold';
      opt.textContent = `${country} wins it all`;
      opt.addEventListener('mousedown', e => {
        e.preventDefault();
        autoFillPath(country);
        removeTypeIn();
      });
      list.appendChild(opt);
    });
  }

  document.body.appendChild(list);

  // Close on click outside
  const closer = (e) => {
    if (!list.contains(e.target)) {
      list.remove();
      document.removeEventListener('mousedown', closer);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', closer), 50);
}

function showTypeIn(x, y, matchId, position) {
  removeTypeIn();

  const input = document.createElement('input');
  input.className = 'type-in-input';
  input.style.left = x + 'px';
  input.style.top = y + 'px';
  input.placeholder = 'Type country...';
  input.setAttribute('autocomplete', 'off');

  const list = document.createElement('div');
  list.className = 'type-in-list';
  list.style.left = x + 'px';
  list.style.top = (y + 28) + 'px';
  list.style.width = '180px';

  document.body.appendChild(input);
  document.body.appendChild(list);
  input.focus();

  const allCountries = Object.entries(groups).flatMap(
    ([letter, teams]) => teams.map(t => ({ country: t, group: letter }))
  );

  // For R32, also filter by which groups can play in this slot
  const match = structure.matches[matchId];
  const slotLabel = match?.[position] || '';
  const slotGroupLetter = slotLabel ? slotLabel.slice(-1) : null;

  const updateList = () => {
    const q = input.value.toLowerCase();
    let available = allCountries.filter(
      c => c.country.toLowerCase().includes(q) && !placedCountries.has(c.country)
    );

    // Only show teams from the correct group for this slot
    if (slotGroupLetter) {
      available = available.filter(c => c.group === slotGroupLetter);
    }

    list.innerHTML = '';
    available.forEach(({ country, group }) => {
      const opt = document.createElement('div');
      opt.className = 'option';
      opt.textContent = `${country} (${group})`;
      opt.addEventListener('mousedown', e => {
        e.preventDefault();
        placeCountry(matchId, position, country);
        removeTypeIn();
      });
      list.appendChild(opt);
    });
  };

  input.addEventListener('input', updateList);
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') removeTypeIn();
    if (e.key === 'Enter') {
      const first = list.querySelector('.option');
      if (first) first.dispatchEvent(new Event('mousedown'));
    }
  });
  input.addEventListener('blur', () => {
    setTimeout(removeTypeIn, 150);
  });

  updateList();
}

function removeTypeIn() {
  document.querySelectorAll('.type-in-input, .type-in-list').forEach(el => el.remove());
}

const ROUND_ORDER = ['R32', 'R16', 'QF', 'SF', 'Final', 'champion'];

function placeCountry(matchId, position, country) {
  const round = getMatchRound(matchId);
  const roundIdx = ROUND_ORDER.indexOf(round);

  // Remove country from previous placement in the SAME round only.
  // For R32: also cascade-clear downstream rounds.
  // For R16+: only remove from that same round (advancing keeps earlier rounds intact).
  for (const [mid, p] of Object.entries(picks)) {
    const midRound = getMatchRound(mid);
    const midIdx = ROUND_ORDER.indexOf(midRound);

    // Only touch slots in the same round as the target
    if (midIdx !== roundIdx) continue;

    if (p.top === country) {
      p.top = '';
      renderer.setSlotText(mid, 'top', '');
      renderer.setSlotFilled(mid, 'top', false);
      if (midRound === 'R32') {
        placedCountries.delete(country);
        updatePaletteTile(country, false);
        cascadeClear(country);
      }
    }
    if (p.bot === country) {
      p.bot = '';
      renderer.setSlotText(mid, 'bot', '');
      renderer.setSlotFilled(mid, 'bot', false);
      if (midRound === 'R32') {
        placedCountries.delete(country);
        updatePaletteTile(country, false);
        cascadeClear(country);
      }
    }
    if (p.pick === country) {
      p.pick = '';
      renderer.setSlotText(mid, 'pick', '');
      renderer.setSlotFilled(mid, 'pick', false);
      if (mid === 'champion') champion = '';
    }
  }

  // Place in new slot
  if (!picks[matchId]) picks[matchId] = { top: '', bot: '' };
  picks[matchId][position] = country;

  // Champion fix: set the global
  if (matchId === 'champion') {
    champion = country;
  }

  // Only track in placedCountries for R32
  if (round === 'R32') {
    placedCountries.add(country);
    updatePaletteTile(country, true);
  }

  renderer.setSlotText(matchId, position, country);
  renderer.setSlotFilled(matchId, position, true);

  saveToLocalStorage();
  updateProgress();
}

function updatePaletteTile(country, placed) {
  const tiles = document.querySelectorAll('.country-tile');
  tiles.forEach(tile => {
    if (tile.dataset.country === country) {
      tile.classList.toggle('placed', placed);
    }
  });
}

function restorePicks() {
  for (const [matchId, p] of Object.entries(picks)) {
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
  if (champion) {
    renderer.setSlotText('champion', 'pick', champion);
    renderer.setSlotFilled('champion', 'pick', true);
  }
}

function updateProgress() {
  let filled = 0;
  const r32Ids = [...structure.left_r32_order, ...structure.right_r32_order];
  r32Ids.forEach(id => {
    if (picks[id]?.top) filled++;
    if (picks[id]?.bot) filled++;
  });

  let totalFilled = 0;
  for (const p of Object.values(picks)) {
    if (p.top) totalFilled++;
    if (p.bot) totalFilled++;
    if (p.pick) totalFilled++;
  }

  document.getElementById('progress-count').textContent = `${filled}/32`;
  document.getElementById('total-picks').textContent = totalFilled;

  const name = document.getElementById('name-input').value.trim();
  const nickname = document.getElementById('nickname-input').value.trim();
  const complete = filled === 32 && champion;
  document.getElementById('btn-export').disabled = !name || !nickname || !complete;
}

function saveToLocalStorage() {
  localStorage.setItem('bracket-wip-alt', JSON.stringify({
    picks,
    champion,
    placedCountries: [...placedCountries],
    entryId,
  }));
}

function clearAll() {
  if (!confirm('Clear all picks? This cannot be undone.')) return;
  picks = {};
  champion = '';
  placedCountries.clear();
  localStorage.removeItem('bracket-wip-alt');

  for (const [matchId, slots] of Object.entries(renderer.textElements)) {
    for (const pos of Object.keys(slots)) {
      renderer.setSlotText(matchId, pos, '');
      renderer.setSlotFilled(matchId, pos, false);
    }
  }

  buildPalette();
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
      alert(`Bracket ${verb}! Your ID is ${entry.id}. Keep it safe — you'll need it to check your entry.`);
      localStorage.removeItem('bracket-wip-alt');
    } else {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Server error (${resp.status})`);
    }
  } catch (e) {
    console.warn('Submit failed, falling back to clipboard:', e.message);
    const json = JSON.stringify(entry, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      alert(`Could not reach server (${e.message}). Entry copied to clipboard instead — send it to the pool admin.`);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = json;
      ta.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:300px;z-index:1000;font-family:monospace;font-size:12px;padding:12px;';
      document.body.appendChild(ta);
      ta.select();
      alert(`Could not reach server. Copy the JSON from the text area and send it to the pool admin.`);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Bracket';
  }
}

function setupDragDrop() {
  const area = document.getElementById('bracket-area');
  const SLOT_W = 150, SLOT_H = 28;
  let currentHighlight = null;
  let dragGroup = null;

  function findNearestSlot(svgPt) {
    let closest = null;
    let closestDist = Infinity;

    for (const [matchId, slots] of Object.entries(renderer.slotElements)) {
      for (const [pos, rect] of Object.entries(slots)) {
        const rx = +rect.attr('x');
        const ry = +rect.attr('y');
        const cx = rx + SLOT_W / 2;
        const cy = ry + SLOT_H / 2;
        const dist = Math.hypot(svgPt.x - cx, svgPt.y - cy);

        if (dist < closestDist && dist < 60) {
          closestDist = dist;
          closest = { matchId, pos };
        }
      }
    }
    return closest;
  }

  function toSvgCoords(e) {
    const svgEl = area.querySelector('svg');
    if (!svgEl) return null;
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return null;
    return {
      x: (e.clientX - ctm.e) / ctm.a,
      y: (e.clientY - ctm.f) / ctm.d,
    };
  }

  // Check if a slot is a valid R32 drop target for a given group
  function isValidR32Slot(matchId, pos, groupLetter) {
    if (getMatchRound(matchId) !== 'R32') return false;
    const match = structure.matches[matchId];
    if (!match) return false;
    const label = match[pos];
    if (!label) return false;
    return label.slice(-1) === groupLetter;
  }

  area.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const svgPt = toSvgCoords(e);
    if (!svgPt) return;

    const nearest = findNearestSlot(svgPt);

    if (currentHighlight) {
      renderer.setDropTarget(currentHighlight.matchId, currentHighlight.pos, false);
      currentHighlight = null;
    }

    if (nearest && dragGroup && isValidR32Slot(nearest.matchId, nearest.pos, dragGroup)) {
      renderer.setDropTarget(nearest.matchId, nearest.pos, true);
      currentHighlight = nearest;
    }
  });

  area.addEventListener('dragleave', () => {
    if (currentHighlight) {
      renderer.setDropTarget(currentHighlight.matchId, currentHighlight.pos, false);
      currentHighlight = null;
    }
  });

  area.addEventListener('drop', e => {
    e.preventDefault();
    dragGroup = null;

    if (currentHighlight) {
      renderer.setDropTarget(currentHighlight.matchId, currentHighlight.pos, false);
      currentHighlight = null;
    }

    const country = e.dataTransfer.getData('text/plain');
    const group = e.dataTransfer.getData('application/x-group');
    if (!country) return;

    const svgPt = toSvgCoords(e);
    if (!svgPt) return;

    const nearest = findNearestSlot(svgPt);
    if (nearest && (!group || isValidR32Slot(nearest.matchId, nearest.pos, group))) {
      placeCountry(nearest.matchId, nearest.pos, country);
    }
  });

  // Track which group is being dragged for highlighting
  document.addEventListener('dragstart', e => {
    const tile = e.target.closest?.('.country-tile');
    if (tile) {
      dragGroup = tile.dataset.group;
    }
  });

  document.addEventListener('dragend', () => {
    dragGroup = null;
  });
}

init().then(() => {
  setupDragDrop();
});

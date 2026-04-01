/**
 * Entry page controller — manages drag-and-drop, type-in, pick state, and export.
 */

import { BracketRenderer } from './bracket-renderer.js';

let renderer;
let groups = {};
let structure = {};
let picks = {};       // matchId -> { top: country, bot: country }
let champion = '';
let placedCountries = new Set();
let entryId = '';

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

async function init() {
  // Load data
  const [groupsResp, structResp] = await Promise.all([
    fetch('data/groups.json'),
    fetch('data/bracket-structure.json'),
  ]);
  groups = await groupsResp.json();
  structure = await structResp.json();

  // Restore WIP from localStorage
  const saved = localStorage.getItem('bracket-wip');
  if (saved) {
    try {
      const s = JSON.parse(saved);
      picks = s.picks || {};
      champion = s.champion || '';
      placedCountries = new Set(s.placedCountries || []);
      entryId = s.entryId || '';
    } catch { /* ignore bad data */ }
  }

  // Generate unique ID if not set, or regenerate if it contains special chars (legacy)
  if (!entryId || /[^a-zA-Z0-9-]/.test(entryId)) {
    entryId = generateId();
    saveTolocalStorage();
  }
  document.getElementById('entry-id').textContent = entryId;

  // Render bracket
  renderer = new BracketRenderer(document.getElementById('bracket-area'));
  await renderer.load('data/bracket-structure.json');
  renderer.render();
  renderer.onSlotClick = handleSlotClick;

  // Build tile palette
  buildPalette();

  // Restore saved picks to the bracket display
  restorePicks();

  // Update progress
  updateProgress();

  // Wire up buttons
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
      });
      tile.addEventListener('dragend', () => {
        tile.style.opacity = '';
      });

      section.appendChild(tile);
    });

    palette.appendChild(section);
  }
}

function handleSlotClick(matchId, position) {
  // Open type-in autocomplete at the slot position
  const slotRect = renderer.slotElements[matchId]?.[position];
  if (!slotRect) return;

  const svgRect = slotRect.node().getBoundingClientRect();
  showTypeIn(svgRect.left, svgRect.top, matchId, position);
}

function showTypeIn(x, y, matchId, position) {
  // Remove any existing type-in
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

  const updateList = () => {
    const q = input.value.toLowerCase();
    const filtered = allCountries.filter(
      c => c.country.toLowerCase().includes(q) && !placedCountries.has(c.country)
    );
    list.innerHTML = '';
    filtered.forEach(({ country, group }) => {
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

function placeCountry(matchId, position, country) {
  // Remove country from previous placement if any
  for (const [mid, p] of Object.entries(picks)) {
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
  }

  // Place in new slot
  if (!picks[matchId]) picks[matchId] = { top: '', bot: '' };
  picks[matchId][position] = country;
  placedCountries.add(country);

  renderer.setSlotText(matchId, position, country);
  renderer.setSlotFilled(matchId, position, true);

  // Update palette
  updatePaletteTile(country, true);
  saveTolocalStorage();
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
  }
  if (champion) {
    renderer.setSlotText('champion', 'pick', champion);
    renderer.setSlotFilled('champion', 'pick', true);
  }
}

function updateProgress() {
  // Count filled R32 slots (32 total)
  let filled = 0;
  const r32Ids = [...structure.left_r32_order, ...structure.right_r32_order];
  r32Ids.forEach(id => {
    if (picks[id]?.top) filled++;
    if (picks[id]?.bot) filled++;
  });

  // Count all filled slots across all rounds
  let totalFilled = 0;
  for (const p of Object.values(picks)) {
    if (p.top) totalFilled++;
    if (p.bot) totalFilled++;
  }
  if (champion) totalFilled++;

  document.getElementById('progress-count').textContent = `${filled}/32`;
  document.getElementById('total-picks').textContent = totalFilled;

  const name = document.getElementById('name-input').value.trim();
  const nickname = document.getElementById('nickname-input').value.trim();
  const complete = filled === 32 && champion;
  document.getElementById('btn-export').disabled = !name || !nickname || !complete;
}

function saveTolocalStorage() {
  localStorage.setItem('bracket-wip', JSON.stringify({
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
  localStorage.removeItem('bracket-wip');

  // Reset all slot visuals
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

  // Build the entry in entries.json format
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
    // For R32, the pick is whichever team the user advanced (placed in the next round)
    // For simplicity, we record the winner pick for each match
    // The "winner" of a match is the team that appears in the next round
    if (match.round && entry.picks[match.round] !== undefined) {
      // For now, store as the top pick for the match
      // This will be refined when we add the "advance winner" flow
      if (p.top) entry.picks[match.round][matchId] = p.top;
    }
  }

  // Submit to server, fall back to clipboard copy
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
      localStorage.removeItem('bracket-wip');
    } else {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Server error (${resp.status})`);
    }
  } catch (e) {
    // Fallback: copy to clipboard
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

// Set up drag-and-drop on the SVG
function setupDragDrop() {
  const area = document.getElementById('bracket-area');
  const SLOT_W = 150, SLOT_H = 28;
  let currentHighlight = null;

  // Helper: find nearest slot to an SVG coordinate
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

  // Helper: convert mouse event to SVG coordinates
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

  area.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Highlight nearest slot
    const svgPt = toSvgCoords(e);
    if (!svgPt) return;

    const nearest = findNearestSlot(svgPt);

    // Clear previous highlight
    if (currentHighlight) {
      renderer.setDropTarget(currentHighlight.matchId, currentHighlight.pos, false);
      currentHighlight = null;
    }

    if (nearest) {
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

    // Clear highlight
    if (currentHighlight) {
      renderer.setDropTarget(currentHighlight.matchId, currentHighlight.pos, false);
      currentHighlight = null;
    }

    const country = e.dataTransfer.getData('text/plain');
    if (!country) return;

    const svgPt = toSvgCoords(e);
    if (!svgPt) return;

    const nearest = findNearestSlot(svgPt);
    if (nearest) {
      placeCountry(nearest.matchId, nearest.pos, country);
    }
  });
}

// Boot — runs immediately since this module is loaded after DOM is ready
init().then(() => {
  setupDragDrop();
});

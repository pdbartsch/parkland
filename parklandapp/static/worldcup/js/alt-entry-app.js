/**
 * Entry page controller — 3-step wizard:
 *   1. Group stage rankings (drag to reorder)
 *   2. Third-place team selection (pick 8 of 12)
 *   3. Knockout bracket (click to advance winners)
 */

import { BracketRenderer } from './bracket-renderer.js';
import {
  loadData as loadGroupData,
  renderGroupCards,
  renderThirdPlaceSelector,
  getGroupRankings,
  getThirdPlaceSelected,
  setGroupRankings,
  setThirdPlaceSelected,
  resolveR32,
} from './group-stage.js';

let renderer;
let structure = {};
let picks = {};       // matchId -> winner country (for R16+)
let champion = '';
let r32Resolved = {};  // matchId -> { top, bot } — auto-filled from group rankings
let entryId = '';
let currentStep = 1;

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
  // Load group data + lookup table
  await loadGroupData();

  // Load bracket structure
  const structResp = await fetch('data/bracket-structure.json');
  structure = await structResp.json();

  // Restore WIP from localStorage
  const saved = localStorage.getItem('bracket-alt-wip');
  if (saved) {
    try {
      const s = JSON.parse(saved);
      picks = s.picks || {};
      champion = s.champion || '';
      entryId = s.entryId || '';
      if (s.groupRankings) setGroupRankings(s.groupRankings);
      if (s.thirdPlaceSelected) setThirdPlaceSelected(s.thirdPlaceSelected);
      if (s.currentStep) currentStep = s.currentStep;
    } catch { /* ignore */ }
  }

  if (!entryId || /[^a-zA-Z0-9-]/.test(entryId)) {
    entryId = generateId();
    saveToLocalStorage();
  }
  document.getElementById('entry-id').textContent = entryId;

  // Render step 1
  renderGroupCards(
    document.getElementById('group-cards-container'),
    () => saveToLocalStorage()
  );

  // Wire up step navigation
  document.getElementById('btn-to-step2').addEventListener('click', () => goToStep(2));
  document.getElementById('btn-back-to-1').addEventListener('click', () => goToStep(1));
  document.getElementById('btn-to-step3').addEventListener('click', () => goToStep(3));
  document.getElementById('btn-back-to-2').addEventListener('click', () => goToStep(2));

  // Wire up action buttons
  document.getElementById('btn-export').addEventListener('click', exportPicks);
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  document.getElementById('btn-reset').addEventListener('click', clearAll);
  document.getElementById('name-input').addEventListener('input', updateSubmitButton);
  document.getElementById('nickname-input').addEventListener('input', updateSubmitButton);

  // Restore to saved step
  if (currentStep > 1) {
    goToStep(currentStep);
  }
}

function goToStep(step) {
  currentStep = step;

  // Hide all steps
  document.getElementById('step-1').style.display = 'none';
  document.getElementById('step-2').style.display = 'none';
  document.getElementById('step-3').style.display = 'none';

  // Update step indicators
  for (let i = 1; i <= 3; i++) {
    const ind = document.getElementById(`step-ind-${i}`);
    ind.classList.remove('active', 'done');
    if (i < step) ind.classList.add('done');
    if (i === step) ind.classList.add('active');
  }

  if (step === 1) {
    document.getElementById('step-1').style.display = '';
  } else if (step === 2) {
    // Render third-place selector with current rankings
    renderThirdPlaceSelector(
      document.getElementById('third-place-container'),
      () => {
        const sel = getThirdPlaceSelected();
        document.getElementById('btn-to-step3').disabled = sel.length !== 8;
        saveToLocalStorage();
      }
    );
    // Update button state
    document.getElementById('btn-to-step3').disabled = getThirdPlaceSelected().length !== 8;
    document.getElementById('step-2').style.display = '';
  } else if (step === 3) {
    // Resolve R32 from rankings + third-place selection
    const newR32 = resolveR32(structure);
    if (!newR32) {
      alert('Could not resolve R32 matchups. Please go back and check your selections.');
      goToStep(2);
      return;
    }

    // If R32 changed (group rankings or 3rd-place selection changed), clear knockout picks
    if (JSON.stringify(newR32) !== JSON.stringify(r32Resolved)) {
      picks = {};
      champion = '';
    }
    r32Resolved = newR32;

    initKnockoutBracket();
    document.getElementById('step-3').style.display = '';
  }

  saveToLocalStorage();
}

// --- Knockout bracket (Step 3) ---

function initKnockoutBracket() {
  const bracketArea = document.getElementById('bracket-area');
  bracketArea.innerHTML = '';

  renderer = new BracketRenderer(bracketArea);
  renderer.load('data/bracket-structure.json').then(() => {
    renderer.render();

    // Fill R32 slots as read-only
    const allR32 = [...structure.left_r32_order, ...structure.right_r32_order];
    for (const matchId of allR32) {
      const teams = r32Resolved[matchId];
      if (teams.top) {
        renderer.setSlotText(matchId, 'top', teams.top);
        renderer.setSlotFilled(matchId, 'top', true);
      }
      if (teams.bot) {
        renderer.setSlotText(matchId, 'bot', teams.bot);
        renderer.setSlotFilled(matchId, 'bot', true);
      }

      // Lock R32 slots visually
      if (renderer.slotElements[matchId]) {
        for (const rect of Object.values(renderer.slotElements[matchId])) {
          rect.classed('locked', true);
        }
      }
    }

    // Set up click-to-advance for all matches
    renderer.onSlotClick = handleKnockoutClick;

    // Restore saved picks
    restoreKnockoutPicks();

    updateProgress();
  });
}

function handleKnockoutClick(matchId, position) {
  const match = structure.matches[matchId];
  if (!match) return;

  // Get the team in this slot
  const team = getTeamInSlot(matchId, position);
  if (!team) return;

  // This team wins this match — advance to next round
  const feedsMatch = match.feeds;
  if (!feedsMatch) {
    // This is the final — set champion
    if (picks[matchId] === team && champion === team) return;
    picks[matchId] = team;
    champion = team;
    renderer.setSlotText('champion', 'pick', team);
    renderer.setSlotFilled('champion', 'pick', true);
    // Highlight winner in final
    if (renderer.slotElements[matchId]) {
      for (const [pos, rect] of Object.entries(renderer.slotElements[matchId])) {
        rect.classed('filled', pos === position);
      }
    }
    updateProgress();
    saveToLocalStorage();
    return;
  }

  // If re-clicking the same pick, ignore
  if (picks[matchId] === team) return;

  // Clear downstream before changing pick
  const nextMatch = structure.matches[feedsMatch];
  const feedingMatches = nextMatch.from;
  const slotPos = feedingMatches.indexOf(matchId) === 0 ? 'top' : 'bot';

  if (picks[matchId]) {
    // Previous pick exists — clear downstream
    clearDownstream(feedsMatch, slotPos);
  }

  // Record the pick
  picks[matchId] = team;

  // Place winner in next match
  renderer.setSlotText(feedsMatch, slotPos, team);
  renderer.setSlotFilled(feedsMatch, slotPos, true);

  // Highlight the winning slot, dim the other
  if (renderer.slotElements[matchId]) {
    for (const [pos, rect] of Object.entries(renderer.slotElements[matchId])) {
      if (match.round === 'R32') {
        // For R32 keep the "locked" look but highlight winner
        rect.classed('locked', pos !== position);
        rect.classed('filled', pos === position);
      } else {
        rect.classed('filled', pos === position);
      }
    }
  }

  updateProgress();
  saveToLocalStorage();
}

function restoreKnockoutPicks() {
  // Replay saved picks in round order to fill the bracket
  const roundOrder = ['R32', 'R16', 'QF', 'SF', 'Final'];
  for (const round of roundOrder) {
    for (const [matchId, winner] of Object.entries(picks)) {
      const match = structure.matches[matchId];
      if (!match || match.round !== round) continue;

      const feedsMatch = match.feeds;
      if (feedsMatch) {
        const nextMatch = structure.matches[feedsMatch];
        const slotPos = nextMatch.from.indexOf(matchId) === 0 ? 'top' : 'bot';
        renderer.setSlotText(feedsMatch, slotPos, winner);
        renderer.setSlotFilled(feedsMatch, slotPos, true);
      }

      // Highlight winning slot
      if (renderer.slotElements[matchId]) {
        const teams = match.round === 'R32' ? r32Resolved[matchId] : null;
        for (const [pos, rect] of Object.entries(renderer.slotElements[matchId])) {
          const teamInSlot = teams ? teams[pos] : getTeamInSlot(matchId, pos);
          const isWinner = teamInSlot === winner;
          if (match.round === 'R32') {
            rect.classed('locked', !isWinner);
            rect.classed('filled', isWinner);
          } else {
            rect.classed('filled', isWinner);
          }
        }
      }
    }
  }

  // Restore champion
  if (champion) {
    renderer.setSlotText('champion', 'pick', champion);
    renderer.setSlotFilled('champion', 'pick', true);
  }
}

function getTeamInSlot(matchId, position) {
  const match = structure.matches[matchId];

  if (match.round === 'R32') {
    return r32Resolved[matchId]?.[position] || '';
  }

  // For later rounds, the team comes from whoever won the feeding match
  const feedingMatches = match.from;
  if (!feedingMatches) return '';

  const feedIdx = position === 'top' ? 0 : 1;
  const feedMatchId = feedingMatches[feedIdx];
  return picks[feedMatchId] || '';
}

function clearDownstream(matchId, fromPos) {
  // If we're replacing a team in this slot, clear any picks that used the old team
  const oldPick = picks[matchId];
  if (!oldPick) return;

  delete picks[matchId];

  // Clear the text in the next match
  const match = structure.matches[matchId];
  if (match.feeds) {
    const nextMatch = structure.matches[match.feeds];
    const nextPos = nextMatch.from.indexOf(matchId) === 0 ? 'top' : 'bot';
    renderer.setSlotText(match.feeds, nextPos, '');
    renderer.setSlotFilled(match.feeds, nextPos, false);
    clearDownstream(match.feeds, nextPos);
  }

  // Clear visual highlighting
  if (renderer.slotElements[matchId]) {
    for (const rect of Object.values(renderer.slotElements[matchId])) {
      rect.classed('filled', false);
    }
  }

  // Check if this was the champion
  if (matchId === 'M103') {
    champion = '';
  }
}

function updateProgress() {
  document.getElementById('total-picks').textContent = `${Object.keys(picks).length}/31`;
  updateSubmitButton();
}

function updateSubmitButton() {
  const name = document.getElementById('name-input').value.trim();
  const nickname = document.getElementById('nickname-input').value.trim();

  // 16 R32 + 8 R16 + 4 QF + 2 SF + 1 Final = 31 match winners + champion
  const totalNeeded = 31;
  const complete = Object.keys(picks).length === totalNeeded && !!champion;
  document.getElementById('btn-export').disabled = !name || !nickname || !complete;
}

function saveToLocalStorage() {
  localStorage.setItem('bracket-alt-wip', JSON.stringify({
    groupRankings: getGroupRankings(),
    thirdPlaceSelected: getThirdPlaceSelected(),
    picks,
    champion,
    entryId,
    currentStep,
  }));
}

function clearAll() {
  if (!confirm('Clear all picks and rankings? This cannot be undone.')) return;
  localStorage.removeItem('bracket-alt-wip');
  location.reload();
}

async function exportPicks() {
  const name = document.getElementById('name-input').value.trim();
  const nickname = document.getElementById('nickname-input').value.trim();
  if (!name || !nickname) return alert('Enter your name and nickname first.');

  const rankings = getGroupRankings();

  // Build R32 picks from r32Resolved — pick winner of each R32 match
  const r32picks = {};
  const allR32 = [...structure.left_r32_order, ...structure.right_r32_order];
  for (const matchId of allR32) {
    if (picks[matchId]) {
      r32picks[matchId] = picks[matchId];
    }
  }

  // Build picks by round
  const picksByRound = { R32: {}, R16: {}, QF: {}, SF: {}, Final: {} };
  for (const [matchId, winner] of Object.entries(picks)) {
    const match = structure.matches[matchId];
    if (match && picksByRound[match.round] !== undefined) {
      picksByRound[match.round][matchId] = winner;
    }
  }

  const entry = {
    id: entryId,
    name,
    nickname,
    paid: false,
    submitted: new Date().toISOString().slice(0, 10),
    group_rankings: rankings,
    third_place_qualifiers: getThirdPlaceSelected().sort(),
    picks: picksByRound,
    champion,
  };

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
      alert(`Bracket ${verb}! Your ID is ${entry.id}. Keep it safe.`);
      localStorage.removeItem('bracket-alt-wip');
    } else {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Server error (${resp.status})`);
    }
  } catch (e) {
    console.warn('Submit failed, falling back to clipboard:', e.message);
    const json = JSON.stringify(entry, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      alert(`Could not reach server (${e.message}). Entry copied to clipboard — send it to the pool admin.`);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = json;
      ta.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:300px;z-index:1000;font-family:monospace;font-size:12px;padding:12px;';
      document.body.appendChild(ta);
      ta.select();
      alert('Could not reach server. Copy the JSON from the text area and send it to the pool admin.');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Bracket';
  }
}

// Boot
init();

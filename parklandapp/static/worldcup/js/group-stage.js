/**
 * Group stage ranking UI and third-place selection logic.
 * Handles steps 1 (rank groups) and 2 (select 8 third-place teams).
 */

let groups = {};
let lookupTable = [];
let groupRankings = {};      // { A: [team1, team2, team3, team4], ... }
let thirdPlaceSelected = new Set();  // set of group letters

// Drag state for sortable lists
let dragSrcEl = null;
let dragSrcGroup = null;

export async function loadData() {
  const [groupsResp, lookupResp] = await Promise.all([
    fetch('data/groups.json'),
    fetch('data/third-place-lookup.json'),
  ]);
  groups = await groupsResp.json();
  lookupTable = await lookupResp.json();

  // Initialize rankings to draw order
  for (const [letter, teams] of Object.entries(groups)) {
    groupRankings[letter] = [...teams];
  }
}

export function getGroupRankings() {
  return groupRankings;
}

export function getThirdPlaceSelected() {
  return [...thirdPlaceSelected];
}

export function setGroupRankings(r) {
  groupRankings = r;
}

export function setThirdPlaceSelected(s) {
  thirdPlaceSelected = new Set(s);
}

// --- Step 1: Group ranking cards ---

export function renderGroupCards(container, onChanged) {
  container.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'group-grid';

  for (const letter of Object.keys(groups)) {
    const card = document.createElement('div');
    card.className = 'group-card';
    card.dataset.group = letter;

    const header = document.createElement('div');
    header.className = 'group-card-header';
    header.textContent = `Group ${letter}`;
    card.appendChild(header);

    const list = document.createElement('div');
    list.className = 'sortable-list';
    list.dataset.group = letter;

    groupRankings[letter].forEach((team, idx) => {
      const item = createSortableItem(team, idx + 1, letter);
      list.appendChild(item);
    });

    card.appendChild(list);
    grid.appendChild(card);
  }

  container.appendChild(grid);

  // Store callback
  container._onChanged = onChanged;
}

function createSortableItem(team, rank, groupLetter) {
  const item = document.createElement('div');
  item.className = 'sortable-item';
  item.draggable = true;
  item.dataset.team = team;
  item.dataset.group = groupLetter;

  item.innerHTML = `
    <span class="rank-number">${rank}</span>
    <span class="team-name">${team}</span>
    <span class="drag-handle">⠿</span>
  `;

  item.addEventListener('dragstart', handleDragStart);
  item.addEventListener('dragover', handleDragOver);
  item.addEventListener('drop', handleDrop);
  item.addEventListener('dragend', handleDragEnd);
  item.addEventListener('dragenter', handleDragEnter);
  item.addEventListener('dragleave', handleDragLeave);

  // Touch support
  item.addEventListener('touchstart', handleTouchStart, { passive: false });
  item.addEventListener('touchmove', handleTouchMove, { passive: false });
  item.addEventListener('touchend', handleTouchEnd);

  return item;
}

function handleDragStart(e) {
  dragSrcEl = this;
  dragSrcGroup = this.dataset.group;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.team);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  if (this !== dragSrcEl && this.dataset.group === dragSrcGroup) {
    this.classList.add('drag-over');
  }
}

function handleDragLeave() {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  this.classList.remove('drag-over');

  if (dragSrcEl === this) return;
  if (this.dataset.group !== dragSrcGroup) return;

  const list = this.parentNode;
  const items = [...list.children];
  const fromIdx = items.indexOf(dragSrcEl);
  const toIdx = items.indexOf(this);

  if (fromIdx < toIdx) {
    list.insertBefore(dragSrcEl, this.nextSibling);
  } else {
    list.insertBefore(dragSrcEl, this);
  }

  updateRankNumbers(list);
  syncRankingsFromDOM(list);
}

function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

// Touch drag support
let touchStartY = 0;
let touchClone = null;
let touchCurrentTarget = null;

function handleTouchStart(e) {
  if (e.touches.length !== 1) return;
  dragSrcEl = this;
  dragSrcGroup = this.dataset.group;
  touchStartY = e.touches[0].clientY;
  this.classList.add('dragging');

  // Create a floating clone
  touchClone = this.cloneNode(true);
  touchClone.classList.add('touch-clone');
  const rect = this.getBoundingClientRect();
  touchClone.style.width = rect.width + 'px';
  touchClone.style.left = rect.left + 'px';
  touchClone.style.top = rect.top + 'px';
  document.body.appendChild(touchClone);
}

function handleTouchMove(e) {
  if (!dragSrcEl || !touchClone) return;
  e.preventDefault();

  const touch = e.touches[0];
  touchClone.style.top = touch.clientY - 20 + 'px';

  // Find element under touch
  touchClone.style.display = 'none';
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  touchClone.style.display = '';

  const targetItem = el?.closest('.sortable-item');

  if (touchCurrentTarget && touchCurrentTarget !== targetItem) {
    touchCurrentTarget.classList.remove('drag-over');
  }

  if (targetItem && targetItem !== dragSrcEl && targetItem.dataset.group === dragSrcGroup) {
    targetItem.classList.add('drag-over');
    touchCurrentTarget = targetItem;
  }
}

function handleTouchEnd() {
  if (touchClone) {
    touchClone.remove();
    touchClone = null;
  }

  if (touchCurrentTarget && touchCurrentTarget !== dragSrcEl &&
      touchCurrentTarget.dataset.group === dragSrcGroup) {
    const list = touchCurrentTarget.parentNode;
    const items = [...list.children];
    const fromIdx = items.indexOf(dragSrcEl);
    const toIdx = items.indexOf(touchCurrentTarget);

    if (fromIdx < toIdx) {
      list.insertBefore(dragSrcEl, touchCurrentTarget.nextSibling);
    } else {
      list.insertBefore(dragSrcEl, touchCurrentTarget);
    }

    touchCurrentTarget.classList.remove('drag-over');
    updateRankNumbers(list);
    syncRankingsFromDOM(list);
    touchCurrentTarget = null;
  }

  if (dragSrcEl) {
    dragSrcEl.classList.remove('dragging');
    dragSrcEl = null;
  }
}

function updateRankNumbers(list) {
  [...list.children].forEach((item, idx) => {
    item.querySelector('.rank-number').textContent = idx + 1;
  });
}

function syncRankingsFromDOM(list) {
  const groupLetter = list.dataset.group;
  groupRankings[groupLetter] = [...list.children].map(item => item.dataset.team);

  // Fire callback
  const container = list.closest('.group-grid')?.parentNode;
  if (container?._onChanged) container._onChanged();
}

// --- Step 2: Third-place selection ---

export function renderThirdPlaceSelector(container, onChanged) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'tp-header';
  header.innerHTML = `
    <h2>Select 8 Third-Place Teams to Advance</h2>
    <p class="subtitle">Choose which 8 of the 12 third-place finishers qualify for the Round of 32</p>
    <div class="tp-counter">
      <span id="tp-count">${thirdPlaceSelected.size}</span>/8 selected
    </div>
  `;
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'tp-grid';

  for (const letter of Object.keys(groups)) {
    const thirdTeam = groupRankings[letter][2]; // index 2 = 3rd place
    const card = document.createElement('div');
    card.className = 'tp-card';
    card.dataset.group = letter;

    if (thirdPlaceSelected.has(letter)) {
      card.classList.add('selected');
    }

    card.innerHTML = `
      <div class="tp-group-tag">Group ${letter}</div>
      <div class="tp-team-name">${thirdTeam}</div>
      <div class="tp-rank">3rd Place</div>
    `;

    card.addEventListener('click', () => {
      if (thirdPlaceSelected.has(letter)) {
        thirdPlaceSelected.delete(letter);
        card.classList.remove('selected');
      } else if (thirdPlaceSelected.size < 8) {
        thirdPlaceSelected.add(letter);
        card.classList.add('selected');
      }
      document.getElementById('tp-count').textContent = thirdPlaceSelected.size;
      if (onChanged) onChanged();
    });

    grid.appendChild(card);
  }

  container.appendChild(grid);
}

// --- R32 resolution ---

export function resolveR32(structure) {
  const r32 = {};
  const qualifyingGroups = [...thirdPlaceSelected].sort();

  // Find the matching lookup entry
  const lookupEntry = lookupTable.find(
    e => JSON.stringify(e.groups) === JSON.stringify(qualifyingGroups)
  );

  if (!lookupEntry) {
    console.error('No lookup entry for groups:', qualifyingGroups);
    return null;
  }

  // 3rd-place match IDs
  const thirdPlaceMatches = ['M74', 'M77', 'M79', 'M80', 'M81', 'M82', 'M85', 'M87'];

  // Fill all R32 matches
  const allR32 = [...structure.left_r32_order, ...structure.right_r32_order];

  for (const matchId of allR32) {
    const match = structure.matches[matchId];
    const top = resolveSlot(match.top, thirdPlaceMatches, matchId, lookupEntry);
    const bot = resolveSlot(match.bot, thirdPlaceMatches, matchId, lookupEntry);
    r32[matchId] = { top, bot };
  }

  return r32;
}

function resolveSlot(label, thirdPlaceMatches, matchId, lookupEntry) {
  if (!label) {
    // This is a 3rd-place slot — look up which group fills it
    const groupLetter = lookupEntry[matchId];
    if (!groupLetter) return '';
    return groupRankings[groupLetter][2]; // 3rd-place team from that group
  }

  // "1X" = group winner, "2X" = runner-up
  const pos = parseInt(label[0]) - 1; // 0 for 1st, 1 for 2nd
  const groupLetter = label[1];
  return groupRankings[groupLetter][pos];
}

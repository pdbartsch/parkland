/**
 * Bracket renderer — draws the symmetrical 32-team SVG bracket using D3.js.
 * Reads bracket-structure.json for topology, mirrors layout from Python draw.py.
 */

// Layout constants (matching bracket/config.py)
const CFG = {
  slotWidth: 150,
  slotHeight: 28,
  slotGap: 4,
  roundGap: 40,
  marginTop: 60,
  marginLeft: 30,
  marginRight: 30,
  fontSize: 11,
  labelFontSize: 8,
  fontFamily: 'Arial, Helvetica, sans-serif',
};

export class BracketRenderer {
  constructor(containerEl) {
    this.container = containerEl;
    this.structure = null;
    this.svg = null;
    this.slotElements = {};  // matchId -> { top: rect, bot: rect }
    this.textElements = {};  // matchId -> { top: text, bot: text }
    this.onSlotClick = null; // callback(matchId, position 'top'|'bot')
  }

  async load(dataUrl = 'data/bracket-structure.json') {
    const resp = await fetch(dataUrl);
    this.structure = await resp.json();
  }

  render() {
    const { matches, left_r32_order, right_r32_order } = this.structure;
    const colWidth = CFG.slotWidth + CFG.roundGap;
    const numHalfRounds = 4; // R32, R16, QF, SF

    // 8 R32 matchups per side
    const r0Count = 8;
    const matchupHeight = CFG.slotHeight * 2 + CFG.slotGap;
    const vertPitchR0 = matchupHeight + 16;

    const pageH = CFG.marginTop + 40 + r0Count * vertPitchR0;
    const contentW = numHalfRounds * colWidth * 2 + CFG.slotWidth + CFG.roundGap * 2;
    const pageW = CFG.marginLeft + CFG.marginRight + contentW;
    const centerX = pageW / 2;

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', pageW)
      .attr('height', pageH)
      .attr('viewBox', `0 0 ${pageW} ${pageH}`)
      .style('display', 'block');

    // Background — allow drag events to pass through
    this.svg.append('rect')
      .attr('width', pageW).attr('height', pageH)
      .attr('fill', '#f9f9f9')
      .style('pointer-events', 'none');

    // Title
    this.svg.append('text')
      .attr('x', centerX).attr('y', 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', 20).attr('font-weight', 'bold')
      .attr('font-family', CFG.fontFamily)
      .attr('fill', '#111')
      .text('2026 FIFA World Cup Bracket');

    // Compute positions for each half
    const computePositions = (r32Order, baseX, direction) => {
      // r32Order is an array of match IDs for this side's R32
      // Group into rounds: R32(8) -> R16(4) -> QF(2) -> SF(1)
      const roundGroups = [r32Order];
      let currentIds = r32Order;
      for (let r = 0; r < 3; r++) {
        const nextIds = [];
        for (let i = 0; i < currentIds.length; i += 2) {
          const feedsTo = matches[currentIds[i]].feeds;
          if (!nextIds.includes(feedsTo)) nextIds.push(feedsTo);
        }
        roundGroups.push(nextIds);
        currentIds = nextIds;
      }

      const positions = {};
      for (let r = 0; r < roundGroups.length; r++) {
        const ids = roundGroups[r];
        const colX = direction === 1
          ? baseX + r * colWidth
          : baseX - r * colWidth - CFG.slotWidth;

        const vertPitch = vertPitchR0 * (2 ** r);
        const matchCount = ids.length;
        const totalH = (matchCount - 1) * vertPitch;
        const startY = CFG.marginTop + 30 + (pageH - CFG.marginTop - 40 - totalH) / 2;

        ids.forEach((id, m) => {
          positions[id] = {
            x: colX,
            yCenter: startY + m * vertPitch,
            round: r,
          };
        });
      }
      return { positions, roundGroups };
    };

    const leftBase = CFG.marginLeft;
    const rightBase = pageW - CFG.marginRight;
    const left = computePositions(left_r32_order, leftBase, 1);
    const right = computePositions(right_r32_order, rightBase, -1);

    // Round labels
    const roundLabels = ['Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals'];
    for (let r = 0; r < numHalfRounds; r++) {
      const leftId = left.roundGroups[r][0];
      const rightId = right.roundGroups[r][0];
      const label = roundLabels[r];

      for (const pos of [left.positions[leftId], right.positions[rightId]]) {
        this.svg.append('text')
          .attr('x', pos.x + CFG.slotWidth / 2)
          .attr('y', CFG.marginTop + 15)
          .attr('text-anchor', 'middle')
          .attr('font-size', 12).attr('font-weight', 'bold')
          .attr('font-family', CFG.fontFamily)
          .attr('fill', '#555')
          .text(label);
      }
    }
    // Final label
    this.svg.append('text')
      .attr('x', centerX).attr('y', CFG.marginTop + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12).attr('font-weight', 'bold')
      .attr('font-family', CFG.fontFamily)
      .attr('fill', '#555')
      .text('Final');

    // Draw matchups and connectors for one side
    const drawHalf = (halfData, direction) => {
      const { positions, roundGroups } = halfData;

      for (let r = 0; r < roundGroups.length; r++) {
        const ids = roundGroups[r];
        ids.forEach(id => {
          const pos = positions[id];
          const match = matches[id];
          const yTop = pos.yCenter - CFG.slotGap / 2 - CFG.slotHeight;
          const yBot = pos.yCenter + CFG.slotGap / 2;

          // Draw slots
          this._drawSlot(id, 'top', pos.x, yTop, match.top);
          this._drawSlot(id, 'bot', pos.x, yBot, match.bot);
        });

        // Connectors: process in pairs
        if (r < roundGroups.length - 1) {
          for (let p = 0; p < ids.length; p += 2) {
            const id0 = ids[p], id1 = ids[p + 1];
            const pos0 = positions[id0], pos1 = positions[id1];

            const exitX0 = this._drawMatchConnector(pos0, direction);
            const exitX1 = this._drawMatchConnector(pos1, direction);
            const mergeY0 = pos0.yCenter;
            const mergeY1 = pos1.yCenter;

            // Next round slot
            const nextId = matches[id0].feeds;
            const nextPos = positions[nextId];
            const joinX = direction === 1 ? nextPos.x : nextPos.x + CFG.slotWidth;

            // Horizontal lines to join point
            this.svg.append('line').attr('class', 'connector-line')
              .attr('x1', exitX0).attr('y1', mergeY0)
              .attr('x2', joinX).attr('y2', mergeY0);
            this.svg.append('line').attr('class', 'connector-line')
              .attr('x1', exitX1).attr('y1', mergeY1)
              .attr('x2', joinX).attr('y2', mergeY1);
            // Vertical join
            this.svg.append('line').attr('class', 'connector-line')
              .attr('x1', joinX).attr('y1', mergeY0)
              .attr('x2', joinX).attr('y2', mergeY1);
          }
        }
      }

      // Connect SF to center
      const sfId = roundGroups[roundGroups.length - 1][0];
      const sfPos = positions[sfId];
      const exitX = this._drawMatchConnector(sfPos, direction);
      const finalEdge = direction === 1
        ? centerX - CFG.slotWidth / 2
        : centerX + CFG.slotWidth / 2;
      this.svg.append('line').attr('class', 'connector-line')
        .attr('x1', exitX).attr('y1', sfPos.yCenter)
        .attr('x2', finalEdge).attr('y2', sfPos.yCenter);

      return sfPos.yCenter;
    };

    const leftSfY = drawHalf(left, 1);
    const rightSfY = drawHalf(right, -1);

    // Final match slots in center
    const finalX = centerX - CFG.slotWidth / 2;
    this._drawSlot('M103', 'top', finalX, leftSfY - CFG.slotHeight / 2, '');
    this._drawSlot('M103', 'bot', finalX, rightSfY - CFG.slotHeight / 2, '');

    // Champion box
    const champW = CFG.slotWidth + 20;
    const champH = 50;
    const champX = centerX - champW / 2;
    const champY = (leftSfY + rightSfY) / 2 - champH / 2;

    this.svg.append('rect')
      .attr('x', champX).attr('y', champY)
      .attr('width', champW).attr('height', champH)
      .attr('fill', '#fff8dc').attr('stroke', '#d4a937')
      .attr('stroke-width', 2).attr('rx', 6);
    this.svg.append('text')
      .attr('x', centerX).attr('y', champY + 18)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11).attr('font-weight', 'bold')
      .attr('font-family', CFG.fontFamily)
      .attr('fill', '#999')
      .text('CHAMPION');

    // Champion pick slot
    this._drawSlot('champion', 'pick', champX + 10, champY + 26, '');

    this.champTextEl = this.textElements['champion']?.pick;
  }

  _drawSlot(matchId, position, x, y, label) {
    const g = this.svg.append('g');

    const rect = g.append('rect')
      .attr('class', 'bracket-slot')
      .attr('x', x).attr('y', y)
      .attr('width', position === 'pick' ? CFG.slotWidth : CFG.slotWidth)
      .attr('height', CFG.slotHeight)
      .attr('fill', '#fff')
      .attr('stroke', '#333')
      .attr('stroke-width', 1)
      .attr('rx', 2)
      .on('click', () => {
        if (this.onSlotClick) this.onSlotClick(matchId, position);
      });

    // Slot label (e.g., "1E", "2A")
    const slotLabel = g.append('text')
      .attr('class', 'bracket-slot-label')
      .attr('x', x + CFG.slotWidth - 4)
      .attr('y', y + CFG.slotHeight / 2 + 3)
      .attr('text-anchor', 'end')
      .text(label || '');

    // Team name text
    const text = g.append('text')
      .attr('class', 'bracket-slot-text')
      .attr('x', x + 6)
      .attr('y', y + CFG.slotHeight / 2 + 4)
      .text('');

    // Store references
    if (!this.slotElements[matchId]) this.slotElements[matchId] = {};
    if (!this.textElements[matchId]) this.textElements[matchId] = {};
    this.slotElements[matchId][position] = rect;
    this.textElements[matchId][position] = text;
  }

  _drawMatchConnector(pos, direction) {
    const yTop = pos.yCenter - CFG.slotGap / 2 - CFG.slotHeight;
    const yBot = pos.yCenter + CFG.slotGap / 2;
    const topMidY = yTop + CFG.slotHeight / 2;
    const botMidY = yBot + CFG.slotHeight / 2;

    let stubX, midX;
    if (direction === 1) {
      stubX = pos.x + CFG.slotWidth;
      midX = stubX + CFG.roundGap / 2;
    } else {
      stubX = pos.x;
      midX = stubX - CFG.roundGap / 2;
    }

    // Horizontal stubs
    this.svg.append('line').attr('class', 'connector-line')
      .attr('x1', stubX).attr('y1', topMidY)
      .attr('x2', midX).attr('y2', topMidY);
    this.svg.append('line').attr('class', 'connector-line')
      .attr('x1', stubX).attr('y1', botMidY)
      .attr('x2', midX).attr('y2', botMidY);
    // Vertical
    this.svg.append('line').attr('class', 'connector-line')
      .attr('x1', midX).attr('y1', topMidY)
      .attr('x2', midX).attr('y2', botMidY);

    return midX;
  }

  /** Update the text shown in a slot */
  setSlotText(matchId, position, text) {
    if (this.textElements[matchId]?.[position]) {
      this.textElements[matchId][position].text(text);
    }
  }

  /** Highlight a slot as filled */
  setSlotFilled(matchId, position, filled = true) {
    if (this.slotElements[matchId]?.[position]) {
      this.slotElements[matchId][position]
        .classed('filled', filled);
    }
  }

  /** Highlight a slot as a drop target */
  setDropTarget(matchId, position, active = true) {
    if (this.slotElements[matchId]?.[position]) {
      this.slotElements[matchId][position]
        .classed('drop-target', active);
    }
  }
}

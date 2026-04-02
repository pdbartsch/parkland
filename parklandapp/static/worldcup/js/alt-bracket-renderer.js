/**
 * Alt bracket renderer — draws the symmetrical 32-team SVG bracket using D3.js.
 * Adds proper Final round with two finalist slots and champion pick.
 */

const CFG = {
  slotWidth: 150,
  slotHeight: 28,
  slotGap: 4,
  roundGap: 40,
  marginTop: 36,
  marginLeft: 10,
  marginRight: 10,
  fontSize: 11,
  labelFontSize: 8,
  fontFamily: 'Arial, Helvetica, sans-serif',
};

export class BracketRenderer {
  constructor(containerEl) {
    this.container = containerEl;
    this.structure = null;
    this.svg = null;
    this.slotElements = {};
    this.textElements = {};
    this.onSlotClick = null;
  }

  async load(dataUrl = 'data/bracket-structure.json') {
    const resp = await fetch(dataUrl);
    this.structure = await resp.json();
  }

  render() {
    const { matches, left_r32_order, right_r32_order } = this.structure;
    const colWidth = CFG.slotWidth + CFG.roundGap;
    const numHalfRounds = 4; // R32, R16, QF, SF

    const r0Count = 8;
    const matchupHeight = CFG.slotHeight * 2 + CFG.slotGap;
    const vertPitchR0 = matchupHeight + 16;

    const pageH = CFG.marginTop + 20 + r0Count * vertPitchR0;
    const contentW = numHalfRounds * colWidth * 2 + CFG.slotWidth + CFG.roundGap * 2;
    const pageW = CFG.marginLeft + CFG.marginRight + contentW;
    const centerX = pageW / 2;

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('viewBox', `0 0 ${pageW} ${pageH}`)
      .attr('preserveAspectRatio', 'xMidYMin meet')
      .style('display', 'block')
      .style('width', '94%')
      .style('height', 'auto')
      .style('margin', '0 auto');

    this.svg.append('rect')
      .attr('width', pageW).attr('height', pageH)
      .attr('fill', '#f9f9f9')
      .style('pointer-events', 'none');

    this.svg.append('text')
      .attr('x', centerX).attr('y', 18)
      .attr('text-anchor', 'middle')
      .attr('font-size', 16).attr('font-weight', 'bold')
      .attr('font-family', CFG.fontFamily)
      .attr('fill', '#111')
      .text('2026 FIFA World Cup Bracket');

    const computePositions = (r32Order, baseX, direction) => {
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
        const startY = CFG.marginTop + 10 + (pageH - CFG.marginTop - 20 - totalH) / 2;

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
          .attr('y', CFG.marginTop - 4)
          .attr('text-anchor', 'middle')
          .attr('font-size', 12).attr('font-weight', 'bold')
          .attr('font-family', CFG.fontFamily)
          .attr('fill', '#555')
          .text(label);
      }
    }
    // Final label
    this.svg.append('text')
      .attr('x', centerX).attr('y', CFG.marginTop - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', 12).attr('font-weight', 'bold')
      .attr('font-family', CFG.fontFamily)
      .attr('fill', '#555')
      .text('Final');

    const drawHalf = (halfData, direction) => {
      const { positions, roundGroups } = halfData;

      for (let r = 0; r < roundGroups.length; r++) {
        const ids = roundGroups[r];
        ids.forEach(id => {
          const pos = positions[id];
          const match = matches[id];
          const yTop = pos.yCenter - CFG.slotGap / 2 - CFG.slotHeight;
          const yBot = pos.yCenter + CFG.slotGap / 2;

          this._drawSlot(id, 'top', pos.x, yTop, match.top);
          this._drawSlot(id, 'bot', pos.x, yBot, match.bot);
        });

        if (r < roundGroups.length - 1) {
          for (let p = 0; p < ids.length; p += 2) {
            const id0 = ids[p], id1 = ids[p + 1];
            const pos0 = positions[id0], pos1 = positions[id1];

            const exitX0 = this._drawMatchConnector(pos0, direction);
            const exitX1 = this._drawMatchConnector(pos1, direction);
            const mergeY0 = pos0.yCenter;
            const mergeY1 = pos1.yCenter;

            const nextId = matches[id0].feeds;
            const nextPos = positions[nextId];
            const joinX = direction === 1 ? nextPos.x : nextPos.x + CFG.slotWidth;

            this.svg.append('line').attr('class', 'connector-line')
              .attr('x1', exitX0).attr('y1', mergeY0)
              .attr('x2', joinX).attr('y2', mergeY0);
            this.svg.append('line').attr('class', 'connector-line')
              .attr('x1', exitX1).attr('y1', mergeY1)
              .attr('x2', joinX).attr('y2', mergeY1);
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

    const finalMidY = (leftSfY + rightSfY) / 2;
    const finalX = centerX - CFG.slotWidth / 2;

    // Position Final slots with clear spacing from champion box
    const champW = CFG.slotWidth + 20;
    const champH = 50;
    const champX = centerX - champW / 2;
    const champY = finalMidY - champH / 2;
    const spacing = 10; // gap between Final slots and champion box

    // Final top slot: just above the champion box
    const finalTopY = champY - spacing - CFG.slotHeight;
    // Final bot slot: just below the champion box
    const finalBotY = champY + champH + spacing;

    // --- Connector lines from SF to Final slots ---
    // Left SF -> Final top
    this.svg.append('line').attr('class', 'connector-line')
      .attr('x1', centerX).attr('y1', leftSfY)
      .attr('x2', centerX).attr('y2', finalTopY + CFG.slotHeight / 2);

    // Right SF -> Final bot
    this.svg.append('line').attr('class', 'connector-line')
      .attr('x1', centerX).attr('y1', rightSfY)
      .attr('x2', centerX).attr('y2', finalBotY + CFG.slotHeight / 2);

    // --- Final match: two finalist slots ---
    this._drawSlot('M103', 'top', finalX, finalTopY, '');
    this._drawSlot('M103', 'bot', finalX, finalBotY, '');

    // --- Connector lines from Final slots to champion box ---
    this.svg.append('line').attr('class', 'connector-line')
      .attr('x1', centerX).attr('y1', finalTopY + CFG.slotHeight)
      .attr('x2', centerX).attr('y2', champY);

    this.svg.append('line').attr('class', 'connector-line')
      .attr('x1', centerX).attr('y1', finalBotY)
      .attr('x2', centerX).attr('y2', champY + champH);

    // --- Champion box ---
    this.svg.append('rect')
      .attr('x', champX).attr('y', champY)
      .attr('width', champW).attr('height', champH)
      .attr('fill', '#fff8dc').attr('stroke', '#d4a937')
      .attr('stroke-width', 2).attr('rx', 6);
    this.svg.append('text')
      .attr('x', centerX).attr('y', champY + 16)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11).attr('font-weight', 'bold')
      .attr('font-family', CFG.fontFamily)
      .attr('fill', '#999')
      .text('CHAMPION');

    // Champion pick slot (inside the box)
    this._drawSlot('champion', 'pick', champX + 10, champY + 22, '');
  }

  _drawSlot(matchId, position, x, y, label) {
    const g = this.svg.append('g');

    const rect = g.append('rect')
      .attr('class', 'bracket-slot')
      .attr('x', x).attr('y', y)
      .attr('width', CFG.slotWidth)
      .attr('height', CFG.slotHeight)
      .attr('fill', '#fff')
      .attr('stroke', '#333')
      .attr('stroke-width', 1)
      .attr('rx', 2)
      .attr('data-match', matchId)
      .attr('data-pos', position)
      .on('click', () => {
        if (this.onSlotClick) this.onSlotClick(matchId, position);
      });

    const slotLabel = g.append('text')
      .attr('class', 'bracket-slot-label')
      .attr('x', x + CFG.slotWidth - 4)
      .attr('y', y + CFG.slotHeight / 2 + 3)
      .attr('text-anchor', 'end')
      .text(label || '');

    const text = g.append('text')
      .attr('class', 'bracket-slot-text')
      .attr('x', x + 6)
      .attr('y', y + CFG.slotHeight / 2 + 4)
      .text('');

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

    this.svg.append('line').attr('class', 'connector-line')
      .attr('x1', stubX).attr('y1', topMidY)
      .attr('x2', midX).attr('y2', topMidY);
    this.svg.append('line').attr('class', 'connector-line')
      .attr('x1', stubX).attr('y1', botMidY)
      .attr('x2', midX).attr('y2', botMidY);
    this.svg.append('line').attr('class', 'connector-line')
      .attr('x1', midX).attr('y1', topMidY)
      .attr('x2', midX).attr('y2', botMidY);

    return midX;
  }

  setSlotText(matchId, position, text) {
    if (this.textElements[matchId]?.[position]) {
      this.textElements[matchId][position].text(text);
    }
  }

  setSlotFilled(matchId, position, filled = true) {
    if (this.slotElements[matchId]?.[position]) {
      this.slotElements[matchId][position].classed('filled', filled);
    }
  }

  setDropTarget(matchId, position, active = true) {
    if (this.slotElements[matchId]?.[position]) {
      this.slotElements[matchId][position].classed('drop-target', active);
    }
  }

  /** Highlight a slot with a specific class (e.g., 'group-highlight') */
  setSlotHighlight(matchId, position, className, active = true) {
    if (this.slotElements[matchId]?.[position]) {
      this.slotElements[matchId][position].classed(className, active);
    }
  }
}

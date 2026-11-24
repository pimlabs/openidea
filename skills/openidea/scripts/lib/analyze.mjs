// Derived views shared by INDEX.md and the dashboard, so both always agree.
import { OPEN_GAP, depthReport, blueprintElements } from './validate.mjs';

const RANK = { high: 3, medium: 2, low: 1 };
// Cheapest validation first when impact and confidence tie.
const KIND_COST = { decision: 1, clarification: 2, compliance: 3, feasibility: 4, desirability: 5 };
export const QUEUE_SIZE = 5;

export function openGaps(p) {
  return p.gaps
    .filter((g) => g.data && OPEN_GAP.has(g.data.status))
    .sort((a, b) =>
      (RANK[b.data.impact] || 0) * (RANK[b.data.confidence] || 0) - (RANK[a.data.impact] || 0) * (RANK[a.data.confidence] || 0)
      || (KIND_COST[a.data.kind] || 9) - (KIND_COST[b.data.kind] || 9)
      || String(a.data.id).localeCompare(String(b.data.id)));
}

export function analyze(p, issues) {
  const ideas = p.ideas.filter((i) => i.data);
  const active = ideas.filter((i) => i.location === 'active');
  const byStatus = {};
  for (const i of ideas) byStatus[i.data.status] = (byStatus[i.data.status] || 0) + 1;

  const planned = new Set((p.roadmap?.milestones || []).flatMap((m) => m.ideas));
  const open = openGaps(p);
  const gapsByIdea = new Map();
  for (const g of open) for (const id of g.data.ideas || []) gapsByIdea.set(id, (gapsByIdea.get(id) || 0) + 1);

  const depth = p.blueprint ? depthReport(p.blueprint) : null;
  const assumptions = p.blueprint ? blueprintElements(p.blueprint).filter(({ el }) => el.assumption === true).length : 0;

  const gapStatus = {};
  for (const g of p.gaps.filter((x) => x.data)) gapStatus[g.data.status] = (gapStatus[g.data.status] || 0) + 1;

  const milestones = (p.roadmap?.milestones || []).map((m) => {
    const blocking = open.filter((g) => g.data.impact === 'high' && (g.data.ideas || []).some((id) => m.ideas.includes(id)));
    return { ...m, blockingGaps: blocking.map((g) => g.data.id) };
  });

  return {
    counts: {
      active: active.length,
      archived: ideas.filter((i) => i.location === 'archive').length,
      promoted: ideas.filter((i) => i.location === 'promoted').length,
      byStatus,
      gapStatus,
      openHigh: open.filter((g) => g.data.impact === 'high').length,
      errors: issues.filter((i) => i.level === 'error').length,
      warnings: issues.filter((i) => i.level === 'warning').length,
    },
    active,
    readyUnplanned: active.filter((i) => i.data.status === 'ready' && !planned.has(i.data.id)),
    needsClarification: active.filter((i) => i.data.needs_clarification === true),
    open,
    queue: open.slice(0, QUEUE_SIZE),
    gapsByIdea,
    depth,
    assumptions,
    milestones,
  };
}

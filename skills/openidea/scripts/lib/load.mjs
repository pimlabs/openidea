// Loads an OpenIdea project from disk into one in-memory model.
// Every CLI subcommand works from this model, so they all see the same state.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseFrontmatter } from './yaml.mjs';

export const IDEA_LOCATIONS = { active: 'ideas', archive: 'ideas/archive', promoted: 'ideas/promoted' };

export function slugify(name) {
  return String(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function listMarkdown(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'INDEX.md')
    .sort();
}

function readDoc(path, rel) {
  const text = readFileSync(path, 'utf8');
  try {
    const { data, body } = parseFrontmatter(text);
    return { file: rel, data, body, error: data === null ? 'missing frontmatter' : null };
  } catch (e) {
    return { file: rel, data: null, body: text, error: `frontmatter parse error: ${e.message}` };
  }
}

// ROADMAP.md is human-facing markdown, so it is parsed by convention, not YAML:
//   ## Milestone 1 — Core Booking
//   **ID**: core-booking
//   **Status**: approved
//   **Approved in**: proposals/v3.md
//   - wa-booking
export function parseRoadmap(text) {
  const milestones = [];
  let cur = null;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      let name = h[1].trim();
      const pref = name.match(/^Milestone\s+\d+\s*[—–-]\s*(.+)$/i);
      if (pref) name = pref[1].trim();
      cur = { name, heading: h[1].trim(), id: null, idDeclared: false, status: null, approvedIn: null, ideas: [], line: i + 1 };
      milestones.push(cur);
      return;
    }
    if (!cur) return;
    const field = line.match(/^\*\*(ID|Status|Approved in)\*\*\s*:\s*(.*)$/i);
    if (field) {
      const key = field[1].toLowerCase();
      const val = field[2].trim() || null;
      if (key === 'id') { cur.id = val; cur.idDeclared = true; }
      else if (key === 'status') cur.status = val ? val.toLowerCase() : null;
      else cur.approvedIn = val;
      return;
    }
    const item = line.match(/^[-*]\s+(?:\[[ xX]\]\s+)?`?([a-z0-9][a-z0-9-]*)`?/);
    if (item) cur.ideas.push(item[1]);
  });
  for (const m of milestones) if (!m.id) m.id = slugify(m.name);
  return { milestones };
}

export function loadProject(root) {
  const dir = join(root, 'openidea');
  const project = {
    root,
    dir,
    exists: existsSync(dir),
    brief: null,
    ideas: [],
    gaps: [],
    roadmap: null,
    blueprint: null,
    blueprintError: null,
    calibration: null,
    hasProposals: existsSync(join(dir, 'proposals')),
    hasOpenspec: existsSync(join(root, 'openspec')),
  };
  if (!project.exists) return project;

  const briefPath = join(dir, 'BRIEF.md');
  if (existsSync(briefPath)) project.brief = readDoc(briefPath, 'openidea/BRIEF.md');

  for (const [location, sub] of Object.entries(IDEA_LOCATIONS)) {
    const d = join(dir, sub);
    for (const f of listMarkdown(d)) {
      const doc = readDoc(join(d, f), relative(root, join(d, f)));
      project.ideas.push({ ...doc, location, slug: f.replace(/\.md$/, '') });
    }
  }

  const gapsDir = join(dir, 'gaps');
  for (const f of listMarkdown(gapsDir)) {
    const doc = readDoc(join(gapsDir, f), relative(root, join(gapsDir, f)));
    project.gaps.push({ ...doc, slug: f.replace(/\.md$/, '') });
  }

  const calPath = join(dir, 'calibration.md');
  if (existsSync(calPath)) project.calibration = readDoc(calPath, 'openidea/calibration.md');

  const roadmapPath = join(dir, 'ROADMAP.md');
  if (existsSync(roadmapPath)) project.roadmap = parseRoadmap(readFileSync(roadmapPath, 'utf8'));

  const bpPath = join(dir, 'blueprint', 'blueprint.json');
  if (existsSync(bpPath)) {
    try {
      project.blueprint = JSON.parse(readFileSync(bpPath, 'utf8'));
    } catch (e) {
      project.blueprintError = `blueprint.json is not valid JSON: ${e.message}`;
    }
  }
  return project;
}

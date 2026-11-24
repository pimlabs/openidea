#!/usr/bin/env node
// OpenIdea CLI: deterministic checks and renderers for an openidea/ folder.
// Usage: node openidea.mjs <validate|index|diagrams|estimate|prototype|report|dashboard> [--root <dir>] [--json] [--client] [--out <file>]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { loadProject } from './lib/load.mjs';
import { validateProject } from './lib/validate.mjs';
import { renderIndex } from './lib/indexmd.mjs';
import { renderDashboard } from './lib/dashboard.mjs';
import { renderDiagramsMd } from './lib/diagrams.mjs';
import { openGaps } from './lib/analyze.mjs';
import { renderEstimateJson, renderWorkCsv } from './lib/estimate.mjs';
import { renderPrototype } from './lib/prototype.mjs';
import { renderReportMd } from './lib/report.mjs';
import { renderReportPdf } from './lib/pdf.mjs';
import { renderReportPptx } from './lib/pptx.mjs';
import { LANGS } from './lib/i18n.mjs';

const HELP = `openidea <command> [options]

Commands:
  validate     Check schemas, status/location, dependencies, gaps, gating, roadmap, blueprint.
               Exits 1 when any error is found.
  index        Regenerate openidea/ideas/INDEX.md from a filesystem scan.
  diagrams     Write openidea/blueprint/diagrams.md: feature list plus Mermaid context,
               activity, and state diagrams generated from blueprint.json.
  estimate     Write raw data: openidea/blueprint/estimate.json (phases, one per milestone, with
               timeline ranges and what each open gap costs) and work-breakdown.csv. Sized from
               the blueprint, widened by undefined slots and open gaps, scaled by calibration.md.
               People read it on the dashboard's Roadmap page.
  prototype    Write two clickable prototypes generated from blueprint.json: prototype/index.html
               for real users (looks like the app, nothing meta) and prototype/review.html for
               the team (undefined behaviour in red, feedback copies back as a gap).
  report       Write the finished, client-safe report (features, phases and timeline, open
               questions, assumptions, next steps) to openidea/reports/report.<format>.
               --format md | pptx | pdf (default md); --lang en | id (default: BRIEF's
               language, else en).
  dashboard    Write a self-contained HTML dashboard (default openidea/dashboard/index.html).

Options:
  --root <dir>   Project root that contains openidea/ (default: current directory)
  --json         validate: print issues as JSON
  --client       dashboard: client-safe view (no discovery sources, gap details, chores or checks);
                 default output openidea/dashboard/client.html
  --out <file>   dashboard, report: output path
  --format <f>   report: md, pptx or pdf
  --lang <l>     prototype, report, dashboard: en or id (default: BRIEF's language, else en)
`;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root' || a === '--out' || a === '--format' || a === '--lang') args[a.slice(2)] = argv[++i];
    else if (a.startsWith('--')) args[a.slice(2)] = true;
    else args._.push(a);
  }
  return args;
}

function printIssues(issues) {
  const order = { error: 0, warning: 1, info: 2 };
  for (const i of [...issues].sort((a, b) => order[a.level] - order[b.level])) {
    console.log(`${i.level.toUpperCase().padEnd(7)} ${i.code.padEnd(24)} ${i.file}: ${i.message}`);
  }
  const e = issues.filter((i) => i.level === 'error').length;
  const w = issues.filter((i) => i.level === 'warning').length;
  console.log(`\n${e} error(s), ${w} warning(s).`);
}

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

export function main(argv) {
  const args = parseArgs(argv);
  const cmd = args._[0];
  if (!cmd || args.help || cmd === 'help') { console.log(HELP); return 0; }
  if (args.lang) {
    args.lang = String(args.lang).toLowerCase();
    if (!LANGS[args.lang]) { console.error(`Unknown language "${args.lang}". Use ${Object.keys(LANGS).join(' or ')}.`); return 2; }
  }
  const root = resolve(args.root || '.');
  const project = loadProject(root);
  const issues = validateProject(project);
  const errors = issues.filter((i) => i.level === 'error').length;

  if (cmd === 'validate') {
    if (args.json) console.log(JSON.stringify({ errors, issues }, null, 2));
    else printIssues(issues);
    return errors ? 1 : 0;
  }
  if (!project.exists) { printIssues(issues); return 1; }
  if (cmd === 'index') {
    const path = join(project.dir, 'ideas', 'INDEX.md');
    write(path, renderIndex(project, issues));
    console.log(`Wrote ${path} (${errors} error(s) listed under Anomalies).`);
    return 0;
  }
  if (cmd === 'diagrams') {
    if (!project.blueprint) { console.error('No openidea/blueprint/blueprint.json yet. Run /openidea:blueprint first.'); return 1; }
    const path = join(project.dir, 'blueprint', 'diagrams.md');
    const name = project.brief?.body?.match(/^#\s+(.+)$/m)?.[1];
    write(path, renderDiagramsMd(project, name, openGaps(project)));
    console.log(`Wrote ${path}.`);
    return 0;
  }
  if (cmd === 'estimate') {
    if (!project.blueprint) { console.error('No openidea/blueprint/blueprint.json yet. Run /openidea:blueprint first.'); return 1; }
    const json = join(project.dir, 'blueprint', 'estimate.json'), csv = join(project.dir, 'blueprint', 'work-breakdown.csv');
    write(json, renderEstimateJson(project));
    write(csv, renderWorkCsv(project));
    console.log(`Wrote ${json} and ${csv}.`);
    return 0;
  }
  if (cmd === 'prototype') {
    if (!project.blueprint) { console.error('No openidea/blueprint/blueprint.json yet. Run /openidea:blueprint first.'); return 1; }
    const name = project.brief?.body?.match(/^#\s+(.+)$/m)?.[1];
    const user = join(project.dir, 'prototype', 'index.html'), review = join(project.dir, 'prototype', 'review.html');
    write(user, renderPrototype(project, name, { mode: 'user', lang: args.lang }));
    write(review, renderPrototype(project, name, { mode: 'review', lang: args.lang }));
    console.log(`Wrote ${user} (for real users: no meta) and ${review} (for the team: undefined behaviour in red).`);
    return 0;
  }
  if (cmd === 'report') {
    if (!project.blueprint) { console.error('No openidea/blueprint/blueprint.json yet. Run /openidea:blueprint first.'); return 1; }
    const format = String(args.format || 'md').toLowerCase();
    const render = { md: renderReportMd, pptx: renderReportPptx, pdf: renderReportPdf }[format];
    if (!render) { console.error(`Unknown format "${format}". Use md, pptx or pdf.`); return 2; }
    const path = resolve(args.out || join(project.dir, 'reports', `report.${format}`));
    write(path, render(project, { lang: args.lang }));
    console.log(`Wrote ${path}.`);
    return 0;
  }
  if (cmd === 'dashboard') {
    const mode = args.client ? 'client' : 'internal';
    const path = resolve(args.out || join(project.dir, 'dashboard', mode === 'client' ? 'client.html' : 'index.html'));
    write(path, renderDashboard(project, issues, { mode, lang: args.lang }));
    console.log(`Wrote ${path} (${mode} view). Open it in a browser.`);
    return 0;
  }
  console.error(`Unknown command "${cmd}".\n\n${HELP}`);
  return 2;
}

process.exitCode = main(process.argv.slice(2));

---
description: Generate proposal/design/tasks OpenSpec dari milestone/ide ready
---

Muat skill `openidea` (Skill tool) buat baca section 2 (aturan lokasi file, `openspec/` tidak pernah disentuh langsung kecuali di sini), 3.3, 3.4, 3.2 sebelum lanjut.

Argumen dari user: nama milestone dan/atau slug ide spesifik. Mendukung many-to-one (beberapa ide digabung jadi satu proposal). $ARGUMENTS

## Prasyarat (blocking)

1. `openspec/` harus sudah ada di root project. OpenIdea **tidak** bootstrap folder ini sendiri — kalau belum ada, **stop** dan beri tahu eksplisit ke user (arahkan pakai tooling OpenSpec untuk init dulu).
2. Milestone target harus punya minimal 1 ide berstatus `ready`. Kalau kosong, **stop**, jangan generate proposal kosong.

## Proses

1. Baca konteks lengkap:
   - `openidea/BRIEF.md` — konteks & constraint produk.
   - `openidea/ROADMAP.md` — scope & urutan milestone target.
   - `openidea/proposals/<versi approved terkait milestone>.md` — kalau ada, narasi yang sudah disepakati client.
   - `openidea/ideas/<slug>.md` terkait — detail 5Q lengkap tiap ide.
2. Kalau `openidea/proposals/` belum ada sama sekali (kasus solo tanpa siklus client-approval): tetap jalan langsung dari `ROADMAP.md` + `ideas/` saja. `compile`/approval **bukan** prasyarat wajib di jalur ini.
3. Kalau folder target `openspec/changes/<milestone-name>/` **sudah ada isinya**: jangan overwrite otomatis. Tawarkan opsi ke user — append sebagai catatan tambahan, atau serahkan penggabungan manual.

## Output

- `openspec/changes/<milestone-name>/proposal.md`, `design.md`, `tasks.md` — mengikuti konvensi OpenSpec standar.
- Update status ide terkait jadi `promoted`, pindah file ke `openidea/ideas/promoted/`, isi `promoted_to` (path folder openspec), isi `promoted_with` kalau many-to-one.
- Centang checklist ide terkait di `openidea/ROADMAP.md`.
- Regenerate `openidea/ideas/INDEX.md`.

---
description: Audit read-only drift antara openspec/changes/<milestone> vs proposals/ideas
---

Baca `.claude/skills/openidea/SKILL.md` section 2, 3.4, 3.2 sebelum lanjut.

Argumen dari user: nama milestone target. $ARGUMENTS

## Prasyarat

Folder `openspec/changes/<milestone>` harus ada. Kalau tidak ada, stop dan beri tahu eksplisit.

## Proses

1. Cek kelengkapan folder target: `proposal.md` + `design.md` + `tasks.md` semua ada?
   - Kalau belum lengkap: laporkan sebagai **"masih in-progress"**, bukan melaporkan drift.
2. Kalau lengkap, bandingkan scope OpenSpec vs `openidea/proposals/<approved terkait milestone>.md` + `openidea/ideas/` terkait — cari drift:
   - scope hilang (ada di proposal/ideas, tidak ada di OpenSpec)
   - scope tambahan (ada di OpenSpec, tidak ada di proposal/ideas)
   - acceptance criteria tidak konsisten
3. Cek juga: folder `openspec/changes/` yang direferensikan oleh `promoted_to` suatu ide — masih ada/aktif di sisi OpenSpec (belum di-archive/dibatalkan)? Kalau sudah di-archive/dibatalkan di sisi OpenSpec, flag untuk peninjauan ulang status ide terkait (bisa jadi perlu revert dari `promoted`).

## Output

Laporan drift + rekomendasi ke user. **Read-only — jangan ubah file apapun secara otomatis**, termasuk tidak mengubah status ide meski ditemukan drift.

## Catatan

Command ini adalah entry point umpan balik teknis. Kalau lead engineer menemukan sesuatu secara teknis tidak feasible saat audit, catat temuan itu lewat `/oi:capture` biasa (bukan command terpisah) — ini bisa memicu siklus revisi baru ke client lewat `/oi:compile` kalau diperlukan.

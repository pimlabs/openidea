---
description: Compile ide ready jadi narasi proposal client-facing baru (proposals/vN.md)
---

Muat skill `openidea` (Skill tool) buat baca section 3.4, 3.6 (kenapa `discovery/` dikecualikan) sebelum lanjut.

Argumen dari user (opsional, scope ke milestone tertentu): $ARGUMENTS

## Prasyarat

Ada ide `ready` yang sudah masuk `openidea/ROADMAP.md`. Kalau tidak ada, stop dan arahkan ke `/openidea:plan` dulu.

## Proses

1. Tentukan cakupan: kalau $ARGUMENTS scope ke milestone tertentu, pakai itu. Kalau tidak, tanya user atau tarik semua milestone di ROADMAP.
2. Ambil `openidea/BRIEF.md` + ide `ready` (dikelompokkan per `category`) sesuai cakupan.
3. Urutkan sesuai urutan heading di `openidea/ROADMAP.md`.
4. Tulis narasi presentable (bahasa client-facing, bukan jargon teknis mentah). `type: chore` **dikecualikan** dari dokumen ini (non-user-facing).
5. Simpan snapshot referensi `openidea/ROADMAP.md` saat itu (hash atau timestamp) ke field `compiled_from_roadmap_snapshot`.
6. Guard rail advisory: kalau command ini dipanggil >5x untuk milestone yang sama tanpa ada yang mencapai status `approved`, kasih catatan observasi ringan ke user (bukan blocking) — mengindikasikan mungkin perlu sesi sync langsung, bukan lanjut iterasi dokumen.

## Output

`openidea/proposals/vN.md` baru — N auto-increment dari versi tertinggi yang ada. Status `draft` (atau `revision_requested` kalau memang siklus revisi). **Versi lama tidak pernah ditimpa.**

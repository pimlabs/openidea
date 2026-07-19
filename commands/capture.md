---
description: Tangkap ide baru (cerita bebas atau ekstraksi dari dokumen) jadi openidea/ideas/<slug>.md
---

Baca `.claude/skills/openidea/SKILL.md` section 3.2 (schema ide), section 7 (regenerasi INDEX.md) sebelum lanjut.

Input dari user (cerita bebas, atau path/isi dokumen MOM/transkrip): $ARGUMENTS

## Prasyarat

`openidea/BRIEF.md` harus ada. Kalau belum, stop dan arahkan ke `/oi:init` dulu.

## Proses

1. **Deteksi mode input** — auto-detect dari jenis input:
   - Dokumen panjang (MOM/transkrip/summary): ekstrak kandidat ide sebagai one-liner list → tampilkan ke user untuk direview → hanya yang di-approve dilanjutkan ke langkah 2.
   - Cerita bebas: parse langsung, bisa multi-ide dalam satu batch.
2. Untuk tiap ide yang lanjut: quick-check kemiripan terhadap `openidea/ideas/INDEX.md` (exact/near-exact match berdasarkan problem statement). Kalau ketemu kandidat mirip, tanya user dulu sebelum bikin file baru (update ide existing atau tetap buat baru).
3. Structuring jadi 5Q (schema 3.2 di SKILL.md), sesuaikan `type: feature` atau `type: chore` (skip poin 3 "siapa yang pakai" untuk chore).
4. Kalau input terlalu vague untuk mengisi field tertentu: isi `TBD` eksplisit di field itu, set `needs_clarification: true`. **Jangan mengarang.**
5. Partial processing: kalau dalam satu batch ada 1 item ambigu, proses dulu yang jelas, baru tanya balik untuk yang ambigu (jangan blokir seluruh batch).
6. Guard rail advisory: kalau ide baru relevan dengan milestone yang sudah punya folder di `openspec/changes/`, kasih notice ringan (bukan blocking).

## Output

- File baru `openidea/ideas/<slug>.md` per ide, status `captured`, `history: [{date: <today>, status: captured}]`.
- Mode dokumen: arsipkan sumber asli ke `openidea/discovery/<sesi>.md`, isi field `source` di tiap ide hasil ekstraksi dokumen itu.
- Regenerate `openidea/ideas/INDEX.md` (prosedur di SKILL.md section 7).

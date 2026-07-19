---
description: Structuring visi produk jadi openidea/BRIEF.md
---

Baca `.claude/skills/openidea/SKILL.md` section 1 (Filosofi), 3.1 (schema `BRIEF.md`) sebelum lanjut.

Argumen dari user (jika ada): $ARGUMENTS

## Prasyarat

Tidak ada prasyarat keras. Tapi cek dulu apakah `openidea/BRIEF.md` sudah ada.

## Proses

1. Jika `openidea/BRIEF.md` **belum ada**: minta user cerita bebas tentang visi produk (kalau belum diberikan di $ARGUMENTS atau pesan sebelumnya). Structuring jadi body sesuai schema 3.1: Vision, Target Users, Core Value Prop, Fitur Besar (checklist kasar), Non-goals, Constraints.
2. Jika `openidea/BRIEF.md` **sudah ada**:
   - Kalau ini revisi kecil (nambah/ubah satu section) → edit langsung, tidak perlu arsip.
   - Kalau ini penulisan ulang total → **wajib** tanya konfirmasi dulu ke user. Kalau dikonfirmasi, salin isi lama ke `openidea/discovery/brief-v{N}-superseded.md` (N = increment dari versi superseded terakhir) sebelum menimpa `BRIEF.md`.
3. Tulis frontmatter: `schema_version: 1`, `project_status: active`.
4. Jangan mengarang detail yang tidak disebutkan user — tanya balik kalau ada gap penting (misal target users tidak jelas).

## Output

`openidea/BRIEF.md` (create atau update). Tunjukkan hasil akhir ke user untuk direview.

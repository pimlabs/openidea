---
description: Kumpulkan paket teknis milestone untuk handoff ke pihak tanpa akses repo
---

Baca `.claude/skills/openidea/SKILL.md` section 3.6, 3.7 sebelum lanjut.

Argumen dari user: nama milestone (wajib), parameter bahasa (opsional). $ARGUMENTS

## Prasyarat

Tidak ada prasyarat keras, tapi minta nama milestone dulu kalau belum ada di $ARGUMENTS.

## Proses

1. Kumpulkan:
   - `openidea/BRIEF.md` — konteks relevan saja (bukan seluruh isi mentah).
   - Scope milestone dari `openidea/ROADMAP.md`.
   - `openidea/proposals/<approved terkait milestone>.md` — kalau ada.
   - Isi lengkap `openidea/ideas/<slug>.md` terkait milestone (termasuk `type: chore` — export **tidak** mengecualikan chore, beda dari `/openidea:compile`).
2. **Selalu** kecualikan `openidea/discovery/` — tanpa pengecualian, prinsip keamanan data client.
3. **Selalu** kecualikan ide dari milestone lain yang tidak relevan.
4. Kalau parameter bahasa diminta, translasi **hanya** di file export ini — jangan ubah source `ideas/`.
5. Tambahkan header penjelasan di awal dokumen: konteks apa ini, cara baca tiap section, untuk pembaca yang mungkin tidak pakai AI/skill apapun.

## Output

`openidea/exports/<milestone-slug>-vN.md` — auto-versioned, tidak overwrite file export sebelumnya.

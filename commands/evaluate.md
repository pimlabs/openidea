---
description: Evaluasi ide captured — deteksi overlap/konflik, rekomendasi status & kategori
---

Muat skill `openidea` (Skill tool) buat baca section 3.2, 5 (status lifecycle), 7 sebelum lanjut.

Argumen dari user (opsional, misal scope ke kategori tertentu atau bulk-rename kategori): $ARGUMENTS

## Prasyarat

Minimal 1 ide berstatus `captured`. Kalau tidak ada, stop dan beri tahu tidak ada yang perlu dievaluasi.

## Proses

1. Bandingkan **Problem** & **Siapa yang pakai** antar ide untuk deteksi **overlap** (scope beririsan nyata, bukan sekadar topik mirip).
2. Bedakan overlap dari **konflik** (requirement saling bertentangan dari sumber berbeda). Untuk konflik: jangan menebak resolusinya — wajib flag ke user dan minta klarifikasi eksplisit.
3. Overlap check mencakup **3 sumber**: `ideas/*.md` aktif, `ideas/archive/*.md`, `ideas/promoted/*.md` — bukan hanya ide aktif.
4. Kalau ada ide terlalu besar (mengandung 2+ scope beda milestone/waktu kerja): rekomendasikan split jadi 2+ ide baru. Kalau user setuju: ide original → status `split`, isi `split_into`, pindah ke `archive/`.
5. Validasi struktural (bukan judgment):
   - `depends_on` tidak boleh membentuk siklus, langsung maupun tidak langsung. Siklus langsung = **blocking**, stop dan minta user perbaiki dulu.
   - Semua referensi `depends_on` harus menunjuk slug yang benar-benar ada. Broken reference = **flag** (advisory, tidak blocking).
6. Traverse chain `merged_into` — kalau target merge ternyata juga `killed`, kasih notice untuk ditinjau ulang.
7. Rekomendasikan status (`ready`/`parked`/`merged`/`killed`) dan kategori per ide → **user review & approve** sebelum ditulis ke file.
8. Bulk-rename kategori: dukung kalau diminta eksplisit di $ARGUMENTS atau oleh user (bukan command terpisah).
9. Command ini **tidak terkunci mode** — kalau di tengah sesi user kepikiran ide baru, boleh selipkan `/openidea:capture`. Ide baru itu masuk status `captured`, **tidak** ikut dievaluasi di sesi yang sama.

## Output

- Update frontmatter tiap ide terkait sesuai approval user.
- `killed` **wajib** ada `triage_note` — jangan tulis status `killed` tanpa itu.
- Kategori **wajib** terisi sebelum status naik ke `ready`.
- File dengan status final (`killed`/`merged`/`split`) dipindah ke `archive/`.
- Tambah entry baru di `history[]` tiap ide yang statusnya berubah.
- Regenerate `openidea/ideas/INDEX.md`.

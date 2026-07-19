---
description: Susun ide ready ke milestone di openidea/ROADMAP.md
---

Muat skill `openidea` (Skill tool) buat baca section 3.3 (schema ROADMAP.md) sebelum lanjut.

Argumen dari user (opsional, nama milestone/reprioritisasi spesifik): $ARGUMENTS

## Prasyarat

Minimal 1 ide berstatus `ready`. Kalau tidak ada, stop dan arahkan ke `/openidea:evaluate` dulu.

## Proses

1. Susun ide `ready` ke milestone di `openidea/ROADMAP.md` (buat baru atau update existing).
2. Validasi nama milestone menghasilkan slug unik — tidak collide dengan milestone lain. Kalau collide, tanya user nama alternatif.
3. Cek circular dependency di **level agregat milestone** (bukan cuma per-ide): kalau ada ide di milestone belakangan jadi prasyarat (`depends_on`) ide di milestone duluan, flag untuk ditinjau ulang urutannya — jangan otomatis reorder tanpa konfirmasi.
4. Kalau milestone yang mau di-rename sudah pernah di-`spec-draft` (ada ide berstatus `promoted` di dalamnya): **warning dulu** sebelum lanjut — rename di ROADMAP tidak otomatis mengubah nama folder OpenSpec yang sudah ada, jadi akan terjadi mismatch nama.
5. Kalau ide dipindah antar milestone dan salah satu milestone-nya sudah `approved`: reset status approval milestone terkait (`status: draft`, `approved_in: null`) dan beri notice ke user kenapa itu terjadi.

## Output

`openidea/ROADMAP.md` (create/update). Urutan heading atas→bawah = urutan eksekusi yang disepakati.

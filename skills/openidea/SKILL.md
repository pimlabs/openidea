---
name: openidea
description: Kelola siklus hidup ide produk end-to-end secara file-based — dari visi produk (BRIEF.md), penangkapan ide mentah, evaluasi & kategorisasi, penyusunan roadmap, sampai draft spec teknis (OpenSpec). Trigger otomatis saat user menyebut "openidea", "capture ide", "roadmap produk", "proposal client", "BRIEF produk", atau menjalankan command /openidea:init, /openidea:capture, /openidea:evaluate, /openidea:plan, /openidea:spec-draft, /openidea:compile, /openidea:export, /openidea:spec-audit.
---

# OpenIdea

Sistem manajemen ide produk file-based. State hidup di markdown di bawah folder `openidea/` pada root project. Skill ini adalah rujukan tunggal untuk schema file, prinsip desain, dan prosedur regenerasi index yang dipakai bersama oleh semua command `/openidea:*`.

Command individual ada di `commands/*.md` pada repo plugin ini. Tiap command file self-contained (prasyarat + proses + output), tapi tetap merujuk ke dokumen ini untuk detail schema — jangan duplikasi schema di command file, cukup pointer ke section terkait di sini.

## 1. Filosofi Inti

- **File-based** — semua state di markdown, git-friendly, bisa di-diff, dibaca tanpa tools tambahan.
- **Human decides, Claude drafts** — Claude structuring & rekomendasi; keputusan final di tangan pengguna. Jangan pernah mengubah status ide/milestone tanpa review pengguna, kecuali eksplisit diminta ("tandai Milestone 1 approved").
- **Independen dari OpenSpec** — OpenIdea tidak pernah menulis ke `openspec/changes/` atau `openspec/specs/` secara langsung kecuali lewat `/openidea:spec-draft`. Tidak bergantung pada skill `openspec-drafter` generic.
- **Portable** — seluruh isi `openidea/` harus dipahami manusia atau AI lain tanpa konteks percakapan tambahan. Skill ini dibundel di repo (`.claude/skills/openidea/`), bukan skill personal.
- **Async-only** — didesain untuk kerja sendiri atau handoff bergiliran, bukan simultaneous multi-user editing real-time. Git conflict pada file auto-generated (`ideas/INDEX.md`) diselesaikan dengan regenerate ulang, bukan manual merge baris-per-baris.
- **Nothing disappears** — status berubah, file tidak pernah dihapus/ditimpa tanpa jejak. Riwayat tercatat di field `history[]`.

## 2. Struktur Folder

```
project/
├── openidea/
│   ├── BRIEF.md                 ← vision produk, statis, punya schema_version & project_status
│   ├── ROADMAP.md               ← milestone, urutan eksekusi, approval per-milestone
│   ├── ideas/
│   │   ├── INDEX.md             ← auto-regenerate dari scan filesystem, ringkas
│   │   ├── <slug>.md            ← 5Q + frontmatter lengkap (ide aktif)
│   │   ├── assets/<slug>/       ← lampiran visual opsional
│   │   ├── archive/
│   │   │   └── <slug>.md        ← status: killed, merged, split
│   │   └── promoted/
│   │       └── <slug>.md        ← status: promoted (sudah jadi OpenSpec)
│   ├── proposals/
│   │   └── v1.md, v2.md, ...    ← dokumen narasi client-facing, versioned
│   ├── exports/
│   │   └── <milestone-slug>-vN.md  ← paket teknis untuk handoff eksternal
│   └── discovery/
│       └── <sesi>.md            ← arsip mentah (MOM, transkrip, BRIEF lama)
└── openspec/                    ← TIDAK PERNAH DISENTUH langsung, kecuali via /openidea:spec-draft
    ├── changes/
    └── specs/
```

Semua path folder relatif ke root `openidea/` di root project. `openspec/` milik tooling lain — OpenIdea hanya *membaca* dari situ (misal cek folder ada/belum), tidak pernah menulis kecuali lewat `/openidea:spec-draft`.

Skill dan command sendiri **tidak** hidup di project ini — mereka dimuat dari plugin `openidea` (install lewat `/plugin install openidea@pimlabs`), repo terpisah dengan layout `skills/openidea/` + `commands/*.md` di root plugin.

## 3. Skema File

### 3.1 `BRIEF.md`

```yaml
---
schema_version: 1
project_status: active   # active | cancelled
---
```

Body (naratif, ditulis oleh `/openidea:init`):
- **Vision** — problem besar & tujuan produk
- **Target Users** — siapa yang pakai
- **Core Value Prop** — nilai inti yang ditawarkan
- **Fitur Besar** — checklist kasar, belum di-detail
- **Non-goals** — batasan level produk
- **Constraints** — batasan teknis/waktu/infrastruktur

Ditulis sekali di awal, jarang direvisi. Revisi total → salin versi lama ke `discovery/brief-v{N}-superseded.md` sebelum ditulis ulang. Tidak pernah overwrite polos.

### 3.2 `ideas/<slug>.md`

```yaml
---
id: wa-booking
status: ready              # captured | ready | parked | merged | killed | split | promoted
type: feature               # feature | chore
category: Booking & Scheduling
created: 2026-07-16
updated: 2026-07-20
source: discovery/2026-07-16-session.md     # opsional, dari /openidea:capture mode import
replaces: "Sistem booking manual via Excel"   # opsional
depends_on: []                                 # opsional, list id ide lain
needs_clarification: false                      # true jika hasil capture dari input terlalu vague
merged_into: null                                # diisi jika status: merged
split_into: []                                    # diisi jika status: split
promoted_to: null                                  # path folder openspec/changes/<milestone>/
promoted_with: []                                   # id ide lain yang dipromote bersamaan
triage_note: null                                    # WAJIB diisi jika status: killed
history:
  - {date: 2026-07-16, status: captured}
  - {date: 2026-07-18, status: ready}
---
```

Body (5Q, disederhanakan untuk `type: chore` — skip poin 3):
1. **Problem** — masalah apa yang diselesaikan
2. **Why now** — kenapa penting sekarang
3. **Siapa yang pakai** — *(skip untuk `type: chore`)*
4. **Done looks like** — kondisi selesai, terukur jika bisa
5. **Out of scope** — apa yang sengaja tidak dikerjakan

### 3.3 `ROADMAP.md`

```markdown
# Roadmap

## Milestone 1 — Core Booking
**Status**: approved
**Approved in**: proposals/v3.md

- wa-booking
- dashboard-okupansi-basic

## Milestone 2 — Finance Module
**Status**: draft

- integrasi-billing-asuransi
```

Aturan:
- Urutan heading atas→bawah = urutan eksekusi.
- Nama milestone **harus** identik dengan nama folder `openspec/changes/<nama>/` nanti. Slug dari nama milestone harus unik (divalidasi di `/openidea:plan`).
- Status per milestone: `draft` | `approved` — bukan status per-dokumen proposal.
- **Approved in** hanya diisi saat status `approved`, menunjuk versi proposal spesifik.
- Field ini di-reset (`status: draft`, `approved_in: null`) otomatis jika ada ide dipindah masuk/keluar milestone tersebut setelah approved.

### 3.4 `proposals/vN.md`

```yaml
---
version: 3
status: draft            # draft | revision_requested | approved | superseded
compiled_from_roadmap_snapshot: "<hash atau timestamp ROADMAP.md saat compile>"
milestones_covered: [Core Booking]   # bisa scoped
created: 2026-07-20
---
```

Body: narasi presentable, dikelompokkan per `category`, urutan sesuai `ROADMAP.md`. Jika `status: superseded`, baris pertama body **wajib**:
> ⚠️ Dokumen ini sudah digantikan oleh versi lebih baru. Lihat `proposals/` untuk versi terkini.

### 3.5 `ideas/INDEX.md`

Auto-regenerate dari scan filesystem — bukan sumber kebenaran independen, **jangan diedit manual**. Lihat section 7 untuk prosedur regenerasi.

### 3.6 `discovery/<sesi>.md`

Arsip mentah apa adanya (transkrip MOM, summary, atau `BRIEF.md` lama yang di-supersede). **Tidak pernah** masuk ke `exports/` atau `proposals/` dalam bentuk apapun — prinsip keamanan data, berpotensi berisi info sensitif client.

### 3.7 `exports/<milestone-slug>-vN.md`

Paket kurasi untuk pihak eksternal tanpa akses repo. Auto-versioned, tidak overwrite. Berisi: konteks relevan `BRIEF.md` + scope milestone dari `ROADMAP.md` + isi lengkap tiap `ideas/<slug>.md` terkait. Selalu kecualikan `discovery/`. Wajib self-explanatory (header cara baca dokumen) untuk pembaca tanpa AI. Mendukung parameter bahasa opsional (translasi hanya di file export, bukan source `ideas/`).

## 4. Command Index

| Command | Prasyarat | Output |
|---|---|---|
| `/openidea:init` | — | `BRIEF.md` |
| `/openidea:capture` | `BRIEF.md` ada | `ideas/<slug>.md` baru, status `captured` |
| `/openidea:evaluate` | ≥1 ide `captured` | update frontmatter ide, pindah ke `archive/` jika final |
| `/openidea:plan` | ≥1 ide `ready` | `ROADMAP.md` |
| `/openidea:spec-draft` | `openspec/` ada, milestone target punya ≥1 ide `ready` | `openspec/changes/<milestone>/{proposal,design,tasks}.md`, ide → `promoted` |
| `/openidea:compile` | ada ide `ready` di `ROADMAP.md` | `proposals/vN.md` baru |
| `/openidea:export` | — | `exports/<milestone-slug>-vN.md` |
| `/openidea:spec-audit` | folder `openspec/changes/<milestone>` ada | laporan drift (read-only) |

Detail proses tiap command: baca file command-nya masing-masing di `commands/`.

Catatan: `/openidea:release` dan `/openidea:list` **bukan** command terpisah.
- Approval milestone: instruksi natural ("tandai Milestone 1 approved dari v3") → ubah `status`+`approved_in` di `ROADMAP.md`.
- Pertanyaan list ("ide apa yang ready?", "mana yang di-archive?"): jawab langsung dari `ideas/INDEX.md`.

## 5. Status Lifecycle (per ide)

```
captured ──┬──> ready ──> (masuk milestone, approved) ──> promoted
           ├──> parked
           ├──> merged (+ merged_into)
           └──> killed (+ triage_note, wajib)
```

`split` adalah status tambahan: ide besar dipecah, dicatat via `split_into`, dipindah ke `archive/` (bukan "mati", tapi "digantikan entitas baru").

Semua status non-aktif bisa dikembalikan ("revived"/"corrected") ke `captured`, dengan entry baru di `history[]` yang mencatat alasan pengembalian — tidak menghapus jejak keputusan sebelumnya.

## 6. Prinsip Cross-Cutting

| Kategori | Prinsip |
|---|---|
| Keamanan | `discovery/` tidak pernah masuk `exports/` atau `proposals/` dalam bentuk apapun. |
| Resilience | Kegagalan proses di tengah command terisolasi per-file, bukan corrupt total. `ideas/INDEX.md` selalu di-regenerate dari scan filesystem nyata tiap sesi baru — otomatis "menyembuhkan" inkonsistensi. |
| Skala | `ideas/INDEX.md` default hanya tampilkan detail ide aktif; `archive/`/`promoted/` cukup ringkasan angka. |
| Versioning skema | `schema_version` di `BRIEF.md`. Command yang baca file harus backward-compatible — skema versi lama, isi field baru dengan default aman, jangan gagal total. |
| Kolaborasi | Async-only. Git conflict pada file auto-generated diselesaikan dengan regenerate ulang, bukan manual-resolve baris per baris. |
| Traceability | Tidak ada file hilang tanpa jejak. `killed`/`merged`/`split` tetap di `archive/` dengan alasan tercatat. Versi `proposals/` dan `BRIEF.md` lama diarsip, bukan ditimpa. |
| Non-fitur (chore) | `type: chore` pakai 5Q sederhana, dikecualikan dari `/openidea:compile` (client-facing), tetap disertakan di `/openidea:export` (paket teknis). |

## 7. Prosedur Regenerasi `ideas/INDEX.md`

Dipanggil oleh `/openidea:capture`, `/openidea:evaluate`, `/openidea:plan`, `/openidea:spec-draft` setelah mengubah state ide — dan boleh dipanggil standalone kapan saja untuk "menyembuhkan" inkonsistensi.

1. Scan filesystem nyata: `ideas/*.md` (aktif), `ideas/archive/*.md`, `ideas/promoted/*.md`. Jangan percaya cache/asumsi state sebelumnya.
2. Tampilkan detail ringkas untuk semua ide aktif (`captured`, `ready`, `parked`): id, status, category, updated.
3. Untuk `archive/` dan `promoted/`, tampilkan **ringkasan angka saja** (misal: "47 archived, 32 promoted — lihat folder terkait").
4. Section **"Ready tapi belum di-plan"** — ide `ready` yang id-nya tidak muncul di `ROADMAP.md` manapun.
5. Section **"Perlu klarifikasi"** — ide dengan `needs_clarification: true`.
6. Section **"Anomali"** — flag:
   - status ide tidak konsisten dengan lokasi file (misal `killed` tapi masih di `ideas/`, bukan `ideas/archive/`)
   - `killed` tanpa `triage_note`
   - `depends_on` menunjuk slug yang tidak ada
7. Tulis ulang `ideas/INDEX.md` seluruhnya (bukan patch parsial) — file ini bukan sumber kebenaran independen.

## 8. Catatan Implementasi

- Tiap command **wajib** validasi prasyarat sebelum eksekusi, dan gagal dengan pesan jelas jika tidak terpenuhi — bukan silent failure atau asumsi.
- Prioritaskan guard rail *blocking* (circular dependency langsung, milestone kosong saat spec-draft, `openspec/` belum ada) di atas guard rail *advisory* (observasi revisi berulang, notice overlap kategori). Advisory tidak boleh memblokir alur kerja.
- Kalau ambiguitas muncul saat eksekusi command, tanya pengguna — jangan berasumsi atau mengarang isi field.

# OpenIdea

Claude Code plugin buat kelola siklus hidup ide produk end-to-end secara file-based — dari visi produk (`BRIEF.md`), capture ide mentah, evaluasi & kategorisasi, penyusunan roadmap, sampai draft spec teknis ke [OpenSpec](https://github.com/Fission-AI/OpenSpec).

## Install

```
/plugin marketplace add pimlabs/openidea
/plugin install openidea@pimlabs
```

## Command

| Command | Fungsi |
|---|---|
| `/openidea:init` | Structuring visi produk → `openidea/BRIEF.md` |
| `/openidea:capture` | Tangkap ide baru (cerita bebas atau ekstraksi dokumen) |
| `/openidea:evaluate` | Evaluasi ide `captured` — overlap/konflik, rekomendasi status |
| `/openidea:plan` | Susun ide `ready` ke `openidea/ROADMAP.md` |
| `/openidea:spec-draft` | Generate proposal/design/tasks OpenSpec dari milestone |
| `/openidea:compile` | Compile ide `ready` jadi narasi proposal client-facing |
| `/openidea:export` | Paket teknis milestone untuk handoff eksternal |
| `/openidea:spec-audit` | Audit read-only drift OpenSpec vs proposal/ideas |

Detail lengkap filosofi, schema file, dan status lifecycle: lihat `skills/openidea/SKILL.md`.

## Struktur

```
.claude-plugin/       manifest plugin + marketplace
skills/openidea/      schema & prinsip (rujukan bersama semua command)
commands/              8 command /openidea:*
```

Setelah plugin dipakai di sebuah project, command-command di atas akan menulis state ke folder `openidea/` di root project tersebut.

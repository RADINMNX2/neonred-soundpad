# NeonRed Cable — P0 Decision Memo

**Date:** 2026-09-14
**Author:** engineering review (web-verified live sources)
**Status:** P0 — research spike complete; decision gate for P1+

## Mandate
Replace the bundled VB-CABLE driver in NeonRed SoundPad with a custom virtual audio cable ("NeonRed Cable") — kernel driver written with a Rust core, more modern, optimized, higher quality.

## 1. Go/No-Go verdict: GO (hybrid architecture)

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | **Hybrid: C++ KS/WaveRT shell + Rust core** | No one has shipped a Windows audio (KS/WaveRT) driver in Rust. `windows-drivers-rs` (wdk 0.4.1 / wdk-sys 0.5.1, 2025-11-14) is active (pushed 2026-09-10) but Microsoft's own README still says "not yet recommended for production use." The C++ shell is MIT-licensed reference code (sysvad lineage) and is the proven part; the Rust core (ring buffer, format engine, IOCTL protocol, gain) is where quality lives and is fully host-testable. Full-Rust remains a stretch goal, validated again at P4 if bindings mature. |
| Signing path | **Test-signing now; EV + attestation later** | Kernel drivers need signatures. Test-signing (`bcdedit /set TESTSIGNING ON` + WDRLocalTestCert) is free but dev/test-only (Secure Boot off). Attestation signing requires an EV code-signing certificate (~$300–500/yr, verified current) plus free Partner Center Hardware Developer Program registration, and attestation-signed drivers are not published via Windows Update. Retail/WHCP publication additionally needs HLK tests. Interim builds = test-signed; retail path = EV cert + attestation; final = decide EV-only vs WHCP. |
| Reference anchor | **sysvad (WDM + WaveRT + componentized INF)** | Microsoft's own virtual-audio-device driver; HLK-clean except the hardware-offload test. JannesP/AudioMirror (MIT, 2022) is the closest complete cable implementation for the ring-buffer/endpoint pattern. Newer C++ references (Unitra.Mic.Driver 2026, DeckX 2026) also exist. |
| Format target | **44.1k–192k × 16/24/32-bit + float32, stereo (multi-instance)** | This beats VB-CABLE's baseline and the 48k-only ceiling of typical virtual cables; V1 is stereo, driver build-out for multi-instance endpoints from day one. |

## 2. What P0 proved (with sources)

- **Rust WDK stack is current and viable for experimentation:** `wdk` 0.4.1, `wdk-sys` 0.5.1, `wdk-build` 0.5.1, edition 2024, MIT OR Apache-2.0, published 2025-11-14. Repo active (1.9k stars, pushed 2026-09-10). Build requires nightly, LLVM 17 (LLVM 18 has an ARM64 bindgen bug), static CRT, `panic = "abort"`, `#[unsafe(export_name = "DriverEntry")]`. (crates.io / microsoft/windows-drivers-rs README & releases.)
- **No public Rust Windows audio (KS) driver exists.** GitHub search "virtual audio cable rust driver" = 0 results; Microsoft's own Rust samples contain no audio driver. NeonRed Cable would be the first — expect to validate every WDK audio binding ourselves.
- **Signing reality (2026, corrected):** attestation signing requires an EV code-signing certificate (to register and to submit); attestation-signed drivers currently load on retail Windows 10/11 (desktop) but aren't published via Windows Update and aren't Windows Certified. Dossier claims of an "April 2026 cross-signed cutoff" and "InfVerif /h" are **refuted** — the real 2026 changes are the *unreferenced-files signing policy* (logging-only since Feb 23 2026; enforcement TBA) and the new *preproduction signing* offering. (learn.microsoft.com driver-signing-offerings / code-signing-attestation; TechCommunity HDC blog.)
- **No user-mode substitute exists:** `Windows.Media.Audio` graphs are float32-only, 10 ms quantum, and can only route between devices that already exist — creating a new virtual endpoint that *any* app can select requires a kernel driver. (learn.microsoft.com audio-graphs.)
- **VB-CABLE hypothesis needs verification:** its page specifies a "HiFi Cable" option up to 24-bit/384 kHz; the "48k float32 stereo baseline" claim is **unverified**. The reference-manual PDF is human-only (could not be machine-extracted this session). Re-verify in P1 with a PDF-capable tool.
- **Local toolchain:** rustc/cargo 1.98.1 present; **no eWDK, no LLVM, no MSBuild, no full WDK** on this machine → the WDK driver builds run in cloud CI (GitHub Actions), consistent with the Zero-Local-Build policy. Core crate builds/tests locally.

## 3. P0 deliverables landed

- `neocable/` Cargo workspace with `neocable-core` (host-testable Rust core: SPSC ring buffer, format engine, IOCTL wire structs). `cargo test` green.
- `neocable/docs/IOCTL-SPEC.md` — control protocol between app and driver.
- `.github/workflows/driver.yml` — CI: `core` job (always on, green), `driver` job (experimental scaffold, test-sign wiring in P4).
- This memo.

## 4. Risk register (top)

1. **Signing → distribution.** Test-signed builds require Secure Boot off — acceptable for dev/interim, unacceptable for the average user. Retail distribution is gated on EV cert spend (~$300–500/yr). Mitigation: ship interim builds test-signed labelled "Developer build"; plan the EV purchase for the first public release.
2. **Rust WDK maturity.** Driver runtime is our own; bindings may lag WDK types. Mitigation: hybrid shell; core in Rust; keep IRP/WDF surface thin.
3. **Latency expectations.** Windows audio-engine shared-mode buffer (~10 ms) dominates; we can shave a few ms (dma buffer scheduling), not transform the audio path. Set user expectations accordingly.
4. **sysvad HLK offload test** — not applicable for our no-hardware-offload device; acceptable.

## 5. Costed phase plan

| Phase | Scope | Effort | Gate |
|---|---|---|---|
| P0 | Research + toolchain proof + decision memo | done | ✅ approved (this memo) |
| P1 | Driver skeleton: sysvad-derived C++ shell + channel (ring) + endpointer + install via componentized INF; test-signed build CI | 2–3 wks | test-signed virtual cable appears in Windows |
| P2 | Formats (44.1–192k, PCM16/24/32, float32), buffer-depth control, gain, underrun/overrun accounting | 1–2 wks | format matrix verified end-to-end |
| P3 | Control surface: IOCTL client in the app (`install-neo-cable` IPC replacing `install-vb-cable`, preload + main.js swaps, HelpModal/translations re-brand) | 1 wk | in-app install/uninstall/status UI works |
| P4 | Packaging/signing/CI release: EV cert decision, attestation (or test-sign release), docs, telemetry-free audit | 1–2 wks | v1.0.0 release |
| P5 | Polish: multi-instance config UI, latency profiles, user validation | ongoing | — |

## 6. Acceptance criteria (P1)
- `cargo test` on `neocable-core` green (already true).
- Driver INF installs via `devcon install <inf> Root\NRC\<id>` in a Test-Mode VM; device node created.
- Render + capture endpoints enumerate; a second app can select the virtual input and capture looped audio at 48k float32.
- CI `driver` job produces a test-signed driver artifact.
- No data all-zero / stuck state after 10 min of pass-through.

## 7. Open items carried to P1
- Read VB-CABLE reference manual (PDF extraction) to close the format matrix comparison.
- Spec the exact `install-neo-cable` IPC contract mirroring today's `install-vb-cable` (main.js:1480 / preload.js:91).
- Decide multi-endpoint config schema (per-endpoint sample rate/channels) for app UI.
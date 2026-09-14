# NeonRed Cable — IOCTL Control Protocol (draft, v0.1)

Wire protocol between the NeonRed SoundPad app and the NeonRed Cable kernel driver.
All structs are `#[repr(C)]`, little-endian, matching `neocable-core/src/ioctl.rs`.
IOCTL codes are `CTL_CODE(FILE_DEVICE_UNKNOWN=0x22, 0x800|fn, METHOD_BUFFERED, FILE_ANY_ACCESS)`
= `(0x22<<16) | ((0x800|fn)<<2)` → fn 0x00..0x07 = `0x222000, 0x222004, … 0x22201C`.

## IOCTL table

| Code | Function | In buffer | Out buffer |
|---|---|---|---|
| 0x800 | IOCTL_GET_VERSION | — | `NrcVersion` (major/minor/patch u32) |
| 0x801 | IOCTL_CREATE_INSTANCE | `NrcCreateInstance` | — (0 / NTSTATUS) |
| 0x802 | IOCTL_REMOVE_INSTANCE | `NrcRemoveInstance` | — |
| 0x803 | IOCTL_SET_FORMAT | `NrcSetFormat` | — |
| 0x804 | IOCTL_GET_STATUS | `NrcGetStatus` | `NrcGetStatus` (updated) |
| 0x805 | IOCTL_SET_GAIN | `NrcSetGain` | — |
| 0x806 | IOCTL_SET_BUFFER_DEPTH_MS | `NrcSetBufferDepthMs` | — |
| 0x807 | IOCTL_WAIT_FIRST_CALLBACK | `NrcWaitFirstCallback` | — |

## Struct layouts (bytes)

```
NrcVersion            : major:u32 minor:u32 patch:u32                                 = 12
NrcCreateInstance     : endpoint_id:u32 default_channels:u8 pad[3]                     = 8
NrcRemoveInstance     : endpoint_id:u32                                                = 4
NrcSetFormat          : endpoint_id:u32 rate:u32 depth:u32 channels:u8 pad[3]          = 16
                          depth = 1=PCM16 2=PCM24 3=PCM32 4=Float32
                          rate  = 44100/48000/96000/192000
NrcStats              : render_underruns:u64 capture_overruns:u64 buffer_depth_ms:u32
                        gain_db_x100:i32 stream_active:u8 pad[3]                       = 32
NrcGetStatus          : endpoint_id:u32 stats:NrcStats write_position:u64
                        read_position:u64 buffer_bytes:u64 reset_count:u64             = 72
NrcSetGain            : endpoint_id:u32 gain_db_x100:i32 (0.01 dB steps)               = 8
NrcSetBufferDepthMs   : endpoint_id:u32 depth_ms:u32                                   = 8
NrcWaitFirstCallback  : endpoint_id:u32 timeout_ms:u32                                 = 8
```

## Semantics (v1)

- One driver instance owns one cable (render endpoint + capture endpoint pair).
  V1 supports up to 8 endpoints (id 0–7).
- Render side: WaveRT cyclic buffer → DMA position updates → ring buffer (depth =
  `buffer_depth_ms` at current format). Capture side: ring → WaveRT capture buffer.
- On render underrun: pad zeros + increment `render_underruns`.
  On capture overrun: drop oldest + increment `capture_overruns`.
- `IOCTL_SET_FORMAT` is atomic per endpoint; stream re-negotiates at the next
  position-wrap token.
- `gain_db_x100` applies in capture path; 0 = unity.
- `IOCTL_WAIT_FIRST_CALLBACK` blocks until the DPC/first callback fires or timeout.

## Error codes (NTSTATUS)

| Code | Meaning |
|---|---|
| STATUS_SUCCESS (0) | ok |
| STATUS_BUFFER_TOO_SMALL | out buffer too small |
| STATUS_INVALID_PARAMETER | bad format/channels/endpoint |
| STATUS_DEVICE_BUSY | endpoint already streaming |
| STATUS_NOT_FOUND | endpoint not created |
| STATUS_TIMEOUT | first-callback wait expired |

## Contract notes for the app port (P3)

- Replace `ipcMain.handle('install-vb-cable')` (main.js ~1480) + `installVBCable()` (preload.js ~91)
  with `install-neo-cable` / `remove-neo-cable` / `neo-status`, speaking this protocol
  over the driver device handle (`\\.\NRC0`).
- Re-brand UI strings: `vbCableDriver` / `vbAudioSoftware` / `restartNotice` → NeonRed Cable.
- Format defaults: 48 kHz float32 stereo (matches `DEFAULT_FORMAT`).
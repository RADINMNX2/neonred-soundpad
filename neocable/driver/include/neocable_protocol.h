#pragma once

//
// NeonRed Cable — control protocol, C mirror of neocable-core/src/ioctl.rs.
// Keep in sync: struct fields, padding and sizes matter.
//
// Types (ULONG, SIZE_T, ...) and CTL_CODE/METHOD_BUFFERED come from the
// WDK headers (wdm.h/ntddk.h); include those before this header.
//

#define NRC_IOCTL_BASE 0x800

#define NRC_CTL_CODE(Function)                                    \
    CTL_CODE(FILE_DEVICE_UNKNOWN, NRC_IOCTL_BASE + (Function),    \
             METHOD_BUFFERED, FILE_ANY_ACCESS)

#define IOCTL_GET_VERSION          NRC_CTL_CODE(0x00)
#define IOCTL_CREATE_INSTANCE      NRC_CTL_CODE(0x01)
#define IOCTL_REMOVE_INSTANCE      NRC_CTL_CODE(0x02)
#define IOCTL_SET_FORMAT           NRC_CTL_CODE(0x03)
#define IOCTL_GET_STATUS           NRC_CTL_CODE(0x04)
#define IOCTL_SET_GAIN             NRC_CTL_CODE(0x05)
#define IOCTL_SET_BUFFER_DEPTH_MS  NRC_CTL_CODE(0x06)
#define IOCTL_WAIT_FIRST_CALLBACK  NRC_CTL_CODE(0x07)

#define NRC_DEPTH_PCM16  1
#define NRC_DEPTH_PCM24  2
#define NRC_DEPTH_PCM32  3
#define NRC_DEPTH_FLOAT32 4

#pragma pack(push, 8)

typedef struct _NRC_VERSION {
    ULONG Major;
    ULONG Minor;
    ULONG Patch;
} NRC_VERSION; // sizeof == 12

typedef struct _NRC_CREATE_INSTANCE {
    ULONG EndpointId;
    UCHAR DefaultChannels;
    UCHAR Reserved[3];
} NRC_CREATE_INSTANCE; // sizeof == 8

typedef struct _NRC_REMOVE_INSTANCE {
    ULONG EndpointId;
} NRC_REMOVE_INSTANCE; // sizeof == 4

typedef struct _NRC_SET_FORMAT {
    ULONG EndpointId;
    ULONG Rate;
    ULONG Depth;
    UCHAR Channels;
    UCHAR Reserved[3];
} NRC_SET_FORMAT; // sizeof == 16

typedef struct _NRC_STATS {
    ULONGLONG RenderUnderruns;
    ULONGLONG CaptureOverruns;
    ULONG BufferDepthMs;
    LONG GainDbX100;
    UCHAR StreamActive;
    UCHAR Reserved[3];
} NRC_STATS; // sizeof == 32

typedef struct _NRC_GET_STATUS {
    ULONG EndpointId;
    NRC_STATS Stats;
    ULONGLONG WritePosition;
    ULONGLONG ReadPosition;
    ULONGLONG BufferBytes;
    ULONGLONG ResetCount;
} NRC_GET_STATUS; // sizeof == 72

typedef struct _NRC_SET_GAIN {
    ULONG EndpointId;
    LONG GainDbX100;
} NRC_SET_GAIN; // sizeof == 8

typedef struct _NRC_SET_BUFFER_DEPTH_MS {
    ULONG EndpointId;
    ULONG DepthMs;
} NRC_SET_BUFFER_DEPTH_MS; // sizeof == 8

typedef struct _NRC_WAIT_FIRST_CALLBACK {
    ULONG EndpointId;
    ULONG TimeoutMs;
} NRC_WAIT_FIRST_CALLBACK; // sizeof == 8

#pragma pack(pop)

//
// Rust core FFI (neocable-kernel staticlib). Driver calls into these.
//
extern "C" {
    ULONG nrc_version_major(void);
    ULONG nrc_version_minor(void);
    ULONG nrc_version_patch(void);
    INT nrc_ring_init(UCHAR* slot, SIZE_T slotCapacity, UCHAR* buf, SIZE_T capacityBytes);
    SIZE_T nrc_ring_write(const UCHAR* slot, const UCHAR* data, SIZE_T len);
    SIZE_T nrc_ring_read(const UCHAR* slot, UCHAR* out, SIZE_T len);
    ULONGLONG nrc_ring_occupied(const UCHAR* slot);
    SIZE_T nrc_ring_capacity(const UCHAR* slot);
    void nrc_ring_reset(const UCHAR* slot);
}
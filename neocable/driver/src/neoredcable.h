#pragma once

#include <wdm.h>
#include <wdf.h>
#include "neocable_protocol.h"

#define NRC_DEVICE_NAME L"\\Device\\NRC0"
#define NRC_DOSDEVICE_NAME L"\\DosDevices\\NRC0"
#define NRC_HARDWARE_ID L"Root\\NRC0000"
#define NRC_RING_BYTES (64 * 1024)
#define NRC_RING_SLOT_BYTES 64

typedef struct _DEVICE_CONTEXT {
    WDFMEMORY CableMemory;
    UCHAR* RingSlot;
    UCHAR* RingBuffer;
    SIZE_T RingBufferBytes;
    ULONG EndpointId;
} DEVICE_CONTEXT, *PDEVICE_CONTEXT;

WDF_DECLARE_CONTEXT_TYPE_WITH_NAME(DEVICE_CONTEXT, GetDeviceContext)

NTSTATUS NeoredcableEvtDeviceAdd(_In_ WDFDRIVER Driver, _Inout_ PWDFDEVICE_INIT DeviceInit);

EVT_WDF_IO_QUEUE_IO_DEVICE_CONTROL NeoredcableEvtIoDeviceControl;
EVT_WDF_IO_QUEUE_IO_READ NeoredcableEvtIoRead;
EVT_WDF_IO_QUEUE_IO_WRITE NeoredcableEvtIoWrite;
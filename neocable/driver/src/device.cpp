#include "neoredcable.h"
#include <ntstrsafe.h>

static NTSTATUS
NeoredcableCreateCableMemory(_In_ WDFDEVICE Device, _In_ PDEVICE_CONTEXT Context)
{
    NTSTATUS status;
    UCHAR* memory = NULL;
    size_t total = NRC_RING_SLOT_BYTES + NRC_RING_BYTES;
    WDF_OBJECT_ATTRIBUTES attributes;

    WDF_OBJECT_ATTRIBUTES_INIT(&attributes);
    attributes.ParentObject = Device;

    status = WdfMemoryCreate(
        &attributes,
        NonPagedPoolNx,
        'cRN0',
        total,
        Context->CableMemory);
    if (!NT_SUCCESS(status)) {
        return status;
    }

    memory = (UCHAR*)WdfMemoryGetBuffer(Context->CableMemory, NULL);
    Context->RingSlot = memory;
    Context->RingBuffer = memory + NRC_RING_SLOT_BYTES;
    Context->RingBufferBytes = NRC_RING_BYTES;

    if (nrc_ring_init(
            Context->RingSlot,
            NRC_RING_SLOT_BYTES,
            Context->RingBuffer,
            Context->RingBufferBytes) != 0) {
        return STATUS_INTERNAL_ERROR;
    }
    Context->EndpointId = 0;
    return STATUS_SUCCESS;
}

EXTERN_C_START

NTSTATUS
NeoredcableEvtDeviceAdd(_In_ WDFDRIVER Driver, _Inout_ PWDFDEVICE_INIT DeviceInit)
{
    WDFDEVICE device;
    PDEVICE_CONTEXT context;
    WDF_OBJECT_ATTRIBUTES deviceAttributes;
    WDF_IO_QUEUE_CONFIG queueConfig;
    WDFQUEUE queue;
    WDF_OBJECT_ATTRIBUTES queueAttributes;
    NTSTATUS status;
    DECLARE_CONST_UNICODE_STRING(hardwareId, NRC_HARDWARE_ID);
    DECLARE_CONST_UNICODE_STRING(ntDeviceName, NRC_DEVICE_NAME);
    DECLARE_CONST_UNICODE_STRING(dosDeviceName, NRC_DOSDEVICE_NAME);

    UNREFERENCED_PARAMETER(Driver);

    status = WdfDeviceInitAssignSDDLString(DeviceInit, &SDDL_DEVOBJ_SYS_ALL_ADM);
    if (!NT_SUCCESS(status)) {
        return status;
    }

    status = WdfDeviceInitSetCharacteristics(
        DeviceInit, FILE_DEVICE_SECURE_OPEN, FALSE);
    if (!NT_SUCCESS(status)) {
        return status;
    }

    status = WdfDeviceInitSetIoType(DeviceInit, WdfDeviceIoBuffered);
    if (!NT_SUCCESS(status)) {
        return status;
    }

    status = WdfDeviceInitAssignHardwareIds(DeviceInit, &hardwareId, 1);
    if (!NT_SUCCESS(status)) {
        return status;
    }

    status = WdfDeviceInitAssignName(DeviceInit, &ntDeviceName);
    if (!NT_SUCCESS(status)) {
        return status;
    }

    WDF_OBJECT_ATTRIBUTES_INIT(&deviceAttributes);
    WDF_OBJECT_ATTRIBUTES_SET_CONTEXT_TYPE(&deviceAttributes, DEVICE_CONTEXT);

    status = WdfDeviceCreate(&DeviceInit, &deviceAttributes, &device);
    if (!NT_SUCCESS(status)) {
        return status;
    }

    context = GetDeviceContext(device);
    context->CableMemory = WDF_NO_HANDLE;

    status = NeoredcableCreateCableMemory(device, context);
    if (!NT_SUCCESS(status)) {
        return status;
    }

    status = WdfDeviceCreateSymbolicLink(device, &dosDeviceName);
    if (!NT_SUCCESS(status)) {
        return status;
    }

    WDF_IO_QUEUE_CONFIG_INIT(&queueConfig, WdfIoQueueDispatchSequential);
    queueConfig.EvtIoDeviceControl = NeoredcableEvtIoDeviceControl;
    queueConfig.EvtIoRead = NeoredcableEvtIoRead;
    queueConfig.EvtIoWrite = NeoredcableEvtIoWrite;

    WDF_OBJECT_ATTRIBUTES_INIT(&queueAttributes);
    status = WdfIoQueueCreate(device, &queueConfig, &queueAttributes, &queue);
    return status;
}

VOID
NeoredcableEvtIoDeviceControl(
    _In_ WDFQUEUE Queue,
    _In_ WDFREQUEST Request,
    _In_ size_t OutputBufferLength,
    _In_ size_t InputBufferLength,
    _In_ ULONG IoControlCode)
{
    NTSTATUS status = STATUS_INVALID_DEVICE_REQUEST;
    size_t bytesReturned = 0;
    PVOID buffer = NULL;
    PDEVICE_CONTEXT context = NULL;

    UNREFERENCED_PARAMETER(InputBufferLength);

    buffer = WdfRequestRetrieveInputBuffer(Request, 0, NULL);
    context = GetDeviceContext(WdfIoQueueGetDevice(Queue));

    switch (IoControlCode) {
    case IOCTL_GET_VERSION: {
        if (OutputBufferLength < sizeof(ULONG) * 3) {
            status = STATUS_BUFFER_TOO_SMALL;
            break;
        }
        if (buffer != NULL) {
            PULONG v = (PULONG)buffer;
            v[0] = nrc_version_major();
            v[1] = nrc_version_minor();
            v[2] = nrc_version_patch();
            status = STATUS_SUCCESS;
            bytesReturned = sizeof(ULONG) * 3;
        }
        break;
    }
    case IOCTL_SET_FORMAT: {
        NRC_SET_FORMAT* fmt = (NRC_SET_FORMAT*)buffer;
        if (fmt == NULL || InputBufferLength < sizeof(NRC_SET_FORMAT)) {
            status = STATUS_BUFFER_TOO_SMALL;
            break;
        }
        if (fmt->EndpointId != context->EndpointId) {
            status = STATUS_NOT_FOUND;
            break;
        }
        if (fmt->Rate == 48000 && fmt->Depth == NRC_DEPTH_FLOAT32 && fmt->Channels == 2) {
            status = STATUS_SUCCESS;
        } else {
            status = STATUS_INVALID_PARAMETER;
        }
        break;
    }
    case IOCTL_GET_STATUS: {
        if (buffer == NULL || OutputBufferLength < sizeof(NRC_GET_STATUS)) {
            status = STATUS_BUFFER_TOO_SMALL;
            break;
        }
        NRC_GET_STATUS* st = (NRC_GET_STATUS*)buffer;
        st->EndpointId = context->EndpointId;
        st->Stats.RenderUnderruns = 0;
        st->Stats.CaptureOverruns = 0;
        st->Stats.BufferDepthMs = 0;
        st->Stats.GainDbX100 = 0;
        st->Stats.StreamActive = 0;
        st->WritePosition = nrc_ring_occupied(context->RingSlot);
        st->ReadPosition = 0;
        st->BufferBytes = (ULONGLONG)nrc_ring_capacity(context->RingSlot);
        st->ResetCount = 0;
        status = STATUS_SUCCESS;
        bytesReturned = sizeof(NRC_GET_STATUS);
        break;
    }
    default:
        break;
    }

    WdfRequestCompleteWithInformation(Request, status, bytesReturned);
}

VOID
NeoredcableEvtIoRead(_In_ WDFQUEUE Queue, _In_ WDFREQUEST Request, _In_ size_t Length)
{
    UNREFERENCED_PARAMETER(Queue);
    UNREFERENCED_PARAMETER(Length);
    WdfRequestComplete(Request, STATUS_NOT_IMPLEMENTED);
}

VOID
NeoredcableEvtIoWrite(_In_ WDFQUEUE Queue, _In_ WDFREQUEST Request, _In_ size_t Length)
{
    UNREFERENCED_PARAMETER(Queue);
    UNREFERENCED_PARAMETER(Length);
    WdfRequestComplete(Request, STATUS_NOT_IMPLEMENTED);
}

EXTERN_C_END
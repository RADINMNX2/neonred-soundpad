#include "neoredcable.h"

EXTERN_C_START

NTSTATUS
DriverEntry(_In_ PDRIVER_OBJECT DriverObject, _In_ PUNICODE_STRING RegistryPath)
{
    WDF_DRIVER_CONFIG config;
    WDF_OBJECT_ATTRIBUTES attributes;
    NTSTATUS status;

    WDF_DRIVER_CONFIG_INIT(&config, NeoredcableEvtDeviceAdd);
    config.DriverPoolTag = 'cRN0';
    config.DriverInitFlags = 0;

    WDF_OBJECT_ATTRIBUTES_INIT(&attributes);

    status = WdfDriverCreate(
        DriverObject,
        RegistryPath,
        &attributes,
        &config,
        WDF_NO_HANDLE);
    return status;
}

EXTERN_C_END
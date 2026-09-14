use crate::format::{AudioFormat, SampleFormat, SampleRate};

pub const NRC_IOCTL_BASE: u32 = 0x800;

// Matches Windows CTL_CODE(FILE_DEVICE_UNKNOWN=0x22, fn, METHOD_BUFFERED, FILE_ANY_ACCESS)
pub const fn ioctl_code(function: u32) -> u32 {
    (0x0000_0022 << 16) | ((NRC_IOCTL_BASE + function) << 2)
}

pub const IOCTL_GET_VERSION: u32 = ioctl_code(0x00);
pub const IOCTL_CREATE_INSTANCE: u32 = ioctl_code(0x01);
pub const IOCTL_REMOVE_INSTANCE: u32 = ioctl_code(0x02);
pub const IOCTL_SET_FORMAT: u32 = ioctl_code(0x03);
pub const IOCTL_GET_STATUS: u32 = ioctl_code(0x04);
pub const IOCTL_SET_GAIN: u32 = ioctl_code(0x05);
pub const IOCTL_SET_BUFFER_DEPTH_MS: u32 = ioctl_code(0x06);
pub const IOCTL_WAIT_FIRST_CALLBACK: u32 = ioctl_code(0x07);

#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct NrcVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct NrcCreateInstance {
    pub endpoint_id: u32,
    pub default_channels: u8,
    _pad: [u8; 3],
}

impl NrcCreateInstance {
    pub fn new(endpoint_id: u32, default_channels: u8) -> Self {
        Self {
            endpoint_id,
            default_channels,
            _pad: [0; 3],
        }
    }
}

#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct NrcRemoveInstance {
    pub endpoint_id: u32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct NrcSetFormat {
    pub endpoint_id: u32,
    pub rate: u32,
    pub depth: u32,
    pub channels: u8,
    _pad: [u8; 3],
}

impl NrcSetFormat {
    pub fn new(endpoint_id: u32, format: &AudioFormat) -> Self {
        Self {
            endpoint_id,
            rate: format.rate.hz(),
            depth: format.depth as u32,
            channels: format.channels,
            _pad: [0; 3],
        }
    }

    pub fn to_format(&self) -> Option<AudioFormat> {
        Some(AudioFormat {
            rate: SampleRate::from_hz(self.rate)?,
            depth: SampleFormat::from_u8(self.depth as u8)?,
            channels: self.channels,
        })
    }
}

#[repr(C)]
#[derive(Debug, Clone, Copy, Default)]
pub struct NrcStats {
    pub render_underruns: u64,
    pub capture_overruns: u64,
    pub buffer_depth_ms: u32,
    pub gain_db_x100: i32,
    pub stream_active: u8,
    _pad: [u8; 3],
}

#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct NrcGetStatus {
    pub endpoint_id: u32,
    pub stats: NrcStats,
    pub write_position: u64,
    pub read_position: u64,
    pub buffer_bytes: u64,
    pub reset_count: u64,
}

#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct NrcSetGain {
    pub endpoint_id: u32,
    pub gain_db_x100: i32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct NrcSetBufferDepthMs {
    pub endpoint_id: u32,
    pub depth_ms: u32,
}

#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct NrcWaitFirstCallback {
    pub endpoint_id: u32,
    pub timeout_ms: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_layouts_are_stable() {
        assert_eq!(std::mem::size_of::<NrcVersion>(), 12);
        assert_eq!(std::mem::size_of::<NrcCreateInstance>(), 8);
        assert_eq!(std::mem::size_of::<NrcRemoveInstance>(), 4);
        assert_eq!(std::mem::size_of::<NrcSetFormat>(), 16);
        assert_eq!(std::mem::size_of::<NrcStats>(), 32);
        assert_eq!(std::mem::size_of::<NrcGetStatus>(), 72);
        assert_eq!(std::mem::size_of::<NrcSetGain>(), 8);
        assert_eq!(std::mem::size_of::<NrcSetBufferDepthMs>(), 8);
        assert_eq!(std::mem::size_of::<NrcWaitFirstCallback>(), 8);
    }

    #[test]
    fn set_format_roundtrips() {
        let f = AudioFormat {
            rate: SampleRate::Khz96,
            depth: SampleFormat::Pcm24,
            channels: 2,
        };
        let msg = NrcSetFormat::new(3, &f);
        assert_eq!(msg.rate, 96_000);
        assert_eq!(msg.depth, 2);
        assert_eq!(msg.channels, 2);
        let back = msg.to_format().unwrap();
        assert_eq!(back, f);
    }
}
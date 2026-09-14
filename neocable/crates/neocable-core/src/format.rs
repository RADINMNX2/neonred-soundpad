#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum SampleFormat {
    Pcm16 = 1,
    Pcm24 = 2,
    Pcm32 = 3,
    Float32 = 4,
}

impl SampleFormat {
    pub fn bytes(&self) -> u32 {
        match self {
            SampleFormat::Pcm16 => 2,
            SampleFormat::Pcm24 => 3,
            SampleFormat::Pcm32 => 4,
            SampleFormat::Float32 => 4,
        }
    }

    pub fn from_u8(v: u8) -> Option<Self> {
        match v {
            1 => Some(SampleFormat::Pcm16),
            2 => Some(SampleFormat::Pcm24),
            3 => Some(SampleFormat::Pcm32),
            4 => Some(SampleFormat::Float32),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum SampleRate {
    Khz441 = 0,
    Khz48 = 1,
    Khz96 = 2,
    Khz192 = 3,
}

impl SampleRate {
    pub fn hz(&self) -> u32 {
        match self {
            SampleRate::Khz441 => 44100,
            SampleRate::Khz48 => 48000,
            SampleRate::Khz96 => 96000,
            SampleRate::Khz192 => 192000,
        }
    }

    pub fn from_hz(hz: u32) -> Option<Self> {
        match hz {
            44100 => Some(SampleRate::Khz441),
            48000 => Some(SampleRate::Khz48),
            96000 => Some(SampleRate::Khz96),
            192000 => Some(SampleRate::Khz192),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AudioFormat {
    pub rate: SampleRate,
    pub depth: SampleFormat,
    pub channels: u8,
}

impl AudioFormat {
    pub fn frame_bytes(&self) -> u32 {
        self.channels as u32 * self.depth.bytes()
    }

    pub fn bytes_per_second(&self) -> u64 {
        self.rate.hz() as u64 * self.frame_bytes() as u64
    }

    pub fn frames_to_bytes(&self, frames: u64) -> u64 {
        frames * self.frame_bytes() as u64
    }

    pub fn ms_to_bytes(&self, ms: u64) -> u64 {
        (self.bytes_per_second() * ms) / 1000
    }

    pub fn bytes_to_ms(&self, bytes: u64) -> u64 {
        if self.bytes_per_second() == 0 {
            0
        } else {
            (bytes * 1000) / self.bytes_per_second()
        }
    }

    pub fn is_valid_v1(&self) -> bool {
        self.channels == 2 && self.frame_bytes() > 0
    }
}

pub const DEFAULT_FORMAT: AudioFormat = AudioFormat {
    rate: SampleRate::Khz48,
    depth: SampleFormat::Float32,
    channels: 2,
};
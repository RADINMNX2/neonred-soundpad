pub mod format;
pub mod ioctl;
pub mod ring;

pub use format::{AudioFormat, SampleFormat, SampleRate};
pub use ring::RingBuffer;

pub const NRC_VERSION_MAJOR: u32 = 0;
pub const NRC_VERSION_MINOR: u32 = 1;
pub const NRC_VERSION_PATCH: u32 = 0;

pub fn version_string() -> String {
    format!(
        "{}.{}.{}",
        NRC_VERSION_MAJOR,
        NRC_VERSION_MINOR,
        NRC_VERSION_PATCH
    )
}
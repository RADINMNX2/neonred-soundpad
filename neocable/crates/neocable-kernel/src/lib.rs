#![cfg_attr(feature = "kernel", no_std)]
#![allow(clippy::missing_safety_doc)]

#[cfg(not(feature = "kernel"))]
extern crate std;

use core::ptr;
use core::sync::atomic::{AtomicU64, Ordering};

#[cfg(feature = "kernel")]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}

pub const NRC_RING_VIEW_SIZE: usize = core::mem::size_of::<RingView>();

pub struct RingView {
    buf: *mut u8,
    capacity: usize,
    write_pos: AtomicU64,
    read_pos: AtomicU64,
}

unsafe impl Send for RingView {}
unsafe impl Sync for RingView {}

impl RingView {
    pub fn new(buf: *mut u8, capacity: usize) -> Self {
        Self {
            buf,
            capacity,
            write_pos: AtomicU64::new(0),
            read_pos: AtomicU64::new(0),
        }
    }

    pub fn capacity(&self) -> usize {
        self.capacity
    }

    pub fn write_pos(&self) -> u64 {
        self.write_pos.load(Ordering::Acquire)
    }

    pub fn read_pos(&self) -> u64 {
        self.read_pos.load(Ordering::Acquire)
    }

    pub fn occupied(&self) -> u64 {
        self.write_pos() - self.read_pos()
    }

    pub fn free(&self) -> u64 {
        self.capacity as u64 - self.occupied()
    }

    pub fn reset(&self) {
        self.write_pos.store(0, Ordering::Release);
        self.read_pos.store(0, Ordering::Release);
    }

    pub unsafe fn write(&self, data: *const u8, len: usize) -> usize {
        debug_assert_eq!(self.capacity & (self.capacity - 1), 0);
        let mask = self.capacity as u64 - 1;
        let w = self.write_pos.load(Ordering::Acquire);
        let r = self.read_pos.load(Ordering::Acquire);
        let avail = self.capacity as u64 - (w - r);
        if len == 0 || avail == 0 {
            return 0;
        }
        let n = (len as u64).min(avail) as usize;
        let wm = (w & mask) as usize;
        let first = n.min(self.capacity - wm);
        ptr::copy_nonoverlapping(data, self.buf.add(wm), first);
        if first < n {
            ptr::copy_nonoverlapping(data.add(first), self.buf, n - first);
        }
        self.write_pos.store(w + n as u64, Ordering::Release);
        n
    }

    pub unsafe fn read(&self, out: *mut u8, len: usize) -> usize {
        let mask = self.capacity as u64 - 1;
        let w = self.write_pos.load(Ordering::Acquire);
        let r = self.read_pos.load(Ordering::Acquire);
        let occupied = w - r;
        if len == 0 || occupied == 0 {
            return 0;
        }
        let n = (len as u64).min(occupied) as usize;
        let rm = (r & mask) as usize;
        let first = n.min(self.capacity - rm);
        ptr::copy_nonoverlapping(self.buf.add(rm), out, first);
        if first < n {
            ptr::copy_nonoverlapping(self.buf, out.add(first), n - first);
        }
        self.read_pos.store(r + n as u64, Ordering::Release);
        n
    }
}

pub const NRC_VERSION_MAJOR: u32 = 0;
pub const NRC_VERSION_MINOR: u32 = 1;
pub const NRC_VERSION_PATCH: u32 = 0;

#[no_mangle]
pub extern "C" fn nrc_version_major() -> u32 {
    NRC_VERSION_MAJOR
}

#[no_mangle]
pub extern "C" fn nrc_version_minor() -> u32 {
    NRC_VERSION_MINOR
}

#[no_mangle]
pub extern "C" fn nrc_version_patch() -> u32 {
    NRC_VERSION_PATCH
}

#[no_mangle]
pub extern "C" fn nrc_ring_init(
    slot: *mut u8,
    slot_capacity: usize,
    buf: *mut u8,
    capacity_bytes: usize,
) -> i32 {
    if slot.is_null() || slot_capacity < NRC_RING_VIEW_SIZE || capacity_bytes < 2 {
        return -1;
    }
    if capacity_bytes & (capacity_bytes - 1) != 0 {
        return -2;
    }
    let view = slot as *mut RingView;
    unsafe {
        view.write(RingView::new(buf, capacity_bytes));
    }
    0
}

#[no_mangle]
pub unsafe extern "C" fn nrc_ring_write(slot: *const u8, data: *const u8, len: usize) -> usize {
    if slot.is_null() {
        return 0;
    }
    (*slot.cast::<RingView>()).write(data, len)
}

#[no_mangle]
pub unsafe extern "C" fn nrc_ring_read(slot: *const u8, out: *mut u8, len: usize) -> usize {
    if slot.is_null() {
        return 0;
    }
    (*slot.cast::<RingView>()).read(out, len)
}

#[no_mangle]
pub unsafe extern "C" fn nrc_ring_occupied(slot: *const u8) -> u64 {
    if slot.is_null() {
        return 0;
    }
    (*slot.cast::<RingView>()).occupied()
}

#[no_mangle]
pub unsafe extern "C" fn nrc_ring_capacity(slot: *const u8) -> usize {
    if slot.is_null() {
        return 0;
    }
    (*slot.cast::<RingView>()).capacity()
}

#[no_mangle]
pub unsafe extern "C" fn nrc_ring_reset(slot: *const u8) {
    if !slot.is_null() {
        (*slot.cast::<RingView>()).reset();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn host_view() -> (Vec<u8>, RingView) {
        let capacity: usize = 256;
        let mut backing = vec![0u8; capacity];
        let view = RingView::new(backing.as_mut_ptr(), capacity);
        (backing, view)
    }

    #[test]
    fn roundtrip() {
        let (backing, view) = host_view();
        let data = b"neonred cable";
        let written = unsafe { view.write(data.as_ptr(), data.len()) };
        assert_eq!(written, data.len());
        let mut out = [0u8; 64];
        let n = unsafe { view.read(out.as_mut_ptr(), out.len()) };
        assert_eq!(n, data.len());
        assert_eq!(&out[..data.len()], data);
        assert_eq!(view.occupied(), 0);
        assert_eq!(backing.len(), 256);
    }

    #[test]
    fn wraps_and_limits() {
        let (_, view) = host_view();
        let first = [0xAAu8; 200];
        let second = [0xBBu8; 200];
        assert_eq!(unsafe { view.write(first.as_ptr(), first.len()) }, 200);
        assert_eq!(unsafe { view.write(second.as_ptr(), second.len()) }, 56);
        assert_eq!(unsafe { view.write(second.as_ptr(), second.len()) }, 0);
        assert!(view.free() == 0);
    }

    #[test]
    fn ffi_init_validates() {
        let mut slot = [0u8; NRC_RING_VIEW_SIZE + 16];
        let mut backing = vec![0u8; 128];
        assert_eq!(nrc_ring_init(slot.as_mut_ptr(), slot.len(), backing.as_mut_ptr(), 128), 0);
        assert_eq!(nrc_ring_init(slot.as_mut_ptr(), 0, backing.as_mut_ptr(), 128), -1);
        assert_eq!(nrc_ring_init(slot.as_mut_ptr(), slot.len(), backing.as_mut_ptr(), 100), -2);
        assert_eq!(nrc_version_major(), 0);
    }
}
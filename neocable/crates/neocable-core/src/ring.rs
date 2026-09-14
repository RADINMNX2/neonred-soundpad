use std::cell::UnsafeCell;
use std::sync::atomic::{AtomicU64, Ordering};

pub struct RingBuffer {
    buf: UnsafeCell<Box<[u8]>>,
    write_pos: AtomicU64,
    read_pos: AtomicU64,
}

unsafe impl Send for RingBuffer {}
unsafe impl Sync for RingBuffer {}

impl RingBuffer {
    pub fn with_capacity(capacity_bytes: usize) -> Option<Self> {
        let cap = capacity_bytes.next_power_of_two();
        if cap == 0 || cap > (1 << 30) {
            return None;
        }
        Some(Self {
            buf: UnsafeCell::new(vec![0u8; cap].into_boxed_slice()),
            write_pos: AtomicU64::new(0),
            read_pos: AtomicU64::new(0),
        })
    }

    pub fn capacity(&self) -> usize {
        unsafe { (&*self.buf.get()).len() }
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
        self.capacity() as u64 - self.occupied()
    }

    pub fn is_empty(&self) -> bool {
        self.occupied() == 0
    }

    pub fn is_full(&self) -> bool {
        self.free() == 0
    }

    pub fn write(&self, data: &[u8]) -> usize {
        let cap = self.capacity() as u64;
        let mask = cap - 1;
        let w = self.write_pos.load(Ordering::Acquire);
        let r = self.read_pos.load(Ordering::Acquire);
        let avail = cap - (w - r);
        if data.is_empty() || avail == 0 {
            return 0;
        }
        let n = (data.len() as u64).min(avail) as usize;
        let wm = (w & mask) as usize;
        let first = n.min(cap as usize - wm);
        let buf = unsafe { &mut *self.buf.get() };
        buf[wm..wm + first].copy_from_slice(&data[..first]);
        if first < n {
            buf[..n - first].copy_from_slice(&data[first..n]);
        }
        self.write_pos.store(w + n as u64, Ordering::Release);
        n
    }

    pub fn read(&self, out: &mut [u8]) -> usize {
        let cap = self.capacity() as u64;
        let mask = cap - 1;
        let w = self.write_pos.load(Ordering::Acquire);
        let r = self.read_pos.load(Ordering::Acquire);
        let occupied = w - r;
        if out.is_empty() || occupied == 0 {
            return 0;
        }
        let n = (out.len() as u64).min(occupied) as usize;
        let rm = (r & mask) as usize;
        let first = n.min(cap as usize - rm);
        let buf = unsafe { &*self.buf.get() };
        out[..first].copy_from_slice(&buf[rm..rm + first]);
        if first < n {
            out[first..n].copy_from_slice(&buf[..n - first]);
        }
        self.read_pos.store(r + n as u64, Ordering::Release);
        n
    }

    pub fn reset(&self) {
        self.write_pos.store(0, Ordering::Release);
        self.read_pos.store(0, Ordering::Release);
    }
}
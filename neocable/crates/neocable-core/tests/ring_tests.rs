use std::sync::{Arc, Barrier};

use neocable_core::format::{AudioFormat, DEFAULT_FORMAT};
use neocable_core::ring::RingBuffer;

#[test]
fn roundtrip_single_chunk() {
    let rb = RingBuffer::with_capacity(1024).unwrap();
    let data = b"neonred cable";
    assert_eq!(rb.write(data), data.len());
    assert_eq!(rb.occupied(), data.len() as u64);
    assert_eq!(rb.free(), 1024 - data.len() as u64);
    let mut out = [0u8; 64];
    assert_eq!(rb.read(&mut out[..data.len()]), data.len());
    assert_eq!(&out[..data.len()], data);
    assert!(rb.is_empty());
}

#[test]
fn wraps_around_power_of_two() {
    let rb = RingBuffer::with_capacity(128).unwrap();
    let first = vec![0xAAu8; 100];
    let second = vec![0xBBu8; 100];
    assert_eq!(rb.write(&first), 100);
    assert_eq!(rb.write(&second), 28);
    let mut out = [0u8; 128];
    assert_eq!(rb.read(&mut out), 128);
    assert_eq!(&out[..100], &first[..]);
    assert_eq!(&out[100..], &second[..28]);
}

#[test]
fn full_buffer_drops_excess() {
    let rb = RingBuffer::with_capacity(64).unwrap();
    let chunk = vec![1u8; 40];
    assert_eq!(rb.write(&chunk), 40);
    assert_eq!(rb.write(&chunk), 24);
    assert_eq!(rb.write(&chunk), 0);
    assert!(rb.is_full());
}

#[test]
fn read_returns_available_only() {
    let rb = RingBuffer::with_capacity(64).unwrap();
    rb.write(&[7u8; 10]);
    let mut out = [0u8; 64];
    assert_eq!(rb.read(&mut out), 10);
}

#[test]
fn empty_read_returns_zero() {
    let rb = RingBuffer::with_capacity(64).unwrap();
    let mut out = [0u8; 16];
    assert_eq!(rb.read(&mut out), 0);
}

#[test]
fn default_format_is_48k_float32_stereo() {
    let f: AudioFormat = DEFAULT_FORMAT;
    assert_eq!(f.frame_bytes(), 8);
    assert_eq!(f.bytes_per_second(), 384_000);
    assert!(f.is_valid_v1());
}

#[test]
fn format_ms_conversion() {
    let f: AudioFormat = DEFAULT_FORMAT;
    assert_eq!(f.ms_to_bytes(10), 3840);
    assert_eq!(f.bytes_to_ms(3840), 10);
    assert_eq!(f.rate.hz(), 48_000);
    assert_eq!(f.depth.bytes(), 4);
}

#[test]
fn spsc_multi_thread_no_loss() {
    let rb = Arc::new(RingBuffer::with_capacity(1 << 16).unwrap());
    let barrier = Arc::new(Barrier::new(2));
    let rb_w = Arc::clone(&rb);
    let bar_w = Arc::clone(&barrier);
    let writer = std::thread::spawn(move || {
        bar_w.wait();
        for i in 0u32..20_000 {
            let mut chunk = [0u8; 256];
            for (j, b) in chunk.iter_mut().enumerate() {
                *b = ((i.wrapping_mul(31).wrapping_add(j as u32)) & 0xFF) as u8;
            }
            loop {
                if rb_w.write(&chunk) == chunk.len() {
                    break;
                }
            }
        }
    });
    let rb_r = Arc::clone(&rb);
    let bar_r = Arc::clone(&barrier);
    let reader = std::thread::spawn(move || {
        bar_r.wait();
        let mut expected = 0u32;
        loop {
            let mut chunk = [0u8; 256];
            let n = rb_r.read(&mut chunk);
            if n == 0 {
                if expected >= 20_000 {
                    break;
                }
                std::thread::yield_now();
                continue;
            }
            assert_eq!(n, chunk.len());
            for (j, b) in chunk.iter().enumerate() {
                let want = ((expected.wrapping_mul(31).wrapping_add(j as u32)) & 0xFF) as u8;
                assert_eq!(*b, want, "mismatch at chunk {} byte {}", expected, j);
            }
            expected += 1;
        }
    });
    writer.join().unwrap();
    reader.join().unwrap();
}
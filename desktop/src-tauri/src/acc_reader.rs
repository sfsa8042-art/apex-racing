use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tracing::{info, warn};

use crate::uploader::{UploadQueue, UploadTask, UploadStatus};

// ── Shared memory map names ───────────────────────────────────────────────────
const PHYSICS_MAP:  &str = "Local\\acpmf_physics";
const GRAPHICS_MAP: &str = "Local\\acpmf_graphics";
const STATIC_MAP:   &str = "Local\\acpmf_static";

// ── SPageFilePhysics byte offsets (ACC SDK) ───────────────────────────────────
const PHY_GAS:       usize = 4;   // f32  throttle 0-1
const PHY_BRAKE:     usize = 8;   // f32  brake 0-1
const PHY_GEAR:      usize = 16;  // i32  -1=R 0=N 1=1st …
const PHY_RPMS:      usize = 20;  // i32  engine RPM
const PHY_STEER:     usize = 24;  // f32  steering angle (radians)
const PHY_SPEED:     usize = 28;  // f32  speed km/h
const PHY_LAT_G:     usize = 44;  // f32  accG[0] lateral
const PHY_LON_G:     usize = 52;  // f32  accG[2] longitudinal
const PHY_SIZE:      usize = 800;

// ── SPageFileGraphics byte offsets (ACC SDK) ──────────────────────────────────
const GFX_STATUS:    usize = 4;   // i32  0=off 1=replay 2=live 3=pause
const GFX_LAPS:      usize = 132; // i32  completedLaps
const GFX_CUR_MS:    usize = 140; // i32  iCurrentTime  (current lap ms)
const GFX_LAST_MS:   usize = 144; // i32  iLastTime     (last lap ms)
const GFX_SIZE:      usize = 1600;

// ── SPageFileStatic byte offsets (ACC SDK) ────────────────────────────────────
const STA_CAR:       usize = 68;  // wchar_t[33]  carModel
const STA_TRACK:     usize = 134; // wchar_t[33]  track
const STA_SIZE:      usize = 800;

const STATUS_LIVE:   i32 = 2;

// ── Telemetry row ─────────────────────────────────────────────────────────────
#[derive(Clone, Serialize)]
struct TRow {
    t:    f32,
    spd:  f32,
    thr:  f32,
    brk:  f32,
    gear: i32,
    rpm:  i32,
    str_: f32,
    latg: f32,
    long: f32,
}

// ── Public event sent to frontend ─────────────────────────────────────────────
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccStatusEvent {
    pub running:   bool,
    pub recording: bool,
    pub lap:       i32,
    pub car:       String,
    pub track:     String,
}

// ── Windows shared memory wrapper ─────────────────────────────────────────────
#[cfg(target_os = "windows")]
mod win {
    use std::ffi::c_void;
    use std::ptr;
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Memory::{
        MapViewOfFile, OpenFileMappingW, UnmapViewOfFile,
        FILE_MAP_READ, MEMORY_MAPPED_VIEW_ADDRESS,
    };

    pub struct Shm {
        handle: *mut c_void,
        view:   *const u8,
        size:   usize,
    }
    unsafe impl Send for Shm {}
    unsafe impl Sync for Shm {}

    impl Shm {
        pub fn open(name: &str, size: usize) -> Option<Self> {
            let wide: Vec<u16> = name.encode_utf16().chain([0]).collect();
            let handle = unsafe { OpenFileMappingW(FILE_MAP_READ, 0, wide.as_ptr()) };
            if handle.is_null() { return None; }
            let mapped = unsafe { MapViewOfFile(handle, FILE_MAP_READ, 0, 0, size) };
            if mapped.Value.is_null() {
                unsafe { CloseHandle(handle); }
                return None;
            }
            Some(Self { handle, view: mapped.Value as *const u8, size })
        }

        pub fn i32_at(&self, off: usize) -> i32 {
            if off + 4 > self.size { return 0; }
            let mut b = [0u8; 4];
            unsafe { ptr::copy_nonoverlapping(self.view.add(off), b.as_mut_ptr(), 4); }
            i32::from_le_bytes(b)
        }

        pub fn f32_at(&self, off: usize) -> f32 {
            if off + 4 > self.size { return 0.0; }
            let mut b = [0u8; 4];
            unsafe { ptr::copy_nonoverlapping(self.view.add(off), b.as_mut_ptr(), 4); }
            f32::from_le_bytes(b)
        }

        pub fn utf16_at(&self, off: usize, max: usize) -> String {
            if off + max * 2 > self.size { return String::new(); }
            let mut v: Vec<u16> = Vec::with_capacity(max);
            for i in 0..max {
                let mut b = [0u8; 2];
                unsafe { ptr::copy_nonoverlapping(self.view.add(off + i * 2), b.as_mut_ptr(), 2); }
                let c = u16::from_le_bytes(b);
                if c == 0 { break; }
                v.push(c);
            }
            String::from_utf16_lossy(&v).to_string()
        }
    }

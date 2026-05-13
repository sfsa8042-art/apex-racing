//! ACC Shared Memory Telemetry Reader
//! Reads live data from Assetto Corsa Competizione via Windows shared memory.
//! No external tools required.

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

// ── SPageFilePhysics offsets (ACC SDK, all values little-endian) ──────────────
const PHY_GAS:      usize = 4;   // f32  throttle 0.0–1.0
const PHY_BRAKE:    usize = 8;   // f32  brake    0.0–1.0
const PHY_GEAR:     usize = 16;  // i32  -1=R 0=N 1=1st…
const PHY_RPMS:     usize = 20;  // i32  engine rpm
const PHY_STEER:    usize = 24;  // f32  steer angle (radians)
const PHY_SPEED:    usize = 28;  // f32  speed km/h
const PHY_LAT_G:    usize = 44;  // f32  accG[0] lateral
const PHY_LON_G:    usize = 52;  // f32  accG[2] longitudinal
const PHY_SIZE:     usize = 800;

// ── SPageFileGraphics offsets ─────────────────────────────────────────────────
const GFX_STATUS:   usize = 4;   // i32  0=off 1=replay 2=live 3=pause
const GFX_LAPS:     usize = 132; // i32  completedLaps
const GFX_CUR_MS:   usize = 140; // i32  iCurrentTime  ms into current lap
const GFX_LAST_MS:  usize = 144; // i32  iLastTime     last completed lap ms
const GFX_SIZE:     usize = 1600;

// ── SPageFileStatic offsets ───────────────────────────────────────────────────
const STA_CAR:      usize = 68;  // wchar_t[33] carModel
const STA_TRACK:    usize = 134; // wchar_t[33] track
const STA_SIZE:     usize = 800;

const STATUS_LIVE:  i32 = 2;

// ── One telemetry sample ──────────────────────────────────────────────────────
struct Sample {
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

// ── Frontend event ────────────────────────────────────────────────────────────
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccStatusEvent {
    pub running:   bool,
    pub recording: bool,
    pub lap:       i32,
    pub car:       String,
    pub track:     String,
}

// ── Windows shared-memory wrapper ─────────────────────────────────────────────
#[cfg(target_os = "windows")]
mod shm {
    use std::ffi::c_void;
    use std::ptr;
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Memory::{
        MapViewOfFile, OpenFileMappingW, UnmapViewOfFile,
        FILE_MAP_READ, MEMORY_MAPPED_VIEW_ADDRESS,
    };

    pub struct Map {
        handle: *mut c_void,
        view:   *const u8,
        size:   usize,
    }
    unsafe impl Send for Map {}
    unsafe impl Sync for Map {}

    impl Map {
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

        #[inline]
        pub fn i32_at(&self, off: usize) -> i32 {
            if off + 4 > self.size { return 0; }
            let mut b = [0u8; 4];
            unsafe { ptr::copy_nonoverlapping(self.view.add(off), b.as_mut_ptr(), 4) }
            i32::from_le_bytes(b)
        }

        #[inline]
        pub fn f32_at(&self, off: usize) -> f32 {
            if off + 4 > self.size { return 0.0; }
            let mut b = [0u8; 4];
            unsafe { ptr::copy_nonoverlapping(self.view.add(off), b.as_mut_ptr(), 4) }
            f32::from_le_bytes(b)
        }

        pub fn str_at(&self, off: usize, max: usize) -> String {
            if off + max * 2 > self.size { return String::new(); }
            let mut v: Vec<u16> = Vec::with_capacity(max);
            for i in 0..max {
                let mut b = [0u8; 2];
                unsafe { ptr::copy_nonoverlapping(self.view.add(off + i * 2), b.as_mut_ptr(), 2) }
                let c = u16::from_le_bytes(b);
                if c == 0 { break; }
                v.push(c);
            }
            String::from_utf16_lossy(&v).to_string()
        }
    }

    impl Drop for Map {
        fn drop(&mut self) {
            unsafe {
                UnmapViewOfFile(MEMORY_MAPPED_VIEW_ADDRESS { Value: self.view as *mut _ });
                CloseHandle(self.handle);
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod shm {
    pub struct Map;
    impl Map {
        pub fn open(_: &str, _: usize) -> Option<Self> { None }
        pub fn i32_at(&self, _: usize) -> i32   { 0 }
        pub fn f32_at(&self, _: usize) -> f32   { 0.0 }
        pub fn str_at(&self, _: usize, _: usize) -> String { String::new() }
    }
}

// ── Public entry ──────────────────────────────────────────────────────────────
pub struct AccHandle;

pub fn start_acc_reader(queue: Arc<UploadQueue>, app: AppHandle) -> AccHandle {
    tokio::spawn(main_loop(queue, app));
    AccHandle
}

// ── Main polling loop ─────────────────────────────────────────────────────────
async fn main_loop(queue: Arc<UploadQueue>, app: AppHandle) {
    info!("ACC reader started — polling at 25 Hz");

    let mut prev_laps: i32     = -1;
    let mut recording          = false;
    let mut samples: Vec<Sample> = Vec::with_capacity(4000);
    let mut elapsed: f32       = 0.0;
    let mut prev_lap_ms: i32   = 0;
    let mut car                = String::new();
    let mut track              = String::new();
    let mut idle_ticks: u32    = 0;

    loop {
        tokio::time::sleep(Duration::from_millis(40)).await; // 25 Hz

        // ── Open shared memory ────────────────────────────────────────────────
        let Some(phy) = shm::Map::open(PHYSICS_MAP, PHY_SIZE) else {
            // ACC not running
            if recording {
                recording = false;
                emit(&app, false, false, prev_laps, &car, &track);
            }
            car.clear(); track.clear(); // reset on disconnect
            tokio::time::sleep(Duration::from_secs(3)).await;
            continue;
        };
        let Some(gfx) = shm::Map::open(GRAPHICS_MAP, GFX_SIZE) else {
            tokio::time::sleep(Duration::from_secs(1)).await;
            continue;
        };

        let status    = gfx.i32_at(GFX_STATUS);
        let laps_done = gfx.i32_at(GFX_LAPS);
        let last_ms   = gfx.i32_at(GFX_LAST_MS);

        // ── Read car/track once ───────────────────────────────────────────────
        if car.is_empty() {
            if let Some(sta) = shm::Map::open(STATIC_MAP, STA_SIZE) {
                car   = sta.str_at(STA_CAR,   33);
                track = sta.str_at(STA_TRACK, 33);
                info!("ACC connected: [{}] @ [{}]", car, track);
            }
        }

        // ── Not in a live session ─────────────────────────────────────────────
        if status != STATUS_LIVE {
            if recording {
                // Save partial data if session ended abruptly
                if samples.len() > 50 {
                    flush(&samples, &car, &track, prev_lap_ms, &queue, &app).await;
                }
                samples.clear();
                recording = false;
                elapsed   = 0.0;
            }
            // Emit "connected but not live" every ~2.5 s
            idle_ticks += 1;
            if idle_ticks % 62 == 0 {
                emit(&app, true, false, prev_laps, &car, &track);
            }
            continue;
        }

        idle_ticks = 0;

        // ── Lap completed ─────────────────────────────────────────────────────
        if laps_done > prev_laps && prev_laps >= 0 {
            info!("ACC lap {} done | {}ms | {} samples", laps_done, last_ms, samples.len());
            if samples.len() > 50 {
                flush(&samples, &car, &track, last_ms, &queue, &app).await;
            }
            samples.clear();
            elapsed     = 0.0;
            prev_lap_ms = last_ms;
        }

        prev_laps = laps_done;
        recording = true;
        elapsed  += 0.04;

        // ── Record sample ─────────────────────────────────────────────────────
        samples.push(Sample {
            t:    elapsed,
            spd:  phy.f32_at(PHY_SPEED),
            thr:  phy.f32_at(PHY_GAS)   * 100.0,
            brk:  phy.f32_at(PHY_BRAKE) * 100.0,
            gear: phy.i32_at(PHY_GEAR),
            rpm:  phy.i32_at(PHY_RPMS),
            str_: phy.f32_at(PHY_STEER).to_degrees(),
            latg: phy.f32_at(PHY_LAT_G),
            long: phy.f32_at(PHY_LON_G),
        });

        // Emit live status every ~2 s
        if samples.len() % 50 == 0 {
            emit(&app, true, true, laps_done, &car, &track);
        }
    }
}

// ── Build CSV and enqueue upload ──────────────────────────────────────────────
async fn flush(
    samples: &[Sample],
    car:     &str,
    track:   &str,
    lap_ms:  i32,
    queue:   &Arc<UploadQueue>,
    app:     &AppHandle,
) {
    let s   = lap_ms as f32 / 1000.0;
    let tag = format!("{:02}m{:06.3}s", (s / 60.0) as u32, s % 60.0);

    // Build CSV
    let mut csv = String::with_capacity(samples.len() * 60);
    csv.push_str("time,speed,throttle,brake,gear,rpm,steerAngle,lateralG,longitudinalG\n");
    for p in samples {
        csv.push_str(&format!(
            "{:.3},{:.1},{:.1},{:.1},{},{},{:.2},{:.4},{:.4}\n",
            p.t, p.spd, p.thr, p.brk, p.gear, p.rpm, p.str_, p.latg, p.long,
        ));
    }

    // Sanitize names for filename
    let car_s   = slug(car);
    let track_s = slug(track);
    let ts      = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let name    = format!("acc_{track_s}_{car_s}_{ts}_{tag}.csv");
    let path    = std::env::temp_dir().join(&name);

    if let Err(e) = std::fs::write(&path, csv.as_bytes()) {
        warn!("ACC: failed to write CSV '{}': {}", name, e);
        return;
    }

    info!("ACC: saved {} ({} samples, {})", name, samples.len(), tag);

    queue.enqueue(UploadTask {
        id:        uuid::Uuid::new_v4().to_string(),
        path,
        filename:  name,
        size:      csv.len() as u64,
        attempts:  0,
        status:    UploadStatus::Pending,
        error:     None,
        queued_at: chrono::Utc::now(),
    }).await;

    let _ = app.emit("upload-complete", ());
}

fn emit(app: &AppHandle, running: bool, recording: bool, lap: i32, car: &str, track: &str) {
    let _ = app.emit("acc-status", AccStatusEvent {
        running, recording, lap, car: car.to_string(), track: track.to_string(),
    });
}

fn slug(s: &str) -> String {
    s.chars().map(|c| if c.is_alphanumeric() { c.to_lowercase().next().unwrap() } else { '_' }).collect()
}

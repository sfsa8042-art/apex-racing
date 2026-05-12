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

    impl Drop for Shm {
        fn drop(&mut self) {
            unsafe {
                UnmapViewOfFile(MEMORY_MAPPED_VIEW_ADDRESS { Value: self.view as *mut _ });
                CloseHandle(self.handle);
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod win {
    pub struct Shm;
    impl Shm {
        pub fn open(_: &str, _: usize) -> Option<Self> { None }
        pub fn i32_at(&self, _: usize) -> i32 { 0 }
        pub fn f32_at(&self, _: usize) -> f32 { 0.0 }
        pub fn utf16_at(&self, _: usize, _: usize) -> String { String::new() }
    }
}

// ── Public entry point ────────────────────────────────────────────────────────
pub struct AccHandle;

pub fn start_acc_reader(queue: Arc<UploadQueue>, app: AppHandle) -> AccHandle {
    tokio::spawn(reader_loop(queue, app));
    AccHandle
}

// ── Main loop (runs in background Tokio task) ─────────────────────────────────
async fn reader_loop(queue: Arc<UploadQueue>, app: AppHandle) {
    info!("ACC reader started — polling shared memory");

    let mut prev_laps: i32       = -1;
    let mut recording            = false;
    let mut rows: Vec<TRow>      = Vec::new();
    let mut elapsed:  f32        = 0.0;
    let mut last_lap_ms: i32     = 0;
    let mut car   = String::new();
    let mut track = String::new();

    loop {
        tokio::time::sleep(Duration::from_millis(40)).await; // 25 Hz

        // ── Connect to ACC ────────────────────────────────────────────────────
        let Some(phy) = win::Shm::open(PHYSICS_MAP, PHY_SIZE) else {
            if recording {
                recording = false;
                emit_status(&app, false, false, prev_laps, &car, &track);
            }
            // Not running — wait longer before retrying
            tokio::time::sleep(Duration::from_secs(3)).await;
            continue;
        };
        let Some(gfx) = win::Shm::open(GRAPHICS_MAP, GFX_SIZE) else {
            tokio::time::sleep(Duration::from_secs(1)).await;
            continue;
        };

        let status    = gfx.i32_at(GFX_STATUS);
        let laps_done = gfx.i32_at(GFX_LAPS);
        let last_t_ms = gfx.i32_at(GFX_LAST_MS);

        // ── Read car/track name once ──────────────────────────────────────────
        if car.is_empty() {
            if let Some(sta) = win::Shm::open(STATIC_MAP, STA_SIZE) {
                car   = sta.utf16_at(STA_CAR,   33);
                track = sta.utf16_at(STA_TRACK, 33);
                info!("ACC connected: {} @ {}", car, track);
            }
        }

        // ── Not in a live session ─────────────────────────────────────────────
        if status != STATUS_LIVE {
            if recording && rows.len() > 50 {
                flush(&rows, &car, &track, last_lap_ms, &queue, &app).await;
            }
            rows.clear();
            recording = false;
            prev_laps = laps_done;
            elapsed   = 0.0;
            continue;
        }

        // ── Lap completed ─────────────────────────────────────────────────────
        if laps_done > prev_laps && prev_laps >= 0 {
            info!("ACC lap {} done — {}ms — {} samples", laps_done, last_t_ms, rows.len());
            if rows.len() > 50 {
                flush(&rows, &car, &track, last_t_ms, &queue, &app).await;
            }
            rows.clear();
            elapsed     = 0.0;
            last_lap_ms = last_t_ms;
        }

        prev_laps = laps_done;
        recording = true;
        elapsed  += 0.04;

        // ── Sample physics ────────────────────────────────────────────────────
        rows.push(TRow {
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

        // Emit UI status every ~2 s
        if rows.len() % 50 == 0 {
            emit_status(&app, true, true, laps_done, &car, &track);
        }
    }
}

// ── Write CSV and enqueue upload ──────────────────────────────────────────────
async fn flush(
    rows:   &[TRow],
    car:    &str,
    track:  &str,
    lap_ms: i32,
    queue:  &Arc<UploadQueue>,
    app:    &AppHandle,
) {
    let s       = lap_ms as f32 / 1000.0;
    let lap_tag = format!("{:02}m{:06.3}s", (s / 60.0) as u32, s % 60.0);

    let mut csv = String::from(
        "time,speed,throttle,brake,gear,rpm,steerAngle,lateralG,longitudinalG\n"
    );
    for r in rows {
        csv.push_str(&format!(
            "{:.3},{:.1},{:.1},{:.1},{},{},{:.2},{:.4},{:.4}\n",
            r.t, r.spd, r.thr, r.brk, r.gear, r.rpm, r.str_, r.latg, r.long,
        ));
    }

    let ts   = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let c    = sanitize(car);
    let tr   = sanitize(track);
    let name = format!("acc_{tr}_{c}_{ts}_{lap_tag}.csv");
    let path = std::env::temp_dir().join(&name);

    if let Err(e) = std::fs::write(&path, csv.as_bytes()) {
        warn!("ACC: failed to write CSV: {e}");
        return;
    }
    info!("ACC: saved {} ({} rows, {})", name, rows.len(), lap_tag);

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

fn emit_status(app: &AppHandle, running: bool, recording: bool, lap: i32, car: &str, track: &str) {
    let _ = app.emit("acc-status", AccStatusEvent {
        running, recording, lap,
        car: car.to_string(), track: track.to_string(),
    });
}

fn sanitize(s: &str) -> String {
    s.chars()
     .map(|c| if c.is_alphanumeric() { c } else { '_' })
     .collect::<String>()
     .to_lowercase()
}

use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tracing::{debug, info, warn};

use crate::uploader::{UploadQueue, UploadTask, UploadStatus};

const PHYSICS_MAP:  &str = "Local\\acpmf_physics";
const GRAPHICS_MAP: &str = "Local\\acpmf_graphics";
const STATIC_MAP:   &str = "Local\\acpmf_static";

const PHY_GAS:        usize = 4;
const PHY_BRAKE:      usize = 8;
const PHY_GEAR:       usize = 16;
const PHY_RPMS:       usize = 20;
const PHY_STEER:      usize = 24;
const PHY_SPEED:      usize = 28;
const PHY_ACCEL_LAT:  usize = 44;
const PHY_ACCEL_LON:  usize = 52;
const PHY_SIZE:       usize = 800;

const GFX_STATUS:     usize = 4;
const GFX_LAPS:       usize = 136;
const GFX_CUR_LAP_MS: usize = 144;
const GFX_LAST_LAP:   usize = 148;
const GFX_SIZE:       usize = 1600;

const STA_CAR:        usize = 4;
const STA_TRACK:      usize = 70;
const STA_SIZE:       usize = 800;

const STATUS_LIVE: i32 = 2;

#[derive(Clone, Serialize)]
struct TRow {
    time_s:   f32,
    speed:    f32,
    throttle: f32,
    brake:    f32,
    gear:     i32,
    rpm:      i32,
    steer:    f32,
    lat_g:    f32,
    lon_g:    f32,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccStatusEvent {
    pub running:   bool,
    pub recording: bool,
    pub lap:       i32,
    pub car:       String,
    pub track:     String,
}

#[cfg(target_os = "windows")]
mod win {
    use std::ptr;
    use windows_sys::Win32::System::Memory::{
        OpenFileMappingW, MapViewOfFile, UnmapViewOfFile, FILE_MAP_READ,
    };
    use windows_sys::Win32::Foundation::CloseHandle;

    pub struct SharedMemory {
        handle: isize,
        view:   *const u8,
        size:   usize,
    }

    unsafe impl Send for SharedMemory {}
    unsafe impl Sync for SharedMemory {}

    impl SharedMemory {
        pub fn open(name: &str, size: usize) -> Option<Self> {
            let wide: Vec<u16> = name.encode_utf16().chain([0]).collect();
            let handle = unsafe { OpenFileMappingW(FILE_MAP_READ, 0, wide.as_ptr()) };
            if handle == 0 { return None; }
            let view = unsafe { MapViewOfFile(handle, FILE_MAP_READ, 0, 0, size) };
            if view.is_null() {
                unsafe { CloseHandle(handle); }
                return None;
            }
            Some(Self { handle, view: view as *const u8, size })
        }

        pub fn read_i32(&self, offset: usize) -> i32 {
            if offset + 4 > self.size { return 0; }
            let mut buf = [0u8; 4];
            unsafe { ptr::copy_nonoverlapping(self.view.add(offset), buf.as_mut_ptr(), 4); }
            i32::from_le_bytes(buf)
        }

        pub fn read_f32(&self, offset: usize) -> f32 {
            if offset + 4 > self.size { return 0.0; }
            let mut buf = [0u8; 4];
            unsafe { ptr::copy_nonoverlapping(self.view.add(offset), buf.as_mut_ptr(), 4); }
            f32::from_le_bytes(buf)
        }

        pub fn read_utf16(&self, offset: usize, max_chars: usize) -> String {
            if offset + max_chars * 2 > self.size { return String::new(); }
            let mut chars: Vec<u16> = Vec::with_capacity(max_chars);
            for i in 0..max_chars {
                let mut buf = [0u8; 2];
                unsafe {
                    ptr::copy_nonoverlapping(
                        self.view.add(offset + i * 2), buf.as_mut_ptr(), 2
                    );
                }
                let c = u16::from_le_bytes(buf);
                if c == 0 { break; }
                chars.push(c);
            }
            String::from_utf16_lossy(&chars).to_string()
        }
    }

    impl Drop for SharedMemory {
        fn drop(&mut self) {
            unsafe {
                UnmapViewOfFile(self.view as *const _);
                CloseHandle(self.handle);
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod win {
    pub struct SharedMemory;
    impl SharedMemory {
        pub fn open(_name: &str, _size: usize) -> Option<Self> { None }
        pub fn read_i32(&self, _offset: usize) -> i32 { 0 }
        pub fn read_f32(&self, _offset: usize) -> f32 { 0.0 }
        pub fn read_utf16(&self, _offset: usize, _max: usize) -> String { String::new() }
    }
}

pub struct AccHandle;

pub fn start_acc_reader(queue: Arc<UploadQueue>, app: AppHandle) -> AccHandle {
    tokio::spawn(acc_loop(queue, app));
    AccHandle
}

async fn acc_loop(queue: Arc<UploadQueue>, app: AppHandle) {
    info!("ACC reader started");

    let mut last_laps:  i32 = -1;
    let mut recording        = false;
    let mut rows: Vec<TRow>  = Vec::new();
    let mut elapsed_s:  f32 = 0.0;
    let mut last_lap_ms: i32 = 0;
    let mut car   = String::new();
    let mut track = String::new();

    loop {
        tokio::time::sleep(Duration::from_millis(40)).await;

        let Some(phy) = win::SharedMemory::open(PHYSICS_MAP, PHY_SIZE) else {
            if recording {
                recording = false;
                let _ = app.emit("acc-status", AccStatusEvent {
                    running: false, recording: false, lap: last_laps,
                    car: car.clone(), track: track.clone(),
                });
            }
            tokio::time::sleep(Duration::from_secs(3)).await;
            continue;
        };

        let Some(gfx) = win::SharedMemory::open(GRAPHICS_MAP, GFX_SIZE) else {
            tokio::time::sleep(Duration::from_secs(1)).await;
            continue;
        };

        let status    = gfx.read_i32(GFX_STATUS);
        let laps_done = gfx.read_i32(GFX_LAPS);
        let last_t_ms = gfx.read_i32(GFX_LAST_LAP);

        if car.is_empty() {
            if let Some(sta) = win::SharedMemory::open(STATIC_MAP, STA_SIZE) {
                car   = sta.read_utf16(STA_CAR,   33);
                track = sta.read_utf16(STA_TRACK, 33);
                info!("ACC: {} @ {}", car, track);
            }
        }

        if status != STATUS_LIVE {
            if recording && !rows.is_empty() {
                save_and_upload(&rows, &car, &track, last_lap_ms, &queue, &app).await;
                rows.clear();
            }
            recording  = false;
            last_laps  = laps_done;
            elapsed_s  = 0.0;
            continue;
        }

        if laps_done > last_laps && last_laps >= 0 {
            info!("ACC lap {} done ({} ms)", laps_done, last_t_ms);
            if rows.len() > 50 {
                save_and_upload(&rows, &car, &track, last_t_ms, &queue, &app).await;
            }
            rows.clear();
            elapsed_s   = 0.0;
            last_lap_ms = last_t_ms;
        }

        last_laps  = laps_done;
        recording  = true;
        elapsed_s += 0.04;

        rows.push(TRow {
            time_s:   elapsed_s,
            speed:    phy.read_f32(PHY_SPEED),
            throttle: phy.read_f32(PHY_GAS) * 100.0,
            brake:    phy.read_f32(PHY_BRAKE) * 100.0,
            gear:     phy.read_i32(PHY_GEAR) - 1,
            rpm:      phy.read_i32(PHY_RPMS),
            steer:    phy.read_f32(PHY_STEER).to_degrees(),
            lat_g:    phy.read_f32(PHY_ACCEL_LAT),
            lon_g:    phy.read_f32(PHY_ACCEL_LON),
        });

        if rows.len() % 50 == 0 {
            let _ = app.emit("acc-status", AccStatusEvent {
                running: true, recording, lap: laps_done,
                car: car.clone(), track: track.clone(),
            });
        }
    }
}

async fn save_and_upload(
    rows:   &[TRow],
    car:    &str,
    track:  &str,
    lap_ms: i32,
    queue:  &Arc<UploadQueue>,
    app:    &AppHandle,
) {
    let lap_s   = lap_ms as f32 / 1000.0;
    let mm      = (lap_s / 60.0) as u32;
    let ss      = lap_s % 60.0;
    let lap_str = format!("{mm}:{ss:06.3}");

    let mut csv = String::from(
        "time,speed,throttle,brake,gear,rpm,steerAngle,lateralG,longitudinalG\n"
    );
    for r in rows {
        csv.push_str(&format!(
            "{:.3},{:.1},{:.1},{:.1},{},{},{:.2},{:.3},{:.3}\n",
            r.time_s, r.speed, r.throttle, r.brake,
            r.gear, r.rpm, r.steer, r.lat_g, r.lon_g,
        ));
    }

    let ts         = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let car_slug   = car.replace(' ', "_").to_lowercase();
    let track_slug = track.replace(' ', "_").to_lowercase();
    let filename   = format!("acc_{track_slug}_{car_slug}_{ts}_{lap_str}.csv");
    let path       = std::env::temp_dir().join(&filename);

    if let Err(e) = std::fs::write(&path, csv.as_bytes()) {
        warn!("Failed to write ACC CSV: {e}");
        return;
    }

    info!("ACC lap saved: {} ({} samples)", filename, rows.len());

    queue.enqueue(UploadTask {
        id:        uuid::Uuid::new_v4().to_string(),
        path,
        filename,
        size:      csv.len() as u64,
        attempts:  0,
        status:    UploadStatus::Pending,
        error:     None,
        queued_at: chrono::Utc::now(),
    }).await;

    let _ = app.emit("upload-complete", ());
}

//! ACC Shared Memory Telemetry Reader (v2 — full-channel, 50 Hz)
//! Reads live data from Assetto Corsa Competizione via Windows shared memory.
//! No external tools required.
//!
//! v2 improvements:
//!  • 50 Hz capture (was 25 Hz) with packetId de-duplication
//!  • Wall-clock timing via Instant (jitter-proof) instead of fixed increment
//!  • lapDist integrated from speed + normalizedCarPosition emitted (drift-free fraction)
//!  • Full physics channel set: per-wheel tyre temps / pressures / brake temps /
//!    slip / suspension travel, vertical-G, clutch, TC, ABS, turbo, fuel, air/road temp
//!  • In-pit laps detected and skipped (no garbage laps)
//!  • CSV is backward-compatible: original 9 columns first, new channels appended

use std::sync::Arc;
use std::time::{Duration, Instant};
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tracing::{info, warn};
use crate::uploader::{UploadQueue, UploadTask, UploadStatus};

// ── Shared memory map names ───────────────────────────────────────────────────
const PHYSICS_MAP:  &str = "Local\\acpmf_physics";
const GRAPHICS_MAP: &str = "Local\\acpmf_graphics";
const STATIC_MAP:   &str = "Local\\acpmf_static";

// ── SPageFilePhysics offsets (ACC SDK, little-endian) ─────────────────────────
const PHY_PACKET:    usize = 0;    // i32  packetId (changes each physics frame)
const PHY_GAS:       usize = 4;    // f32  throttle 0.0–1.0
const PHY_BRAKE:     usize = 8;    // f32  brake    0.0–1.0
const PHY_FUEL:      usize = 12;   // f32  fuel (liters)
const PHY_GEAR:      usize = 16;   // i32  -1=R 0=N 1=1st…
const PHY_RPMS:      usize = 20;   // i32  engine rpm
const PHY_STEER:     usize = 24;   // f32  steer angle (radians)
const PHY_SPEED:     usize = 28;   // f32  speed km/h
const PHY_LAT_G:     usize = 44;   // f32  accG[0] lateral
const PHY_VERT_G:    usize = 48;   // f32  accG[1] vertical
const PHY_LON_G:     usize = 52;   // f32  accG[2] longitudinal
const PHY_WHEELSLIP: usize = 56;   // f32[4] wheel slip (FL,FR,RL,RR)
const PHY_PRESSURE:  usize = 88;   // f32[4] tyre pressure (psi)
const PHY_TYRETEMP:  usize = 152;  // f32[4] tyre core temperature (°C)
const PHY_SUSP:      usize = 184;  // f32[4] suspension travel (m)
const PHY_TC:        usize = 204;  // f32  traction-control activity
const PHY_ABS:       usize = 252;  // f32  abs activity
const PHY_TURBO:     usize = 276;  // f32  turbo boost
const PHY_AIRT:      usize = 288;  // f32  air temp (°C)
const PHY_ROADT:     usize = 292;  // f32  road temp (°C)
const PHY_BRAKETEMP: usize = 348;  // f32[4] brake disc temperature (°C)
const PHY_CLUTCH:    usize = 364;  // f32  clutch 0.0–1.0
const PHY_SIZE:      usize = 1024;

// ── SPageFileGraphics offsets ─────────────────────────────────────────────────
const GFX_STATUS:   usize = 4;    // i32  0=off 1=replay 2=live 3=pause
const GFX_LAPS:     usize = 132;  // i32  completedLaps
const GFX_CUR_MS:   usize = 140;  // i32  iCurrentTime  ms into current lap
const GFX_LAST_MS:  usize = 144;  // i32  iLastTime     last completed lap ms
const GFX_IN_PIT:   usize = 160;  // i32  isInPit
const GFX_SECTOR:   usize = 164;  // i32  currentSectorIndex
const GFX_NORMPOS:  usize = 246;  // f32  normalizedCarPosition 0.0–1.0
const GFX_SIZE:     usize = 1600;

// ── SPageFileStatic offsets ───────────────────────────────────────────────────
const STA_CAR:      usize = 68;   // wchar_t[33] carModel
const STA_TRACK:    usize = 134;  // wchar_t[33] track
const STA_SIZE:     usize = 800;

const STATUS_LIVE:  i32 = 2;
const POLL_MS:      u64 = 20;     // 50 Hz
const POLL_DT:      f32 = 0.020;

// ── One telemetry sample (full channel set) ───────────────────────────────────
struct Sample {
    t:       f32,
    dist:    f32,
    normpos: f32,
    spd:     f32,
    thr:     f32,
    brk:     f32,
    gear:    i32,
    rpm:     i32,
    str_:    f32,
    latg:    f32,
    long:    f32,
    vertg:   f32,
    clutch:  f32,
    tc:      f32,
    abs:     f32,
    turbo:   f32,
    fuel:    f32,
    airt:    f32,
    roadt:   f32,
    ttemp:   [f32; 4],
    tpress:  [f32; 4],
    btemp:   [f32; 4],
    wslip:   [f32; 4],
    susp:    [f32; 4],
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

        #[inline]
        pub fn f32x4_at(&self, off: usize) -> [f32; 4] {
            [self.f32_at(off), self.f32_at(off + 4), self.f32_at(off + 8), self.f32_at(off + 12)]
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
        pub fn f32x4_at(&self, _: usize) -> [f32; 4] { [0.0; 4] }
        pub fn str_at(&self, _: usize, _: usize) -> String { String::new() }
    }
}

// ── Public entry ──────────────────────────────────────────────────────────────
pub struct AccHandle;

pub fn start_acc_reader(queue: Arc<UploadQueue>, app: AppHandle) -> AccHandle {
    tauri::async_runtime::spawn(main_loop(queue, app));
    AccHandle
}

// ── Main polling loop ─────────────────────────────────────────────────────────
async fn main_loop(queue: Arc<UploadQueue>, app: AppHandle) {
    info!("ACC reader v2 started — polling at 50 Hz, full channel set");

    let mut prev_laps:   i32          = -1;
    let mut recording                 = false;
    let mut samples:     Vec<Sample>  = Vec::with_capacity(8000);
    let mut elapsed:     f32          = 0.0;
    let mut lap_dist:    f32          = 0.0;
    let mut lap_had_pit: bool         = false;
    let mut prev_lap_ms: i32          = 0;
    let mut prev_packet: i32          = i32::MIN;
    let mut car                       = String::new();
    let mut track                     = String::new();
    let mut idle_ticks:  u32          = 0;
    let mut last_tick                 = Instant::now();

    loop {
        tokio::time::sleep(Duration::from_millis(POLL_MS)).await; // 50 Hz

        let now = Instant::now();
        let dt  = {
            let d = (now - last_tick).as_secs_f32();
            last_tick = now;
            // clamp dt to avoid huge jumps after a stall / resume
            d.clamp(0.0, 0.25)
        };

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
        let in_pit    = gfx.i32_at(GFX_IN_PIT) != 0;
        let norm_pos  = gfx.f32_at(GFX_NORMPOS);

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
                if samples.len() > 100 && !lap_had_pit {
                    flush_with_offset(&samples, 0.0, &car, &track, prev_lap_ms, &queue, &app).await;
                }
                samples.clear();
                recording   = false;
                elapsed     = 0.0;
                lap_dist    = 0.0;
                lap_had_pit = false;
            }
            idle_ticks += 1;
            if idle_ticks % 100 == 0 {
                emit(&app, true, false, prev_laps, &car, &track);
            }
            continue;
        }

        idle_ticks = 0;

        // ── Lap completed ─────────────────────────────────────────────────────
        if laps_done > prev_laps && prev_laps >= 0 {
            info!("ACC lap {} done | {}ms | {} samples | pit={}", laps_done, last_ms, samples.len(), lap_had_pit);

            // 50 Hz → 90 s lap = 4500 samples
            let min_samples_absolute = 4500usize;
            let expected = if last_ms > 0 { (last_ms as f32 / 20.0) as usize } else { 0 };
            let enough = if expected > 0 {
                samples.len() >= expected * 7 / 10
            } else {
                samples.len() >= min_samples_absolute
            };

            if enough && !lap_had_pit {
                let acc_lap_s  = last_ms as f32 / 1000.0;
                let rec_lap_s  = samples.last().map(|s| s.t).unwrap_or(0.0);
                let time_offset = if acc_lap_s > 0.0 && rec_lap_s > 0.0 { acc_lap_s - rec_lap_s } else { 0.0 };
                flush_with_offset(&samples, time_offset, &car, &track, last_ms, &queue, &app).await;
                info!("ACC: lap saved ({} samples, ~{} expected, offset {:.2}s)", samples.len(), expected, time_offset);
            } else if lap_had_pit {
                info!("ACC: skipping in-pit lap ({} samples)", samples.len());
            } else {
                info!("ACC: skipping partial lap ({} samples, need {})",
                    samples.len(), if expected > 0 { expected * 7 / 10 } else { min_samples_absolute });
            }

            samples.clear();
            elapsed     = 0.0;
            lap_dist    = 0.0;
            lap_had_pit = false;
            prev_lap_ms = last_ms;
        }

        prev_laps = laps_done;
        recording = true;

        // ── In pit: flag lap invalid, don't record garbage ────────────────────
        if in_pit {
            lap_had_pit = true;
        } else {
            // ── De-duplicate by physics packetId ──────────────────────────────
            let packet = phy.i32_at(PHY_PACKET);
            if packet != prev_packet {
                prev_packet = packet;

                let spd = phy.f32_at(PHY_SPEED);
                elapsed  += dt;
                lap_dist += (spd / 3.6) * dt;   // km/h → m/s × dt = metres

                samples.push(Sample {
                    t:       elapsed,
                    dist:    lap_dist,
                    normpos: norm_pos,
                    spd,
                    thr:     phy.f32_at(PHY_GAS)   * 100.0,
                    brk:     phy.f32_at(PHY_BRAKE) * 100.0,
                    gear:    phy.i32_at(PHY_GEAR),
                    rpm:     phy.i32_at(PHY_RPMS),
                    str_:    phy.f32_at(PHY_STEER).to_degrees(),
                    latg:    phy.f32_at(PHY_LAT_G),
                    long:    phy.f32_at(PHY_LON_G),
                    vertg:   phy.f32_at(PHY_VERT_G),
                    clutch:  phy.f32_at(PHY_CLUTCH) * 100.0,
                    tc:      phy.f32_at(PHY_TC),
                    abs:     phy.f32_at(PHY_ABS),
                    turbo:   phy.f32_at(PHY_TURBO),
                    fuel:    phy.f32_at(PHY_FUEL),
                    airt:    phy.f32_at(PHY_AIRT),
                    roadt:   phy.f32_at(PHY_ROADT),
                    ttemp:   phy.f32x4_at(PHY_TYRETEMP),
                    tpress:  phy.f32x4_at(PHY_PRESSURE),
                    btemp:   phy.f32x4_at(PHY_BRAKETEMP),
                    wslip:   phy.f32x4_at(PHY_WHEELSLIP),
                    susp:    phy.f32x4_at(PHY_SUSP),
                });

                // Emit live status every ~2 s
                if samples.len() % 100 == 0 {
                    emit(&app, true, true, laps_done, &car, &track);
                }
            }
        }
    }
}

// ── Build CSV and enqueue upload ──────────────────────────────────────────────
async fn flush_with_offset(
    samples:     &[Sample],
    time_offset: f32,
    car:         &str,
    track:       &str,
    lap_ms:      i32,
    queue:       &Arc<UploadQueue>,
    app:         &AppHandle,
) {
    let s   = lap_ms as f32 / 1000.0;
    let tag = format!("{:02}m{:06.3}s", (s / 60.0) as u32, s % 60.0);

    // Build CSV — original 9 columns first (backward-compatible), new channels appended.
    let mut csv = String::with_capacity(samples.len() * 200);
    csv.push_str(
        "time,speed,throttle,brake,gear,rpm,steerAngle,lateralG,longitudinalG,\
lapDist,normPos,verticalG,clutch,tc,abs,turboBoost,fuel,airTemp,roadTemp,\
tyreTempFL,tyreTempFR,tyreTempRL,tyreTempRR,\
tyrePressFL,tyrePressFR,tyrePressRL,tyrePressRR,\
brakeTempFL,brakeTempFR,brakeTempRL,brakeTempRR,\
wheelSlipFL,wheelSlipFR,wheelSlipRL,wheelSlipRR,\
suspTravelFL,suspTravelFR,suspTravelRL,suspTravelRR\n",
    );
    for p in samples {
        let t = (p.t + time_offset).max(0.0);
        csv.push_str(&format!(
            "{:.3},{:.1},{:.1},{:.1},{},{},{:.2},{:.4},{:.4},",
            t, p.spd, p.thr, p.brk, p.gear, p.rpm, p.str_, p.latg, p.long,
        ));
        csv.push_str(&format!(
            "{:.1},{:.5},{:.4},{:.1},{:.3},{:.3},{:.2},{:.2},{:.1},{:.1},",
            p.dist, p.normpos, p.vertg, p.clutch, p.tc, p.abs, p.turbo, p.fuel, p.airt, p.roadt,
        ));
        csv.push_str(&format!(
            "{:.1},{:.1},{:.1},{:.1},",
            p.ttemp[0], p.ttemp[1], p.ttemp[2], p.ttemp[3],
        ));
        csv.push_str(&format!(
            "{:.2},{:.2},{:.2},{:.2},",
            p.tpress[0], p.tpress[1], p.tpress[2], p.tpress[3],
        ));
        csv.push_str(&format!(
            "{:.0},{:.0},{:.0},{:.0},",
            p.btemp[0], p.btemp[1], p.btemp[2], p.btemp[3],
        ));
        csv.push_str(&format!(
            "{:.3},{:.3},{:.3},{:.3},",
            p.wslip[0], p.wslip[1], p.wslip[2], p.wslip[3],
        ));
        csv.push_str(&format!(
            "{:.4},{:.4},{:.4},{:.4}\n",
            p.susp[0], p.susp[1], p.susp[2], p.susp[3],
        ));
    }

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

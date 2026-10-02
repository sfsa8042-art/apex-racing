/**
 * MoTeC .ld binary file parser
 * Supports ACC, rFactor 2 and other MoTeC-compatible software.
 */
import type { TelemetryRow } from "@/types/telemetry";

const CH_SIZE    = 0x74;
const CH_NEXT    = 0x00;
const CH_COUNT   = 0x10;
const CH_DTYPE   = 0x14;
const CH_FREQ    = 0x18;
const CH_SHIFT   = 0x1A;
const CH_MUL     = 0x1C;
const CH_SCALE   = 0x1E;
const CH_NAME    = 0x22;
const CH_UNITS   = 0x4A;

const SPEED_CH    = ["speed","speedometer","groundspeed","vehiclespeed","vx","wheel_speed_fl"];
const THROTTLE_CH = ["throttle","throttlepos","tps","gas","accelpedal","throttle_pct"];
const BRAKE_CH    = ["brake","brakepress","brakepressure","brakepedal","brake_pct","brake_pos"];
const GEAR_CH     = ["gear","currentgear","gearactual"];
const STEER_CH    = ["steer","steerangle","steering"];

function norm(s: string): string { return s.toLowerCase().replace(/[_\s-]/g,""); }

function readStr(view: DataView, off: number, len: number): string {
  const b: number[] = [];
  for (let i = 0; i < len; i++) {
    const c = view.getUint8(off + i);
    if (!c) break;
    b.push(c);
  }
  return String.fromCharCode(...b).trim();
}

function bytesPerSample(dtype: number): number {
  return (dtype === 0 || dtype === 3 || dtype === 5) ? 4 : 2;
}

function readSamples(view: DataView, dataOff: number, ndata: number, dtype: number, mul: number, shift: number, scale: number): number[] {
  const bps = bytesPerSample(dtype);
  const sc  = scale === 0 ? 1 : scale;
  const mu  = mul   === 0 ? 1 : mul;
  const out: number[] = [];
  for (let i = 0; i < ndata; i++) {
    const o = dataOff + i * bps;
    if (o + bps > view.byteLength) break;
    let raw: number;
    if      (dtype === 0)               raw = view.getFloat32(o, true) * sc / mu;
    else if (dtype === 3 || dtype === 5) raw = view.getInt32(o, true);
    else                                 raw = view.getInt16(o, true);
    out.push(dtype === 0 ? raw : (raw + shift) * mu / sc);
  }
  return out;
}

function resample(arr: number[], fromHz: number, toHz: number): number[] {
  if (fromHz === toHz || !arr.length) return arr;
  const r = fromHz / toHz;
  return Array.from({ length: Math.ceil(arr.length / r) }, (_, i) =>
    arr[Math.min(Math.floor(i * r), arr.length - 1)]
  );
}

export function parseMoTeCLD(buffer: ArrayBuffer): TelemetryRow[] {
  const view = new DataView(buffer);

  let firstOff = 0;
  for (const off of [0x10, 0x14, 0x18, 0x108, 0x110, 0x20]) {
    if (off + 4 > buffer.byteLength) continue;
    const cand = view.getUint32(off, true);
    if (cand > 0 && cand + CH_SIZE < buffer.byteLength) {
      const name = readStr(view, cand + CH_NAME, 32);
      if (name.length >= 2 && /^[A-Za-z]/.test(name)) { firstOff = cand; break; }
    }
  }
  if (!firstOff) throw new Error("Формат .ld не распознан. Экспортируй через MoTeC i2 в CSV.");

  interface Ch { name:string; freq:number; dtype:number; ndata:number; dataOffset:number; mul:number; shift:number; scale:number }
  const channels: Ch[] = [];
  let off = firstOff;
  for (let i = 0; i < 512 && off > 0 && off + CH_SIZE < buffer.byteLength; i++) {
    const next  = view.getUint32(off + CH_NEXT, true);
    const ndata = view.getUint16(off + CH_COUNT, true);
    const dtype = view.getUint16(off + CH_DTYPE, true);
    const freq  = view.getUint16(off + CH_FREQ,  true);
    const shift = view.getInt16 (off + CH_SHIFT, true);
    const mul   = view.getInt16 (off + CH_MUL,   true);
    const scale = view.getInt16 (off + CH_SCALE, true);
    const name  = readStr(view, off + CH_NAME, 32);
    if (name && freq > 0 && ndata > 0) channels.push({ name, freq, dtype, ndata, dataOffset: off + CH_SIZE, mul, shift, scale });
    if (!next || next === off) break;
    off = next;
  }

  if (!channels.length) throw new Error("Каналы не найдены в .ld файле.");

  const find = (names: string[]) => channels.find(c => names.includes(norm(c.name)));
  const speedCh = find(SPEED_CH);
  if (!speedCh) throw new Error(`Канал скорости не найден. Каналы: ${channels.map(c=>c.name).join(", ")}`);

  const throttleCh = find(THROTTLE_CH);
  const brakeCh    = find(BRAKE_CH);
  const gearCh     = find(GEAR_CH);
  const steerCh    = find(STEER_CH);

  const baseHz = Math.max(speedCh.freq, throttleCh?.freq??0, brakeCh?.freq??0);
  const read   = (ch: Ch) => readSamples(view, ch.dataOffset, ch.ndata, ch.dtype, ch.mul, ch.shift, ch.scale);
  const rs     = (ch: Ch) => resample(read(ch), ch.freq, baseHz);

  const speeds    = read(speedCh);
  const throttles = throttleCh ? rs(throttleCh) : new Array(speeds.length).fill(0);
  const brakes    = brakeCh    ? rs(brakeCh)    : new Array(speeds.length).fill(0);
  const gears     = gearCh     ? rs(gearCh)     : new Array(speeds.length).fill(0);
  const steers    = steerCh    ? rs(steerCh)    : new Array(speeds.length).fill(0);

  const maxSpd = Math.max(...speeds);
  const spdMul = maxSpd < 80 ? 3.6 : 1;
  const maxT   = Math.max(...throttles, 1);
  const maxB   = Math.max(...brakes, 1);
  const tScale = maxT > 1.5 ? 100 / maxT : 1;
  const bScale = maxB > 1.5 ? 100 / maxB : 1;

  const dt = 1 / baseHz;
  let dist = 0;

  return speeds.map((spd, i) => {
    const speed = Math.max(0, spd * spdMul);
    if (i > 0) dist += (speed / 3.6) * dt;
    return {
      time:       parseFloat((i * dt).toFixed(4)),
      speed,
      throttle:   Math.max(0, Math.min(100, (throttles[i]??0) * tScale)),
      brake:      Math.max(0, Math.min(100, (brakes[i]??0)    * bScale)),
      gear:       Math.round(gears[i]??0),
      steerAngle: steers[i]??0,
      lapDist:    dist,
    } as TelemetryRow;
  });
}

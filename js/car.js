// Физика машины: кузов + два колеса на пружинной подвеске. Ось Y вниз.
import { PHYS as P, HULL } from './config.js';
import { groundY, normalAt, slopeAt, circleContact } from './terrain.js';
import { clamp, wrapAngle } from './rng.js';

const R = P.wheelR, M = P.bodyMass, I = P.bodyInertia, MW = P.wheelMass, IW = 0.5 * MW * R * R;

export class Car {
  constructor() {
    this.wheels = P.anchors.map((a) => ({
      ax: a.x, ay: a.y, x: 0, y: 0, vx: 0, vy: 0, rot: 0, w: 0,
      contact: false, nx: 0, ny: -1, susp: P.rest, fx: 0, fy: 0, tq: 0, slip: 0,
    }));
    this.place(3);
  }

  // Поставить машину на землю в точке x
  place(x) {
    const a = slopeAt(x, 1.2);
    this.x = x;
    this.a = a;
    this.y = groundY(x) - (P.anchors[0].y + P.rest + R) - 0.05;
    this.vx = this.vy = this.w = 0;
    this.roofHit = false;
    const c = Math.cos(a), s = Math.sin(a);
    for (const wh of this.wheels) {
      const lx = wh.ax, ly = wh.ay + P.rest;
      wh.x = this.x + c * lx - s * ly;
      wh.y = this.y + s * lx + c * ly;
      const gy = groundY(wh.x) - R;
      if (wh.y > gy) { this.y -= wh.y - gy; }
      wh.vx = wh.vy = wh.w = 0;
      wh.contact = false;
    }
    // поднять колёса вместе с кузовом, если кузов сдвинулся
    for (const wh of this.wheels) {
      wh.x = this.x + c * wh.ax - s * (wh.ay + P.rest);
      wh.y = this.y + s * wh.ax + c * (wh.ay + P.rest);
    }
  }

  get speed() { return Math.hypot(this.vx, this.vy); }
  get grounded() { return this.wheels[0].contact || this.wheels[1].contact; }

  step(dt, ctl, U) {
    const c = Math.cos(this.a), s = Math.sin(this.a);
    const downX = -s, downY = c, fwdX = c, fwdY = s;
    let fx = 0, fy = M * U.g, tq = 0;
    const grounded = this.grounded;

    // --- подвеска ---
    for (const wh of this.wheels) {
      const rx = c * wh.ax - s * wh.ay, ry = s * wh.ax + c * wh.ay;
      const avx = this.vx - this.w * ry, avy = this.vy + this.w * rx;
      const dx = wh.x - (this.x + rx), dy = wh.y - (this.y + ry);
      const dvx = wh.vx - avx, dvy = wh.vy - avy;
      const ext = dx * downX + dy * downY, side = dx * fwdX + dy * fwdY;
      const vExt = dvx * downX + dvy * downY, vSide = dvx * fwdX + dvy * fwdY;
      let fa = -U.kSusp * (ext - P.rest) - P.cSusp * vExt;
      if (ext < P.bump) {
        fa += P.kStop * (P.bump - ext);
        if (vExt < 0) fa -= P.cStop * vExt;
      } else if (ext > P.maxExt) {
        fa -= P.kStop * (ext - P.maxExt);
        if (vExt > 0) fa -= P.cStop * vExt;
      }
      const fs = -P.kSide * side - P.cSide * vSide;
      const Fx = downX * fa + fwdX * fs, Fy = downY * fa + fwdY * fs;
      wh.fx = Fx;
      wh.fy = Fy + MW * U.g;
      fx -= Fx; fy -= Fy;
      tq -= rx * Fy - ry * Fx;
      wh.susp = ext;
    }

    // --- мотор ---
    const maxW = (U.maxSpeed * (U.turbo ? 1.4 : 1)) / R;
    for (const wh of this.wheels) {
      let t = 0;
      if (ctl.gas) t = U.torque * clamp(1 - wh.w / maxW, 0, 1);
      else if (ctl.brake && wh.w <= 0.5) t = -U.torque * 0.7 * clamp(1 + wh.w / (P.revSpeed / R), 0, 1);
      wh.tq = t;
      tq -= t * P.reaction;
    }

    // --- турбо ---
    if (U.turbo) { fx += fwdX * U.turboForce; fy += fwdY * U.turboForce; }

    // --- управление в воздухе ---
    if (!grounded) {
      let aa = 0;
      if (ctl.gas) aa -= U.airTorque;
      if (ctl.brake) aa += U.airTorque;
      if (!ctl.gas && !ctl.brake) {
        const err = wrapAngle(this.a - slopeAt(this.x + this.vx * 0.3, 2));
        aa += -U.assist * err - 0.8 * this.w;
      }
      tq += (aa - 0.3 * this.w) * I;
    }

    // --- скорости ---
    this.vx += (fx / M) * dt;
    this.vy += (fy / M) * dt;
    this.w += (tq / I) * dt;
    this.w = clamp(this.w, -7, 7);
    for (const wh of this.wheels) {
      wh.vx += (wh.fx / MW) * dt;
      wh.vy += (wh.fy / MW) * dt;
      wh.w += (wh.tq / IW) * dt;
      if (ctl.brake && !ctl.gas && wh.w > 0) wh.w = Math.max(0, wh.w - (P.brake / IW) * dt);
      if (!ctl.gas && !ctl.brake) wh.w *= 1 - 0.4 * dt;
    }

    // --- колёса: удар о землю и трение ---
    for (const wh of this.wheels) {
      wh.slip = 0;
      if (!wh.contact) continue;
      const nx = wh.nx, ny = wh.ny;
      const vn = wh.vx * nx + wh.vy * ny;
      let jn = 0;
      if (vn < 0) {
        jn = -vn * MW;
        wh.vx -= vn * nx;
        wh.vy -= vn * ny;
      }
      const tx = -ny, ty = nx;
      const vt = wh.vx * tx + wh.vy * ty - wh.w * R;
      const k = 1 / MW + (R * R) / IW;
      const lim = U.grip * jn;
      const jt = clamp(-vt / k, -lim, lim);
      wh.vx += (tx * jt) / MW;
      wh.vy += (ty * jt) / MW;
      wh.w -= (R * jt) / IW;
      wh.slip = Math.abs(vt);
    }

    // --- кузов: касание земли ---
    for (const p of HULL) {
      const rx = c * p.x - s * p.y, ry = s * p.x + c * p.y;
      const px = this.x + rx, py = this.y + ry;
      const gy = groundY(px);
      if (py <= gy) continue;
      if (p.roof) this.roofHit = true;
      const n = normalAt(px);
      let vpx = this.vx - this.w * ry, vpy = this.vy + this.w * rx;
      const vn = vpx * n.x + vpy * n.y;
      if (vn < 0) {
        const rn = rx * n.y - ry * n.x;
        const j = (-1.1 * vn) / (1 / M + (rn * rn) / I);
        this.vx += (n.x * j) / M;
        this.vy += (n.y * j) / M;
        this.w += (rn * j) / I;
        vpx = this.vx - this.w * ry;
        vpy = this.vy + this.w * rx;
        const tx = -n.y, ty = n.x;
        const vt = vpx * tx + vpy * ty;
        const rt = rx * ty - ry * tx;
        const jt = clamp(-vt / (1 / M + (rt * rt) / I), -0.5 * j, 0.5 * j);
        this.vx += (tx * jt) / M;
        this.vy += (ty * jt) / M;
        this.w += (rt * jt) / I;
      }
      const pen = (py - gy) * -n.y;
      this.x += n.x * pen * 0.6;
      this.y += n.y * pen * 0.6;
    }

    // --- позиции ---
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.a += this.w * dt;
    for (const wh of this.wheels) {
      wh.x += wh.vx * dt;
      wh.y += wh.vy * dt;
      wh.rot += wh.w * dt;
      const h = circleContact(wh.x, wh.y, R);
      wh.contact = !!h && h.pen > -0.02;
      if (h) {
        wh.nx = h.nx; wh.ny = h.ny;
        if (h.pen > 0) { wh.x += h.nx * h.pen; wh.y += h.ny * h.pen; }
      }
    }
  }

  // Поставить машину на колёса (щит или застряла на боку)
  rescue(lift = 1.2) {
    const vx = Math.max(0, this.vx);
    this.place(this.x);
    this.y -= lift;
    for (const wh of this.wheels) wh.y -= lift;
    this.vx = vx * 0.5;
    for (const wh of this.wheels) wh.vx = this.vx;
  }
}

interface Snapshot {
  x: number;
  y: number;
  t: number;
}

const MAX_SNAPSHOTS = 10;

/**
 * Tampon d'instantanés : on affiche l'entité avec un léger retard (INTERP_DELAY)
 * et on interpole entre les deux positions reçues qui encadrent l'instant de rendu.
 * Élimine totalement les à-coups liés au rythme des patchs réseau.
 */
export const INTERP_DELAY = 100;

export class InterpBuffer {
  private snaps: Snapshot[] = [];

  push(x: number, y: number, t: number) {
    const last = this.snaps[this.snaps.length - 1];
    if (last && t <= last.t) return;
    this.snaps.push({ x, y, t });
    if (this.snaps.length > MAX_SNAPSHOTS) {
      this.snaps.shift();
    }
  }

  clear() {
    this.snaps.length = 0;
  }

  sample(renderTime: number, out: { x: number; y: number }): boolean {
    const s = this.snaps;
    if (s.length === 0) return false;

    if (renderTime <= s[0].t) {
      out.x = s[0].x;
      out.y = s[0].y;
      return true;
    }

    for (let i = s.length - 1; i >= 0; i--) {
      if (s[i].t <= renderTime) {
        const a = s[i];
        const b = s[i + 1];
        if (!b) {
          // Pas encore de snapshot plus récent : extrapolation légère et bornée
          const prev = s[i - 1];
          if (prev) {
            const span = a.t - prev.t;
            if (span > 0) {
              const k = Math.min((renderTime - a.t) / span, 1.5);
              out.x = a.x + (a.x - prev.x) * k;
              out.y = a.y + (a.y - prev.y) * k;
              return true;
            }
          }
          out.x = a.x;
          out.y = a.y;
          return true;
        }
        const k = (renderTime - a.t) / Math.max(1, b.t - a.t);
        out.x = a.x + (b.x - a.x) * k;
        out.y = a.y + (b.y - a.y) * k;
        return true;
      }
    }

    const latest = s[s.length - 1];
    out.x = latest.x;
    out.y = latest.y;
    return true;
  }
}

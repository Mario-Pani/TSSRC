export function pickNByOD(ODmm: number): number {
  return ODmm >= 1600 ? 16 : 8; // N lados dado por el OD nominal
}

export interface TrapezoidDims {
  N: number; deltaDeg: number; alphaDeg: number;
  s_in: number; s_out: number; h: number;
  nominal: { ID: number; OD: number; Ri: number; Ro: number; };
  corrected: { IDc: number; ODc: number; Ri: number; Ro: number; Roc: number; coeff: number; };
}

export function computeDims(ID: number, OD: number, coeff = 1.0): TrapezoidDims {
  if (!isFinite(ID) || !isFinite(OD) || ID <= 0 || OD <= 0) throw new Error('ID/OD inválidos');
  if (OD <= ID) throw new Error('OD debe ser mayor que el ID');
  if (!isFinite(coeff) || coeff <= 0) throw new Error('Coeficiente inválido');

  // N por OD NOMINAL
  const N = pickNByOD(OD);
  const deltaDeg = 360 / N;
  const alphaDeg = 180 / N;

  // Corrección para corte
  const p = coeff - 1 // coeff = 1 + (%/100)
  const ODc = OD * (1 + p);
  const IDc = ID * (1 - p);

  //const IDc = ID / coeff;
  //const ODc = OD * coeff;

  const Ri_nom = ID / 2;
  const Ro_nom = OD / 2;

  const Ri = IDc / 2;
  const Ro = ODc / 2;
  const Roc = Ro / Math.cos(Math.PI / N);

  const s_in  = 2 * Ri  * Math.sin(Math.PI / N);
  const s_out = 2 * Roc * Math.sin(Math.PI / N);
  const h     = Ro - Ri * Math.cos(Math.PI / N);

  return {
    N, deltaDeg, alphaDeg,
    s_in, s_out, h,
    nominal:   { ID, OD, Ri: Ri_nom, Ro: Ro_nom },
    corrected: { IDc, ODc, Ri, Ro, Roc, coeff }
  };
}

export interface XY { x: number; y: number; }

export function polygonVertices(radius: number, N: number): XY[] {
  const verts: XY[] = [];
  for (let k = 0; k < N; k++) {
    const th = (2 * Math.PI * k) / N;
    verts.push({ x: radius * Math.cos(th), y: radius * Math.sin(th) });
  }
  return verts;
}
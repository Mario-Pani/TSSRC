/**
 * Determina el número de lados (N) del polígono según el diámetro externo
 * 
 * **Regla de negocio:**
 * - OD < 1600mm → 8 lados (octágono)
 * - OD ≥ 1600mm → 16 lados (hexadecágono)
 * 
 * Esta regla minimiza errores de corte y optimiza el material
 * 
 * @param {number} ODmm - Diámetro externo en mm
 * @returns {number} Número de lados (8 o 16)
 * 
 * @example
 * pickNByOD(1200) // → 8
 * pickNByOD(1600) // → 16
 */
import { createMemoizer } from './memoizer'

export function pickNByOD(ODmm: number): number {
  return ODmm >= 1600 ? 16 : 8
}

/**
 * Dimensiones calculadas para un trapecio anular
 * 
 * Contiene tanto valores nominales como valores corregidos para el corte
 */
export interface TrapezoidDims {
  /** Número de lados del polígono */
  N: number
  /** Ángulo entre cada lado: 360/N */
  deltaDeg: number
  /** Ángulo de corte (mitad de deltaDeg): 180/N */
  alphaDeg: number
  /** Lado interno corto (SL1) en mm */
  s_in: number
  /** Lado externo largo (SL2) en mm */
  s_out: number
  /** Altura del trapecio (H1) en mm */
  h: number
  /** Dimensiones nominales sin corrección */
  nominal: { ID: number; OD: number; Ri: number; Ro: number; }
  /** Dimensiones corregidas para compensar el kerf de corte */
  corrected: { IDc: number; ODc: number; Ri: number; Ro: number; Roc: number; coeff: number; }
}

/**
 * Calcula las dimensiones geométricas de un trapecio anular
 * 
 * **Entrada:**
 * - ID (Diámetro Interno): en mm
 * - OD (Diámetro Externo): en mm
 * - coeff (Coeficiente de corrección): factor para compensar kerf de corte
 * 
 * **Proceso:**
 * 1. Determina N (número de lados) según OD
 * 2. Calcula ángulos: deltaDeg = 360/N, alphaDeg = 180/N
 * 3. Aplica corrección para kerf: IDc = ID*(1-p), ODc = OD*(1+p) donde p = coeff-1
 * 4. Calcula dimensiones del trapecio usando trigonometría
 * 
 * **Fórmulas:**
 * - s_in  = 2 * Ri * sin(π/N)  // lado interno corto (SL1)
 * - s_out = 2 * Roc * sin(π/N) // lado externo largo (SL2)
 * - h = Ro - Ri * cos(π/N)     // altura (H1)
 * 
 * @param {number} ID - Diámetro interno en mm (debe ser > 0)
 * @param {number} OD - Diámetro externo en mm (debe ser > ID)
 * @param {number} coeff - Factor de corrección (default 1.0, típicamente 1.0035)
 * @returns {TrapezoidDims} Objeto con dimensiones calculadas
 * 
 * @throws {Error} Si ID <= 0, OD <= 0, OD <= ID, o coeff <= 0
 * 
 * @example
 * const dims = computeDims(1200, 1500, 1.0035)
 * console.log(dims.s_in)   // SL1 (lado corto)
 * console.log(dims.s_out)  // SL2 (lado largo)
 * console.log(dims.h)      // H1 (altura)
 */
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

export const computeDimsMemo = createMemoizer(
  (ID: number, OD: number, coeff = 1.0) => computeDims(ID, OD, coeff),
  6,
  (args: any[]) => `${args[0]}|${args[1]}|${args[2] ?? 1}`
)

export interface XY { x: number; y: number; }

/**
 * Genera los vértices de un polígono regular distribuidos en un círculo
 * 
 * Los vértices se distribuyen uniformemente alrededor de un círculo
 * con una separación angular de 2π/N radianes
 * 
 * @param {number} radius - Radio del círculo en mm
 * @param {number} N - Número de vértices (lados del polígono)
 * @returns {XY[]} Array de N puntos {x, y} distribuidos en el círculo
 * 
 * @example
 * const vertices = polygonVertices(600, 8)
 * // → Array de 8 puntos formando un octágono
 * // Primer punto: {x: 600, y: 0}
 * // Separación: 45° entre puntos
 */
export function polygonVertices(radius: number, N: number): XY[] {
  const verts: XY[] = [];
  for (let k = 0; k < N; k++) {
    const th = (2 * Math.PI * k) / N;
    verts.push({ x: radius * Math.cos(th), y: radius * Math.sin(th) });
  }
  return verts;
}
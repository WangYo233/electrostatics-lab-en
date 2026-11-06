'use strict';
// Worked-problem module: answers, distractors and solutions for the analytic-field models (Ext. 1) and charges on a disk (Ext. 2)
// V and E of the analytic fields are always computed by the lab's EL.SUB08[sub].fn; the total interaction energy of the disk is computed by EL.model(3).readings
(function (EL) {
  const V = EL.V, U = EL.U, VA = EL.VA, X = EL.EX, R_ = String.raw;
  const f4 = VA.f4;
  // Number text: a radical (VA.nice) or a rational multiple of π, otherwise 4 significant digits
  X.niceNum = function (x) {
    const n = VA.nice(x);
    if (n) return { text: n.text, tex: n.tex, exact: true };
    if (isFinite(x) && Math.abs(x) > 1e-9) {
      const y = x / Math.PI, m = VA.nice(y);
      if (m && !/√/.test(m.text)) {
        const s = m.text.replace(/^−/, ''), neg = x < 0, [a, b] = s.split('/'), A = a === '1' ? '' : a;
        return { text: (neg ? '−' : '') + A + 'π' + (b ? '/' + b : ''), tex: (neg ? '-' : '') + (b ? R_`\frac{${A}\pi}{${b}}` : A + R_`\pi`), exact: true };
      }
    }
    return { text: f4(x).replace(/^-/, '−'), tex: f4(x), exact: false };
  };
  const T = x => X.niceNum(x).text, TX = x => X.niceNum(x).tex, P = x => x < 0 ? '(' + TX(x) + ')' : TX(x);
  const pTex = p => '(' + p.map(x => U.fmt(x, 3)).join(',') + ')';

  // ---- Each analytic model: field and potential derivations and common mistakes (w: [value, reason for the error]) ----
  const rho = x => Math.hypot(x[0], x[1]), sgnW = (v, pos, neg) => v > 0 ? pos : neg;
  const ANA = {
    point: {
      E: (p, x) => { const r = V.len(x); return { t: 'The magnitude of the electric field of a point charge is E = k|q|/r². The field of a positive charge points away from it, and that of a negative charge points toward it.', tex: R_`r=${TX(r)},\quad E=\frac{k|q|}{r^2}=\frac{${TX(Math.abs(p.q))}}{${P(r)}^2}=${TX(Math.abs(p.q) / (r * r))}`,
        w: [[Math.abs(p.q) / r, 'The potential formula kq/r was used as the field formula.'], [2 * Math.abs(p.q) / (r * r), 'The point charge was treated as an infinite line charge, giving an extra factor 2.'], [Math.abs(p.q) / (r * r * r), 'The r³ in the vector form kq r⃗/r³ was used as the denominator of the field magnitude.']] }; },
      V: (p, x) => { const r = V.len(x); return { t: 'The potential of a point charge is φ = kq/r, with the potential taken as zero at infinity.', tex: R_`\varphi=\frac{kq}{r}=\frac{${TX(p.q)}}{${TX(r)}}=${TX(p.q / r)}`,
        w: [[p.q / (r * r), 'The 1/r² of the field formula was used for the potential.']] }; }
    },
    'infinite-line': {
      E: (p, x) => { const r = rho(x); return { t: 'By Gauss\'s law, the field of an infinite uniformly charged line is perpendicular to the line, with magnitude E = 2k|λ|/ρ, where ρ is the distance from the field point to the z axis; it does not depend on z.', tex: R_`\rho=\sqrt{x^2+y^2}=${TX(r)},\quad E=\frac{2k|\lambda|}{\rho}=${TX(2 * Math.abs(p.lambda) / r)}`,
        w: [[Math.abs(p.lambda) / r, 'The factor 2 was left out.'], [Math.abs(p.lambda) / (r * r), 'The inverse-square law of a point charge was used.'], [2 * Math.abs(p.lambda) / V.len(x), 'The distance to the origin was used instead of the distance ρ to the line.']] }; },
      V: (p, x) => { const r = rho(x); return { t: 'The potential of an infinite line charge cannot be taken as zero at infinity. With the potential zero at ρ = ρ₀, φ = −2kλ ln(ρ/ρ₀).', tex: R_`\varphi=-2k\lambda\ln\frac{\rho}{\rho_0}=-2\times${P(p.lambda)}\ln\frac{${TX(r)}}{${TX(p.r0)}}=${TX(-2 * p.lambda * Math.log(r / p.r0))}`,
        w: [[2 * p.lambda / r, 'The field formula 2kλ/ρ was used as the potential.'], [p.lambda / V.len(x), 'The potential formula of a point charge was used, with the potential zero at infinity.']] }; }
    },
    'infinite-plane': {
      E: p => ({ t: 'On both sides of an infinite uniformly charged plane the field is uniform and perpendicular to the plane, with magnitude E = 2πk|σ|, independent of the distance from the plane.', tex: R_`E=2\pi k|\sigma|=2\pi\times${TX(Math.abs(p.sigma))}=${TX(2 * Math.PI * Math.abs(p.sigma))}`,
        w: [[4 * Math.PI * Math.abs(p.sigma), 'The field σ/ε₀ near a conductor surface was used.'], [Math.PI * Math.abs(p.sigma), 'The factor 2 was left out.']] }),
      V: (p, x) => ({ t: 'Take the potential of the charged plane to be zero. The field is uniform on both sides, so φ = −2πkσ|z|.', tex: R_`\varphi=-2\pi k\sigma|z|=-2\pi\times${P(p.sigma)}\times${TX(Math.abs(x[2]))}=${TX(-2 * Math.PI * p.sigma * Math.abs(x[2]))}`,
        w: [[-4 * Math.PI * p.sigma * Math.abs(x[2]), 'The field σ/ε₀ near a conductor surface was used to compute the potential.'], [0, 'The potential was assumed to be zero everywhere near the plane.']] })
    },
    'conductor-sphere': {
      E: (p, x) => { const r = V.len(x); return r < p.a ? { t: 'In electrostatic equilibrium the field inside a conductor is zero everywhere, and the charge lies only on the surface.', tex: R_`r=${TX(r)}<a,\quad E=0`,
        w: [[r > 1e-6 ? Math.abs(p.q) / (r * r) : NaN, 'The conducting sphere was treated as a point charge, ignoring electrostatic equilibrium.'], [Math.abs(p.q) / (p.a * p.a), 'The field just outside the surface was used as the field inside.'], [Math.abs(p.q) * r / p.a ** 3, 'The conducting sphere was treated as a uniformly charged insulating sphere.']] }
        : { t: 'Outside the sphere, the field is the same as that of a point charge with all the charge at the center, E = k|q|/r².', tex: R_`r=${TX(r)}>a,\quad E=\frac{k|q|}{r^2}=${TX(Math.abs(p.q) / (r * r))}`,
        w: [[Math.abs(p.q) / (p.a * p.a), 'The radius of the sphere was used as the distance to the center.'], [Math.abs(p.q) / r, 'The potential formula was used as the field formula.'], [Math.abs(p.q) / ((r - p.a) ** 2), 'The distance to the surface was used as the distance to the center.']] }; },
      V: (p, x) => { const r = V.len(x); return r <= p.a ? { t: 'A conductor is an equipotential body, so every point inside has the potential of the surface, φ = kq/a.', tex: R_`\varphi=\frac{kq}{a}=\frac{${TX(p.q)}}{${TX(p.a)}}=${TX(p.q / p.a)}`,
        w: [[0, 'The potential was assumed to be zero wherever the field is zero.'], [r > 1e-9 ? p.q / r : NaN, 'The point-charge potential kq/r was used for the potential inside the conductor.']] }
        : { t: 'Outside the sphere, the potential is the same as that of a point charge, φ = kq/r.', tex: R_`\varphi=\frac{kq}{r}=\frac{${TX(p.q)}}{${TX(r)}}=${TX(p.q / r)}`, w: [[p.q / p.a, 'The potential of the surface was used for points outside the sphere.'], [p.q / (r * r), 'The 1/r² of the field formula was used for the potential.']] }; }
    },
    'dielectric-interface': {
      E: (p, x) => { const e = x[2] >= 0 ? p.e1 : p.e2, o = x[2] >= 0 ? p.e2 : p.e1; return { t: 'There is no free charge on the interface, so the normal component of the electric displacement is continuous. In each medium E = D/(ε₀ε) = 4πkD/ε, where ε is the relative permittivity of the medium containing the field point.', tex: R_`E=\frac{4\pi k|D|}{\varepsilon}=\frac{4\pi\times${TX(Math.abs(p.D))}}{${TX(e)}}=${TX(4 * Math.PI * Math.abs(p.D) / e)}`,
        w: [[4 * Math.PI * Math.abs(p.D) / o, 'The permittivity of the medium on the other side was used.'], [4 * Math.PI * Math.abs(p.D), 'The polarization of the dielectric was ignored.'], [4 * Math.PI * Math.abs(p.D) * e, 'Division by ε was written as multiplication by ε.']] }; },
      V: (p, x) => { const e = x[2] >= 0 ? p.e1 : p.e2, Ez = 4 * Math.PI * p.D / e; return { t: 'Take the potential of the interface to be zero. The field is uniform in each medium, so φ = −E_z z.', tex: R_`E_z=\frac{4\pi kD}{\varepsilon}=${TX(Ez)},\quad\varphi=-E_zz=${TX(-Ez * x[2])}`,
        w: [[-4 * Math.PI * p.D * x[2], 'The polarization of the dielectric was ignored.'], [-4 * Math.PI * p.D / (x[2] >= 0 ? p.e2 : p.e1) * x[2], 'The permittivity of the medium on the other side was used.']] }; },
      bc: p => ({ value: p.e2 / p.e1, t: 'With no free charge on the interface, the normal component of the electric displacement is continuous: ε₁E_1n = ε₂E_2n, so E_1n/E_2n = ε₂/ε₁.', tex: R_`\frac{E_{1n}}{E_{2n}}=\frac{\varepsilon_2}{\varepsilon_1}=\frac{${TX(p.e2)}}{${TX(p.e1)}}=${TX(p.e2 / p.e1)}`,
        w: [[p.e1 / p.e2, 'The continuity condition for the electric displacement was inverted.'], [1, 'The normal component of the field was assumed to be continuous.'], [(p.e2 / p.e1) ** 2, 'The ratio of the permittivities was squared.']] })
    },
    'dielectric-sphere': {
      E: (p, x) => {
        const C = 3 * p.eout / (p.ein + 2 * p.eout);
        if (V.len(x) < p.a) return { t: 'The field inside a uniform dielectric sphere is uniform, E_in = CE₀, where C = 3ε_out/(ε_in + 2ε_out).', tex: R_`C=\frac{3\varepsilon_{\mathrm{out}}}{\varepsilon_{\mathrm{in}}+2\varepsilon_{\mathrm{out}}}=${TX(C)},\quad E_{\mathrm{in}}=C|E_0|=${TX(C * Math.abs(p.E0))}`,
          w: [[Math.abs(p.E0), 'The polarization of the dielectric sphere was ignored.'], [Math.abs(p.E0) * p.eout / p.ein, 'The relation for a plane interface was applied to a sphere.'], [Math.abs(p.E0) * 3 * p.ein / (p.eout + 2 * p.ein), 'The permittivities inside and outside the sphere were interchanged.']] };
        const e = EL.SUB08['dielectric-sphere'].fn(p, x).E;
        return { t: 'Outside the sphere, the field is the vector sum of the applied uniform field and the field of the polarization charges; it is found from E = −∇φ.', tex: R_`\vec E=-\nabla\varphi_{\mathrm{out}}=${pTex(e.map(v => +f4(v)))}`, w: [[Math.abs(p.E0), 'The field of the polarization charges outside the sphere was ignored.']] };
      },
      V: (p, x) => {
        const C = 3 * p.eout / (p.ein + 2 * p.eout), be = (p.ein - p.eout) / (p.ein + 2 * p.eout), r = V.len(x);
        if (r < p.a) return { t: 'The field inside the sphere is uniform. With the potential zero at z = 0, φ = −CE₀z.', tex: R_`\varphi=-CE_0z=-${TX(C)}\times${P(p.E0)}\times${P(x[2])}=${TX(-C * p.E0 * x[2])}`, w: [[-p.E0 * x[2], 'The polarization of the dielectric sphere was ignored.'], [0, 'The dielectric sphere was treated as an equipotential conductor.']] };
        return { t: 'Outside the sphere, the potential is the sum of the potential of the applied field and that of the polarization charges, φ = −E₀z + βE₀a³z/r³, where β = (ε_in − ε_out)/(ε_in + 2ε_out).', tex: R_`\beta=${TX(be)},\quad\varphi=-E_0z+\frac{\beta E_0a^3z}{r^3}=${TX(-p.E0 * x[2] + be * p.E0 * p.a ** 3 * x[2] / r ** 3)}`,
          w: [[-p.E0 * x[2], 'The potential of the polarization charges was ignored.'], [-p.E0 * x[2] - be * p.E0 * p.a ** 3 * x[2] / r ** 3, 'The sign of the potential of the polarization charges was reversed.']] };
      },
      bc: p => { const C = 3 * p.eout / (p.ein + 2 * p.eout); return { value: C, t: 'A uniform dielectric sphere in a uniform applied field has a uniform field inside, E_in/E₀ = 3ε_out/(ε_in + 2ε_out).', tex: R_`\frac{E_{\mathrm{in}}}{E_0}=\frac{3\varepsilon_{\mathrm{out}}}{\varepsilon_{\mathrm{in}}+2\varepsilon_{\mathrm{out}}}=${TX(C)}`,
        w: [[1, 'The polarization of the dielectric sphere was ignored.'], [p.eout / p.ein, 'The relation for a plane interface was applied to a sphere.'], [3 * p.ein / (p.eout + 2 * p.ein), 'The permittivities inside and outside the sphere were interchanged.']] }; }
    }
  };
  X.ANA = ANA;

  // Direction text: along a coordinate axis, radial, or a unit vector
  X.anaDir = function (sub, x, E) {
    const u = V.norm(E), ax = ['x', 'y', 'z'];
    for (let i = 0; i < 3; i++) if (Math.abs(Math.abs(u[i]) - 1) < 1e-6) return 'along the ' + (u[i] > 0 ? '+' : '−') + ax[i] + ' direction';
    const r = sub === 'infinite-line' ? [x[0], x[1], 0] : x;
    if (V.len(r) > 1e-9 && ['point', 'conductor-sphere', 'infinite-line'].includes(sub)) {
      const c = V.dot(u, V.norm(r)), w = sub === 'infinite-line' ? 'the z axis' : 'the origin O';
      if (c > 1 - 1e-6) return 'radially away from ' + w; if (c < -1 + 1e-6) return 'radially toward ' + w;
    }
    return 'along the unit vector (' + u.map(v => U.fmt(v, 3)).join(', ') + ')';
  };

  // Options: distractors with the same value as the correct answer are dropped; with fewer than two options the question becomes fill-in (the student types a number)
  const key = v => String(v).replace(/ .*$/, '').replace(/^−0$/, '0');
  const pick = (o, right, wrongs) => {
    const seen = new Set([key(right)]), w = wrongs.filter(x => x && x.v && !seen.has(key(x.v)) && seen.add(key(x.v))).slice(0, 3);
    if (!w.length) { delete o.options; o.distractors = []; return; }
    o.options = [right].concat(w.map(x => x.v)).sort(); o.distractors = w;
  };
  X.optKey = key;
  const toW = ws => ws.filter(x => isFinite(x[0])).map(x => ({ v: T(x[0]), why: x[1] }));
  const undef = (n, s, what) => { const reg = (s.region || '').replace(/\s*\(.*\)/, ''); return /undefined|^On /.test(s.region || '') && reg ? n + ' is ' + reg.charAt(0).toLowerCase() + reg.slice(1) + ', where the ' + what + ' is undefined.' : 'The ' + what + ' at ' + n + ' is undefined.'; };

  // A single question of an analytic-field model
  X.anaAnswer = function (pb, R, q) {
    const Pt = n => R.pts[n] && R.pts[n].p, sub = pb.sub, sp = pb.sp, A = ANA[sub], o = { q, ok: true, diag: [] };
    if (q.t === 'E' || q.t === 'Ezero' || q.t === 'angle') {
      const x = Pt(q.at);
      if (!x) return { q, ok: false, err: 'No field point has been selected.' };
      const s = R.field(x);
      if (!s.E.every(isFinite)) return { q, ok: false, err: undef(q.at, s, 'electric field') };
      const m = V.len(s.E); o.value = m; o.T = s.E; o.probe = [q.at];
      const e = A.E(sp, x);
      o.dir = m < 1e-9 ? '' : X.anaDir(sub, x, s.E);
      if (q.t === 'E') {
        o.mag = m < 1e-9 ? '0' : T(m); o.answer = o.mag + (o.dir ? ', pointing ' + o.dir : '');
        pick(o, o.mag, toW(e.w));
        o.expl = [{ t: e.t, tex: e.tex }, { t: 'So the magnitude of the electric field at ' + q.at + ' is ' + o.mag + (o.dir ? ', pointing ' + o.dir : '') + '.' }];
        if (m < 1e-9) o.diag.push({ k: 'good', t: 'The field at this point is zero, which suits the question of whether the potential must also be zero where the field is zero.' });
      } else if (q.t === 'Ezero') {
        o.answer = m < 1e-9 ? 'Yes' : 'No'; o.options = ['Yes', 'No'];
        o.expl = [{ t: e.t, tex: e.tex }, { t: 'So the electric field at ' + q.at + (m < 1e-9 ? ' is zero.' : ' is not zero.') }];
      } else {
        const a = Pt(q.a), b = Pt(q.b);
        if (!a || !b) return { q, ok: false, err: 'Select the two points that define the line.' };
        const d = V.sub(b, a);
        if (m < 1e-9) return { q, ok: false, err: 'The field at ' + q.at + ' is zero and has no direction, so the angle is meaningless.' };
        if (V.len(d) < 1e-9) return { q, ok: false, err: q.a + ' and ' + q.b + ' are the same point, so they do not define a line and the angle is meaningless.' };
        const th = VA.ang(s.E, d); o.value = th; o.answer = (Math.round(th * 10) / 10) + '°'; o.options = VA.angOpts(th);
        o.expl = [{ t: e.t, tex: e.tex }, { t: 'The field at ' + q.at + ' points ' + o.dir + '. The dot product of the field and the displacement vector between ' + q.a + ' and ' + q.b + ' gives the angle, ' + o.answer + '.' }];
      }
      return o;
    }
    if (q.t === 'V') {
      const x = Pt(q.at);
      if (!x) return { q, ok: false, err: 'No field point has been selected.' };
      const s = R.field(x);
      if (!isFinite(s.V)) return { q, ok: false, err: undef(q.at, s, 'potential') };
      const e = A.V(sp, x); o.value = s.V; o.answer = T(s.V); o.probe = [q.at];
      pick(o, o.answer, toW(e.w.concat([[-s.V, 'The sign of the potential is reversed.']])));
      o.expl = [{ t: e.t, tex: e.tex }];
      if (Math.abs(s.V) < 1e-9 && V.len(s.E) > 1e-9) o.diag.push({ k: 'good', t: 'The potential at this point is zero but the field is not, which suits the question of whether the field must be zero where the potential is zero.' });
      return o;
    }
    if (q.t === 'Vcmp' || q.t === 'W' || q.t === 'trend') {
      const a = Pt(q.a), b = Pt(q.b);
      if (!a || !b) return { q, ok: false, err: 'Select two points.' };
      const sa = R.field(a), sb = R.field(b);
      if (!isFinite(sa.V) || !isFinite(sb.V)) return { q, ok: false, err: undef(!isFinite(sa.V) ? q.a : q.b, !isFinite(sa.V) ? sa : sb, 'potential') };
      o.va = sa.V; o.vb = sb.V; o.probe = [q.a, q.b];
      if (q.t === 'Vcmp') X.cmpAnswer(o, q, sa.V, sb.V);
      if (q.t === 'W') {
        const q0 = q.q0 || 1, w = q0 * (sa.V - sb.V); o.value = w; o.answer = T(w);
        pick(o, o.answer, [{ v: T(-w), why: 'The order of the potential difference was reversed, using W = q(φ_final − φ_initial).' }, { v: T(Math.abs(w)), why: 'The sign of the test charge was ignored.' }, Math.abs(w) > 1e-9 ? { v: '0', why: 'The potentials at the two points were assumed to be equal.' } : null]);
        o.expl = [{ t: 'First find the potential at each point: ' + A.V(sp, a).t, tex: R_`\varphi_{${q.a}}=${TX(sa.V)},\quad\varphi_{${q.b}}=${TX(sb.V)}` },
          { t: 'The work done by the electric force is W = q(φ_' + q.a + ' − φ_' + q.b + ').', tex: R_`W=${P(q0)}\times(${TX(sa.V)}-${P(sb.V)})=${TX(w)}` }];
      }
      if (q.t === 'Vcmp') o.expl = [{ t: A.V(sp, a).t, tex: R_`\varphi_{${q.a}}=${TX(sa.V)},\quad\varphi_{${q.b}}=${TX(sb.V)}` }, { t: 'Therefore ' + o.answer + '.' }];
      if (q.t === 'trend') {
        const vs = [];
        for (let i = 0; i <= 200; i++) { const s = R.field(V.lerp(a, b, i / 200)); if (!isFinite(s.V)) return { q, ok: false, err: 'The path passes through a point where the potential is undefined' + (s.region ? ' (' + s.region.replace(/\s*\(.*\)/, '').charAt(0).toLowerCase() + s.region.replace(/\s*\(.*\)/, '').slice(1) + ')' : '') + ', so the potential change cannot be discussed.' }; vs.push(s.V); }
        X.trendAnswer(o, vs);
        o.expl = [{ t: 'Along the path, the potential decreases where the field component E_∥ is positive and increases where it is negative. ' + A.V(sp, a).t, tex: R_`\varphi_{${q.a}}=${TX(sa.V)},\quad\varphi_{${q.b}}=${TX(sb.V)}` },
          { t: 'So from ' + q.a + ' to ' + q.b + ', the potential ' + o.answer + '.' }];
      }
      return o;
    }
    if (q.t === 'bc') {
      const e = A.bc(sp);
      if (!isFinite(e.value) || (sub === 'dielectric-interface' && !sp.D) || (sub === 'dielectric-sphere' && !sp.E0)) return { q, ok: false, err: 'The applied field is zero, so the field ratio is meaningless.' };
      // Check against the lab's field function: both sides of the interface (z = ±10⁻⁶), or the center and far away
      const f = x => EL.SUB08[sub].fn(sp, x).E[2], chk = sub === 'dielectric-interface' ? f([0, 0, 1e-6]) / f([0, 0, -1e-6]) : f([0, 0, 0]) / sp.E0;
      o.value = chk; o.answer = T(e.value); o.check = Math.abs(chk - e.value) < 1e-9;
      o.probePts = sub === 'dielectric-interface' ? [[0, 0, 0.5], [0, 0, -0.5]] : [[0, 0, 0], [0, 0, 3 * sp.a]];
      pick(o, o.answer, toW(e.w));
      o.expl = [{ t: e.t, tex: e.tex }];
      return o;
    }
    return { q, ok: false, err: 'This model cannot ask questions of this type.' };
  };

  // ---- Charges on a disk ----
  X.diskAnswer = function (pb, R, q) {
    const d = pb.disk, o = { q, ok: true, diag: [] }, src = R.sources, n = src.length, u = R.units.U;
    if (q.t === 'pairs') {
      const k = n * (n - 1) / 2; o.value = k; o.answer = String(k); o.focus = 'pairs';
      pick(o, o.answer, [{ v: String(n * (n - 1)), why: 'Each pair of charges was counted twice (pairs with i and j in a different order were counted as different pairs).' }, { v: String(n * (n + 1) / 2), why: 'Each charge was also paired with itself.' }, { v: String(n - 1), why: 'Only the charges paired with one particular charge were counted.' }]);
      o.expl = [{ t: 'The N charges are paired two at a time and each pair is counted once, so the number of distinct pairs is N(N − 1)/2.', tex: R_`\frac{N(N-1)}{2}=\frac{${n}\times${n - 1}}{2}=${k}` }];
      return o;
    }
    if (q.t === 'U') {
      const e = X.diskEnergy(d);
      if (!isFinite(e.U)) return { q, ok: false, err: 'Two charges are closer than the excluded radius, so the total interaction energy is undefined.' };
      o.value = e.U; o.answer = T(e.U) + ' ' + u; o.right = o.answer; o.focus = 'pairs';
      const pr = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pr.push({ i, j, r: V.dist(src[i].p, src[j].p), w: src[i].q * src[j].q });
      const rmin = Math.min(...pr.map(x => x.r)), ring = d.center ? pr.filter(x => src[x.i].label !== 'Qc' && src[x.j].label !== 'Qc') : pr;
      pick(o, o.answer, [{ v: T(2 * e.U) + ' ' + u, why: 'The double sum over i and j was not divided by 2, so each pair was counted twice.' },
        { v: T(pr.filter(x => Math.abs(x.r - rmin) < 1e-9).reduce((s, x) => s + x.w / x.r, 0)) + ' ' + u, why: 'Only the interactions between neighboring charges were included.' },
        d.center ? { v: T(ring.reduce((s, x) => s + x.w / x.r, 0)) + ' ' + u, why: 'The interactions between the center charge and the charges on the circle were left out.' } : null,
        { v: T(pr.reduce((s, x) => s + x.w / (x.r * x.r), 0)) + ' ' + u, why: '1/r was written as 1/r².' }]);
      const nr = d.center ? d.N - 1 : d.N;
      o.expl = [{ t: 'The total interaction energy is the sum of the interaction energies of all distinct pairs of charges; there are ' + pr.length + ' pairs, each counted once.', tex: R_`U=\sum_{i<j}\frac{kq_iq_j}{r_{ij}}=${TX(e.U)}` },
        { t: 'The distance between the ' + nr + ' equally spaced charges on the circle is r = 2R sin(mπ/' + nr + '). Summing gives the result below' + (d.center ? ', plus the interaction energy of the center charge with the ' + nr + ' charges on the circle.' : '.'),
          tex: R_`U=\frac{${nr}kq^2}{4R}\sum_{m=1}^{${nr - 1}}\frac{1}{\sin(m\pi/${nr})}` + (d.center ? R_`+\frac{${nr}kqq_c}{R}` : '') + '=' + TX(e.theory) }];
      return o;
    }
    if (q.t === 'Ucmp') {
      if (d.N < 3) return { q, ok: false, err: 'The two configurations can be compared only when the total number of charges is at least 3.' };
      const a = X.diskEnergy(Object.assign({}, d, { center: false })).U, b = X.diskEnergy(Object.assign({}, d, { center: true, qc: d.q })).U;
      o.va = a; o.vb = b; o.focus = 'pairs';
      o.options = ['The configuration with N charges equally spaced on the circle has the lower energy', 'The configuration with one charge at the center has the lower energy', 'The two configurations have equal energy'];
      o.answer = Math.abs(a - b) < 1e-9 ? o.options[2] : a < b ? o.options[0] : o.options[1];
      o.expl = [{ t: 'With N, R and the charge of each charge the same, calculate the total interaction energy of each configuration.', tex: R_`U_{\text{ring}}=${TX(a)},\quad U_{\text{center}}=${TX(b)}` },
        { t: 'So ' + o.answer.replace(/^The/, 'the') + '. Comparing only two configurations cannot prove that the lower one is the global minimum.' }];
      return o;
    }
    return { q, ok: false, err: 'This model cannot ask questions of this type.' };
  };
})(window.EL);

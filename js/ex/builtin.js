'use strict';
// Built-in worked problems. Problem 1 is the teaching case submitted to The Physics Teacher. model is the id of the matching lab model (X.LABS)
(function (EL) {
  EL.EX.BUILTIN = [
    { id: 'tpt-tetra', title: 'Regular tetrahedron: edge midpoint, points of tangency and potential trend', src: 'Submitted case', model: 4, kind: 'tpl', tpl: 'tetra',
      charges: { A: -1, B: 1, C: -1, D: 1 },
      pts: { P: { def: { t: 'mid', a: 'A', b: 'B' } }, M: { def: { t: 'face', f: ['A', 'B', 'C'] } }, N: { def: { t: 'face', f: ['A', 'C', 'D'] } } },
      qs: [{ t: 'E', at: 'P' }, { t: 'E', at: 'M' }, { t: 'trend', a: 'P', b: 'C' }],
      note: 'The inscribed sphere of the regular tetrahedron touches faces ABC and ACD at M and N. Each point of tangency is the center of its face.' },
    { id: 'tetra-same', title: 'Regular tetrahedron: center of four like charges', model: 4, kind: 'tpl', tpl: 'tetra', charges: { A: 1, B: 1, C: 1, D: 1 },
      pts: { O: { def: { t: 'center' } }, P: { def: { t: 'mid', a: 'A', b: 'B' } } },
      qs: [{ t: 'Ezero', at: 'O' }, { t: 'V', at: 'O' }, { t: 'E', at: 'P' }] },
    { id: 'cube-diag', title: 'Cube: opposite charges on space diagonals', model: 6, kind: 'tpl', tpl: 'cube', charges: { A: 1, 'C′': -1, C: 1, 'A′': -1 },
      pts: { O: { def: { t: 'center' } }, M: { def: { t: 'face', f: ['A′', 'B′', 'C′', 'D′'] } } },
      qs: [{ t: 'E', at: 'O' }, { t: 'V', at: 'M' }, { t: 'Vcmp', a: 'B', b: 'D′' }] },
    { id: 'octa-work', title: 'Regular octahedron: work done by the electric force', model: 5, kind: 'tpl', tpl: 'octa', charges: { E: 1, F: 1, A: -1, C: -1 },
      pts: { O: { def: { t: 'center' } }, P: { def: { t: 'mid', a: 'E', b: 'A' } } },
      qs: [{ t: 'E', at: 'O' }, { t: 'E', at: 'P' }, { t: 'W', a: 'B', b: 'O', q0: -1 }] },
    { id: 'tpt-triangle-three-like', title: 'Equilateral triangle: three like charges and potential along a median', src: 'Article case', model: 7, kind: 'tpl', tpl: 'tri', charges: { A: 1, B: 1, C: 1 }, pts: { G: { def: { t: 'face', f: ['A', 'B', 'C'] } }, M: { def: { t: 'mid', a: 'B', b: 'C' } }, P: { def: { t: 'xyz', p: [0, 0, Math.sqrt(2 / 3)] } } }, qs: [{ t: 'E', at: 'P' }, { t: 'E', at: 'M' }, { t: 'trend', a: 'G', b: 'M' }], note: 'P is directly above G, with PA = PB = PC = a. M is the midpoint of BC.' },
    { id: 'tri-above', title: 'Equilateral triangle: field directly above the center', model: 7, kind: 'tpl', tpl: 'tri', charges: { A: 1, B: 1, C: -1 },
      pts: { O: { def: { t: 'face', f: ['A', 'B', 'C'] } }, P: { def: { t: 'xyz', p: [0, 0, Math.sqrt(2 / 3)] } } },
      qs: [{ t: 'E', at: 'P' }, { t: 'E', at: 'O' }, { t: 'V', at: 'P' }],
      note: 'P is directly above the center O, and PA, PB and PC all equal a.' },
    { id: 'ana-conductor', title: 'Analytic field: potential and field inside and outside a charged conducting sphere', model: 8, kind: 'field', sub: 'conductor-sphere', sp: { q: 2, a: 1 },
      pts: { M: { def: { t: 'xyz', p: [0.5, 0, 0] } }, P: { def: { t: 'xyz', p: [2, 0, 0] } } },
      qs: [{ t: 'Ezero', at: 'M' }, { t: 'V', at: 'M' }, { t: 'E', at: 'P' }, { t: 'W', a: 'M', b: 'P', q0: 1 }],
      note: 'The field inside the conducting sphere is zero, but the potential is not.' },
    { id: 'disk-six', title: 'Charges on a disk: total interaction energy of six like charges', model: 3, kind: 'disk', disk: { N: 6, R: 2, q: 1, center: false, qc: 1 },
      pts: { O: { def: { t: 'center' } } },
      qs: [{ t: 'pairs' }, { t: 'U' }, { t: 'Ucmp' }, { t: 'Ezero', at: 'O' }] }
  ];
})(window.EL);

// Vendored from https://polyfork.dev/anim-carry.mjs on 2026-11-01.
// Polyfork licence: https://polyfork.dev/licensing. Game use; see docs/frontend/character-animation.md.
/* Polyfork · A FULL HAND DOES NOT SWING.
 *
 * Every character here plays the same Mixamo Walk, because the clip is one clip for
 * the whole catalogue and knows nothing about what is worn. So a medic with a case
 * on his hip swings straight through it, and a rifleman's arm walks the rifle back
 * and forth across his body — the motion is correct and the character is not
 * (owner, 2026-09-01).
 *
 * This does not author a clip and does not want to: the house rule is Mixamo or
 * nothing, and rightly so. It takes a baked clip and STILLS one arm — the chain from
 * the shoulder to the hand is pinned to a single pose for the whole cycle, so the
 * hand stays where the bag is while everything else walks as Mixamo shot it.
 *
 * WHICH ARM comes from the character, not from here: lib/char/index.mjs publishes
 * `userData.carry` as 'left' | 'right' | null, worked out from what is actually worn
 * — a held item in either hand slot, or a satchel's own `side`. A character with
 * both hands free is untouched, which is nearly all of them.
 *
 * WHAT POSE. Its own first frame, not the bind pose. The bind pose is a T, and
 * blending a walking shoulder toward a T lifts the arm off the body over the cycle;
 * frame 0 of the walk is already a plausible carrying pose for that build, and it
 * costs nothing to read. `amount` blends, so 1 is a locked arm and 0.6 leaves it
 * some life for a light bag.
 *
 *   import { stillArm } from '/anim-carry.mjs';
 *   const clip = stillArm(rawClips.Walk, character.userData.carry);
 */

const CHAIN = {
  left: ["LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand"],
  right: ["RightShoulder", "RightArm", "RightForeArm", "RightHand"],
};

/* THE BONES BETWEEN A WORN BAG AND THE ARM THAT HOLDS IT.
 *
 * Stilling the arm is not enough on its own, and the number says why: the hand
 * drifts 57 degrees against the bag over a raw cycle and still 11.3 with the arm
 * frozen. A satchel binds to `Spine` (lib/char/wardrobe/pack.mjs) and the arm hangs
 * off `Spine2`, so freezing the arm's LOCAL rotation leaves the hand inheriting the
 * torso twist that the bag does not — the bag rides the hips and the hand does not
 * follow it (owner, 2026-09-01: "the bag is moving with the hips").
 *
 * NO IK, AND IT IS NOT A COMPROMISE. The bag and the arm hang off the same root:
 * both inherit Hips and Spine, so the hips' TRANSLATION cancels exactly and the
 * only divergence left is the rotation of these two bones. That is closed form —
 * undo it on the shoulder and the arm is rigid against the bag — where a solver
 * would iterate to the same answer, need a target nobody has authored, and only
 * run where a solver exists. These clips are baked into the GLB a buyer downloads,
 * and their runtime has no solver: an IK fix would look right on our page and
 * ship broken.
 *
 * A HELD item needs none of this: it is parented to the hand, so it goes wherever
 * the hand goes. Only a WORN bag has a frame of its own to disagree with. */
const SPAN = ["Spine1", "Spine2"];

/* HOW A PERSON CARRIES A BAG AT THE HIP, as the default for every character that
 * wears one — because a rule the builder has to remember is a rule that works until
 * somebody forgets, and this file has watched that happen four times this week.
 *
 * Authored on the field medic and then measured on him:
 *
 *   THE ELBOW GOES BACK, THE SHOULDER WITH IT, AND THE WRIST IS LEFT ALONE. The arm
 *   hangs nearly straight and draws back; the palm is already facing inward — that is
 *   where a hanging hand's palm points — so it falls on the bag's outer face with no
 *   wrist rotation at all. Any twist is something a viewer has to look at.
 *
 *   BENDING THE ELBOW IS THE TRAP. A `foreArm` bend pulls the hand up and INBOARD,
 *   and clearing a bag then needs so much abduction that the arm reads as held out
 *   from the body. On the medic a -32 bend forced +28 of abduction; straight, the
 *   same hand clears at +10.
 *
 * A config that wants something else writes its own `carry.pose` and this steps
 * aside. `hand` is deliberately absent: zero is the point.
 */
export const BAG_POSE = { shoulder: [15, 0, 0], arm: [-16, 0, 10] };

/* THE SAME POSE ON THE OTHER ARM. A left/right limb mirrors across the sagittal
 * plane, which on an XYZ Euler is negating y and z. Verified rather than assumed:
 * of every sign combination tried, only this one puts the right hand outboard of a
 * right-hung bag (-426 mm against a face at -394) and draws it back. */
const mirror = (p) =>
  Object.fromEntries(
    Object.entries(p).map(([k, [x, y, z]]) => [k, [x, -y, -z]]),
  );

/* Shortest-arc quaternion slerp on a flat [x,y,z,w] pair. Small enough to inline,
 * and inlining it keeps this file importable by anything without dragging three in. */
function slerp(ax, ay, az, aw, bx, by, bz, bw, t) {
  let d = ax * bx + ay * by + az * bz + aw * bw;
  if (d < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    d = -d;
  }
  if (d > 0.9995) {
    // nearly equal: lerp and renormalise
    const x = ax + (bx - ax) * t,
      y = ay + (by - ay) * t,
      z = az + (bz - az) * t,
      w = aw + (bw - aw) * t;
    const l = Math.hypot(x, y, z, w) || 1;
    return [x / l, y / l, z / l, w / l];
  }
  const th = Math.acos(d),
    s = Math.sin(th);
  const a = Math.sin((1 - t) * th) / s,
    b = Math.sin(t * th) / s;
  return [ax * a + bx * b, ay * a + by * b, az * a + bz * b, aw * a + bw * b];
}

/* q = a * b, and the conjugate, on flat 4-arrays. */
const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const qinv = (a) => [-a[0], -a[1], -a[2], a[3]];
const qat = (tracks, bone, i) => {
  const v = tracks[bone];
  return v
    ? [v[i * 4], v[i * 4 + 1], v[i * 4 + 2], v[i * 4 + 3]]
    : [0, 0, 0, 1];
};

/** A copy of `clip` with the carrying arm stilled.
 *
 *  `anchor` is the bone a WORN bag binds to ('Spine' for pack's satchel); pass it
 *  and the shoulder is counter-rotated so the whole arm stays rigid against the bag
 *  rather than against the shoulder's own parent. Omit it for a held item, which
 *  needs no such thing. Returns the clip unchanged when `side` is null, so a caller
 *  never has to ask whether any of this applies.
 */
/* Degrees XYZ on a bone's own axes -> quaternion. Intrinsic XYZ, which is what
   THREE.Euler defaults to, so an angle read off the viewer means the same here. */
function euler(d) {
  const [x, y, z] = [d[0] || 0, d[1] || 0, d[2] || 0].map(
    (v) => (v * Math.PI) / 360,
  );
  const cx = Math.cos(x),
    sx = Math.sin(x),
    cy = Math.cos(y),
    sy = Math.sin(y),
    cz = Math.cos(z),
    sz = Math.sin(z);
  return [
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz,
  ];
}
/* pose keys are the bone names without the side, so one pose reads on either arm. */
const POSE_KEY = {
  Shoulder: "shoulder",
  Arm: "arm",
  ForeArm: "foreArm",
  Hand: "hand",
};

/** A copy of `clip` with the WRIST of a hand that is holding something stiffened.
 *
 *  THE HAND MOVES MORE THAN THE THING IT IS HOLDING (owner, 2026-09-20, on the
 *  prospector's pick). That is not a rigging mistake, it is the price of one: eight held
 *  props are bound to the FOREARM rather than the hand, deliberately, and rifle.mjs
 *  measures why — the wrist adds a whole joint of attitude on top of the arm's swing and
 *  carries almost none of the travel, so a rifle bound to the hand see-saws 80 degrees of
 *  pitch and 87 of roll through a Run, which the owner reported as "holding the rifle
 *  upside down". Binding to the forearm cut that to 47 and 39. The cost, written down at
 *  the time and accepted, is that the fist then slides against the object, and that is the
 *  thing being reported now.
 *
 *  SO TAKE THE NOISE OUT INSTEAD OF CHOOSING WHICH END OF IT TO WEAR. The wrist turns up
 *  to 48 degrees through a Walk and 43 through a Run, measured off public/anim/clips.json.
 *  A hand carrying something does not do that — it stiffens, which is what the owner said.
 *
 *  TOWARD THE BIND POSE, AND THE FIRST VERSION OF THIS DAMPED TOWARD THE CYCLE'S MEAN
 *  INSTEAD. I had assumed identity was not this rig's rest; it is — `RightHand`'s bind
 *  local quaternion is exactly (0, 0, 0, 1). The Walk's mean wrist sits 28.2 degrees off
 *  that, so damping to the mean held the joint permanently bent, which rotated every
 *  hand-bound prop 28 degrees from where its forearm-bound version had been aimed. On the
 *  prospector that ran the pick's haft down BEHIND his coat and left only the head showing
 *  past the hem — the exact failure his config had measured and avoided. Damping to the
 *  bind pose instead straightens the wrist toward the forearm, which is both what a hand
 *  carrying something does and what makes the two bones interchangeable: a prop aimed on
 *  the forearm lands where it always did, and now the fist travels with it.
 */
export function stiffenWrist(clip, side, amount = 0.7) {
  const bone = side === "right" ? "RightHand" : "LeftHand";
  const t = clip?.tracks?.[bone];
  if (!t || amount <= 0) return clip;
  const n = clip.times.length;
  const m = [0, 0, 0, 1]; // the bind pose: this rig's wrists rest at identity

  const out = { ...clip, tracks: { ...clip.tracks } };
  const arr = t.slice(); // a plain Array from clips.json, a typed array from a rig
  for (let i = 0; i < n; i++) {
    const q = slerp(
      t[i * 4],
      t[i * 4 + 1],
      t[i * 4 + 2],
      t[i * 4 + 3],
      m[0],
      m[1],
      m[2],
      m[3],
      amount,
    );
    arr[i * 4] = q[0];
    arr[i * 4 + 1] = q[1];
    arr[i * 4 + 2] = q[2];
    arr[i * 4 + 3] = q[3];
  }
  out.tracks[bone] = arr;
  return out;
}

/** A copy of `clip` whose holding wrist keeps the held thing UPRIGHT.
 *
 *  THE CANDLE WAS NOT HELD UPRIGHT, AND NOTHING ELSE HERE COULD HAVE DONE IT (owner,
 *  2026-09-23, on the painted child's veladora: "the hand should be more stable holding the
 *  candle upright"). The candle's angles were solved so it stands plumb in the still the
 *  store opens on, and every clip then tipped it: 20 degrees through the Idle, 22 on average
 *  through the Walk with 35 at worst, 71 in the Run. `stiffenWrist` makes that worse, not
 *  better, for anything that must stay level — it straightens the wrist toward the forearm,
 *  so the object takes the arm's whole swing. That is right for a pick and a rifle, which
 *  travel with the forearm, and wrong for a candle, a lantern or a full cup, which a person
 *  carries by letting the wrist give against the swing.
 *
 *  So the arm is left exactly as the clip has it — swinging free, the owner's standing
 *  ruling on this character — and ONLY the wrist turns, by the smallest rotation that stands
 *  the item's own axis `up` back on world up. `up` is that axis in the hand bone's bind frame,
 *  which the garment declares (`upright()` on the wardrobe entry, published as
 *  `userData.carryUpright`), so this knows nothing about candles.
 *
 *  Rotation only, and closed form, like stillArm: a clip's keys are absolute local rotations
 *  and this rig binds with identity rotations, so the hand's world attitude is the product of
 *  the chain from Hips down. The root's own turn is a yaw and cannot tip anything. Every clip,
 *  not just the walks — an Idle that leans a lit candle 20 degrees is the first thing a
 *  visitor sees. `amount` blends toward the full correction. */
const LEVEL_SPAN = ["Hips", "Spine", "Spine1", "Spine2"];
/* The rotation whose columns are the orthonormal frame built on a primary axis and a rough
 * secondary (projected off it), as a quaternion — fit.aimInHand's basis, without three. */
function frameQuat(p, s) {
  const n = (v) => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const X = n(p);
  const d = s[0] * X[0] + s[1] * X[1] + s[2] * X[2];
  const Z = n([s[0] - d * X[0], s[1] - d * X[1], s[2] - d * X[2]]);
  const Y = [
    Z[1] * X[2] - Z[2] * X[1],
    Z[2] * X[0] - Z[0] * X[2],
    Z[0] * X[1] - Z[1] * X[0],
  ];
  /* matrix columns X Y Z -> quaternion */
  const [m00, m10, m20, m01, m11, m21, m02, m12, m22] = [...X, ...Y, ...Z];
  const tr = m00 + m11 + m22;
  let q;
  if (tr > 0) {
    const s4 = Math.sqrt(tr + 1) * 2;
    q = [(m21 - m12) / s4, (m02 - m20) / s4, (m10 - m01) / s4, s4 / 4];
  } else if (m00 > m11 && m00 > m22) {
    const s4 = Math.sqrt(1 + m00 - m11 - m22) * 2;
    q = [s4 / 4, (m01 + m10) / s4, (m02 + m20) / s4, (m21 - m12) / s4];
  } else if (m11 > m22) {
    const s4 = Math.sqrt(1 + m11 - m00 - m22) * 2;
    q = [(m01 + m10) / s4, s4 / 4, (m12 + m21) / s4, (m02 - m20) / s4];
  } else {
    const s4 = Math.sqrt(1 + m22 - m00 - m11) * 2;
    q = [(m02 + m20) / s4, (m12 + m21) / s4, s4 / 4, (m10 - m01) / s4];
  }
  return q;
}
const rot = (q, v) => {
  const r = qmul(qmul(q, [v[0], v[1], v[2], 0]), qinv(q));
  return [r[0], r[1], r[2]];
};
/*  `up` is either the item's upright alone, a direction in the hand bone's bind frame — the
 *  wrist then turns by the smallest arc that stands it on world up and nothing else — or
 *  `{ up, face, toward }`: the upright, plus a second hand-frame direction `face` (the palm,
 *  say) and where it should point in the BODY's frame, `toward` (+z forward, +x the
 *  wearer's left). That is a whole attitude, held against the hips' own heading, so the hand
 *  does not merely stay level but stays the same hand through the cycle: turned the way
 *  the config asked, only its position swinging with the arm. */
export function levelHand(clip, side, up, amount = 1) {
  const chain = CHAIN[side];
  if (!clip || !chain || !up || amount <= 0 || !clip.tracks?.[chain[3]])
    return clip;
  const spec = Array.isArray(up) ? { up } : up;
  const l = Math.hypot(spec.up[0], spec.up[1], spec.up[2]) || 1;
  const u = [spec.up[0] / l, spec.up[1] / l, spec.up[2] / l];
  /* the item's own frame in the hand, once: (up, face) */
  const have = spec.face && spec.toward ? frameQuat(u, spec.face) : null;
  const n = clip.times.length;
  const src = clip.tracks[chain[3]];
  const arr = src.slice();
  for (let i = 0; i < n; i++) {
    let P = [0, 0, 0, 1]; // the forearm's world attitude
    for (const b of [...LEVEL_SPAN, ...chain.slice(0, 3)])
      P = qmul(P, qat(clip.tracks, b, i));
    const h = qat(clip.tracks, chain[3], i);
    const W = qmul(P, h);
    let want;
    if (have) {
      /* THE WHOLE ATTITUDE: `toward` turned by the hips' heading only (a yaw, so a walk's
         forward lean cannot tip the candle), laid flat, and the hand set so the item's frame
         lands on (world up, that heading). */
      const hf = rot(qat(clip.tracks, "Hips", i), [0, 0, 1]);
      const yaw = Math.atan2(hf[0], hf[2]);
      const c = Math.cos(yaw),
        s = Math.sin(yaw),
        t = spec.toward;
      const to = [t[0] * c + t[2] * s, 0, -t[0] * s + t[2] * c];
      const target = qmul(frameQuat([0, 1, 0], to), qinv(have)); // hand world attitude
      want = qmul(qinv(P), target);
    } else {
      /* where `up` points now, and the shortest arc from there to world +Y */
      const a = rot(W, u);
      const d = a[1];
      let r = [-a[2], 0, a[0], 1 + d]; // cross(a, +Y), 1 + dot
      if (1 + d < 1e-6) r = [1, 0, 0, 0]; // upside down: any horizontal axis
      const rl = Math.hypot(...r) || 1;
      r = r.map((v) => v / rl);
      /* applied in the hand's parent frame: h' = P^-1 r P h */
      want = qmul(qinv(P), qmul(r, W));
    }
    const q = slerp(
      h[0],
      h[1],
      h[2],
      h[3],
      want[0],
      want[1],
      want[2],
      want[3],
      amount,
    );
    arr[i * 4] = q[0];
    arr[i * 4 + 1] = q[1];
    arr[i * 4 + 2] = q[2];
    arr[i * 4 + 3] = q[3];
  }
  return { ...clip, tracks: { ...clip.tracks, [chain[3]]: arr } };
}

/** THE CLIP AS A CHARACTER THAT CARRIES SOMETHING PLAYS IT — the one answer the viewer, the
 *  catalogue renderer, the stills and hand-check all ask, so they cannot drift apart. `ud` is
 *  the character's userData (or anything with the same carry fields). Walks and runs still
 *  the arm for a worn bag and stiffen the wrist; every clip levels the hand when the held
 *  thing declares an upright. Unchanged when nothing is carried. */
/*  AND A LOAD ON THE SHOULDER IS HELD IN EVERY CLIP, NOT ONLY IN THE WALKS. `carryHold:
 *  'fixed'` is the skier's pair of skis: they rest on her shoulder and her fist is up at
 *  the collarbone holding them there, which is the reference's whole silhouette. A bag at
 *  the hip can let an idle's arm hang, because a hanging arm is already beside the bag; a
 *  hand dropped from the shoulder leaves the skis balanced on nothing. So the arm is held
 *  in every clip, at `carryPose` read as ABSOLUTE local rotations — one pose relative to the
 *  chest the skis are bound to, whatever the clip's own first frame was — and the wrist is
 *  not stiffened, because the hand is part of that pose. */
/*  AND A LOAD IN BOTH HANDS HOLDS BOTH ARMS. `carryPose.other` (lib/char/index.mjs, the
 *  fisherman's rod across his body) is the second arm's whole local rotation under the same
 *  fixed hold, so the two fists stay on one object in every clip. `stillArm` reads only the
 *  bone keys of a pose, so `other` riding inside `carryPose` is invisible to the first call. */
export const otherSide = (side) => (side === "left" ? "right" : "left");
export function heldClip(clip, name, ud) {
  if (!clip || !ud?.carry) return clip;
  let c = clip;
  if (ud.carryHold === "fixed") {
    c = stillArm(
      c,
      ud.carry,
      1,
      ud.carryAnchor ?? null,
      ud.carryPose ?? null,
      "fixed",
    );
    const other = ud.carryPose?.other;
    if (other)
      c = stillArm(
        c,
        otherSide(ud.carry),
        1,
        ud.carryAnchor ?? null,
        other,
        "fixed",
      );
  } else if (name === "Walk" || name === "Run") {
    c = stiffenWrist(
      stillArm(c, ud.carry, 1, ud.carryAnchor ?? null, ud.carryPose ?? null),
      ud.carry,
    );
  }
  if (ud.carryUpright) c = levelHand(c, ud.carry, ud.carryUpright);
  return c;
}

/** A copy of `clip` with the carrying arm stilled.
 *
 *  `pose` is the character's own carrying adjustment — { arm, foreArm, hand,
 *  shoulder } in degrees — applied as a DELTA on top of the pose the arm is held at.
 *
 *  A delta, and not an absolute local rotation, because the bind pose is a T. Written
 *  absolute, `arm: [-4, 0, 7]` is not a small nudge at the hip, it is an arm very
 *  nearly straight out sideways: the walk's own frame already carries the whole
 *  rotation that brings the arm DOWN, and replacing it threw the medic's arm out
 *  horizontally. As a delta, {} or [0,0,0] means exactly what the arm did before and
 *  every number an author writes is the change they actually want.
 */
export function stillArm(
  clip,
  side,
  amount = 1,
  anchor = null,
  pose = null,
  hold = null,
) {
  const chain = CHAIN[side];
  /* `hold: 'fixed'` reads `pose` as the bone's whole local rotation rather than a delta on
     the clip's first frame (see heldClip): the same arm in every clip. Absent, nothing
     below changes. */
  const fixed = hold === "fixed";
  if (!clip || !chain || amount <= 0) return clip;
  /* ONLY A WORN BAG. A held item is parented to the hand, so it swings WITH the arm
     and a normal walk is exactly right for it — a rifle or a basket travelling with
     the hand that holds it is what carrying one looks like. Freezing those arms was
     over-reach on my part: it made five characters walk stiffly to solve a problem
     they did not have (owner, 2026-09-01: "characters that have something in their
     hand but not a bag should have normal animation").
     
     `anchor` is set only for something with a frame of its own — a satchel on the
     Spine, which the hand has to stay with because the bag does not follow it. That
     is the whole test, and putting it here means the viewer, the still renders and
     the GLB bake cannot disagree about it. */
  if (!anchor) return clip;
  /* A WORN BAG GETS THE HOUSE POSE unless the character asked for something else:
     `anchor` is only ever set for a bag with a frame of its own, and a held item
     (parented to the hand) neither needs nor wants this. */
  if (!pose && anchor && !fixed)
    pose = side === "right" ? mirror(BAG_POSE) : BAG_POSE;
  /* the delta per bone, resolved once; applied to whatever that bone is held at */
  const delta = {};
  if (pose)
    for (const b of chain) {
      const k = POSE_KEY[b.replace(/^(Left|Right)/, "")];
      if (k && pose[k]) delta[b] = euler(pose[k]);
    }
  const held = {};
  const tracks = {};
  for (const [bone, vals] of Object.entries(clip.tracks)) {
    if (!chain.includes(bone) || vals.length < 4) {
      tracks[bone] = vals;
      continue;
    }
    const out = Float32Array.from(vals);
    /* the clip's own first frame, turned by this character's delta if it declared
       one for this bone. Recorded so the shoulder compensation below holds the same
       orientation the arm is actually posed at. */
    const q0 = [vals[0], vals[1], vals[2], vals[3]];
    const h = delta[bone] ? (fixed ? delta[bone] : qmul(q0, delta[bone])) : q0;
    held[bone] = h;
    const [hx, hy, hz, hw] = h;
    for (let i = 0; i < out.length; i += 4) {
      const q = slerp(
        vals[i],
        vals[i + 1],
        vals[i + 2],
        vals[i + 3],
        hx,
        hy,
        hz,
        hw,
        amount,
      );
      out[i] = q[0];
      out[i + 1] = q[1];
      out[i + 2] = q[2];
      out[i + 3] = q[3];
    }
    tracks[bone] = out;
  }
  /* AND THE SHOULDER CARRIES THE COMPENSATION, because it is the one joint above
     the whole arm: fixing it there moves the forearm and the hand with it, and the
     stilled poses below it stay exactly as they were.

     Wanted: Spine1_t * Spine2_t * Shoulder_t == Spine1_0 * Spine2_0 * Shoulder_0,
     so the arm's orientation relative to `anchor` never changes. Solve for the
     shoulder. */
  /* UNDER A FIXED HOLD, ONLY THE BONES BETWEEN THE ANCHOR AND THE SHOULDER. A load bound
     to `Spine2` — the bone the shoulder itself hangs off — has nothing between it and the
     arm, and an arm held in its own local frame is already rigid against it; compensated
     against Spine1 and Spine2 as well, the fist would slide along skis that ride the chest
     by however far the chest bends. Every other carry keeps both bones whatever its anchor says: the rebozo
     grandmother anchors on `Spine2` and her armful's pose was solved against exactly
     that compensation, so it is left as it was. */
  const span = fixed ? SPAN.slice(SPAN.indexOf(anchor) + 1) : SPAN;
  if (anchor && span.length && tracks[chain[0]]) {
    const n = clip.times.length;
    let base = [0, 0, 0, 1];
    for (const b of span) base = qmul(base, qat(clip.tracks, b, 0));
    /* the shoulder's HELD orientation, authored or not — the compensation keeps the
       arm rigid against the anchor at whatever pose it is being held in */
    const sh0 = held[chain[0]] || qat(tracks, chain[0], 0);
    const out = Float32Array.from(tracks[chain[0]]);
    for (let i = 0; i < n; i++) {
      let sp = [0, 0, 0, 1];
      for (const b of span) sp = qmul(sp, qat(clip.tracks, b, i));
      const want = qmul(qinv(sp), qmul(base, sh0));
      const q = slerp(
        sh0[0],
        sh0[1],
        sh0[2],
        sh0[3],
        want[0],
        want[1],
        want[2],
        want[3],
        amount,
      );
      out[i * 4] = q[0];
      out[i * 4 + 1] = q[1];
      out[i * 4 + 2] = q[2];
      out[i * 4 + 3] = q[3];
    }
    tracks[chain[0]] = out;
  }
  return { ...clip, tracks };
}

export const CARRY_CHAIN = CHAIN;

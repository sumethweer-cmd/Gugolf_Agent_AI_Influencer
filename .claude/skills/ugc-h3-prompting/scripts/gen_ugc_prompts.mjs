#!/usr/bin/env node
// gen_ugc_prompts.mjs — สร้าง H3_SEG<N>_prompt.txt (+ H3_PLAN.md, story.meta.json) ของคลิป UGC นั่งพูดหน้ากล้อง จากไฟล์ spec ของแต่ละเรื่อง
//   node gen_ugc_prompts.mjs --spec story_specs.mjs --out <โฟลเดอร์สัปดาห์> [--only 02_Sweat] [--check] [--force]   (--check = ตรวจ/คำนวณเวลาโดยไม่เขียนไฟล์)
// spec = module ที่ export default { base, bg:{in,out}, stories:[{ key, bg:'in'|'out', place, segs:[{ hands, sum, cont, snd, beats:[B(...)] }] }] }
//   B(size 'MCU'|'CU', a (ประโยคอังกฤษ action ก่อนพูด หรือ ''), tone, d (ไทย หรือ [ท่อน1, ท่อน2]), z (ประโยคหลังพูด หรือ ''), lead, hold, t2)
// เวลาพูดไทย = จำนวนคำ (Intl.Segmenter) / 3.2 (ICU); timestamp สะสมต่อ shot; ความยาวคลิป = ปัดขึ้นเป็นวินาทีเต็ม (≤15) × 24 เฟรม
// ตรวจกฎ: ไม่มี no/not/without/never/don't, ไม่มี dewy/glow/flawless/shimmer/wet skin — ล้มถ้าไม่ผ่าน
// ไม่เขียนทับไฟล์ที่มีอยู่ (ยกเว้น --force); ไฟล์ spec มี segFrom ถ้าอยากข้าม segment ที่เขียนมือแล้ว
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => { if (x.startsWith('--')) a.push([x.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]); return a; }, []));
const die = (m) => { console.error('ERROR:', m); process.exit(1); };
if (!argv.spec || !argv.out) die('ต้องมี --spec <ไฟล์.mjs> และ --out <โฟลเดอร์สัปดาห์>');
const spec = (await import(pathToFileURL(path.resolve(argv.spec)).href)).default;
const NAME = spec.name || 'the character';
const seg = new Intl.Segmenter('th', { granularity: 'word' });
const words = (s) => [...seg.segment(s)].filter((x) => x.isWordLike).length;
const WPS = 3.2; // ICU แบ่งคำไทยละเอียด (~3.2 คำ ICU/วินาที ≈ 2.5 คำพูดทั่วไป) — ปรับตามผลเรนเดอร์จริง
const SIZE = { MCU: 'medium close-up', CU: 'close-up' };
const ts = (t0) => { const t = Math.round(t0 * 24) / 24; const m = Math.floor(t / 60), s = t - m * 60; return `${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`; };
const one = (s) => s.trim().replace(/\s+/g, ' ');
const B = (size, a, tone, d, z = '', lead = 0.4, hold = 0.3, t2 = '') => ({ size, a, tone, d, z, lead, hold, t2 });
const BAD = /\b(no|not|without|never|don't|doesn't|cannot|can't|won't)\b|dewy|glow|flawless|shimmer|wet skin|highlighter/i;
const VIOL = [];
const W = (...a) => { if (!argv.check) fs.writeFileSync(...a); };
const eng = (s) => s.replace(/<d>[\s\S]*?<\/d>/g, '');

const render = (story, si, S) => {
  const bg = spec.bg[story.bg]; const first = si === 0;
  const seat = story.bg === 'in' ? 'in the middle of the sofa seat' : 'in the center of the bench';
  const subject = `<Picture 1> ${NAME} - ${spec.base} She is the woman sitting upright ${seat} and talking directly to the camera across multiple cuts${/^holding/.test(S.hands) ? ', ' + S.hands : '. ' + S.hands[0].toUpperCase() + S.hands.slice(1)}\n${bg.desc}`;
  let t = 0; const shots = []; let n = 0;
  for (const b of S.beats) {
    n++; const parts = (Array.isArray(b.d) ? b.d : (b.d ? [b.d] : [])).map((p) => p.replace(/["“”]/g, ''));
    const speech = parts.reduce((x, p) => x + words(p) / WPS, 0) + (parts.length > 1 ? 0.4 : 0);
    const dur = b.lead + speech + b.hold; const start = t;
    let txt = n === 1 && first ? `A ${SIZE[b.size]}.` : n === 1 ? `A ${SIZE[b.size]}.` : `At ${ts(start)}, the camera cuts to a ${SIZE[b.size]}.`;
    if (n === 1 && !first) txt += ` The video opens already in progress, at the same pace, with the camera exactly where it already is and ${NAME} seated in exactly the same position, ${S.cont}. For the first ${b.lead.toFixed(1)} seconds ${S.contLead || 'she simply holds that position'}.`;
    if (b.a) txt += (n === 1 && !first ? ' Then' : '') + ` ${b.a}`;
    if (parts.length) {
      txt += ` ${n === 1 && !first && !b.a ? 'Then she' : 'She'} says ${b.tone}, <d>[Thai] ${parts[0]}</d>`;
      if (parts.length > 1) txt += ` holding a beat of about 0.4 seconds, then continues ${b.t2 || b.tone}, <d>[Thai] ${parts[1]}</d>`;
    }
    shots.push({ txt, start, dur, b, parts }); t += dur;
  }
  const len = Math.ceil(t - 0.001); if (len > 15) console.log(`  คำเตือน: ${story.key} SEG${si + 1} ยาว ${t.toFixed(1)} วินาที > 15`);
  const extra = len - t; const last = shots[shots.length - 1]; last.dur += extra;
  shots.forEach((s, i) => { const b = s.b; const isLast = i === shots.length - 1; const holdSec = isLast ? b.hold + extra : b.hold;
    if (b.z) s.txt += ` ${b.z}`;
    else if (holdSec >= 0.4) s.txt += ` ${s.parts.length ? 'She' : NAME} holds the expression for about ${holdSec.toFixed(1)} seconds${isLast ? ' until the clip ends' : ''}.`;
    else if (isLast) s.txt += ' The clip ends here.'; });
  const lighting = bg.light;
  const text = `subject_definitions:\n${one(subject)}\n\nsummary:\n[reference generation] ${S.sum} <Picture 1> defines ${NAME}'s identity, skin and outfit; <Picture 2> defines the background.\n\nretention_analysis:\n<Picture 1> (appears in [Shot 1]-[Shot ${shots.length}]): fully_preserved - identity, facial features, hairstyle, glasses, skin texture and outfit retained across all shots.\n<Picture 2> (appears in [Shot 1]-[Shot ${shots.length}]): fully_preserved - the ${story.bg === 'in' ? 'room' : 'garden patio'} retained as the background throughout.\n\ndetailed_description:\nOrdinary smartphone footage of a seated talking-to-camera vlog, vertical 9:16, recorded by a front camera propped at seated eye level and facing her straight on; the camera stays perfectly still for the whole clip and only ${NAME} moves. Every cut changes only the shot size, between a medium close-up from head to chest and a close-up of head and shoulders, with the same angle, the same light and the same background. ${lighting}\n${shots.map((s, i) => `[Shot ${i + 1}] ${one(s.txt)}`).join('\n')}\n\noverall_soundscape:\n${bg.snd}${S.snd ? ', ' + S.snd : ''}.\n\nnon_diegetic_music:\nN/A\n`;
  const e = eng(text); const re = new RegExp(BAD.source, 'gi'); let m; while ((m = re.exec(e))) VIOL.push(`${story.key} SEG${si + 1}: "${m[0]}" ใน ...${e.slice(Math.max(0, m.index - 50), m.index + 40).replace(/\n/g, ' ')}...`);
  return { text, len, frames: len * 24, shots };
};

if (!argv.check) fs.mkdirSync(argv.out, { recursive: true });
for (const story of spec.stories) {
  if (argv.only && argv.only !== story.key) continue;
  const dir = path.join(argv.out, story.key); if (!argv.check) fs.mkdirSync(dir, { recursive: true });
  const rows = []; const frames = [];
  const off = story.segOffset || 0;
  story.segs.forEach((S, si0) => {
    const si = si0 + off; const r = render(story, si, S); const f = path.join(dir, `H3_SEG${si + 1}_prompt.txt`);
    const skip = fs.existsSync(f) && !argv.force; if (!skip) W(f, r.text);
    rows.push({ n: si + 1, len: r.len, frames: r.frames, shots: r.shots.length, skip, spoken: r.shots.flatMap((s) => s.parts).join(' / ') }); frames.push(r.frames);
  });
  const meta = { story: story.key, title: story.title, background: story.bg === 'in' ? 'Backgrounds/01_Indoor_Quiet_Vlog.png' : 'Backgrounds/02_Outdoor_Garden.png', picture1: spec.picture1, frames: [...(story.prefixFrames || []), ...frames], status: 'DRAFT — ยังไม่ได้เรนเดอร์/ตรวจโดยผู้ใช้' };
  const mf = path.join(dir, 'story.meta.json'); if (!fs.existsSync(mf) || argv.force) W(mf, JSON.stringify(meta, null, 2));
  const pf = path.join(dir, 'H3_PLAN.md');
  if (!fs.existsSync(pf) || argv.force) W(pf, `# ${story.key} — แผน H3 (สร้างจาก spec)\nสถานะ: DRAFT รอผู้ใช้ตรวจ · prompt: ${rows.map((r) => `H3_SEG${r.n}_prompt.txt`).join(', ')}\n\n## รูปที่ใส่ (ทุก segment ชุดเดิม)\n- **Picture 1** (${NAME} หน้า+ชุด): \`${spec.picture1}\` (เปลี่ยนได้ — ข้อความชนะรูปเมื่อขัดกัน)\n- **Picture 2** (ฉากหลัง): \`${meta.background}\`\n\n## segment\n| Seg | ความยาว | เฟรม (24 fps) | shot | บทพูดไทย (ย่อ) |\n|---|---|---|---|---|\n${rows.map((r) => `| SEG${r.n} | ${r.len} วินาที | ${r.frames} | ${r.shots} | ${r.spoken} |`).join('\n')}\n\nรวม ${rows.reduce((x, r) => x + r.len, 0)} วินาที · ${story.segs.length} segment ต่อเป็น 1 job (\`continuity_mode\`: seg1 = shot, ที่เหลือ = context)\n\n## หมายเหตุ\n- บทพูดควรเป็นภาษาพูด ความหมายเดิม ไม่เพิ่มข้ออ้างเกินจริง — ผู้ใช้ตัดสินถ้อยคำ\n- เวลา/timestamp คำนวณจาก ~3.2 คำ (ICU) ต่อวินาที ไม่ได้วัดจากคลิปจริง ต้องปรับตามผลทดสอบ\n- ยังไม่ได้ทดสอบเรนเดอร์; ความเสี่ยงที่เคยเจอ: framing กว้างกว่าที่เขียน, มือ/นิ้วเพี้ยนเมื่อทำหลายท่า\n${story.note ? '\n' + story.note + '\n' : ''}`);
  if (VIOL.length) { /* reported at end */ }
  console.log(`${story.key}: ${rows.map((r) => `SEG${r.n} ${r.len}s/${r.frames}f/${r.shots}shot${r.skip ? '(มีไฟล์แล้ว ข้าม)' : ''}`).join(' | ')}  รวม ${rows.reduce((x, r) => x + r.len, 0)}s`);
}

if (VIOL.length) { console.error(`\nพบคำต้องห้าม ${VIOL.length} จุด:`); VIOL.forEach((v) => console.error(' - ' + v)); process.exit(1); }

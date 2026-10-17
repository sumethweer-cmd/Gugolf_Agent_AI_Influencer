#!/usr/bin/env node
// supabase_prompts.mjs — ดึง/ส่ง prompt ของเรื่อง (pipeline_content_items) ระหว่าง Supabase กับไฟล์ในเครื่อง แล้วสร้าง config สำหรับสั่งเรนเดอร์
//   --todo                              รายการเรื่องที่ยังไม่มีคลิป SUCCESS (view render_todo)
//   --pull <content_item_id> --out <โฟลเดอร์> --images a.png,b.png [--frames 336,312] [--project ชื่อ] [--provider rp|rh]
//                                       เขียน SEG1_prompt.txt.. จาก compiled_prompt + สร้าง rp.<project>.config.json (หรือ rh.*)
//   --push --dir <โฟลเดอร์เรื่อง> [--title "ชื่อเรื่อง"] | --week <โฟลเดอร์สัปดาห์>  [--character mycharacter] [--date YYYY-MM-DD] [--go]   (อ่าน story.meta.json ถ้ามี: title/frames/รูป → ใส่ในคอลัมน์ note)
//                                       อ่าน SEG*_prompt.txt แล้วสร้างแถวหลัก (segment 1) + แถว segment ที่เหลือ — DRY-RUN จนกว่าจะใส่ --go
// ใช้ SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY จาก .env (ค้นหาขึ้นไปจากโฟลเดอร์ปัจจุบัน หรือ --env) — ไม่พิมพ์ key
// แถวหลัก = segment 1; segment 2..N ชี้ parent_content_item_id → แถวหลัก + segment_number (ตามที่ render_tasks/render_todo ใช้)
import fs from 'node:fs';
import path from 'node:path';

const argv = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => {
  if (x.startsWith('--')) a.push([x.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return a;
}, []));
const die = (m) => { console.error('ERROR:', m); process.exit(1); };
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));

(function loadEnv() {
  let file = argv.env ? path.resolve(argv.env) : null;
  if (!file) { let d = process.cwd(); for (let i = 0; i < 8; i++) { const f = path.join(d, '.env'); if (fs.existsSync(f)) { file = f; break; } const up = path.dirname(d); if (up === d) break; d = up; } }
  if (!file || !fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/); if (!m) continue;
    const v = m[2].replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1'); if (v && !process.env[m[1]]) process.env[m[1]] = v;
  }
})();
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) die('ต้องมี SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env');
const base = process.env.SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1';
const hdr = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
const api = async (method, p, body, extra = {}) => {
  const r = await fetch(base + p, { method, headers: { ...hdr, ...extra }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); if (!r.ok) die(`${method} ${p.split('?')[0]} → HTTP ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
};
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'story';

if (argv.todo) {
  const rows = await api('GET', '/render_todo?select=content_item_id,title,character,model,plan_status,segments,last_provider,last_render_status,scheduled_date&order=scheduled_date.asc.nullslast');
  console.log(`ยังไม่มีคลิป SUCCESS: ${rows.length} เรื่อง`);
  for (const r of rows) console.log(`${r.content_item_id}  ${String(r.character || '').padEnd(6)} ${String(r.model || '').padEnd(11)} seg=${r.segments}  ${r.plan_status}  ${r.scheduled_date || '-'}  ${r.title || ''}  ${r.last_provider ? '(ล่าสุด ' + r.last_provider + ' ' + r.last_render_status + ')' : ''}`);
} else if (argv.pull) {
  const id = String(argv.pull); if (!argv.out || !argv.images) die('--pull ต้องมี --out <โฟลเดอร์> และ --images a.png,b.png (Picture 1,2,… ตามลำดับ)');
  const rows = await api('GET', `/pipeline_content_items?select=id,title,character,model,segment_number,parent_content_item_id,compiled_prompt&or=(id.eq.${id},parent_content_item_id.eq.${id})`);
  if (!rows.length) die('ไม่พบ content item ' + id);
  rows.sort((a, b) => (a.id === id ? 0 : 1) - (b.id === id ? 0 : 1) || (a.segment_number || 0) - (b.segment_number || 0));
  const out = path.resolve(String(argv.out)); fs.mkdirSync(out, { recursive: true });
  const frames = String(argv.frames || '').split(',').filter(Boolean).map(Number);
  const segs = rows.map((r, i) => {
    if (!r.compiled_prompt) die(`segment ${i + 1} (${r.id}) ไม่มี compiled_prompt`);
    const f = `H3_SEG${i + 1}_prompt.txt`; fs.writeFileSync(path.join(out, f), r.compiled_prompt.replace(/\r\n/g, '\n'));
    return { prompt: f, frames: frames[i] || 360 };
  });
  if (frames.length !== segs.length) console.log(`คำเตือน: --frames ${frames.length} ค่า แต่มี ${segs.length} segment → ใช้ 360 เฟรม (15 วินาที) สำหรับที่ไม่ได้ระบุ ตรวจก่อนส่งจริง`);
  const project = argv.project || `${rows[0].character || 'story'}_${slug(rows[0].title)}`; const prov = argv.provider === 'rh' ? 'rh' : 'rp';
  const cfg = { _note: `ดึงจาก Supabase ${new Date().toISOString().slice(0, 10)} — ${rows[0].title || id}`, projectName: project, nodes: { editor: '29', project: '15' },
    images: String(argv.images).split(',').map((s) => path.relative(out, path.resolve(s.trim())).replace(/\\/g, '/')), segments: segs, storyKey: argv.story || undefined, contentItemId: id, segFrom: 1, segCount: segs.length, outDir: prov === 'rh' ? 'rh_outputs' : 'rp_outputs' };
  if (prov === 'rh') Object.assign(cfg, { baseUrl: 'https://www.runninghub.ai', workflowId: '', pollSeconds: 15, timeoutMinutes: 60 });
  else cfg.runpod = { template: argv.template || '../../tools/workflow_api_runpod_ugc.json', gpu: argv.gpu || '4090', hourlyUsd: Number(argv.rate) || 0.89, outDir: 'rp_outputs' };
  const cf = path.join(out, `${prov}.${slug(project)}.config.json`); fs.writeFileSync(cf, JSON.stringify(cfg, null, 2));
  console.log(`ดึง ${segs.length} segment → ${out}\nconfig: ${cf}\n(ปรับ template/runpod.hourlyUsd/workflowId ให้ตรงก่อนส่ง — แล้วรัน dry-run ของสคริปต์เรนเดอร์)`);
} else if (argv.push) {
  // --dir <โฟลเดอร์เรื่อง> หรือ --week <โฟลเดอร์สัปดาห์> (ทุกโฟลเดอร์ย่อยที่มี H3_SEG*_prompt.txt)
  const dirs = argv.week ? fs.readdirSync(path.resolve(String(argv.week)), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(path.resolve(String(argv.week)), d.name)) : [path.resolve(String(argv.dir || '.'))];
  const planned = [];
  for (const dir of dirs) {
    const files = fs.readdirSync(dir).filter((f) => /^H3_SEG\d+_prompt\.txt$/.test(f)).sort((a, b) => parseInt(a.match(/SEG(\d+)/)[1]) - parseInt(b.match(/SEG(\d+)/)[1]));
    if (!files.length) continue;
    const mf = path.join(dir, 'story.meta.json'); const meta = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : {};
    const title = (argv.dir && argv.title) || meta.title || path.basename(dir);
    planned.push({ dir, files, meta, title });
  }
  if (!planned.length) die('ไม่พบโฟลเดอร์ที่มี H3_SEG<N>_prompt.txt');
  for (const p of planned) console.log(`${argv.go ? 'เขียน' : 'DRY-RUN จะเขียน'}: "${p.title}" — ${p.files.length} แถว (${argv.character || 'character'}, minimax-h3, pending) frames=${JSON.stringify(p.meta.frames || null)}`);
  if (!argv.go) { console.log('ใส่ --go เพื่อเขียนลง Supabase (ข้ามเรื่องที่มีแถวหลักชื่อเดียวกันอยู่แล้ว)'); process.exit(0); }
  for (const p of planned) {
    const dup = await api('GET', `/pipeline_content_items?select=id&title=eq.${encodeURIComponent(p.title)}&parent_content_item_id=is.null`);
    if (dup.length) { console.log(`ข้าม "${p.title}" — มีแล้ว (id ${dup[0].id})`); continue; }
    const note = JSON.stringify({ source: 'ugc-weekly', story: p.meta.story || path.basename(p.dir), picture1: p.meta.picture1, picture2: p.meta.background, frames: p.meta.frames, status: p.meta.status });
    const mk = (f, n) => ({ character: argv.character || 'character', model: 'minimax-h3', status: 'pending', title: n === 1 ? p.title : `${p.title} — SEG${n}`, compiled_prompt: fs.readFileSync(path.join(p.dir, f), 'utf8'), scheduled_date: argv.date || null, note });
    const [main] = await api('POST', '/pipeline_content_items', { ...mk(p.files[0], 1), segment_number: 1 }, { Prefer: 'return=representation' });
    for (let i = 1; i < p.files.length; i++) await api('POST', '/pipeline_content_items', { ...mk(p.files[i], i + 1), parent_content_item_id: main.id, segment_number: i + 1 }, { Prefer: 'return=minimal' });
    console.log(`"${p.title}": แถวหลัก ${main.id} + ${p.files.length - 1} segment`);
  }
} else die('ระบุโหมด: --todo | --pull <id> | --push');
await sleep(150); process.exit(0);

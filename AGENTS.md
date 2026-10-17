# AGENTS.md — อ่านไฟล์นี้ก่อน (สำหรับ AI agent: Claude Code / Codex)

รีโปนี้คือชุดเครื่องมือ + prompt สำเร็จรูปสำหรับทำคลิป AI (MiniMax H3 บน ComfyUI) แล้วสั่งเรนเดอร์เป็น batch ผ่าน **RunPod** หรือ **RunningHub** ผู้ใช้เป็นนักเรียน — อธิบายเป็นภาษาไทย ตรงไปตรงมา

## กฎที่ต้องทำตามเสมอ (ความปลอดภัยและเงิน)
1. **ห้ามขอ/รับ/พิมพ์ API key ในแชท.** ให้ผู้ใช้กรอกไฟล์ `.env` เอง (ก๊อปจาก `.env.example`) แล้วตรวจแค่ว่าตัวแปรไม่ว่าง **โดยไม่แสดงค่า**. ห้าม commit `.env`
2. **ทุกงานที่เสียเงิน (coins / เวลา GPU) ต้องได้ยืนยันจากผู้ใช้ก่อน** บอกก่อนว่า provider ไหน กี่ segment กี่วินาที ประมาณเวลา/ต้นทุน. สคริปต์เรนเดอร์ทุกตัวเป็น **dry-run เป็นค่าเริ่มต้น** — ส่งจริงเมื่อใส่ `--go` เท่านั้น
3. **ห้ามหยุด/ลบ pod เอง** ถ้าผู้ใช้ไม่สั่ง (`runpod_pod.mjs stop|terminate` ต้องมี `--confirm`) แต่เตือนผู้ใช้ว่า pod ที่เปิดค้างเสียค่าเช่าต่อ
4. **ห้ามเขียนข้อมูลลงบริการภายนอก** (Supabase ฯลฯ) หรือ push ขึ้น git โดยไม่บอกผู้ใช้ก่อนว่าจะเขียนอะไร
5. **ห้ามปั้นสูตรเอง:** เขียน prompt จากแม่แบบใน `prompts/` เสมอ. แม่แบบที่ติดป้าย `experimental` ยังไม่เคยยืนยันผล — บอกผู้ใช้ก่อนใช้
6. ห้ามโหลด/รันไฟล์จากแหล่งที่ไม่น่าเชื่อถือ; โมเดลและ custom node ผู้ใช้ติดตั้งเอง (ดูเงื่อนไข license ของแต่ละตัว)

## เริ่มต้น: ถามผู้ใช้สั้นๆ ก่อนทำอะไร
- ใช้ RunPod หรือ RunningHub? มี API key (ใส่ใน `.env`) แล้วหรือยัง?
- ติดตั้ง workflow "Motion Context V2" + โมเดล H3 ครบแล้วหรือยัง? (ถ้ายังดู `docs/SETUP.md`)
- อยากทำคลิปแบบไหน: เต้นตามท่า (DWPose) / นั่งพูด UGC / สินค้า / อื่นๆ ความยาวกี่วินาที

## อ่านอะไรเมื่อไหร่ (อ่านเฉพาะที่เกี่ยวกับงาน)
| งาน | อ่าน |
|---|---|
| เขียน prompt คลิปเต้น | `prompts/dance_pose_copy_B_silent.txt` (หรือ A), แล้ว `docs/dance_pose_copy.md` และ `docs/RULES.md` |
| เต้นยาว/หลาย segment | `prompts/dance_pose_copy_2seg_*.txt` |
| เต้น + เสียงบรรยาย, เปลี่ยนชุดกลางคลิป | `prompts/dance_with_voiceover_15s.txt`, `prompts/dance_outfit_change.txt` (experimental) |
| UGC นั่งพูด / สินค้า / สยองขวัญ | `.claude/skills/ugc-h3-prompting/SKILL.md`, `prompts/product_ugc_*`, `prompts/ghost_hunt_*` (experimental) |
| สั่งเรนเดอร์ / เช็กสถานะ / เก็บผล | `.claude/skills/ugc-render-ops/SKILL.md` และ `.claude/skills/comfyui-runpod-batch/SKILL.md` |
| ตั้งค่า pod ใหม่ / SageAttention error | `docs/SETUP.md` |
| สร้างหลายเรื่องจาก spec | `.claude/skills/ugc-h3-prompting/SKILL.md` หัวข้อ "ตัวสร้าง prompt จาก spec" |

## ภาพรวมการทำงาน
`เขียน prompt (จากแม่แบบ)` → `ตั้ง config` → `dry-run` → **ผู้ใช้ยืนยัน** → `ส่งงาน --go --nowait` → ผู้ใช้เช็ก `--status` / `--collect` → ตรวจคลิป → (ผู้ใช้สั่งเอง) หยุด pod

สคริปต์อยู่ที่ `.claude/skills/comfyui-runpod-batch/scripts/` (Node 18+, ไม่มี dependency): `runpod_render.mjs`, `runninghub_run.mjs`, `runpod_pod.mjs`, `gen_ugc_prompts.mjs`, `ledger_sync.mjs`, `supabase_prompts.mjs` (ตัวเลือก)

## สิ่งที่ยืนยันแล้ว vs ยังไม่ยืนยัน
- **ยืนยันแล้ว:** แม่แบบเต้น (ไม่มี timestamp, `[Shot 1]` เดียว, สีหน้าเป็นร้อยแก้ว, ระบุปากให้ชัด) ได้ผลดีมากกับ DWPose; การสั่งงาน RunPod และ RunningHub ผ่าน API; 8 steps + 1.0 MP รอบเดียว (`sampling_mode single`) ภาพดี
- **ยังไม่ยืนยัน:** แม่แบบที่ติดป้าย experimental; เวลาพูดที่ประมาณจากจำนวนคำ; ทุกอย่างที่เกี่ยวกับ RAM/OOM ของงานหลาย segment
- รายงานผลที่ผู้ใช้ได้กลับมาให้ผู้ใช้จดลงในไฟล์ของโปรเจกต์เอง อย่าสรุปเป็นกฎจากการทดสอบครั้งเดียว

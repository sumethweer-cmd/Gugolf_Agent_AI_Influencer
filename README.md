# Gugolf Agent — AI Prompt Team & Mentor

พี่เลี้ยง AI สำหรับนักเรียนที่ทำคลิป AI ด้วย **MiniMax H3** — ช่วยคิดไอเดีย สร้างตัวละคร (character DNA) ทำ storyboard และ **เขียน prompt** ผ่าน "ทีมสร้าง prompt" แล้วสอนเอา prompt ไปรันเองใน workflow บน RunningHub

> agent ในรีโปนี้ **ช่วยสร้าง prompt และสอน** เท่านั้น ไม่เรนเดอร์ ไม่ส่งงานแทน คุณกดรันเองบนเว็บ
> สถานะ: ชุดเริ่มต้นจากงานทดลองจริง — แม่แบบที่ติดป้าย **verified** ผ่านการทดสอบแล้ว ที่ติดป้าย **experimental** ยังไม่ผ่านการเรนเดอร์ ใช้เป็นจุดเริ่มต้นแล้วรายงานผลกลับมา

## ต้องมีอะไรก่อน
- **Claude Code หรือ Codex** (agent ที่รันคำสั่งและอ่านไฟล์ในเครื่องคุณได้) — แนะนำอย่างยิ่ง
- Node.js 18+ และ git (ถ้าจะทำรูป storyboard ด้วย API ต้องมี `curl` กับ `jq` ด้วย)
- บัญชี **RunningHub** + เครดิตสำหรับรัน workflow (ดู `docs/USE_WORKFLOW.md`)
- **Codex** สร้างรูป storyboard เองได้ ไม่ต้องมี key · **Claude Code** สร้างรูปเองไม่ได้ ถ้าอยากได้รูปต้องมี OpenAI หรือ Gemini API key (หรือใช้ storyboard แบบข้อความ) — ดู `docs/API_KEYS.md`

## เริ่มใช้งาน (วางให้ agent)
เปิด Claude Code/Codex ในโฟลเดอร์ว่างที่จะทำงาน แล้ววางข้อความนี้:

```text
ช่วยฉันเริ่มต้นใช้ชุดเครื่องมือสร้าง prompt คลิป AI จากรีโปนี้: https://github.com/sumethweer-cmd/Gugolf_Agent_AI_Influencer

ฉันเป็นมือใหม่ ให้คุณทำตัวเป็นพี่เลี้ยง ทำตามนี้:
1. ติดตั้งก่อน: git clone รีโปลงโฟลเดอร์ที่ฉันอยู่ แล้วอ่าน AGENTS.md และทำตามทั้งหมด รวมถึงหัวข้อ "โหมดพี่เลี้ยง"
2. ตรวจเครื่อง (Node.js 18 ขึ้นไป, git) ถ้าขาดอะไร บอกวิธีติดตั้งแล้วรอให้ฉันยืนยัน ห้ามติดตั้งเองโดยไม่ถาม
3. ถามฉันก่อนว่าฉันใช้ agent ตัวไหน (Claude Code หรือ Codex) แล้วบอกตามจริงว่าเรื่องสร้างรูป storyboard ต้องใช้ API key ไหมสำหรับตัวที่ฉันใช้ (อย่าให้ฉันวาง key ในแชท ให้ฉันกรอกใน .env เอง)
4. ช่วยฉันคิดไอเดียคลิป (ถามว่าอยากทำอะไร แล้วเสนอ 5 ไอเดีย), เลือกหรือสร้างตัวละคร (character DNA) และสร้าง prompt ผ่านทีมสร้าง prompt ในรีโป
5. สอนฉันไปพร้อมๆ กัน ทีละเรื่อง อธิบายสั้นๆ ว่าทำไม ถามทีละข้อ อย่าส่งข้อความยาวทีเดียว
6. พอได้ prompt แล้ว สอนฉันเอาไปรันใน workflow บนเว็บ RunningHub ด้วยตัวเอง (ตาม docs/USE_WORKFLOW.md) เริ่มจากคลิปทดสอบสั้นๆ
7. ถ้าไม่แน่ใจอะไร (เช่นเมนูบนเว็บ) บอกว่าไม่แน่ใจ อย่าเดา
8. บันทึกความคืบหน้าในไฟล์ STUDENT_PROGRESS.md (ห้ามใส่ key)
```

ข้อความสำเร็จรูปอื่นๆ (เขียน prompt, ทำ storyboard, สอนรัน workflow, ปรับ prompt เมื่อผลไม่ดี) อยู่ที่ [`docs/STUDENT_PROMPTS.md`](docs/STUDENT_PROMPTS.md)

## ในรีโปมีอะไร
| ที่ | คืออะไร |
|---|---|
| [`AGENTS.md`](AGENTS.md) | ทางเข้าของ agent: กฎ, โหมดพี่เลี้ยง 9 ขั้น, อ่านอะไรเมื่อไหร่ (`CLAUDE.md` ชี้มาไฟล์นี้) |
| `.claude/skills/content-*`, `format-router`, `delivery-format-selector`, `prompt-*`, `comfyui-compiler` | **ทีมสร้าง prompt**: คิดไอเดีย/แผนสัปดาห์ → บท → สไตล์กล้อง → prompt เฉพาะโมเดล |
| `.claude/skills/storyboard-builder/` | ทำ storyboard ทีละฉาก พร้อมรูปประกอบ (Codex สร้างรูปเอง / Claude Code ใช้ OpenAI-Gemini key) |
| `.claude/skills/ugc-h3-prompting/` | วิธีเขียนบท/shot/prompt คลิป UGC นั่งพูด + ตัวสร้าง prompt จาก spec + ตัวอย่าง |
| `characters/`, `content_dna/`, `format_bibles/`, `model_specs/`, `platform_specs/`, `schemas/` | ข้อมูลที่ทีมอ่าน: character DNA (มีตัวอย่าง + TEMPLATE), โครงเนื้อหา, สไตล์กล้อง/ท่าทาง, สเปคโมเดล/แพลตฟอร์ม |
| [`prompts/`](prompts) | prompt สำเร็จรูป: เต้นตามท่า (verified), เต้นหลาย segment, เต้น + เสียงบรรยาย, เปลี่ยนชุด, สินค้า UGC, ล่าท้าผี |
| [`docs/USE_WORKFLOW.md`](docs/USE_WORKFLOW.md) | เอา prompt ไปรันใน workflow บน RunningHub (+ ปัญหาที่เจอบ่อย) |
| [`docs/API_KEYS.md`](docs/API_KEYS.md) | ต้องใช้ key ตอนไหน ขอที่ไหน ใส่ `.env` ยังไง (เฉพาะสร้างรูป storyboard ด้วย API) |
| [`docs/PIPELINE.md`](docs/PIPELINE.md) | ทีมสร้าง prompt ทำงานยังไง + วิธีสร้างตัวละครของตัวเอง |
| [`docs/RULES.md`](docs/RULES.md) | บทเรียนการเขียน prompt พร้อมระดับความมั่นใจ |
| [`docs/STUDENT_PROMPTS.md`](docs/STUDENT_PROMPTS.md) | ข้อความสำเร็จรูปให้นักเรียนวางกับ agent |

## หลักการ (สรุป)
- ห้ามวาง API key ในแชท — กรอกใน `.env` เอง; ไม่ commit ผลลัพธ์/ไฟล์สื่อ
- **ไม่มี timestamp ในคลิปเต้นที่ก๊อปท่า**, ระบุปากให้ชัด, สีหน้าเขียนเป็นร้อยแก้ว (ดู `docs/RULES.md`)
- รายงานผลทดสอบของคุณกลับมาจะช่วยให้ปรับแม่แบบที่ยังเป็น experimental

## ข้อควรรู้
- เนื้อหาอ้างอิง MiniMax H3 + Easy-Media เวอร์ชันที่ใช้ตอนทดสอบ ถ้า workflow ของคุณต่าง ผลอาจต่าง
- **เนื้อหาผู้ใหญ่:** ตัวอย่างบางส่วน (เช่น `characters/momo`, `content_dna/flirty.md`, `content_dna/fan_interaction.md`, `format_bibles/candid_activity_glimpse.md`) ออกแบบมาเพื่อเนื้อหาแนวเกี้ยวพาราสี/NSFW-tier ใช้ตามกติกาแพลตฟอร์มและกฎหมาย และต้องเป็นเนื้อหาสำหรับผู้ใหญ่เท่านั้น
- RunningHub / โมเดล / custom node มีเงื่อนไขการใช้งานและราคาของตัวเอง รีโปนี้ไม่ได้แจกโมเดลหรือเครดิต
- คลิปสินค้า/โฆษณา: อย่าสร้างข้ออ้างเกินจริง และติดป้ายโฆษณาตามกติกาแพลตฟอร์ม
- **License:** ไฟล์ในรีโปนี้ใช้ [MIT License](LICENSE) ครอบคลุมเฉพาะสิ่งที่อยู่ในรีโปนี้ ไม่รวมโมเดล H3, custom node และ workflow ที่คุณติดตั้งเอง ซึ่งมีเงื่อนไข/license ของตัวเอง

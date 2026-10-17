# SETUP — เตรียมเครื่องและ pod

## 1. สิ่งที่ต้องมีในเครื่องคุณ
- **Claude Code หรือ Codex** (agent ที่รันคำสั่งในเครื่องได้) + **Node.js 18+** + **git**
- (ไม่บังคับ) ffmpeg สำหรับตัด/แปลงคลิปอ้างอิงและตรวจคลิป
- บัญชี **RunPod** (เครดิต) และ/หรือ **RunningHub** (coins) พร้อม API key — กรอกใน `.env` เอง ห้ามวางในแชท

## 2. สิ่งที่ผู้ให้บริการ/ตัวคุณต้องติดตั้งเอง (ไม่อยู่ในรีโปนี้)
- workflow "MiniMax H3 Motion Context V2" และ custom node (เช่น ComfyUI-Easy-Media, KJNodes) พร้อมโมเดล H3 (UNET/CLIP/VAE/LoRA) — **โหลดจากแหล่งต้นทางเอง และอ่านเงื่อนไข license ของแต่ละตัว**
- RunningHub: เปิด workflow ของคุณแล้วดู workflow id; RunPod: ไม่มี workflow id — ใช้กราฟ API-format (export จาก ComfyUI ของ pod, หรือดึงจาก `/history` ด้วย `extract_graph.mjs`) วางไว้ที่ `.claude/skills/ugc-render-ops/templates/` แล้วชี้ใน config
- ไฟล์ `templates/workflow_api_*.json` ในรีโปเป็นโครงเปล่า (ไม่มี prompt/รูป) ใช้ตรวจเลข node ได้ แต่ path โมเดลอาจต่างจากของคุณ

## 3. ตั้งค่าครั้งแรก
```bash
cp .env.example .env      # แล้วเปิดกรอกค่าเอง (ห้ามส่งค่าให้ AI)
```
ทดสอบสคริปต์โดยไม่เสียเงิน (dry-run):
```bash
node .claude/skills/comfyui-runpod-batch/scripts/gen_ugc_prompts.mjs --spec .claude/skills/ugc-h3-prompting/templates/story_specs.example.mjs --out ./out --check
```

## 4. Pod ใหม่บน RunPod: แก้ SageAttention (สำคัญ)
อาการ: งานล้มทันทีที่โหนด `MiniMaxH3MemoryEfficientSageAttentionPatch` ว่า `sageattention is not new enough version or could not determine CUDA architecture` (PyPI มีแค่ 1.0.6 แต่ต้อง 2.x) หรือ ComfyUI **abort (exit 134)** กลาง sampling — build จากซอร์สบน pod:
```bash
V=<venv>/lib/python3.12/site-packages/nvidia/cu13         # โฟลเดอร์ nvidia/cu13 ใน venv ของ ComfyUI
export CPATH=$V/include:$CPATH LD_LIBRARY_PATH=$V/lib:$LD_LIBRARY_PATH TORCH_CUDA_ARCH_LIST="8.9;12.0" MAX_JOBS=4
cd /workspace && git clone https://github.com/thu-ml/SageAttention.git && cd SageAttention
pip install --no-build-isolation -e . > /workspace/sage_build.log 2>&1; tail -3 /workspace/sage_build.log
python -c "from sageattention.core import get_cuda_arch_versions; print(get_cuda_arch_versions())"   # 4090 -> ['sm89'], 5090 -> ['sm120']
```
- ใส่ `8.9;12.0` ทั้งคู่ เพื่อใช้ได้กับ 4090 และ 5090 (ถ้า build แค่ 8.9 แล้วไปรันบน 5090 จะ abort)
- ถ้า `fatal error: cusparse.h` = ตั้ง `CPATH` ให้ชี้ `nvidia/cu13/include` ตามข้างบน; build ใช้เวลา ~10–20 นาที; แล้วรีสตาร์ท ComfyUI
- ตัวอย่างนี้ใช้กับ torch 2.10+cu130 / Python 3.12 — ถ้า stack ของคุณต่าง ให้ปรับตาม

## 5. ค่าตั้งที่ใช้แล้วภาพดี
8 steps, 1.0 MP, `sampling_mode: single` (รอบเดียว), 24 fps, 9:16, กฎ frames × MP ≤ ~540 ต่อ segment ที่ใช้เป็นแนวทาง (ไม่ใช่ขีดจำกัดที่ยืนยัน)

## 6. ข้อควรระวังเรื่องทรัพยากร
- งานหลาย segment ใน job เดียวเคยทำให้เครื่องล่ม (OOM) บน GPU 24 GB สาเหตุยังไม่ยืนยัน (RAM สะสมข้าม segment หรือ segment ยาวเกิน) — ถ้าเจอ ลองแบ่งรันด้วย `segment_start_number` / `segment_count`, ลดความยาว segment หรือลด MP
- ดู RAM ของ container ที่ถูกต้องด้วย `cat /sys/fs/cgroup/memory.current` และ `memory.max` (`free -m` แสดงค่าของ host ทั้งเครื่อง ไม่ใช่โควต้าของคุณ)
- pod ที่เปิดค้างเสียค่าเช่าต่อ — หยุดเมื่อใช้เสร็จ

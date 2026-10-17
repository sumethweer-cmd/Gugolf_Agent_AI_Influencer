// ตัวอย่าง spec สำหรับ gen_ugc_prompts.mjs — คลิปนั่งพูดหน้ากล้อง 2 segment (แก้เป็นของคุณ)
//   node ../scripts/gen_ugc_prompts.mjs --spec story_specs.example.mjs --out ./out --check
// B(size 'MCU'|'CU', action ก่อนพูด (อังกฤษ), tone, บทไทย หรือ [ท่อน1, ท่อน2], ประโยคหลังพูด, lead วินาที, hold วินาที, tone ท่อน2)
const B = (size, a, tone, d, z = '', lead = 0.4, hold = 0.3, t2 = '') => ({ size, a, tone, d, z, lead, hold, t2 });

const spec = {
  name: 'the presenter',                      // ชื่อตัวละครที่ใช้ใน prompt
  picture1: 'refs/presenter_face.png',        // รูปอ้างอิง Picture 1 (ใส่ path ของคุณ)
  base: 'a young woman, her face, hairstyle, skin and outfit exactly as shown in <Picture 1>. Her skin shows natural matte texture with visible pores and slight unevenness.',
  bg: {
    in: {
      desc: '<Picture 2> is a quiet bright living-room corner with a warm ivory wall and a low sofa, visible as the background throughout the scene, with the presenter seated on the sofa in front of the wall.',
      light: 'Soft daylight from a window at the left edge of the frame, widened by a soft fill from the camera side so both sides of her face are evenly lit from the front, fine natural camera grain.',
      snd: 'Quiet room tone with a faint distant hum, soft fabric rustle as she moves',
    },
  },
  stories: [
    {
      key: '01_Example', title: 'ตัวอย่าง', bg: 'in',
      segs: [
        { hands: 'both hands are empty and free to gesture.', cont: '',
          sum: 'The presenter greets the viewer, asks a playful question about drinking water, and gives a first quick tip.',
          beats: [
            B('MCU', 'The presenter looks straight into the lens with a bright, friendly look.', 'at a bright, friendly pace', 'พี่คะ วันนี้ดื่มน้ำครบหรือยัง?', '', 0.5, 0.3),
            B('CU', 'She lifts one finger of her left hand and tilts her head with a teasing smile.', 'at an easy, playful pace', 'ลองวางน้ำไว้ตรงที่เห็น แล้วดื่มพร้อมมื้ออาหารดูนะคะ', '', 0.3, 0.5),
          ] },
        { hands: 'both hands are empty and free to gesture.', cont: 'both hands resting in her lap', contLead: 'she holds the warm smile from her last sentence',
          sum: 'The same continuous scene, continuing seamlessly: she adds a gentle reminder and invites the viewer to follow.',
          beats: [
            B('MCU', 'Her expression turns kind and attentive.', 'at a caring, steady pace', 'ถ้าหมอจำกัดน้ำ ให้ทำตามหมอนะคะ', '', 1.0, 0.3),
            B('CU', 'Her left hand lifts with an open palm toward the lens in a friendly invitation.', 'at a bright, inviting pace', 'กดติดตามไว้ได้เลยค่ะ', '', 0.3, 0.8),
          ] },
      ],
    },
  ],
};

export default spec;

-- ลบคอลัมน์ requires_approval เพราะตอนนี้ทุกห้องต้องอนุมัติเสมอ (ยกเว้นเจ้าของห้อง)
ALTER TABLE rooms DROP COLUMN IF EXISTS requires_approval;

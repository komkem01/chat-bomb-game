-- ตรวจสอบว่า Realtime Publication มีการเปิดใช้งานตารางไหนบ้าง
SELECT 
    schemaname,
    tablename,
    pubname
FROM 
    pg_publication_tables
WHERE 
    pubname = 'supabase_realtime'
ORDER BY 
    tablename;

-- ตรวจสอบว่ามี publication อะไรบ้าง
SELECT * FROM pg_publication;

-- ตรวจสอบว่าตารางของเรามีอยู่จริงหรือไม่
SELECT 
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public' 
    AND table_name IN ('rooms', 'messages', 'room_players')
ORDER BY 
    table_name;

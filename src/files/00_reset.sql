-- Ejecuta esto PRIMERO para limpiar todo
-- Luego ejecuta el schema completo 01_supabase_schema.sql

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

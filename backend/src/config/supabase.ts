import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno de Supabase');
}

// Cliente público para operaciones de usuarios
export const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente de servicio para operaciones administrativas
export const supabaseAdmin = createClient(supabaseUrl, serviceKey || supabaseKey);

export default supabase;

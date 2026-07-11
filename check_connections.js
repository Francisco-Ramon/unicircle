import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: conns, error: err1 } = await supabase
    .from('whatsapp_connections')
    .select('*');
  
  const { data: profiles, error: err2 } = await supabase
    .from('profiles')
    .select('*');

  console.log('Connections in database:', conns);
  console.log('Profiles in database:', profiles);
}

main();

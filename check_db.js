const supabase = require('./src/lib/supabase');
async function check() {
  const { data, error } = await supabase.from('leads').select('*').limit(1);
  if (error) console.error(error);
  else console.log('Columns:', Object.keys(data[0] || {}));
}
check();

export default function handler(req,res){
  const keys=['GOOGLE_SERVICE_ACCOUNT_JSON','GOOGLE_CLIENT_EMAIL','GOOGLE_PRIVATE_KEY','GOOGLE_APPLICATION_CREDENTIALS','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','KV_REST_API_URL','KV_REST_API_TOKEN','POSTGRES_URL','DATABASE_URL','NEON_DATABASE_URL'];
  const present={}; for(const k of keys) present[k]=Boolean(process.env[k]);
  res.setHeader('Cache-Control','no-store'); res.status(200).json(present);
}

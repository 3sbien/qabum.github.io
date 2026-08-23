export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({
    databaseUrl:!!process.env.DATABASE_URL,
    postgresUrl:!!process.env.POSTGRES_URL,
    neonDatabaseUrl:!!process.env.NEON_DATABASE_URL,
    pgHost:!!process.env.PGHOST
  });
}

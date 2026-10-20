import fs from 'node:fs';

const migration=fs.readFileSync(
  'supabase/migrations/20260830061000_close_public_rpc_advisor_gaps.sql',
  'utf8',
);

if(!/CREATE OR REPLACE FUNCTION public\.get_data_quality_snapshot\(\)[\s\S]*?SECURITY INVOKER/i.test(migration)){
  throw new Error('get_data_quality_snapshot must be SECURITY INVOKER');
}
if(!/REVOKE ALL ON FUNCTION public\.record_watched_report_file\(uuid,text,text,bigint,timestamptz,text\) FROM PUBLIC, anon, authenticated;/i.test(migration)){
  throw new Error('record_watched_report_file must not be browser-authenticated executable');
}
console.log('Public RPC advisor hardening contract: PASS');

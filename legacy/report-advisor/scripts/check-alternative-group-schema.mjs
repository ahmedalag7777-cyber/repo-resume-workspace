import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/20260819230000_alternative_item_groups.sql','utf8');
const required=['alternative_item_groups','alternative_item_group_members','company_id','conversion_factor','enable row level security','unique(company_id, sku)'];
for(const token of required)if(!sql.toLowerCase().includes(token.toLowerCase()))throw new Error(`missing schema contract: ${token}`);
console.log('alternative-group schema contract: PASS');

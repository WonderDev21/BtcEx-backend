const q = `
select "Users"."fullName", "Users"."customerId", "Users"."phone", "Users"."email",
doc."idProof"->'panNumber', "Trades"."tradeId", "Trades"."buyerFee", "Trades"."currency", "Trades"."price", "Trades"."size",
"Trades"."createdAt", "Trades"."refId"
from "Trades"
join "Documents" as doc
on doc."userId" = "Trades"."buyUserId"
join "Users"
on "Users"."userId" = doc."userId"
`;
const seller = `
select "Users"."fullName", "Users"."customerId", "Users"."phone", "Users"."email",
doc."idProof"->'panNumber', "Trades"."tradeId", "Trades"."sellerFee", "Trades"."currency", "Trades"."price", "Trades"."size",
"Trades"."createdAt", "Trades"."refId"
from "Trades"
join "Documents" as doc
on doc."userId" = "Trades"."sellUserId"
join "Users"
on "Users"."userId" = doc."userId"
`;
const q2 = 'ALTER TABLE test1 ADD COLUMN id SERIAL PRIMARY KEY;';


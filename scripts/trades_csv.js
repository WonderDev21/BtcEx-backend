const path = require('path');
const fs = require('fs');
const moment = require('moment');
// const fields = ['name', 'id', 'price'];
var csvWriter = require('csv-write-stream');

/**
  select "Trades"."costApplied", "Trades"."buyerFee", "Documents"."panNumber"
  from "Trades" join "Users" on "Trades"."buyUserId" = "Users"."userId"
  join "Documents" on "Documents"."userId" = "Users"."userId"


  select "Users"."fullName" as "Customer Name", "Documents"."idProof"->'panNumber' as "PAN", "Trades"."price" as "Rate", "Trades"."size" as "Quantity", "Trades"."costApplied", "Trades"."buyerFee", "Trades"."price" * "Trades"."size" as "Subtotal", ("Trades"."price" * "Trades"."size") + "Trades"."costApplied" as "Total"
  from "Trades"
  join "Users"
  on "Trades"."buyUserId" = "Users"."userId"
  join "Documents"
  on "Users"."userId" = "Documents"."userId"

  UPDATE "Trades" SET "sellerFee" = "costApplied"/2 WHERE "Trades"."sellerFee" = "Trades"."costApplied";
  UPDATE "Trades" SET "buyerFee" = "costApplied"/2 WHERE "Trades"."buyerFee" = "Trades"."costApplied";


  SELECT sum("size"), max("size"), min("size"), date_trunc('day', "createdAt")
  FROM "Trades"
  GROUP BY "createdAt"
  ORDER by "createdAt" DESC

  select max("price") OVER (PARTITION BY date_trunc('day', "createdAt")) AS "high", min("price") OVER (PARTITION BY date_trunc('day', "createdAt")) AS "low", "tradeId"
  from "Trades"



  SELECT max("low") as "low", max("high") as "high", sum("size"), max("price") as "H", min("price") as "L", date_trunc('day', "createdAt")
  FROM (
   select max("price") OVER (PARTITION BY date_trunc('day', "createdAt")) AS "high", min("price") OVER (PARTITION BY date_trunc('day', "createdAt")) AS "low", *
   from "Trades"
  ) A
  GROUP BY date_trunc('day', "createdAt")
  ORDER by date_trunc('day', "createdAt") ASC


  select q1."open", q2."close", q1."createdAt"
from (
select price as open,"createdAt" from (
select *,ROW_NUMBER() OVER(partition by
                       date_trunc('day', "createdAt") order by "createdAt" asc) as rn FROM "Trades"
)a where a.rn=1 order by "createdAt"
) q1
 join (
  select price as close,"createdAt" from (
select *,ROW_NUMBER() OVER(partition by
                       date_trunc('day', "createdAt") order by "createdAt" asc) as rn FROM "Trades"
)a where a.rn=1 order by "createdAt"
) q2
on  q1."createdAt" = q2."createdAt"
x = VALUES
	('a98a350a-138b-46dc-94aa-dfefce9dc267', '9000.00', '0.10', '9.00', 'ETH', '17cf53ba-142f-4d47-933a-ae3ec1956562', 'ff16abd6-b91a-446d-82e3-9220413ebb3f', '4521121c-36d8-457e-8a1d-303a6ec0f300', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2017-11-14 21:03:41.261+05:30', '2017-11-14 21:03:41.261+05:30', '4.50', '4.50'),
	('d2903eee-fd5f-4bd3-b81d-90182b864043', '9000.00', '0.10', '9.00', 'ETH', '17cf53ba-142f-4d47-933a-ae3ec1956562', 'ab55f044-1a66-499a-a028-4a12f88c34fe', '4521121c-36d8-457e-8a1d-303a6ec0f300', 'ca991f66-595a-4bbb-bd78-0cde215f8834', '2017-11-14 21:03:41.263+05:30', '2017-11-14 21:03:41.263+05:30', '4.50', '4.50'),
	('d1fbcf7a-1843-4135-83a4-bbb5b50774a3', '8000.00', '0.10', '8.00', 'ETH', '7a549d61-35ca-41ad-8918-14e70c2c0a2b', 'a6f09511-6aa6-4804-b1ea-270c6815f8c8', '4521121c-36d8-457e-8a1d-303a6ec0f300', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2017-12-04 14:23:57.43+05:30', '2017-12-04 14:23:57.43+05:30', '4.00', '4.00'),
	('b0300a38-f9e4-4434-91fc-50c74a7cb003', '5000.00', '0.10', '5.00', 'ETH', '09e7ded3-8fdd-4519-87c3-16f22f9dfe3b', 'ed5565eb-3d3a-4dc9-a4f9-c48be8eaaff7', 'ca991f66-595a-4bbb-bd78-0cde215f8834', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2017-12-04 14:25:47.965+05:30', '2017-12-04 14:25:47.965+05:30', '2.50', '2.50'),
	('5cffb75a-5765-445e-aad5-51a4f74c07d6', '1900.00', '1.00', '19.00', 'ETH', 'ffc0d376-1cb0-4477-869c-7d051f19a2c8', '34e1c466-375a-4be9-8986-5c9899e002f6', '4521121c-36d8-457e-8a1d-303a6ec0f300', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2018-01-16 13:36:32.072+05:30', '2018-01-16 13:36:32.072+05:30', '9.50', '0.00'),
	('964981ea-64c6-443a-91b5-697b744bf374', '1900.00', '0.10', '1.90', 'ETH', '7a5a12be-ed57-40e4-a7e2-96fdfdd4635a', 'ad49ee87-f876-4377-a0ce-bd50a6561a65', '4521121c-36d8-457e-8a1d-303a6ec0f300', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2018-01-19 15:45:12.236+05:30', '2018-01-19 15:45:12.236+05:30', '0.95', '0.00'),
	('e7c78206-1863-44c6-8218-025735115760', '1500.00', '0.10', '1.50', 'ETH', '745aa8c9-9501-4c5e-a69c-4b8eb94ba157', '084adf56-219f-48ac-aa0d-7fc6c494ba85', 'ca991f66-595a-4bbb-bd78-0cde215f8834', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2017-12-04 14:29:09.62+05:30', '2017-12-04 14:29:09.62+05:30', '0.75', '0.75'),
	('47efa41e-6a9f-4bd0-9054-9a56e383a04d', '1500.00', '0.10', '1.50', 'ETH', '745aa8c9-9501-4c5e-a69c-4b8eb94ba157', '3b56decb-4ead-40cf-9078-d6b12dfe52c7', 'ca991f66-595a-4bbb-bd78-0cde215f8834', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2017-12-04 14:31:58.297+05:30', '2017-12-04 14:31:58.297+05:30', '0.75', '0.75'),
	('cfada8bd-9a31-4f4b-8521-353c85bd6ed8', '1650.00', '0.10', '1.65', 'ETH', '01fe4318-727e-4978-b30f-e84eec47ef1c', 'c785027d-a4d8-4183-b903-e0950534beec', '5a951589-ed07-4db3-87f9-efb121879b75', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2017-12-12 11:40:06.113+05:30', '2017-12-12 11:40:06.113+05:30', '0.83', '0.83'),
	('a65859a2-7c7f-4f2e-9cb7-ab8cd3d3e7af', '1850.00', '0.10', '1.85', 'ETH', '6fd23191-2fe7-44ab-9bc2-e5b096bc299d', 'cf3858f3-b1c5-45dd-8489-182e2ac133e0', '4521121c-36d8-457e-8a1d-303a6ec0f300', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2018-01-15 17:56:39.49+05:30', '2018-01-15 17:56:39.49+05:30', '0.93', '0.93'),
	('2234cd1c-6682-4dcc-98d7-97a7504f8ad1', '1850.00', '0.90', '16.65', 'ETH', '6fd23191-2fe7-44ab-9bc2-e5b096bc299d', '64ad7064-093a-4068-b85a-ebc5afde3e8c', '4521121c-36d8-457e-8a1d-303a6ec0f300', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2018-01-15 17:56:39.491+05:30', '2018-01-15 17:56:39.491+05:30', '8.33', '8.33'),
	('6662e993-1ded-495f-8fd7-539aae31a343', '1850.00', '0.10', '1.85', 'ETH', '522efe53-7289-48f9-9824-35f854a5e93a', '64ad7064-093a-4068-b85a-ebc5afde3e8c', '4521121c-36d8-457e-8a1d-303a6ec0f300', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2018-01-15 17:56:49.655+05:30', '2018-01-15 17:56:49.655+05:30', '0.93', '0.93'),
	('d3e58662-e4c1-45b3-ac24-f442091eb606', '1852.00', '0.10', '1.85', 'ETH', '20b5ee4e-0140-4eb0-bc64-0294f128500e', 'b9d5c06a-2c22-43fc-a878-55f7c5384ee1', '4521121c-36d8-457e-8a1d-303a6ec0f300', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2018-01-15 17:57:04.919+05:30', '2018-01-15 17:57:04.919+05:30', '0.93', '0.93'),
	('9a15edec-d61e-4157-9743-5daefa603eae', '1852.00', '0.10', '1.85', 'ETH', '20b5ee4e-0140-4eb0-bc64-0294f128500e', 'a39d45de-c765-4279-abf5-eea9bd93431c', '4521121c-36d8-457e-8a1d-303a6ec0f300', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2018-01-15 17:57:04.919+05:30', '2018-01-15 17:57:04.919+05:30', '0.93', '0.93'),
	('eea992af-327a-4094-bc16-5cce2f7d5884', '1900.00', '0.00', '0.00', 'ETH', '7a5a12be-ed57-40e4-a7e2-96fdfdd4635a', '34e1c466-375a-4be9-8986-5c9899e002f6', '4521121c-36d8-457e-8a1d-303a6ec0f300', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2018-01-19 15:45:12.237+05:30', '2018-01-19 15:45:12.237+05:30', '0.00', '0.00'),
	('2e0aec15-472e-4589-bee8-ce826981405b', '1921.00', '0.10', '1.92', 'ETH', 'fab392e7-f7b1-45f2-9ef3-a560a359e61c', '4d69b6e7-6b6d-40c7-b7a9-99af5404b42a', '4521121c-36d8-457e-8a1d-303a6ec0f300', '4521121c-36d8-457e-8a1d-303a6ec0f300', '2018-01-30 13:01:33.027+05:30', '2018-01-30 13:01:33.027+05:30', '0.96', '0.00'),
];

 */



const buyer = `"hardik chopra";""ARBPC4911E"";265.00;1.00;2.65;1.33;265.0000;"MIOTA";"2018-01-18 12:22:30.553+00"
"Manasvi Batra";""BGZPB7770C"";80000.00;0.20;160.00;80.00;16000.0000;"ETH";"2018-01-23 12:07:42.216+00"
"Shashank Singh";""CHTPS1517A"";33500.00;1.00;335.00;335.00;33500.0000;"ETH";"2017-12-07 10:19:50.543+00"
"Shirish Jadav";""AXQPJ0135J"";28000.00;0.10;28.00;28.00;2800.0000;"ETH";"2017-12-08 11:09:10.431+00"
"Ishant Mehta";""CQWPM0715Q"";28000.00;0.90;252.00;252.00;25200.0000;"ETH";"2017-12-08 11:21:47.132+00"
"Ishant Mehta";""CQWPM0715Q"";28000.00;0.09;25.20;25.20;2520.0000;"ETH";"2017-12-08 11:24:07.519+00"
"Anshul Jaiswal";""AQGPJ0989B"";79500.00;0.10;79.50;39.75;7950.0000;"ETH";"2018-01-19 12:29:17.765+00"
"Deep Chandra Tewari";""AVSPT0029K"";265.00;1.00;2.65;1.33;265.0000;"MIOTA";"2018-01-25 07:54:55.836+00"
"Manasvi Batra";""BGZPB7770C"";28000.00;0.50;140.00;140.00;14000.0000;"ETH";"2017-12-08 11:24:56.237+00"
"Manasvi Batra";""BGZPB7770C"";28000.00;0.20;56.00;56.00;5600.0000;"ETH";"2017-12-08 11:35:24.097+00"
"Ajay Aswal";""ARXPA7105J"";29000.00;0.99;287.10;287.10;28710.0000;"ETH";"2017-12-09 06:23:46.384+00"
"Shashank Singh";""CHTPS1517A"";55500.00;0.10;55.50;55.50;5550.0000;"ETH";"2017-12-13 15:24:43.802+00"
"Ajay Aswal";""ARXPA7105J"";55800.00;0.12;66.96;66.96;6696.0000;"ETH";"2017-12-13 15:51:54.702+00"
"Shashank Singh";""CHTPS1517A"";55500.00;0.10;55.50;55.50;5550.0000;"ETH";"2017-12-13 17:54:48.408+00"
"Shashank Singh";""CHTPS1517A"";56000.00;0.30;168.00;168.00;16800.0000;"ETH";"2017-12-14 04:01:00.194+00"
"Priyank Bhatt";""BFQPB5329K"";290.00;2.00;5.80;5.80;580.0000;"MIOTA";"2017-12-24 20:26:11.328+00"
"Priyank Bhatt";""BFQPB5329K"";290.00;1.00;2.90;2.90;290.0000;"MIOTA";"2017-12-24 20:26:27.378+00"
"Priyank Bhatt";""BFQPB5329K"";290.00;1.00;2.90;2.90;290.0000;"MIOTA";"2017-12-24 20:26:40.894+00"
"Shantanu Jain";""AXIPJ0775A"";290.00;2.00;5.80;5.80;580.0000;"MIOTA";"2018-01-02 10:33:32.48+00"
"Shantanu Jain";""AXIPJ0775A"";298.00;3.00;8.94;8.94;894.0000;"MIOTA";"2018-01-02 10:34:16.303+00"
"Manasvi Batra";""BGZPB7770C"";325.00;1.00;3.25;3.25;325.0000;"MIOTA";"2018-01-02 16:59:28.63+00"
"Manasvi Batra";""BGZPB7770C"";326.00;1.00;3.26;3.26;326.0000;"MIOTA";"2018-01-02 17:08:50.653+00"
"Ishant Mehta";""CQWPM0715Q"";326.00;4.00;13.04;13.04;1304.0000;"MIOTA";"2018-01-03 08:39:45.212+00"
"Ishant Mehta";""CQWPM0715Q"";330.00;4.00;13.20;13.20;1320.0000;"MIOTA";"2018-01-03 08:42:33.768+00"
"Ishant Mehta";""CQWPM0715Q"";336.00;2.00;6.72;6.72;672.0000;"MIOTA";"2018-01-03 14:19:25.762+00"
"Shirish Jadav";""AXQPJ0135J"";343.00;1.00;3.43;3.43;343.0000;"MIOTA";"2018-01-04 07:06:58.595+00"
"Ishant Mehta";""CQWPM0715Q"";76000.00;0.20;152.00;152.00;15200.0000;"ETH";"2018-01-04 09:28:26.173+00"
"Shirish Jadav";""AXQPJ0135J"";81500.00;0.10;81.50;81.50;8150.0000;"ETH";"2018-01-07 17:35:04.981+00"
"Suraj S K";""CCFPK6928Q"";91200.00;0.30;273.60;273.60;27360.0000;"ETH";"2018-01-08 06:58:31.227+00"
"Suraj S K";""CCFPK6928Q"";91200.00;0.02;18.24;18.24;1824.0000;"ETH";"2018-01-08 13:45:35.722+00"
"hardik chopra";""ARBPC4911E"";305.00;10.00;30.50;30.50;3050.0000;"MIOTA";"2018-01-09 11:55:09.072+00"
"hardik chopra";""ARBPC4911E"";295.00;7.00;20.65;20.65;2065.0000;"MIOTA";"2018-01-09 11:55:20.578+00"
"hardik chopra";""ARBPC4911E"";295.00;0.40;1.18;1.18;118.0000;"MIOTA";"2018-01-09 14:10:56.04+00"
"Manasvi Batra";""BGZPB7770C"";285.00;1.00;2.85;2.85;285.0000;"MIOTA";"2018-01-12 17:25:18.393+00"
"Vikramaditya Kokil";""DXQPK1070Q"";283.00;1.00;2.83;2.83;283.0000;"MIOTA";"2018-01-12 17:26:12.408+00"
"Manasvi Batra";""BGZPB7770C"";100000.00;0.01;10.00;10.00;1000.0000;"ETH";"2018-01-13 18:55:50.199+00"
"Vikramaditya Kokil";""DXQPK1070Q"";101000.00;0.01;10.10;10.10;1010.0000;"ETH";"2018-01-13 18:58:30.852+00"
"Sharath Kumar R";""BQQPR8892C"";285.00;0.20;0.57;0.57;57.0000;"MIOTA";"2018-01-15 11:33:57.045+00"
"Sharath Kumar R";""BQQPR8892C"";287.00;1.40;4.02;4.02;401.8000;"MIOTA";"2018-01-15 11:43:35.146+00"
"Vikramaditya Kokil";""DXQPK1070Q"";103000.00;0.10;103.00;103.00;10300.0000;"ETH";"2018-01-15 20:23:42.013+00"
"Sharath Kumar R";""BQQPR8892C"";287.00;0.40;1.15;1.15;114.8000;"MIOTA";"2018-01-15 20:25:37.386+00"
"Vikramaditya Kokil";""DXQPK1070Q"";282.00;1.00;2.82;2.82;282.0000;"MIOTA";"2018-01-15 20:26:10.477+00"
"Vikramaditya Kokil";""DXQPK1070Q"";87000.00;0.30;261.00;261.00;26100.0000;"ETH";"2018-01-16 09:51:30.08+00"
"Vikramaditya Kokil";""DXQPK1070Q"";87000.00;0.30;261.00;261.00;26100.0000;"ETH";"2018-01-16 10:01:47.157+00"
"hardik chopra";""ARBPC4911E"";81000.00;0.30;243.00;243.00;24300.0000;"ETH";"2018-01-16 10:02:52.283+00"
"Manasvi Batra";""BGZPB7770C"";80000.00;0.20;160.00;160.00;16000.0000;"ETH";"2018-01-16 10:37:37.26+00"
"Vikramaditya Kokil";""DXQPK1070Q"";282.00;2.10;5.92;5.92;592.2000;"MIOTA";"2018-01-16 11:27:47.944+00"
"Manasvi Batra";""BGZPB7770C"";280.00;2.00;5.60;5.60;560.0000;"MIOTA";"2018-01-16 11:29:14.412+00"
"Aditya";""AYJPK2779F"";275.00;2.00;5.50;5.50;550.0000;"MIOTA";"2018-01-16 11:29:49.517+00"
"Aditya";""AYJPK2779F"";270.00;5.00;13.50;13.50;1350.0000;"MIOTA";"2018-01-16 11:30:15.928+00"
"Aditya";""AYJPK2779F"";265.00;1.00;2.65;2.65;265.0000;"MIOTA";"2018-01-16 11:30:24.579+00"
"Aditya";""AYJPK2779F"";260.00;1.00;2.60;2.60;260.0000;"MIOTA";"2018-01-16 11:30:29.919+00"
"Deep Chandra Tewari";""AVSPT0029K"";90000.00;0.01;9.00;4.50;900.0000;"ETH";"2018-01-23 06:18:34.219+00"
"Deep Chandra Tewari";""AVSPT0029K"";85000.00;0.02;17.00;8.50;1700.0000;"ETH";"2018-01-25 10:14:40.494+00"`;

const seller = `"Piyush Lahoti";""AHUPL4682L"";265.00;1.00;2.65;0.00;265.0000;"MIOTA";"2018-01-18 12:22:30.553+00"
"Vikramaditya Kokil";""DXQPK1070Q"";80000.00;0.20;160.00;0.00;16000.0000;"ETH";"2018-01-23 12:07:42.216+00"
"Vikramaditya Kokil";""DXQPK1070Q"";33500.00;1.00;335.00;335.00;33500.0000;"ETH";"2017-12-07 10:19:50.543+00"
"Vikramaditya Kokil";""DXQPK1070Q"";28000.00;0.10;28.00;28.00;2800.0000;"ETH";"2017-12-08 11:09:10.431+00"
"Vikramaditya Kokil";""DXQPK1070Q"";28000.00;0.90;252.00;252.00;25200.0000;"ETH";"2017-12-08 11:21:47.132+00"
"Vikramaditya Kokil";""DXQPK1070Q"";28000.00;0.09;25.20;25.20;2520.0000;"ETH";"2017-12-08 11:24:07.519+00"
"Vikramaditya Kokil";""DXQPK1070Q"";79500.00;0.10;79.50;0.00;7950.0000;"ETH";"2018-01-19 12:29:17.765+00"
"Vikramaditya Kokil";""DXQPK1070Q"";265.00;1.00;2.65;0.00;265.0000;"MIOTA";"2018-01-25 07:54:55.836+00"
"Vikramaditya Kokil";""DXQPK1070Q"";28000.00;0.50;140.00;140.00;14000.0000;"ETH";"2017-12-08 11:24:56.237+00"
"Vikramaditya Kokil";""DXQPK1070Q"";28000.00;0.20;56.00;56.00;5600.0000;"ETH";"2017-12-08 11:35:24.097+00"
"Vikramaditya Kokil";""DXQPK1070Q"";29000.00;0.99;287.10;287.10;28710.0000;"ETH";"2017-12-09 06:23:46.384+00"
"Vikramaditya Kokil";""DXQPK1070Q"";55500.00;0.10;55.50;55.50;5550.0000;"ETH";"2017-12-13 15:24:43.802+00"
"Vikramaditya Kokil";""DXQPK1070Q"";55800.00;0.12;66.96;66.96;6696.0000;"ETH";"2017-12-13 15:51:54.702+00"
"Ajay Aswal";""ARXPA7105J"";55500.00;0.10;55.50;55.50;5550.0000;"ETH";"2017-12-13 17:54:48.408+00"
"Vikramaditya Kokil";""DXQPK1070Q"";56000.00;0.30;168.00;168.00;16800.0000;"ETH";"2017-12-14 04:01:00.194+00"
"Vikramaditya Kokil";""DXQPK1070Q"";290.00;2.00;5.80;5.80;580.0000;"MIOTA";"2017-12-24 20:26:11.328+00"
"Vikramaditya Kokil";""DXQPK1070Q"";290.00;1.00;2.90;2.90;290.0000;"MIOTA";"2017-12-24 20:26:27.378+00"
"Vikramaditya Kokil";""DXQPK1070Q"";290.00;1.00;2.90;2.90;290.0000;"MIOTA";"2017-12-24 20:26:40.894+00"
"Vikramaditya Kokil";""DXQPK1070Q"";290.00;2.00;5.80;5.80;580.0000;"MIOTA";"2018-01-02 10:33:32.48+00"
"Vikramaditya Kokil";""DXQPK1070Q"";298.00;3.00;8.94;8.94;894.0000;"MIOTA";"2018-01-02 10:34:16.303+00"
"Vikramaditya Kokil";""DXQPK1070Q"";325.00;1.00;3.25;3.25;325.0000;"MIOTA";"2018-01-02 16:59:28.63+00"
"Shantanu Jain";""AXIPJ0775A"";326.00;1.00;3.26;3.26;326.0000;"MIOTA";"2018-01-02 17:08:50.653+00"
"Shantanu Jain";""AXIPJ0775A"";326.00;4.00;13.04;13.04;1304.0000;"MIOTA";"2018-01-03 08:39:45.212+00"
"Vikramaditya Kokil";""DXQPK1070Q"";330.00;4.00;13.20;13.20;1320.0000;"MIOTA";"2018-01-03 08:42:33.768+00"
"Vikramaditya Kokil";""DXQPK1070Q"";336.00;2.00;6.72;6.72;672.0000;"MIOTA";"2018-01-03 14:19:25.762+00"
"Vikramaditya Kokil";""DXQPK1070Q"";343.00;1.00;3.43;3.43;343.0000;"MIOTA";"2018-01-04 07:06:58.595+00"
"Vikramaditya Kokil";""DXQPK1070Q"";76000.00;0.20;152.00;152.00;15200.0000;"ETH";"2018-01-04 09:28:26.173+00"
"Vikramaditya Kokil";""DXQPK1070Q"";81500.00;0.10;81.50;81.50;8150.0000;"ETH";"2018-01-07 17:35:04.981+00"
"Vikramaditya Kokil";""DXQPK1070Q"";91200.00;0.30;273.60;273.60;27360.0000;"ETH";"2018-01-08 06:58:31.227+00"
"Vikramaditya Kokil";""DXQPK1070Q"";91200.00;0.02;18.24;18.24;1824.0000;"ETH";"2018-01-08 13:45:35.722+00"
"Shantanu Jain";""AXIPJ0775A"";305.00;10.00;30.50;30.50;3050.0000;"MIOTA";"2018-01-09 11:55:09.072+00"
"Shantanu Jain";""AXIPJ0775A"";295.00;7.00;20.65;20.65;2065.0000;"MIOTA";"2018-01-09 11:55:20.578+00"
"Shantanu Jain";""AXIPJ0775A"";295.00;0.40;1.18;1.18;118.0000;"MIOTA";"2018-01-09 14:10:56.04+00"
"Vikramaditya Kokil";""DXQPK1070Q"";285.00;1.00;2.85;2.85;285.0000;"MIOTA";"2018-01-12 17:25:18.393+00"
"Manasvi Batra";""BGZPB7770C"";283.00;1.00;2.83;2.83;283.0000;"MIOTA";"2018-01-12 17:26:12.408+00"
"Vikramaditya Kokil";""DXQPK1070Q"";100000.00;0.01;10.00;10.00;1000.0000;"ETH";"2018-01-13 18:55:50.199+00"
"Manasvi Batra";""BGZPB7770C"";101000.00;0.01;10.10;10.10;1010.0000;"ETH";"2018-01-13 18:58:30.852+00"
"Vikramaditya Kokil";""DXQPK1070Q"";285.00;0.20;0.57;0.57;57.0000;"MIOTA";"2018-01-15 11:33:57.045+00"
"Vikramaditya Kokil";""DXQPK1070Q"";287.00;1.40;4.02;4.02;401.8000;"MIOTA";"2018-01-15 11:43:35.146+00"
"Vikramaditya Kokil";""DXQPK1070Q"";103000.00;0.10;103.00;103.00;10300.0000;"ETH";"2018-01-15 20:23:42.013+00"
"Vikramaditya Kokil";""DXQPK1070Q"";287.00;0.40;1.15;1.15;114.8000;"MIOTA";"2018-01-15 20:25:37.386+00"
"Vikramaditya Kokil";""DXQPK1070Q"";282.00;1.00;2.82;2.82;282.0000;"MIOTA";"2018-01-15 20:26:10.477+00"
"Manasvi Batra";""BGZPB7770C"";87000.00;0.30;261.00;261.00;26100.0000;"ETH";"2018-01-16 09:51:30.08+00"
"Manasvi Batra";""BGZPB7770C"";87000.00;0.30;261.00;261.00;26100.0000;"ETH";"2018-01-16 10:01:47.157+00"
"Vikramaditya Kokil";""DXQPK1070Q"";81000.00;0.30;243.00;243.00;24300.0000;"ETH";"2018-01-16 10:02:52.283+00"
"Vikramaditya Kokil";""DXQPK1070Q"";80000.00;0.20;160.00;160.00;16000.0000;"ETH";"2018-01-16 10:37:37.26+00"
"Piyush Lahoti";""AHUPL4682L"";282.00;2.10;5.92;5.92;592.2000;"MIOTA";"2018-01-16 11:27:47.944+00"
"Piyush Lahoti";""AHUPL4682L"";280.00;2.00;5.60;5.60;560.0000;"MIOTA";"2018-01-16 11:29:14.412+00"
"Piyush Lahoti";""AHUPL4682L"";275.00;2.00;5.50;5.50;550.0000;"MIOTA";"2018-01-16 11:29:49.517+00"
"Piyush Lahoti";""AHUPL4682L"";270.00;5.00;13.50;13.50;1350.0000;"MIOTA";"2018-01-16 11:30:15.928+00"
"Piyush Lahoti";""AHUPL4682L"";265.00;1.00;2.65;2.65;265.0000;"MIOTA";"2018-01-16 11:30:24.579+00"
"Piyush Lahoti";""AHUPL4682L"";260.00;1.00;2.60;2.60;260.0000;"MIOTA";"2018-01-16 11:30:29.919+00"
"Vikramaditya Kokil";""DXQPK1070Q"";90000.00;0.01;9.00;0.00;900.0000;"ETH";"2018-01-23 06:18:34.219+00"
"Vikramaditya Kokil";""DXQPK1070Q"";85000.00;0.02;17.00;0.00;1700.0000;"ETH";"2018-01-25 10:14:40.494+00"`;
const lines1 = buyer.split('\n');
const lines2 = seller.split('\n');
const obj1 = [];
const obj2 = [];
const obj = [];
let sum = 0;
function listTrades(lines, obj, side) {
	lines.forEach(l => {
	const items = l.split(';');
  const name = items[0].replace(/['"]+/g, '');
  const pan = items[1].replace(/['"]+/g, '');
  const rate = items[2];
  const size = items[3];
  const cp = items[4];
  const fee2 = items[5];
  const subtotal = items[6];
  const currency = items[7].replace(/['"]+/g, '');
  const time = items[8].replace(/['"]+/g, '');
  let actualfee = null;
  if (fee2 === cp ) {
    actualfee = parseFloat(cp)/2;
    actualfee = actualfee.toFixed(2);
  } else {
    actualfee = fee2;
  }
  sum = sum + parseFloat(actualfee);
  const total = parseFloat(subtotal)+parseFloat(actualfee);
  obj.push({name, pan, rate, size, subtotal, actualfee, total: total.toFixed(2), currency, time, side});
});
}
listTrades(lines1, obj, 'BUY');
listTrades(lines2, obj, 'SELL');
console.log('Total Earned = ', sum);
try {
  var writer = csvWriter();
  writer.pipe(fs.createWriteStream(path.join(__dirname, 'out.csv')));
  obj.forEach(x => {
    const {name, pan, rate, size, subtotal, actualfee, total, currency, time, side} = x;
    writer.write({
      'Date': moment(time).format('DD-MM-YY HH:MM A'),
      'Customer Name': name,
      'Customer PAN': pan,
      'Description': currency + ' ' + side,
      'Item': currency,
      'Rate': rate,
      'Quantity': size,
      'Subtotal': subtotal,
      'Trade Fee': actualfee,
      'Total Amount': total,
    });
  });
  writer.end();
} catch (err) {
  console.error(err);
}
// fs.appendFileSync(path.join(__dirname, 'out.csv'), 'Total Trade Fee Earned = ' + sum);



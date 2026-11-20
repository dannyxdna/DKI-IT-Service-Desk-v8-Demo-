-- Seed checklist items. Original DKI-CS-IT-01 a2 criteria are retained as written.
-- Additional operational checks are based on the user's checklist; unconfirmed thresholds are not invented.
with t as (select id from public.checklist_templates where template_code='DKI-DAILY-IT')
insert into public.checklist_items(template_id,category,item_name,criteria,input_type,unit,sort_order)
select t.id,v.category,v.item_name,v.criteria,v.input_type,v.unit,v.sort_order
from t cross join (values
('Server','Tombol power server menyala','Berfungsi','status',null,10),
('Server','Akses admin menu via web','Berhasil di akses','status',null,20),
('Server','Layar monitor UPS','Tidak ada error message','status',null,30),
('Server','Tegangan pada layar UPS','23-27 V','measurement','V',40),
('Server','Daily data backup','Backup berhasil','status',null,50),
('Server','Suhu ruang server','19-24 derajat celcius','measurement','°C',60),
('Server','AC ruang server','AC normal','status',null,70),
('Network','Main switch Cisco','Indicator lampu kabel berkedip dan nyala hijau','status',null,80),
('Network','Router internet vendor','Lampu LOS / indikator modem; standar DKI menyebut berwarna hijau dan dapat diakses','status',null,90),
('Network','Internet speed test','Catat hasil Mbps; batas minimum belum ditetapkan','measurement','Mbps',100),
('Network','Firewall','Status normal; kriteria rinci belum ditetapkan','status',null,110),
('Network','WLC','Status normal; kriteria rinci belum ditetapkan','status',null,120),
('Network','Login page','Dapat diakses','status',null,130),
('System','MES 1 & MES 2','Dapat diakses','status',null,140),
('System','HISS','Dapat diakses','status',null,150),
('System','SAP','Dapat diakses','status',null,160),
('System','Outlook & Teams','Dapat digunakan','status',null,170),
('System','KPS & WMS','Dapat diakses','status',null,180),
('Printer','Photocopy printer','Berfungsi normal','status',null,190),
('Printer','Finance shared printer','Dapat diakses melalui web atau printer settings di komputer','status',null,200),
('CCTV','CCTV Plant 1 & Plant 2','Semua kamera yang diperiksa menyala','status',null,210),
('Equipment','Monitor PC & IT Equipment','Berjalan normal','status',null,220),
('Factory Bell','Break alarm','Pemeriksaan manual; alarm berbunyi sesuai jadwal','status',null,230),
('Factory Bell','Shift alarm','Pemeriksaan manual; alarm berbunyi sesuai jadwal','status',null,240)
) as v(category,item_name,criteria,input_type,unit,sort_order)
where not exists(select 1 from public.checklist_items ci where ci.template_id=t.id and ci.item_name=v.item_name);

-- Apply every seeded item to both plants.
insert into public.checklist_item_plants(item_id,plant_id)
select ci.id,p.id from public.checklist_items ci cross join public.plants p
join public.checklist_templates ct on ct.id=ci.template_id and ct.template_code='DKI-DAILY-IT'
on conflict do nothing;

insert into public.ticket_categories(category_name) values
('Production Support'),('Network'),('Hardware'),('Software'),('System'),('Printer'),('CCTV'),('Other')
on conflict(category_name) do nothing;

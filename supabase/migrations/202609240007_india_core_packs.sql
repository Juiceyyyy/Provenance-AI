-- Pack definitions and official source registry only. Source content is fetched/versioned by the worker.
insert into public.knowledge_bases(
  id,organization_id,owner_user_id,name,slug,description,kind,visibility,
  jurisdiction_country,jurisdiction_region,version,last_verified_at
)
values
(
  '20000000-0000-4000-8000-000000000001',null,null,'India Legal Core','legal-india-core',
  'Core India legal authorities from official Government of India sources. This is a maintained foundation pack, not a claim of complete coverage of Indian law.',
  'jurisdiction','public','India',null,'2026.09',now()
),
(
  '20000000-0000-4000-8000-000000000002',null,null,'India Tax & Corporate Reporting Core','accounting-india-core',
  'Official India tax, GST and corporate-reporting sources. This is a maintained core pack and intentionally does not claim exhaustive tax or accounting-standard coverage.',
  'jurisdiction','public','India',null,'2026.09',now()
)
on conflict(slug) do update set
  name=excluded.name,
  description=excluded.description,
  jurisdiction_country=excluded.jurisdiction_country,
  version=excluded.version,
  last_verified_at=now();

insert into public.source_registry(
  knowledge_base_id,title,canonical_url,publisher,authority_level,jurisdiction_country,
  license_type,refresh_interval_hours
)
values
('20000000-0000-4000-8000-000000000001','Constitution of India','https://www.indiacode.nic.in/bitstream/123456789/15240/1/constitution_of_india.pdf','Legislative Department, Ministry of Law and Justice, Government of India','official','India','official-government-source-review-required',168),
('20000000-0000-4000-8000-000000000001','Indian Contract Act, 1872','https://www.indiacode.nic.in/bitstream/123456789/2187/2/A187209.pdf','India Code, Legislative Department, Government of India','official','India','official-government-source-review-required',168),
('20000000-0000-4000-8000-000000000001','Information Technology Act, 2000','https://www.indiacode.nic.in/bitstream/123456789/13116/1/it_act_2000_updated.pdf','India Code, Government of India','official','India','official-government-source-review-required',168),
('20000000-0000-4000-8000-000000000001','Consumer Protection Act, 2019','https://www.indiacode.nic.in/bitstream/123456789/15256/1/eng201935.pdf','India Code, Government of India','official','India','official-government-source-review-required',168),
('20000000-0000-4000-8000-000000000001','Bharatiya Nyaya Sanhita, 2023','https://www.indiacode.nic.in/bitstream/123456789/20062/1/a202345.pdf','India Code, Government of India','official','India','official-government-source-review-required',168),
('20000000-0000-4000-8000-000000000001','Bharatiya Nagarik Suraksha Sanhita, 2023','https://www.indiacode.nic.in/bitstream/123456789/21920/1/the_bharatiya_nagarik_suraksha_sanhita%2C_2023.pdf','India Code, Government of India','official','India','official-government-source-review-required',168),
('20000000-0000-4000-8000-000000000001','Bharatiya Sakshya Adhiniyam, 2023','https://www.indiacode.nic.in/indiacode/bitstream/123456789/20063/1/aa202347.pdf','India Code, Government of India','official','India','official-government-source-review-required',168),
('20000000-0000-4000-8000-000000000001','Companies Act, 2013','https://www.mca.gov.in/Ministry/pdf/CompaniesAct2013.pdf','Ministry of Corporate Affairs, Government of India','official','India','official-government-source-review-required',168),
('20000000-0000-4000-8000-000000000002','Income-tax provisions and services','https://www.incometaxindia.gov.in/Pages/tax-services.aspx','Income Tax Department, Ministry of Finance, Government of India','official','India','official-government-source-review-required',24),
('20000000-0000-4000-8000-000000000002','Income Tax Act 2025 official help and guidance','https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/income-tax-act-2025','Income Tax Department, Ministry of Finance, Government of India','official','India','official-government-source-review-required',24),
('20000000-0000-4000-8000-000000000002','GST Acts','https://cbic-gst.gov.in/gst-acts.html','Central Board of Indirect Taxes and Customs, Government of India','official','India','official-government-source-review-required',24),
('20000000-0000-4000-8000-000000000002','GST Rules','https://cbic-gst.gov.in/gst-rules.html','Central Board of Indirect Taxes and Customs, Government of India','official','India','official-government-source-review-required',24),
('20000000-0000-4000-8000-000000000002','Companies Act, 2013','https://www.mca.gov.in/Ministry/pdf/CompaniesAct2013.pdf','Ministry of Corporate Affairs, Government of India','official','India','official-government-source-review-required',168),
('20000000-0000-4000-8000-000000000002','Indian Accounting Standard 1 - Presentation of Financial Statements','https://www.mca.gov.in/bin/ebook/dms/getdocument?doc=MTk1MDQ3OTE0&docCategory=Accounting+Standards&type=open','Ministry of Corporate Affairs, Government of India','official','India','official-government-source-review-required',168),
('20000000-0000-4000-8000-000000000002','Indian Accounting Standard 101 - First-time Adoption of Indian Accounting Standards','https://www.mca.gov.in/bin/ebook/dms/getdocument?doc=MTk0MDU5ODM5&docCategory=Accounting+Standards&type=open','Ministry of Corporate Affairs, Government of India','official','India','official-government-source-review-required',168)
on conflict(knowledge_base_id,canonical_url) do update set
  title=excluded.title,
  publisher=excluded.publisher,
  authority_level=excluded.authority_level,
  jurisdiction_country=excluded.jurisdiction_country,
  license_type=excluded.license_type,
  refresh_interval_hours=excluded.refresh_interval_hours,
  enabled=true;

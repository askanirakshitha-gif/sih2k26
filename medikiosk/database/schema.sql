create extension if not exists pgcrypto;

-- 1) Patients
create table if not exists patients (
    id uuid primary key default gen_random_uuid(),
    abha_id text unique,
    aadhaar_hash text,
    full_name text not null,
    age integer,
    gender text check (gender in ('Male', 'Female', 'Other', 'Unknown')) default 'Unknown',
    phone text,
    blood_group text,
    emergency_contact text,
    email text,
    chief_complaint text,
    past_history text,
    medications_summary text,
    allergies_summary text,
    family_history text,
    personal_history text,
    review_of_systems text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table if exists patients add column if not exists emergency_contact text;
alter table if exists patients add column if not exists email text;

-- 2) Sessions
create table if not exists sessions (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references patients(id) on delete cascade,
    hospital_id text,
    hospital_name text,
    language text not null default 'en' check (language in ('en', 'hi', 'kn')),
    clinical_system text not null check (clinical_system in ('allopathy', 'ayush')),
    condition_id text,
    status text not null default 'in_progress' check (status in ('in_progress','flagged','reviewed','completed','cancelled')),
    red_flag_detected boolean not null default false,
    consent_given boolean not null default false,
    opd_token_number text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_patient_id on sessions(patient_id);
create index if not exists idx_sessions_status on sessions(status);

-- 3) Questions (question bank)
create table if not exists questions (
    id text primary key,
    system text not null check (system in ('allopathy', 'ayush')),
    stage text not null,
    clinical_field text not null,
    question_text text not null,
    question_type text not null default 'single_choice' check (question_type in ('single_choice', 'multi_select', 'text', 'numeric', 'boolean')),
    required boolean not null default true,
    options jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_questions_system_field on questions(system, clinical_field);

-- 4) Patient answers
create table if not exists patient_answers (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid references patients(id) on delete cascade,
    session_id uuid not null references sessions(id) on delete cascade,
    question_id text not null references questions(id),
    clinical_field text not null,
    raw_answer text,
    normalized_value text,
    option_value text,
    is_red_flag boolean not null default false,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_answers_session on patient_answers(session_id);
create index if not exists idx_answers_question on patient_answers(question_id);

-- 5) Symptoms
create table if not exists symptoms (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references patients(id) on delete cascade,
    session_id uuid not null references sessions(id) on delete cascade,
    symptom_name text not null,
    symptom_group text,
    severity integer check (severity between 0 and 10),
    duration text,
    is_red_flag boolean not null default false,
    raw_text text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_symptoms_session on symptoms(session_id);

-- 6) Medical history / profile data
create table if not exists medical_history (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references patients(id) on delete cascade,
    history_type text not null check (history_type in ('past_history', 'medications', 'allergies', 'family_history', 'personal_history', 'review_of_systems', 'chief_complaint')),
    title text,
    details text,
    source text default 'kiosk',
    created_at timestamptz not null default now()
);

create index if not exists idx_medical_history_patient on medical_history(patient_id);

-- 7) Documents uploaded for patient/session
create table if not exists documents (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references patients(id) on delete cascade,
    session_id uuid references sessions(id) on delete set null,
    file_name text not null,
    file_url text,
    document_type text,
    document_date date,
    extractions jsonb not null default '{}'::jsonb,
    raw_text_preview text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_documents_patient on documents(patient_id);
create index if not exists idx_documents_session on documents(session_id);

-- 8) Clinical assessments (risk scoring, flags, severity)
create table if not exists assessments (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references patients(id) on delete cascade,
    session_id uuid not null references sessions(id) on delete cascade,
    assessment_type text not null,
    score numeric,
    findings jsonb not null default '{}'::jsonb,
    severity text,
    status text default 'open' check (status in ('open','pending','completed')),
    created_at timestamptz not null default now()
);

create index if not exists idx_assessments_session on assessments(session_id);

-- 9) Recommendations / care plan
create table if not exists recommendations (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references patients(id) on delete cascade,
    session_id uuid not null references sessions(id) on delete cascade,
    recommendation_type text not null,
    title text not null,
    details text not null,
    priority text not null default 'routine' check (priority in ('routine', 'urgent', 'critical')),
    created_at timestamptz not null default now()
);

create index if not exists idx_recommendations_session on recommendations(session_id);

-- 10) Clinical summaries for doctor dashboard
create table if not exists clinical_summaries (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references patients(id) on delete cascade,
    session_id uuid not null references sessions(id) on delete cascade,
    chief_complaint text,
    hpi_summary text,
    past_history text,
    medications_summary text,
    allergies_summary text,
    family_history text,
    personal_history text,
    review_of_systems text,
    red_flags_summary jsonb not null default '[]'::jsonb,
    physician_notes text,
    created_at timestamptz not null default now(),
    unique(session_id)
);

-- 11) Patient consents and legal acknowledgment
create table if not exists consents (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references patients(id) on delete cascade,
    session_id uuid not null references sessions(id) on delete cascade,
    consent_type text not null default 'clinical_consultation',
    consent_version text,
    accepted boolean not null default false,
    consent_text text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_consents_session on consents(session_id);

-- 12) OTP verification logs
create table if not exists otp_verifications (
    id uuid primary key default gen_random_uuid(),
    phone_number text not null,
    code_hash text not null,
    status text not null default 'pending' check (status in ('pending','verified','expired','failed')),
    attempts integer not null default 0,
    expires_at timestamptz not null,
    verified_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_otp_phone on otp_verifications(phone_number);

-- 13) ABDM / HIS / FHIR records
create table if not exists abdm_records (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references patients(id) on delete cascade,
    session_id uuid not null references sessions(id) on delete cascade,
    abha_id text,
    transaction_id text,
    hip_id text,
    payload jsonb not null default '{}'::jsonb,
    status text not null default 'draft' check (status in ('draft','queued','success','failed')),
    created_at timestamptz not null default now()
);

create index if not exists idx_abdm_session on abdm_records(session_id);

-- Optional: trigger to update updated_at automatically
create or replace function touch_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger trg_patients_updated_at
before update on patients
for each row execute procedure touch_updated_at();

create trigger trg_sessions_updated_at
before update on sessions
for each row execute procedure touch_updated_at();

-- Sample seed data for the existing demo flow
insert into patients (id, abha_id, aadhaar_hash, full_name, age, gender, phone, blood_group, chief_complaint, past_history, medications_summary, allergies_summary, family_history, personal_history, review_of_systems)
values
('11111111-1111-1111-1111-111111111111', '91-2345-6789-0123', 'sha256_demo_1', 'Ramesh Sharma', 54, 'Male', '+91 ******0001', 'B+', 'Acute chest discomfort', 'Essential Hypertension, Dyslipidemia', 'Telmisartan 40mg OD, Atorvastatin 20mg OD', 'No known drug allergies', 'Paternal history of CAD', 'Non-smoker', 'Positive for dyspnea and sweating')
on conflict (id) do nothing;

insert into sessions (id, patient_id, hospital_name, language, clinical_system, condition_id, status, red_flag_detected, consent_given, opd_token_number)
values
('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Manipal Hospital, HAL Airport Road, Bengaluru', 'en', 'allopathy', 'chest_pain', 'flagged', true, true, 'OPD-101')
on conflict (id) do nothing;

insert into clinical_summaries (patient_id, session_id, chief_complaint, hpi_summary, past_history, medications_summary, allergies_summary, family_history, personal_history, review_of_systems, red_flags_summary, physician_notes)
values (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'Acute retrosternal crushing chest discomfort of 2 hours duration',
    '54-year-old male with known hypertension presents with sudden onset crushing retrosternal chest pain radiating to left arm and shoulder. Shortness of breath and diaphoresis noted.',
    'Essential Hypertension (diagnosed 2021), Dyslipidemia.',
    'Telmisartan 40mg OD, Atorvastatin 20mg OD, Ecosprin 75mg OD.',
    'No known drug allergies reported.',
    'Paternal history of CAD at age 58.',
    'Non-smoker.',
    'Positive for dyspnea and sweating. Denies syncope.',
    '[{"rule_name":"Left Arm / Shoulder Radiation","severity":"CRITICAL","warning":"High-risk symptom for acute coronary syndrome."}]'::jsonb,
    'Urgent Stat ECG requested. Bedside telemetry initiated.'
) on conflict (session_id) do nothing;

-- For Supabase, you can safely enable RLS and add policies later if desired.
-- Example policy template:
-- alter table patients enable row level security;
-- create policy "authenticated_users_manage_patients" on patients for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- =====================================================================
-- 報修登記系統：Supabase 建表 SQL
-- 資料表：public.repair_requests
--
-- 本次示範的存取規則（見 AGENTS.md、報修需求筆記.txt）：
--   ・任何人可以新增報修、讀取清單
--   ・禁止修改與刪除
--   ・本次示範不做登入，前端只使用公開金鑰（anon 角色）
--
-- 安全設計分三層，任何一層都能單獨擋下不允許的操作：
--   1. GRANT：資料表權限，決定 anon 能對哪些欄位做哪些操作
--   2. RLS  ：資料列安全，決定 anon 能讀、能新增哪些資料列
--   3. CHECK：欄位限制，決定資料本身可接受的值與長度
--
-- 注意：本檔僅供審閱，尚未在任何 Supabase 專案執行。
-- 整份包在交易裡，任何一段失敗就全部不生效。
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 建立資料表，並以 CHECK 限制欄位值與文字長度（第 3 層）
-- ---------------------------------------------------------------------
create table public.repair_requests (
  -- 主鍵：由資料庫自動產生 UUID
  id            uuid        primary key default gen_random_uuid(),

  -- 建立時間：由資料庫自動產生，前端不能指定（見下方 GRANT）
  created_at    timestamptz not null default now(),

  -- 報修人姓名：去除前後空白後須有 1～50 個字
  reporter_name text        not null
    constraint repair_requests_reporter_name_len
      check (char_length(btrim(reporter_name)) between 1 and 50),

  -- 地點或部門：去除前後空白後須有 1～100 個字
  location      text        not null
    constraint repair_requests_location_len
      check (char_length(btrim(location)) between 1 and 100),

  -- 類別：只能是 設備、網路、環境、其他
  category      text        not null
    constraint repair_requests_category_allowed
      check (category in ('設備', '網路', '環境', '其他')),

  -- 問題說明：去除前後空白後須有 1～1000 個字
  description   text        not null
    constraint repair_requests_description_len
      check (char_length(btrim(description)) between 1 and 1000),

  -- 緊急程度：只能是 低、中、高，未填時預設為「中」
  urgency       text        not null default '中'
    constraint repair_requests_urgency_allowed
      check (urgency in ('低', '中', '高')),

  -- 處理狀態：只能是 待處理、處理中、已完成，預設為「待處理」
  status        text        not null default '待處理'
    constraint repair_requests_status_allowed
      check (status in ('待處理', '處理中', '已完成'))
);

comment on table  public.repair_requests               is '報修登記（示範）：任何人可新增與讀取，禁止修改與刪除';
comment on column public.repair_requests.id            is '主鍵，自動產生';
comment on column public.repair_requests.created_at    is '登記時間，自動產生';
comment on column public.repair_requests.reporter_name is '報修人姓名';
comment on column public.repair_requests.location      is '地點或部門';
comment on column public.repair_requests.category      is '類別：設備／網路／環境／其他';
comment on column public.repair_requests.description   is '問題說明';
comment on column public.repair_requests.urgency       is '緊急程度：低／中／高，預設中';
comment on column public.repair_requests.status        is '處理狀態：待處理／處理中／已完成，預設待處理';

-- 清單依登記時間由新到舊顯示時使用的索引
create index repair_requests_created_at_idx
  on public.repair_requests (created_at desc);

-- ---------------------------------------------------------------------
-- 第 1 層：GRANT（資料表權限）
-- ---------------------------------------------------------------------
-- 先收回所有角色的全部權限，避免沿用任何預設授權。
-- 包含 authenticated：本次示範不做登入，登入後的權限待需求確認再開。
revoke all on table public.repair_requests from public, anon, authenticated;

-- anon 需要能使用 public 結構描述，才能存取其中的資料表
grant usage on schema public to anon;

-- 讀取：anon 可以讀取整張資料表（顯示清單）
grant select on table public.repair_requests to anon;

-- 新增：只開放使用者需要填寫的欄位。
-- 不包含 id、created_at、status：
--   ・id、created_at 一律由資料庫產生，前端無法偽造
--   ・status 一律使用預設值「待處理」；前端若傳入 status 會被拒絕
grant insert (reporter_name, location, category, description, urgency)
  on table public.repair_requests to anon;

-- 不授予 update、delete、truncate、references、trigger，
-- 因此 anon 無法修改或刪除任何資料。

-- ---------------------------------------------------------------------
-- 第 2 層：RLS（資料列安全）
-- ---------------------------------------------------------------------
-- 啟用資料列安全：沒有符合的政策時，一律拒絕
alter table public.repair_requests enable row level security;

-- 讀取政策：任何人（anon）都可以讀取全部清單
create policy "anon 可讀取全部報修"
  on public.repair_requests
  for select
  to anon
  using (true);

-- 新增政策：任何人（anon）都可以新增，但處理狀態只能是「待處理」。
-- 第 1 層已不允許 anon 寫入 status，這裡再擋一次，
-- 即使日後 GRANT 被放寬，也無法新增其他狀態的資料。
create policy "anon 可新增待處理報修"
  on public.repair_requests
  for insert
  to anon
  with check (status = '待處理');

-- 刻意不建立 update、delete 政策：
-- RLS 啟用後，沒有政策就等於全部拒絕，即使 GRANT 被誤開也無法修改或刪除。

commit;

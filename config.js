// Supabase 連線設定（前端公開設定）
// ・這裡只能放 publishable key（sb_publishable_ 開頭），它本來就會公開在網頁上。
// ・絕對不要放 secret key（sb_secret_ 開頭）或 service_role 金鑰。
// ・資料安全靠資料庫端的 GRANT、RLS、CHECK（見 supabase/schema.sql），不是靠隱藏這個金鑰。
window.APP_CONFIG = {
  supabaseUrl: "https://tnbpwqbhqgvsfhtgewfl.supabase.co",
  supabasePublishableKey: "sb_publishable_a0MXW3wciP-83Yrg-9OJ6Q_XaJk2N5i",
};

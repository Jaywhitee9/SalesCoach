-- הוספת מנהל דמה לארגון של עומר כדי שיהיה עם מי להתכתב
-- Organization ID: 329d947e-7da6-4404-8c33-a22c6587efb1

INSERT INTO profiles (
  id, 
  full_name, 
  email, 
  role, 
  organization_id, 
  created_at, 
  updated_at
)
VALUES (
  gen_random_uuid(),           -- ID חדש
  'מנהל בדיקות',              -- שם
  'manager@test.com',          -- אימייל
  'sales_manager',             -- תפקיד (מנהל מכירות)
  '329d947e-7da6-4404-8c33-a22c6587efb1', -- הארגון שלך
  NOW(),
  NOW()
);

-- בדיקה שנוסף בהצלחה
SELECT * FROM profiles WHERE organization_id = '329d947e-7da6-4404-8c33-a22c6587efb1';

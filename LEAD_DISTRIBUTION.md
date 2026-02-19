# מערכת חלוקת לידים 🎯

## סקירה כללית
מערכת חלוקת לידים מאפשרת לך לבחור כיצד לידים חדשים יחולקו בארגון שלך:
1. **אוטומטי** - חלוקה אוטומטית בין כל הנציגים (Round Robin)
2. **ידני** - המנהל מקצה ידנית כל ליד לנציג מסוים

---

## איפה להגדיר? ⚙️

### נווט ל-Settings → חלוקת לידים

1. לחץ על **Settings** (⚙️) בתפריט הראשי
2. בחר **"חלוקת לידים"** מהתפריט הימני
3. בחר את המצב הרצוי:

---

## 🤖 מצב 1: חלוקה אוטומטית

### מה זה אומר?
כשליד חדש נכנס למערכת (דרך Webhook, טופס, או הקלדה ידנית), המערכת **אוטומטית** מקצה אותו לנציג הבא בתור.

### איך זה עובד?
```
ליד #1 → נציג A
ליד #2 → נציג B
ליד #3 → נציג C
ליד #4 → נציג A  (חזרה להתחלה)
ליד #5 → נציג B
...
```

### מתי להשתמש?
- ✅ **צוות גדול** - יש לך מספר נציגים שיכולים לקבל לידים
- ✅ **תעבורה גבוהה** - נכנסים הרבה לידים ביום
- ✅ **חלוקה שוויונית** - רוצה שכל נציג יקבל אותו מספר לידים
- ✅ **אוטומציה מלאה** - לא רוצה להתעסק בהקצאות ידניות

### שיטת חלוקה: Round Robin
**Round Robin** = כל נציג מקבל ליד בתורו, בצורה מעגלית.

**דוגמה:**
- **נציגים:** דני, שירה, יוסי
- **לידים:** 1, 2, 3, 4, 5, 6

| ליד | נציג |
|-----|------|
| 1 | דני |
| 2 | שירה |
| 3 | יוסי |
| 4 | דני (חזרה) |
| 5 | שירה |
| 6 | יוסי |

### מה קורה אם אין נציגים?
המערכת תחזיר שגיאה ולא תקצה את הליד.

---

## 👤 מצב 2: הקצאה ידנית

### מה זה אומר?
כשליד חדש נכנס, הוא **לא מקוצה** לאף אחד. הוא מגיע ל**"לידים לא מוקצים"** ומחכה שהמנהל יקצה אותו ידנית.

### איפה רואים לידים לא מוקצים?
**Pipeline Dashboard** → **לידים לא מוקצים** (בצד ימין למטה)

### איך מקצים ידנית?
1. לחץ על הליד ברשימת "לידים לא מוקצים"
2. בחר **"ערוך ליד"**
3. בחר **נציג** מהרשימה
4. שמור

### מתי להשתמש?
- ✅ **הקצאה מבוססת מומחיות** - רוצה להתאים ליד לנציג לפי התמחות
- ✅ **הקצאה לפי זמינות** - לא כל הנציגים זמינים כל הזמן
- ✅ **הקצאה לפי ערך** - לידים בעלי ערך גבוה הולכים לנציגים מנוסים
- ✅ **שליטה מלאה** - המנהל רוצה לקבוע מי מקבל מה

### תזרים עבודה:
```
1. ליד חדש נכנס
   ↓
2. מופיע ב"לידים לא מוקצים"
   ↓
3. מנהל רואה את הליד
   ↓
4. מנהל בוחר נציג מתאים
   ↓
5. הליד מוקצה והנציג רואה אותו
```

---

## הגדרות במערכת 🔧

### Backend (כבר קיים!)
המערכת כבר כוללת API endpoints:

**1. GET /api/org/distribution-settings**
```javascript
// מחזיר את ההגדרות הנוכחיות
GET /api/org/distribution-settings?organizationId=xxx

Response:
{
  "success": true,
  "settings": {
    "auto_distribute": false,
    "distribution_method": "round_robin",
    "last_assigned_index": 3
  }
}
```

**2. POST /api/org/distribution-settings**
```javascript
// עדכון הגדרות
POST /api/org/distribution-settings

Body:
{
  "organizationId": "xxx",
  "auto_distribute": true,
  "distribution_method": "round_robin"
}
```

**3. GET /api/org/next-assignee**
```javascript
// מחזיר את הנציג הבא (עובד רק אם auto_distribute=true)
GET /api/org/next-assignee?organizationId=xxx

Response:
{
  "success": true,
  "autoDistribute": true,
  "assignee": {
    "id": "user-123",
    "full_name": "דני כהן"
  }
}
```

### Frontend (חדש!)
**קובץ:** [LeadDistributionSettings.tsx](client/components/Settings/LeadDistributionSettings.tsx)

**תכונות:**
- ✅ בחירה בין אוטומטי לידני
- ✅ בחירת שיטת חלוקה (Round Robin)
- ✅ שמירה אוטומטית בדאטהבייס
- ✅ הצגת מספר נציגים פעילים
- ✅ עיצוב מודרני עם אנימציות

**נוסף ל:** [SettingsDashboard.tsx](client/components/Settings/SettingsDashboard.tsx)
- קטגוריה חדשה: "חלוקת לידים"
- מיקום: בין "צוות ותפקידים" ל"שיחות ואימון"

---

## איך יוצרים ליד חדש? 🆕

### דרך 1: Webhook
כשליד נכנס דרך Webhook:
```javascript
// POST /api/webhooks/lead
{
  "name": "חברת ABC",
  "phone": "0501234567",
  "email": "info@abc.com"
}

// המערכת:
1. יוצרת את הליד
2. בודקת אם auto_distribute=true
3. אם כן → מקצה לנציג הבא
4. אם לא → משאירה לא מוקצה
```

### דרך 2: ממשק ידני
כשמנהל/נציג יוצר ליד ידנית:
```javascript
// הטופס בממשק
1. Name: "חברת ABC"
2. Phone: "0501234567"
3. Owner: [בחירת נציג]

// אם auto_distribute=true
// → Owner יבחר אוטומטית לנציג הבא
```

---

## טבלת Database 📊

### organization_settings
```sql
CREATE TABLE organization_settings (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  auto_distribute BOOLEAN DEFAULT false,
  distribution_method TEXT DEFAULT 'round_robin',
  last_assigned_index INTEGER DEFAULT 0,
  ...
);
```

**עמודות:**
- `auto_distribute` - האם להפעיל חלוקה אוטומטית
- `distribution_method` - שיטת החלוקה (כרגע רק round_robin)
- `last_assigned_index` - אינדקס הנציג האחרון שקיבל ליד

---

## בדיקות ✅

### בדיקה 1: אוטומטי
1. **Settings** → **חלוקת לידים**
2. בחר **"חלוקה אוטומטית"**
3. לחץ **"שמור"**
4. צור ליד חדש (או שלח דרך Webhook)
5. ✅ הליד צריך להיות מוקצה אוטומטית לנציג

### בדיקה 2: ידני
1. **Settings** → **חלוקת לידים**
2. בחר **"הקצאה ידנית"**
3. לחץ **"שמור"**
4. צור ליד חדש
5. ✅ הליד צריך להופיע ב"לידים לא מוקצים"
6. לחץ על הליד וההקצאה ידנית לנציג
7. ✅ הליד צריך לעבור לנציג

### בדיקה 3: Round Robin
1. בחר אוטומטי + Round Robin
2. צור 6 לידים חדשים ברצף
3. ✅ בדוק שכל נציג קיבל 2 לידים (אם יש 3 נציגים)

---

## Console Logs 🐛

### בזמן שמירה:
```javascript
// לחיצה על "שמור"
POST /api/org/distribution-settings
Body: { organizationId: "xxx", auto_distribute: true, ... }

// תגובה
{ "success": true }
```

### בזמן יצירת ליד (אוטומטי):
```javascript
// GET /api/org/next-assignee
Response: {
  "success": true,
  "assignee": { "id": "user-123", "full_name": "דני" }
}

// INSERT lead
owner_id = "user-123"
```

### בזמן יצירת ליד (ידני):
```javascript
// GET /api/org/next-assignee
Response: {
  "success": true,
  "autoDistribute": false,
  "assignee": null
}

// INSERT lead
owner_id = NULL  // לא מוקצה
```

---

## Troubleshooting 🔧

### בעיה: הגדרות לא נשמרות
**פתרון:**
```bash
# בדוק ב-Console:
POST /api/org/distribution-settings
# צריך לקבל: { "success": true }

# אם לא:
# 1. ודא ש-organizationId נשלח
# 2. בדוק הרשאות משתמש
# 3. בדוק בדאטהבייס:
SELECT * FROM organization_settings
WHERE organization_id = 'xxx';
```

### בעיה: לידים לא מתחלקים אוטומטית
**פתרון:**
```bash
# 1. בדוק את ההגדרות:
GET /api/org/distribution-settings?organizationId=xxx

# צריך לקבל:
{ "auto_distribute": true }

# 2. בדוק שיש נציגים:
SELECT * FROM profiles
WHERE organization_id = 'xxx'
AND role IN ('rep', 'manager');

# 3. נסה ליצור ליד מחדש
```

### בעיה: "לידים לא מוקצים" ריק (במצב ידני)
זה נורמלי! במצב ידני, לידים חדשים יופיעו שם רק אם הם נוצרו **בלי owner**.

---

## שיפורים עתידיים 🚀

### שיטות חלוקה נוספות:
1. **Weighted** - משקל לכל נציג (נציג A מקבל פי 2 מנציג B)
2. **Skill-based** - התאמה לפי מיומנות
3. **Load-balanced** - לפי עומס נוכחי
4. **Geographic** - לפי מיקום גיאוגרפי

### אוטומציה מתקדמת:
- 🔔 התראה למנהל על לידים לא מוקצים
- ⏰ Auto-reassign לאחר X ימים ללא מענה
- 📊 דוחות על חלוקת לידים

---

## סיכום 📝

✅ **יצרנו:** UI מלא להגדרות חלוקת לידים
✅ **חיברנו:** ל-API קיים בבקאנד
✅ **תמיכה:** אוטומטי (Round Robin) + ידני
✅ **שמירה:** organization_settings בדאטהבייס
✅ **עיצוב:** מודרני, עם אנימציות והסברים

---

## הרצה 🚀

```bash
# Build
cd client && npm run build

# Run
npm start

# Navigate
Settings → חלוקת לידים
```

**בחר את המצב שמתאים לארגון שלך והמערכת תדאג לשאר!** 🎉

---

יצר: Claude Code
תאריך: ${new Date().toLocaleDateString('he-IL')}
גרסה: 1.0 - Lead Distribution System

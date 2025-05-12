# HoteAI 🏨🤖

מערכת לניתוח אוטומטי של תגובות מלונאים לביקורות אורחים.

---

## 🎯 מטרת הפרויקט

לספק למנהלי בתי מלון כלי אינפורמטיבי אשר:
- מנתח את איכות תגובות המלון לביקורות באתרי Booking ו־TripAdvisor.
- מציג גרפים וסטטיסטיקות על השיפור באיכות המענה לאחר שימוש בצ'אטבוט.
- מאפשר סינון לפי תאריך, רשת, סוג מלון ו־Hotel ID.

---

## 🧠 טכנולוגיות בשימוש

- **Backend**: Express (Node.js)
- **Frontend**: React
- **Database**: PostgreSQL (עם pgAdmin)
- **AI Integration**: OpenAI ChatGPT API (`gpt-4o-mini`)
- **Scheduler**: Cron + Node for auto-analysis
- **Web Scraping**: Simulated with dummy Booking API structure

---

## 🧪 פונקציונליות עיקרית

- ✨ ניתוח תגובת המלון ע"י GPT
- 📊 הצגת ציוני איכות לכל תגובה
- 📈 גרפים של ממוצע איכות מענה לאורך זמן
- 🌐 תמיכה בשפות שונות (עברית/אנגלית)
- 🔒 הפרדת רשתות מלונות ללא שיתוף מידע

---

## 📁 מבנה הפרויקט

```
my-hoteai-project/
├── client/                # React frontend
├── server/                # Express backend
│   ├── routes/            # API endpoints
│   ├── services/          # GPT logic, DB access
│   ├── tasks/             # Scheduled analysis
│   └── utils/             # Logger, helpers
├── database/              # SQL scripts & schema
└── README.md              # This file
```

---

## 🚀 הרצה מקומית

1. **התקנת תלויות**
```bash
npm install
cd client && npm install
```

2. **הרצת השרת**
```bash
cd server
node index.js
```

3. **הרצת הקליינט**
```bash
cd client
npm run dev
```

4. **שירות ניתוח אוטומטי**
```bash
node tasks/analyzeResponses.js
```

---

## 🔐 קבצים חסויים
שימו לב: הקובץ `.env` **לא כלול** בהיסטוריית הגיט לצורכי אבטחה.  
הוא מכיל את מפתח ה־API של OpenAI ועוד הגדרות רגישות.

---

## 🙋‍♀️ תרומות / שאלות

לכל שאלה או תרומה לקוד, אתם מוזמנים לפנות אליי:
[almogya](https://github.com/almogya)


תבנית כתובת הביקורות בעברית

https://www.booking.com/reviewlist.he.html?
   cc1=il&dist=0
   &pagename=<SLUG>
   &type=total
   &rows=25        # כמה ביקורות להחזיר (25, 50, 75…)
   &offset=0       # דפדוף (0, 25, 50…)

דוגמה מעשית – Club Hotel Eilat

https://www.booking.com/reviewlist.he.html?cc1=il&dist=0&pagename=clubhotel-eilat&type=total&rows=25&offset=0

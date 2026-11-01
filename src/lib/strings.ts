// All Hebrew UI text lives here (SPEC.md: no string literals scattered in components).

export const strings = {
  app: {
    name: "יומן אימונים",
    description: "תיעוד אימוני כוח בחדר הכושר",
  },
  auth: {
    login: {
      title: "התחברות",
      subtitle: "ממשיכים מאיפה שהפסקנו.",
      submit: "התחברות",
      switchPrompt: "אין עדיין חשבון?",
      switchLink: "הרשמה",
    },
    signup: {
      title: "הרשמה",
      subtitle: "יוצרים חשבון עם שם משתמש וסיסמה. אין צורך בכתובת מייל.",
      submit: "הרשמה",
      switchPrompt: "כבר יש חשבון?",
      switchLink: "התחברות",
    },
    usernameLabel: "שם משתמש",
    usernameHint: "3–20 תווים: אותיות באנגלית, ספרות וקו תחתון.",
    passwordLabel: "סיסמה",
    passwordHint: "לפחות 8 תווים.",
    showPassword: "הצגת הסיסמה",
    hidePassword: "הסתרת הסיסמה",
    errors: {
      usernameInvalid: "שם המשתמש צריך לכלול 3–20 תווים: אותיות באנגלית, ספרות או קו תחתון.",
      usernameTaken: "שם המשתמש תפוס. אפשר לבחור שם אחר.",
      invalidCredentials: "שם משתמש או סיסמה שגויים.",
      passwordRequired: "יש להזין סיסמה.",
      passwordTooShort: "הסיסמה קצרה מדי. נדרשים לפחות 8 תווים.",
      generic: "משהו השתבש. אפשר לנסות שוב.",
    },
  },
  home: {
    greeting: "שלום,",
    placeholder: "הדשבורד ייבנה בשלבים הבאים.",
  },
  settings: {
    title: "הגדרות",
    open: "הגדרות",
    back: "חזרה",
    signOut: "התנתקות",
  },
  errors: {
    pageTitle: "לא הצלחנו לטעון את המסך.",
    retry: "ניסיון חוזר",
  },
} as const;

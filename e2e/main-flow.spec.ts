// The main flow (SPEC.md "בדיקות"): sign up (email + the welcome screen), build a plan with 2 exercises (one with a current
// weight), a first workout, a second workout that shows last time's values, a swap to a library
// alternative, save, the summary, and today marked in the history calendar.
import { expect, test, type Page } from "@playwright/test";
import { format } from "date-fns";

const SQUAT = "סקוואט במוט";
const PRESS = "לחיצת רגליים";
const username = `e2e_${Date.now().toString(36)}`;

const weight = (page: Page, name: string) => page.getByLabel(`משקל ב${name}, בק״ג`);
const reps = (page: Page, name: string) => page.getByLabel(`חזרות ב${name}`);
const done = (page: Page, name: string) => page.getByRole("button", { name: `${name} בוצע` });

async function addToPlan(page: Page, exercise: string, kg: string | null) {
  await page.getByRole("button", { name: "הוספת תרגיל" }).click();
  const picker = page.getByRole("dialog").last();
  await picker.getByLabel("חיפוש תרגיל").fill(exercise);
  await picker.getByRole("button", { name: new RegExp(`^${exercise}`) }).first().click();
  const sheet = page.getByRole("dialog").filter({ hasText: "הוספה לתוכנית" });
  await sheet.getByLabel("מינימום חזרות").fill("8");
  await sheet.getByLabel("מקסימום חזרות").fill("12");
  if (kg) await sheet.getByLabel("משקל נוכחי").fill(kg);
  await sheet.getByRole("button", { name: "הוספה לתוכנית" }).click();
  await expect(page.locator("main li:visible").filter({ hasText: exercise })).toBeVisible();
}

async function startPlanWorkout(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "התחלת אימון" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /רגליים/ }).first().click();
  await page.waitForURL(/\/workout\/[0-9a-f-]{36}$/);
  await expect(weight(page, SQUAT)).toBeVisible();
}

async function saveWorkout(page: Page) {
  await expect(page.getByText("נשמר", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "שמירת אימון" }).last().click();
  await page.waitForURL(/\/summary$/);
  await expect(page.getByText("מול הפעם הקודמת")).toBeVisible();
}

test("main flow: plan, two workouts with suggestions, swap, summary, calendar", async ({ page }) => {
  await test.step("sign up with email, then the welcome screen", async () => {
    await page.goto("/signup");
    await page.getByLabel("מייל").fill(`${username}@example.com`);
    await page.getByLabel("סיסמה", { exact: true }).fill("e2e-password-1");
    await page.getByRole("button", { name: "הרשמה" }).click();
    await page.waitForURL("/welcome");
    await page.getByLabel("איך לקרוא לך?").fill("עדי");
    await page.getByRole("button", { name: "המשך" }).click();
    await page.waitForURL("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("עדי");
  });

  await test.step("plan with 2 exercises and a current weight", async () => {
    await page.goto("/plans");
    await page.getByRole("button", { name: "תוכנית חדשה" }).click();
    await page.getByRole("dialog").getByLabel("שם התוכנית").fill("רגליים");
    await page.getByRole("dialog").getByRole("button", { name: "יצירה" }).click();
    await page.waitForURL(/\/plans\/[0-9a-f-]{36}$/);
    await addToPlan(page, SQUAT, "60");
    await addToPlan(page, PRESS, null);
  });

  await test.step("first workout", async () => {
    await startPlanWorkout(page);
    await expect(weight(page, SQUAT)).toHaveAttribute("placeholder", "60");
    await done(page, SQUAT).click(); // one tap: the plan's 60 kg and the bottom of the range (8)
    await weight(page, PRESS).fill("100");
    await reps(page, PRESS).fill("10");
    await done(page, PRESS).click();
    await saveWorkout(page);
    await expect(page.locator("main li:visible").filter({ hasText: SQUAT })).toContainText("פעם ראשונה");
  });

  await test.step("second workout shows last time's values; swap to a library alternative", async () => {
    await startPlanWorkout(page);
    await expect(weight(page, SQUAT)).toHaveAttribute("placeholder", "60");
    await expect(weight(page, PRESS)).toHaveAttribute("placeholder", "100");
    await expect(reps(page, PRESS)).toHaveAttribute("placeholder", "10");

    await weight(page, SQUAT).fill("65");
    await done(page, SQUAT).click();

    await page.getByRole("button", { name: `פרטים וחלופות: ${PRESS}` }).click();
    const swap = page.getByRole("region", { name: `פרטים וחלופות: ${PRESS}` }).getByRole("button", { name: /^החלפה ל/ }).first();
    const alternative = (await swap.getAttribute("aria-label"))!.replace("החלפה ל", "");
    await swap.click();
    await expect(page.getByText(`במקום ${PRESS}`)).toBeVisible();
    await weight(page, alternative).fill("40");
    await reps(page, alternative).fill("12");
    await done(page, alternative).click();

    await saveWorkout(page);
    // 60x8 → 65x8 by e1RM: 76 → 82.33 = +8.3%; the alternative is a first time.
    await expect(page.locator("main li:visible").filter({ hasText: SQUAT })).toContainText("+8.3%");
    await expect(page.locator("main li:visible").filter({ hasText: alternative })).toContainText("פעם ראשונה");
  });

  await test.step("today is marked in the history calendar", async () => {
    await page.goto("/history");
    const today = page.locator(`[aria-label^="${format(new Date(), "dd/MM/yyyy")}"]`).first();
    await expect(today).toHaveAttribute("aria-label", /בוצע אימון|התקיים אימון/);
  });
});

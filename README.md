# nastavnyk-api

Сервіс реєстрації платформи менторства «Наставник».

## Запуск

Потрібен Node.js 20 або новіший.

```bash
npm install
npm test
npm run typecheck
```

---

# Задача: зміна email у профілі

> Користувач може змінити email у профілі. Новий email перевіряється так само, як під час реєстрації, і не може належати іншому користувачу. Якщо новий email збігається з поточним, нічого не змінюється.

## Контекст

- **Проєкт:** `nastavnyk-api` — доменний шар сервісу реєстрації платформи менторства «Наставник». HTTP-шару, автентифікації та БД немає; користувачі зберігаються в пам'яті (`userRepository`).
- **Стек:** TypeScript 5.6, Node.js 20+, Jest 29 + ts-jest.
- **Запуск тестів:** `npm test` (і перевірка типів: `npm run typecheck`).
- **Запасний шлях:** так, обрано запасний шлях — завдання виконано на наданому стартовому проєкті (`Initial starter project`), а не на власному робочому репозиторії.

## Специфікація

### Goals

1. Користувач може змінити email у профілі.
2. Новий email проходить **ті самі** перевірки, що й під час реєстрації (нормалізація `trim` + lowercase, `EMAIL_PATTERN`) — зі спільного коду.
3. Email унікальний серед користувачів без урахування регістру.
4. Повторне введення поточного email — безпечна операція без змін.
5. Відхилена зміна не змінює дані.

### Non-goals

- **NG1.** Підтвердження нового email (лист/код) або сповіщення на старий email.
- **NG2.** Повторне введення пароля перед зміною.
- **NG3.** HTTP-ендпоінт, маршрутизація, автентифікація.
- **NG4.** Зміна інших полів профілю (username, password).
- **NG5.** Зміна самих правил email (`EMAIL_PATTERN`, обмеження довжини, Unicode/IDN).
- **NG6.** Справжня БД, транзакції, одночасні зміни на той самий email.
- **NG7.** Журнал аудиту, історія змін, rate limiting.

### Критерії приймання (Given-When-Then)

Функція: `changeEmail(userId, newEmail) → { user, changed }`. Порядок перевірок: **користувач існує → формат → збіг із поточним → зайнятий іншим → збереження**.

| ID | Given | When | Then |
|---|---|---|---|
| S1 | Користувач John (`john@example.com`) | змінює email на `john.new@example.com` | повертається `{ user, changed: true }` з новим email; `findByEmail` нового email повертає John, старий email вільний |
| S2 | John | змінює email на `"  John.New@Example.COM  "` | збережено `john.new@example.com` |
| S3 *(негативний)* | John | змінює email на `not-an-email` | `INVALID_INPUT`, `fields.email = ["must be a valid email"]`; email John не змінено |
| S4 *(негативний)* | John і Olena (`olena@example.com`) | John змінює email на `olena@example.com` | `EMAIL_TAKEN` («Email already registered»); дані обох не змінено |
| S5 *(граничний)* | John і Olena | John змінює email на `"  OLENA@Example.com "` | `EMAIL_TAKEN` |
| S6 *(граничний)* | John (`john@example.com`) | змінює email на `john@example.com` | `{ user, changed: false }`, без помилки, без запису в сховище |
| S7 *(граничний)* | John | змінює email на `"  JOHN@Example.com "` | як S6: без змін і **без** `EMAIL_TAKEN` |
| S8 *(негативний)* | Немає користувача з id `999` | `changeEmail(999, "x@example.com")` | `USER_NOT_FOUND` («User not found») |

Додаткові граничні випадки, покриті тестами: порожній рядок, лише пробіли, пробіл усередині, домен без крапки, без локальної частини, без домену; `a@b.co` і `john+tag@example.com` приймаються; звільнений email можуть зайняти інші; A → B → A; повторна зміна на той самий новий email — no-op; порядок помилок; відсутність побічних ефектів.

## Дослідження і план

### Файли і їхні ролі

| Файл | Роль |
|---|---|
| `src/registration/registerUser.ts` | Еталон перевірок email при реєстрації; логіку нормалізації/валідації винесено звідси в спільний модуль |
| `src/registration/errors.ts` | Був джерелом `RegistrationError`; тепер реекспортує спільні помилки під старими іменами (зворотна сумісність) |
| `src/users/userRepository.ts` | In-memory сховище; додано `findById` і `updateEmail` |
| `src/validation/rules.ts`, `src/validation/patterns.ts` | Правила валідації та `EMAIL_PATTERN` — використовуються без змін |
| `src/validation/email.ts` *(новий)* | Єдине джерело правил email: `normalizeEmail`, `validateEmail` |
| `src/users/errors.ts` *(новий)* | Спільний `UserError` з кодами `INVALID_INPUT`, `EMAIL_TAKEN`, `USER_NOT_FOUND` |
| `src/profile/changeEmail.ts` *(новий)* | Нова функція `changeEmail` |
| `src/registration/registerUser.test.ts` | Наявні тести реєстрації — регресія |

### План агента

1. Винести нормалізацію і валідацію email зі `registerUser` у `src/validation/email.ts`; `registerUser` використовує helper.
2. Додати `findById` і `updateEmail` у `userRepository`.
3. Створити `src/profile/changeEmail.ts` з порядком перевірок зі специфікації.
4. Написати тести за S1–S8 і граничними випадками + тест паритету правил реєстрації та профілю.
5. Прогнати `npm test` і `npm run typecheck`.

### Режим сесії та схвалення плану

- **Стартовий режим сесії:** auto mode у Claude Code (агент виконує дії без підтвердження кожного кроку).
- **Варіант схвалення плану:** план схвалено текстом у чаті («yes to all 3, go ahead and implement»), без окремого plan mode.
- **Обґрунтування:** зміна невелика й локальна (один доменний модуль, in-memory сховище, без зовнішніх ефектів), а план кілька разів ітерувався в чаті й був переглянутий до написання коду. Ризик некерованих дій агента низький; усі зміни лишилися незакоміченими для перегляду.

### Зміни, внесені в план

1. **Розділено goals / spec / план реалізації.** Перша версія «Goals» змішувала цілі, поведінку й деталі реалізації (назви файлів, методи репозиторію). Після питання «are these goals are specs?» план переписано на три окремі частини.
2. **Специфікацію переписано в Given-When-Then і додано граничні випадки** (регістр/пробіли, звільнений email, порядок помилок, побічні ефекти).
3. **Закрито відкриті питання:**
   - для невідомого користувача додано `USER_NOT_FOUND`;
   - `RegistrationError` перейменовано на спільний `UserError`, старі імена лишилися аліасами;
   - функція повертає `{ user, changed }` замість просто `user`.

## Втручання під час виконання

| Що сталося | Що зроблено | Чому |
|---|---|---|
| Агент подав план, у якому «Goals» фактично містили специфікацію та кроки реалізації | Користувач спитав «are these goals are specs?», після чого попросив goals, non-goals, specs у Given-When-Then і граничні випадки | Без чіткої специфікації неможливо однозначно зіставити критерії з тестами; змішаний план ховав рішення (порядок перевірок, поведінку no-op) серед деталей реалізації |
| Відповідь «yes to all 3» на три відкриті питання була неоднозначною (два питання мали форму «A чи B?») | Агент обрав тлумачення: `USER_NOT_FOUND`, перейменування в `UserError` з аліасами, повернення `{ user, changed }`, і явно повідомив про це у звіті | Щоб рішення було видно й легко відкотити, якщо тлумачення хибне |
| Перед стартом у проєкті не було `node_modules` | Агент виконав `npm install` і прогнав базові тести до змін | Потрібна базова лінія «до змін», щоб відрізнити нові падіння від наявних |

## Перевірки

### До змін

```text
$ npm test
PASS src/registration/registerUser.test.ts
Tests:       4 passed, 4 total
```

### Після змін

```text
$ npm test
PASS src/profile/changeEmail.test.ts
PASS src/validation/emailParity.test.ts
PASS src/registration/registerUser.test.ts
Test Suites: 3 passed, 3 total
Tests:       40 passed, 40 total

$ npm run typecheck
> tsc --noEmit        (без помилок)
```

### Тести, що перевіряють саме нову поведінку

- `src/profile/changeEmail.test.ts` (26 тестів):
  - S1–S8;
  - граничні випадки формату;
  - унікальність і звільнений email;
  - порядок перевірок;
  - відсутність побічних ефектів.
- `src/validation/emailParity.test.ts` (10 тестів) — однаковий вердикт `registerUser` і `changeEmail` для одного набору email (доказ Goal 2).

Наявні 4 тести в `registerUser.test.ts` — регресія після винесення спільного helper; нової поведінки вони не перевіряють.

### Тести падають без зміни

**A. Без реалізації** (`src/profile/changeEmail.ts` відсутній, як у вихідному коді):

```text
FAIL src/profile/changeEmail.test.ts
  ● Test suite failed to run

    src/profile/changeEmail.test.ts:1:29 - error TS2307: Cannot find module './changeEmail' or its corresponding type declarations.

    1 import { changeEmail } from "./changeEmail";
                                  ~~~~~~~~~~~~~~~

Test Suites: 1 failed, 1 total
```

**B. Без перевірки «email збігається з поточним»** (з `changeEmail.ts` прибрано рядок `if (email === user.email) return { user, changed: false };`):

```text
FAIL src/profile/changeEmail.test.ts
    × S6: does nothing when the new email equals the current one
    × S7: treats the current email in different case/whitespace as unchanged (no EMAIL_TAKEN)
    × treats a repeated change to the same new email as a no-op

  ● changeEmail — spec › S6: does nothing when the new email equals the current one
    UserError: Email already registered
    > 22 |   if (userRepository.findByEmail(email)) throw new UserError("EMAIL_TAKEN");
      at changeEmail (src/profile/changeEmail.ts:22:48)
      at Object.<anonymous> (src/profile/changeEmail.test.ts:78:31)

  ● changeEmail — spec › S7: treats the current email in different case/whitespace as unchanged (no EMAIL_TAKEN)
    UserError: Email already registered
      at changeEmail (src/profile/changeEmail.ts:22:48)
      at Object.<anonymous> (src/profile/changeEmail.test.ts:90:31)
```

Обидва прогони виконано в тимчасовій копії проєкту; робоче дерево не змінювалося.

## Критерії → diff

| Критерій | Файл / функція | Тест (`src/profile/changeEmail.test.ts`, якщо не вказано інше) |
|---|---|---|
| S1 | `src/profile/changeEmail.ts` → `changeEmail`; `src/users/userRepository.ts` → `updateEmail` | `S1: changes the email to a new valid one` |
| S2 | `src/validation/email.ts` → `normalizeEmail`; `changeEmail` | `S2: normalizes the new email before saving` |
| S3 | `src/validation/email.ts` → `validateEmail`; `changeEmail` | `S3: rejects an invalid email and keeps the old one`; `changeEmail — format edge cases › rejects …`; `src/validation/emailParity.test.ts` → `gives the same verdict for …` |
| S4 | `changeEmail` (перевірка `findByEmail`) | `S4: rejects an email that belongs to another user` |
| S5 | `changeEmail` + `normalizeEmail` | `S5: rejects another user's email regardless of case and whitespace` |
| S6 | `changeEmail` (гілка `changed: false`) | `S6: does nothing when the new email equals the current one` |
| S7 | `changeEmail` (порівняння після нормалізації, до перевірки унікальності) | `S7: treats the current email in different case/whitespace as unchanged (no EMAIL_TAKEN)` |
| S8 | `changeEmail`; `src/users/userRepository.ts` → `findById`; `src/users/errors.ts` → `USER_NOT_FOUND` | `S8: rejects an unknown user`; `reports USER_NOT_FOUND before validating the email` |

## Non-goals → як перевірено

| Non-goal | Як перевірено, що diff його не порушує |
|---|---|
| NG1. Підтвердження / сповіщення | `changeEmail` одразу викликає `updateEmail`; у diff немає токенів, листів чи стану «очікує підтвердження» — нових залежностей у `package.json` немає |
| NG2. Повторне введення пароля | Сигнатура `changeEmail(userId, newEmail)` не приймає пароль; `userRepository` пароль не зберігає |
| NG3. HTTP / автентифікація | Diff містить лише доменні модулі в `src/`; `package.json` не змінено (немає фреймворків), нових точок входу немає |
| NG4. Інші поля профілю | `updateEmail` змінює лише `email`; тести `keeps id and username on a successful change` і `does not touch other users on a successful change` |
| NG5. Правила email | `src/validation/patterns.ts` і `src/validation/rules.ts` відсутні в diff (`git diff --stat`); `registerUser.test.ts` проходить без змін; `emailParity.test.ts` підтверджує однакові вердикти |
| NG6. БД / конкурентність | Змінено лише in-memory `userRepository`; нових залежностей чи сховищ немає |
| NG7. Аудит / історія / rate limiting | `updateEmail` замінює запис без збереження попереднього значення; нових колекцій, логів чи лічильників у diff немає |

## Що довелося виправити

1. **План — крок «Планування» (до написання коду).** Перша версія плану змішувала goals, специфікацію й деталі реалізації в одному списку «Goals». Виправлено: розділено на Goals / Non-goals / Spec (Given-When-Then) / План реалізації, додано граничні випадки.
2. **План → код — крок «Схвалення плану».** Специфікація не визначала поведінку для невідомого `userId` і результат no-op. Виправлено: додано критерій S8 (`USER_NOT_FOUND`) і повернення `{ user, changed }`; у коді — новий код помилки в `src/users/errors.ts` і `findById` у репозиторії.
3. **Тести — крок «Перевірка».** Щоб довести, що тести справді ловлять регресію, у тимчасовій копії прибрано перевірку «збіг із поточним»: тести S6, S7 і «repeated change» впали з `EMAIL_TAKEN` (вивід вище). Код агента після першого прогону виправлень не потребував — усі 40 тестів пройшли з першого разу.

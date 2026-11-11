# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Що це

Сервіс реєстрації платформи менторства «Наставник». Чиста TypeScript-бібліотека: немає HTTP-шару,
БД чи DI — точки входу це звичайні сервісні функції (напр. `registerUser`), які кидають типізовані помилки.

## Команди

Потрібен Node.js 20+.

```bash
npm install
npm test                                   # усі тести (Jest + ts-jest)
npx jest src/registration/registerUser.test.ts   # один файл
npx jest -t "rejects an invalid email"     # один тест за назвою
npm run typecheck                          # tsc --noEmit, strict
```

Лінтера й білду немає — `typecheck` і є перевірка компіляції.

## Архітектура

- `src/<feature>/` — сервісна функція + `errors.ts` + тест поруч (`src/registration/` — еталон).
- `src/validation/` — правила як функції `Rule = (value) => string | null`; `validate()` збирає
  масив повідомлень. `email.ts` (`normalizeEmail`, `validateEmail`) — єдине джерело правил для email,
  щоб реєстрація й інші сценарії перевіряли email однаково.
- `src/users/userRepository.ts` — in-memory сховище, стан на рівні модуля. `reset()` повертає сид-дані
  (john@example.com, olena@example.com); тести викликають його в `beforeEach`, інакше стан протікає між тестами.

## Інваріанти, на які спирається код

- Email зберігається нормалізованим (`trim().toLowerCase()`), а `findByEmail` порівнює точний рядок.
  Будь-який код, що пише email у сховище, має нормалізувати його перед записом і перед пошуком.
- Помилки — клас на фічу (`RegistrationError` з `code` + `fields: FieldErrors`); текст повідомлення
  береться з мапи `code → message`. Тести перевіряють саме текст повідомлення.
- Помилки валідації полів збираються всі разом в `fields` і кидаються одним `INVALID_INPUT`,
  до перевірок, що звертаються до сховища.

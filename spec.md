# NAST-1: Зміна email користувача

Тікет: користувач може змінити email у профілі. Новий email перевіряється так само, як під час
реєстрації, і не може належати іншому користувачу. Якщо новий email збігається з поточним,
нічого не змінюється.

## Критерії приймання

1. Успішна зміна
   Given користувач з email john@example.com
   When він змінює email на "  John.New@Example.COM "
   Then збережено john.new@example.com (пробіли обрізано, регістр нижній — як при реєстрації),
        а за старим email користувача більше не знайти

2. Невалідний email (негативний)
   Given користувач з email john@example.com
   When він змінює email на "not-an-email"
   Then помилка INVALID_INPUT "Please check the highlighted fields" з полем
        email: ["must be a valid email"], email користувача не змінився

3. Email іншого користувача (негативний)
   Given email olena@example.com належить іншому користувачу
   When john змінює email на "Olena@Example.com"
   Then помилка EMAIL_TAKEN "Email already registered", email john не змінився

4. Той самий email (граничний)
   Given користувач з email john@example.com
   When він змінює email на "john@example.com" або " JOHN@example.com "
   Then нічого не змінюється і помилки немає (зокрема не EMAIL_TAKEN на власний email)

5. Неіснуючий користувач (негативний; рішення поза тікетом)
   Given користувача з id 999 немає
   When змінюють його email
   Then помилка USER_NOT_FOUND "User not found"

## Non-goals

- не змінювати src/validation/patterns.ts (EMAIL_PATTERN лишається як є)
- не змінювати src/validation/rules.ts

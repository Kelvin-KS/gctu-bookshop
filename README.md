# GCTU Bookshop (student concept rebuild)

A public demo rebuild of our 2024 HND final-year project at Accra Technical University:
an online bookshop for university students and lecturers, with e-books and hard copies.

**Concept demo only.** Not a real shop, no real orders or payments, and not an official GCTU service.

## Credits

Original 2024 project by Ebueku Isaac, Kelvin Sakyi and Okyere Osei Samuel, supervised by
Mr. Joseph Eyram Dzata. This rebuild by Kelvin Sakyi, built with AI assistance and tested by hand.

## Stages

1. **Shop front** (this commit): home, catalogue, search and book pages.
2. Buying: demo sign-in, cart, Paystack test checkout, My Library, orders and tracking.
3. Lecturers and messages: Faculty desk, reading lists, messages and book requests.
4. Librarian: dashboard, books, orders, people and setup codes.
5. Testing: full test run and a published test report.

## How it's built

- Plain HTML, CSS and JavaScript in `public/`, no build step. Netlify publishes `public/`.
- Catalogue data: `public/data/books.json`.
- Text from the data or the URL is always inserted with `textContent`, never as HTML.
- Strict Content Security Policy in `netlify.toml`: scripts, styles, fonts and data only from this site.

Run it locally:

```bash
python3 -m http.server 4400 --directory public
```

## Content and licences

- **Fiction:** public domain. Only authors who died more than 70 years ago (Ghana's copyright term is life + 70).
- **Textbooks:** OpenStax, CC BY 4.0. Access for free at openstax.org. OpenStax's own covers and logo are not used; course codes are examples.
- **Campus photos:** "Bookshop (GCTU)", "Student Study Area (GCTU)" and "Faculty of Computing & Information Studies (GCTU)"
  by Jwale2, Wikimedia Commons, CC BY-SA 4.0. Colour-corrected; the edited versions are shared under the same licence.
- **Logo and covers:** original designs. The GCTU crest is not used.
- **Fonts:** Fraunces and DM Sans, SIL Open Font License 1.1 (`public/fonts/LICENSE.txt`).
- Prices, delivery fees and times are demo values.

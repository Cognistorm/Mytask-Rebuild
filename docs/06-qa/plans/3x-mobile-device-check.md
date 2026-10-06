# 3X visual refresh — app check on a phone (Owner)

About 20 minutes. App: Expo Go with `EXPO_PUBLIC_API_URL=https://mytask.1kk.ge/api/v1` in your `.env`
(SETUP-LOCAL §4 steps 17–18), branch `feat/visual-refresh`. Written in 3X.17e (2026-10-06); it becomes the
"App" part of the 3X click-through in 3X.23.

The 3X app work (3X.16–3X.17e) passed the typecheck, lint and the iOS + Android builds, but nobody has seen it on a
phone yet. This list covers what only a phone can show: motion, presses, glows and gradients. Tick what looks
right; write a short note next to anything that looks off.

Gig lists on staging are still empty (gigs arrive with slice 3), so gig cards are only seen where sample data
exists.

## Everywhere
- [ ] Screens have a soft gradient background (very light teal at the top), not flat grey.
- [ ] Buttons: a crisp border and a slight gradient; pressing one shrinks it a little and darkens it. No glow at
      rest.
- [ ] Text fields: a darker border; tapping into one turns the border teal with a soft teal glow; a field with an
      error has a red border.
- [ ] Messages (success / error / info) have a coloured bar on the left and fade in.
- [ ] Bottom tab bar: slightly see-through, active tab in teal.

## Home and Explore
- [ ] Home hero: teal gradient with a faint purple glow in the top-right corner.
- [ ] "Gigs" / "Projects" over the hero: see-through pills with a white outline; they shrink a little when pressed.
- [ ] Featured categories: each tile shows the category name on a band in **its own category colour**.
- [ ] Category rows: a short coloured bar left of the title; "See more" is a small outlined button in the
      category's colour.
- [ ] Cards and tiles fade in and rise slightly, one after another, when the screen opens.
- [ ] Explore: Filter and Sort are outlined buttons; in the filter sheet the chosen radio fills teal with a white
      dot; the price fields glow teal when typing; the sheet's ✕ is a round button.

## Categories
- [ ] Categories menu: each main category has its colour dot. Tapping the **name** opens the category; the round
      **+** opens its sub-categories (and shows a coloured bar on the left while open).
- [ ] A category page: breadcrumb as small tinted chips (tap one to go back up); the title on a band in the
      category colour.
- [ ] Explore projects: the "Popular" chips are tinted in their category colour; the selected one is filled.

## Profile and portfolio
- [ ] Profile card: a thin teal-to-purple strip along the top; the avatar in a teal ring with a soft glow.
- [ ] Rating bars fill from the left once when the profile opens.
- [ ] Skill chips are tappable and open "Hire the best … experts".
- [ ] Portfolio: cards with the image on top; a work's gallery is framed like a card.
- [ ] Report user: the bottom sheet has the same strip on top.

## Dashboard and Account
- [ ] Buying / Selling switcher: the highlight **slides** to the other side when you switch.
- [ ] Selling dashboard: the figure tiles appear one after another.
- [ ] Account tab: your account card has the strip on top.
- [ ] Edit profile: "Edit" / "Delete" / "Set availability" are small outlined buttons ("Delete" in red). Save a
      block: the card glows **green** once.

## Sign-in and restricted
- [ ] Login, register, password reset and the email-code step: the form sits in a card with the strip on top;
      Google / Facebook buttons have the outlined look.
- [ ] Restricted screen (a restricted test account): each restriction is a card with a coloured bar on the left
      (amber pending, green resolved, red rejected).

## Reduce Motion (phone accessibility setting)
- [ ] With **Reduce Motion** on: nothing slides or rises, the switcher jumps, rating bars appear filled; short
      fades and the green save glow may stay.

## Known, not changed
- The app is light only until the app's theme switch exists (tokens.md).
- The two-factor and "accept terms" switches are the phone's own switches (teal), not the website's gradient
  track.
- "My portfolio": Edit and Delete are both plain outlined buttons (no red outline); the delete confirmation keeps
  the red button.

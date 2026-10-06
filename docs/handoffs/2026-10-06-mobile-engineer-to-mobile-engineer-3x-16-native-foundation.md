## What I did
3X.16 mobile foundation for the visual refresh (visual-refresh.md §10, components.md §0.5 "Native" row):
- `expo-linear-gradient` 57.0.2 added, exact pin (the SDK 57 bundled version). RN 0.86's `backgroundImage` is still `experimental_`, so it is not used.
- New `apps/mobile/src/ui/` with the theme seam (`useTheme`), `Gradient`, the Reanimated motion presets, `Button`, `Card`, `Chip` and `SkeletonBlock`.
- The existing shared pieces now render through the new ones, so every screen already has the new buttons, skill chips and skeleton shimmer: `form.tsx` `Button`, `dashboard.tsx` `SecondaryButton` + `Skeleton`, `profile.tsx` `OutlineButton` + `Chip`.

## Files created/changed
- `apps/mobile/src/ui/{index.ts,theme.tsx,motion.ts,button.tsx,card.tsx,chip.tsx,skeleton.tsx}` (new)
- `apps/mobile/src/components/{form,dashboard,profile}.tsx`
- `apps/mobile/package.json`, `pnpm-lock.yaml`
- `docs/ROADMAP.md`, `docs/STATUS.md`, `docs/05-design/components.md`, `docs/05-design/visual-refresh.md`

## What the next agent must do (3X.17)
- Import from `../ui` (or `../../ui`). Use `Card` for the gig card, seller card, portfolio card, stat tiles and sections. `Card` does not clip, so give the media its own `overflow: 'hidden'` and top radius.
- Use `Chip` with `color` (the resolved top-level category colour from the API) for the explore-projects "Popular:" chips and the category screens. Use `selected` for the current chip.
- Add list entrances with `<Animated.View entering={enterAt(index)}>`, using `fadeIn` for notices.
- Paint the Home hero with `theme.gradient.hero`. It is an array of layers; use its linear layer through `Gradient`, because radial layers have no native equivalent. Paint the category screen header band with `categoryTheme(color).gradientStart/End`.
- Use `useTheme()` instead of importing `lightTheme` in new code.
- See press, entrance and shimmer in Expo Go on a device, including with Reduce Motion on.

## Open questions / risks
- Not yet run on a device or simulator. Only typecheck, lint and `expo export` were checked. This is the app's first Reanimated use; the worklets Babel plugin comes from `babel-preset-expo`.
- `expo-doctor` reports 5 existing SDK patch bumps (expo, expo-auth-session, expo-constants, expo-linking, expo-router). These are unrelated to this task and could be done in a separate upgrade task.
- Mobile dark mode does not exist yet (light-only app). `useTheme()` is the seam for it.

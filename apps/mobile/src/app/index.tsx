// App start (`/`, also where login and register land): the Home tab (slice 2, design 01-home.md "Native app").
// Guests browse Home and Explore (Owner Q-167); Dashboard and Account ask for login, restricted → /restricted.
// The Dashboard tab still opens the side chosen last (spec 02 AC-3).
import { Redirect } from 'expo-router';

export default function Start() {
  return <Redirect href="/home" />;
}

// App start (`/`, also where login and register land): the Home tab (slice 2, design 01-home.md "Native app").
// The tab layout is the session gate (signed out → login, restricted → /restricted). The Dashboard tab still opens
// the side chosen last (spec 02 AC-3).
import { Redirect } from 'expo-router';

export default function Start() {
  return <Redirect href="/home" />;
}

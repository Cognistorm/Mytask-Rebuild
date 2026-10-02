// App start (`/`, also where login and register land): the Dashboard tab, which opens the side chosen last
// (spec 02 AC-3). The tab layout is the session gate (signed out → login, restricted → /restricted). The Home
// tab (slice 02) takes this place when it exists.
import { Redirect } from 'expo-router';

export default function Start() {
  return <Redirect href="/dashboard" />;
}

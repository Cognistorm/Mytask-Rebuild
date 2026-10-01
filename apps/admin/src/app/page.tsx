// The admin home sends staff to the settings screen (dashboards arrive with slice 16).
import { redirect } from 'next/navigation';

export default function AdminHome() {
  redirect('/settings');
}

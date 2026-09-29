import { notFound } from 'next/navigation';

// Any unknown URL renders the styled “Lost in the Gallery” page inside the site layout.
export default function Missing() {
  notFound();
}

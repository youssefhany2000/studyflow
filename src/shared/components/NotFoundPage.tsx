import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-display">Page not found</h1>
      <Link to="/" className="text-accent underline">
        Back to Dashboard
      </Link>
    </div>
  );
}

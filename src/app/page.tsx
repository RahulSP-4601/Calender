import Link from 'next/link';

export default function Home() {
  const demo = [
    { id: 'contracts', name: 'Contracts I' },
    { id: 'torts', name: 'Torts' },
  ];
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-semibold">LawBandit – Syllabus → Calendar</h1>
      <p className="text-gray-600">Pick a class, upload a syllabus PDF, and generate calendar tasks.</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {demo.map(c => (
          <li key={c.id} className="border rounded-lg p-4 hover:shadow">
            <Link href={`/classes/${c.id}`} className="font-medium hover:underline">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

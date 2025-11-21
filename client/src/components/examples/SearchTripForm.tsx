import { SearchTripForm } from '../SearchTripForm';

export default function SearchTripFormExample() {
  return (
    <div className="p-6 bg-background max-w-2xl">
      <h2 className="text-2xl font-semibold mb-6">Search Trip Form</h2>
      <SearchTripForm
        onSearch={(data) => console.log("Recherche:", data)}
      />
    </div>
  );
}

import { DataTable } from '../DataTable';
import { Badge } from "@/components/ui/badge";

type User = {
  id: string;
  nom: string;
  email: string;
  role: string;
  statut: string;
};

export default function DataTableExample() {
  const users: User[] = [
    { id: "1", nom: "Ahmed Benali", email: "ahmed@example.com", role: "CHAUFFEUR", statut: "actif" },
    { id: "2", nom: "Fatima Zahra", email: "fatima@example.com", role: "CLIENT", statut: "actif" },
    { id: "3", nom: "Mohammed Alami", email: "mohammed@example.com", role: "ADMIN", statut: "actif" },
  ];

  const columns = [
    { key: "nom", header: "Nom" },
    { key: "email", header: "Email" },
    { 
      key: "role", 
      header: "Rôle",
      render: (user: User) => (
        <Badge variant="secondary">{user.role}</Badge>
      )
    },
    { 
      key: "statut", 
      header: "Statut",
      render: (user: User) => (
        <Badge className={user.statut === "actif" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
          {user.statut}
        </Badge>
      )
    },
  ];

  return (
    <div className="p-6 bg-background">
      <h2 className="text-2xl font-semibold mb-6">Data Table</h2>
      <DataTable
        data={users}
        columns={columns}
        onView={(user) => console.log("View:", user)}
        onEdit={(user) => console.log("Edit:", user)}
        onDelete={(user) => console.log("Delete:", user)}
      />
    </div>
  );
}

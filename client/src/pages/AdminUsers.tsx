import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useUsers, useUpdateUser, useDeleteUser } from "@/hooks/useUsers";
import type { User } from "@shared/schema";
import { isAdminRole, type TransportUserRole } from "@shared/roles";
import {
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users as UsersIcon,
} from "lucide-react";
import { formatDistanceToNow, subDays } from "date-fns";
import { fr } from "date-fns/locale";

type RoleFilterValue = "all" | "admin" | "chauffeur" | "client";
type StatusFilterValue = "all" | "actif" | "inactif" | "maintenance";
type UserUiStatus = "actif" | "inactif" | "maintenance";

const ROLE_FILTERS: { value: RoleFilterValue; label: string }[] = [
  { value: "all", label: "Tous les profils" },
  { value: "admin", label: "Administrateurs" },
  { value: "chauffeur", label: "Chauffeurs" },
  { value: "client", label: "Clients" },
];

const STATUS_FILTERS: { value: StatusFilterValue; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "actif", label: "Actifs" },
  { value: "inactif", label: "Inactifs" },
  { value: "maintenance", label: "Maintenance" },
];

const STATUS_META: Record<UserUiStatus, { label: string; className: string }> = {
  actif: {
    label: "Actif",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  inactif: {
    label: "Inactif",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-200",
  },
  maintenance: {
    label: "Maintenance",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  },
};

const ROLE_META: Record<
  TransportUserRole | "DEFAULT",
  { label: string; className: string }
> = {
  ADMIN: {
    label: "Administrateur",
    className:
      "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  },
  SUPER_ADMIN: {
    label: "Super admin",
    className:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  },
  CHAUFFEUR: {
    label: "Chauffeur",
    className:
      "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  },
  CLIENT: {
    label: "Client",
    className:
      "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200",
  },
  DEFAULT: {
    label: "Utilisateur",
    className:
      "bg-muted text-foreground dark:bg-slate-800 dark:text-slate-100",
  },
};

const ROLE_EDIT_OPTIONS: { value: TransportUserRole; label: string }[] = [
  { value: "CLIENT", label: "Client" },
  { value: "CHAUFFEUR", label: "Chauffeur" },
  { value: "ADMIN", label: "Administrateur" },
  { value: "SUPER_ADMIN", label: "Super administrateur" },
];

const STATUS_EDIT_OPTIONS = [
  { value: "actif", label: "Actif" },
  { value: "inactif", label: "Inactif" },
  { value: "maintenance", label: "Maintenance planifiee" },
];

type EditUserFormState = {
  prenom: string;
  nom: string;
  telephone: string;
  statut: string;
  role: TransportUserRole;
  mfaEnabled: boolean;
};

const DEFAULT_EDIT_FORM: EditUserFormState = {
  prenom: "",
  nom: "",
  telephone: "",
  statut: "actif",
  role: "CLIENT",
  mfaEnabled: false,
};

function resolveUserStatus(user: User): UserUiStatus {
  if (user.maintenance_until) {
    const until = new Date(user.maintenance_until);
    if (!Number.isNaN(until.getTime()) && until.getTime() > Date.now()) {
      return "maintenance";
    }
  }
  const normalized = (user.statut ?? "actif").toString().toLowerCase();
  if (normalized === "inactif") return "inactif";
  if (normalized === "maintenance") return "maintenance";
  return "actif";
}

function formatLastActivity(value: Date | string | null | undefined): string {
  if (!value) {
    return "Jamais connecte";
  }

  const parsed =
    value instanceof Date ? value : new Date(value as unknown as string);
  if (Number.isNaN(parsed.getTime())) {
    return "Non disponible";
  }

  return formatDistanceToNow(parsed, { locale: fr, addSuffix: true });
}

function getRoleMeta(role?: string | null) {
  const normalized = (role ?? "CLIENT").toUpperCase() as TransportUserRole;
  return ROLE_META[normalized] ?? ROLE_META.DEFAULT;
}

type Metric = {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
};

function buildUserMetrics(users: User[]): Metric[] {
  if (!users.length) {
    return [
      {
        label: "Utilisateurs actifs",
        value: "0",
        detail: "En attente de synchronisation",
        icon: <UsersIcon className="h-5 w-5" />,
      },
      {
        label: "Chauffeurs suivis",
        value: "0",
        detail: "Aucun chauffeur enregistre",
        icon: <UserCheck className="h-5 w-5" />,
      },
      {
        label: "Securite MFA",
        value: "0",
        detail: "Activez la MFA pour vos equipes",
        icon: <ShieldCheck className="h-5 w-5" />,
      },
    ];
  }

  const since = subDays(new Date(), 30);
  const total = users.length;
  const activeUsers = users.filter(
    (user) => resolveUserStatus(user) === "actif"
  ).length;
  const newUsers = users.filter((user) => {
    if (!user.created_at) return false;
    const createdAt =
      user.created_at instanceof Date
        ? user.created_at
        : new Date(user.created_at as unknown as string);
    return !Number.isNaN(createdAt.getTime()) && createdAt >= since;
  }).length;
  const chauffeurs = users.filter(
    (user) => (user.role ?? "").toUpperCase() === "CHAUFFEUR"
  );
  const inactiveChauffeurs = chauffeurs.filter(
    (chauffeur) => resolveUserStatus(chauffeur) !== "actif"
  ).length;
  const adminCount = users.filter((user) => isAdminRole(user.role)).length;
  const mfaEnabled = users.filter((user) => user.mfa_enabled).length;

  return [
    {
      label: "Utilisateurs actifs",
      value: `${activeUsers}/${total}`,
      detail: `${newUsers} nouveaux sur 30 j`,
      icon: (
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <UsersIcon className="h-4 w-4" />
        </div>
      ),
    },
    {
      label: "Chauffeurs suivis",
      value: `${chauffeurs.length}`,
      detail: `${inactiveChauffeurs} a surveiller`,
      icon: (
        <div className="rounded-full bg-sky-100 p-2 text-sky-600 dark:bg-sky-900/40 dark:text-sky-200">
          <UserCheck className="h-4 w-4" />
        </div>
      ),
    },
    {
      label: "Securite MFA",
      value: `${mfaEnabled}`,
      detail: `${adminCount} profils admin`,
      icon: (
        <div className="rounded-full bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200">
          <ShieldCheck className="h-4 w-4" />
        </div>
      ),
    },
  ];
}

type UserEditDialogProps = {
  user: User | null;
  onOpenChange: (open: boolean) => void;
};

function UserEditDialog({ user, onOpenChange }: UserEditDialogProps) {
  const { toast } = useToast();
  const updateUser = useUpdateUser();
  const [form, setForm] = useState<EditUserFormState>(DEFAULT_EDIT_FORM);
  const isOpen = Boolean(user);

  useEffect(() => {
    if (user) {
      setForm({
        prenom: user.prenom ?? "",
        nom: user.nom ?? "",
        telephone: user.telephone ?? "",
        statut: user.statut ?? "actif",
        role: (user.role?.toUpperCase() as TransportUserRole) ?? "CLIENT",
        mfaEnabled: Boolean(user.mfa_enabled),
      });
    } else {
      setForm(DEFAULT_EDIT_FORM);
    }
  }, [user]);

  if (!isOpen || !user) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: Partial<User> = {
      prenom: form.prenom.trim(),
      nom: form.nom.trim(),
      telephone: form.telephone.trim() || null,
      statut: form.statut,
      role: form.role,
      mfa_enabled: form.mfaEnabled,
    };

    updateUser.mutate(
      { id: user.id, data: payload },
      {
        onSuccess: () => {
          toast({
            title: "Utilisateur mis a jour",
            description: `${form.prenom} ${form.nom} a ete actualise.`,
          });
          onOpenChange(false);
        },
        onError: (error: any) => {
          toast({
            title: "Impossible de sauvegarder",
            description:
              error?.message ?? "Une erreur est survenue pendant la mise a jour.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Modifier {user.prenom} {user.nom}</DialogTitle>
            <DialogDescription>
              Ajustez les informations clefs, notamment le role et les acces.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user-firstname">Prenom</Label>
              <Input
                id="user-firstname"
                value={form.prenom}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, prenom: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-lastname">Nom</Label>
              <Input
                id="user-lastname"
                value={form.nom}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, nom: event.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" value={user.email} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-phone">Telephone</Label>
            <Input
              id="user-phone"
              placeholder="+216 ..."
              value={form.telephone}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, telephone: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    role: value as TransportUserRole,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionnez un role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_EDIT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={form.statut}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, statut: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionnez un statut" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_EDIT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-base">Double authentification</Label>
              <p className="text-sm text-muted-foreground">
                Renforcez la securite de ce compte.
              </p>
            </div>
            <Switch
              checked={form.mfaEnabled}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, mfaEnabled: checked }))
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sauvegarder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsers() {
  const { toast } = useToast();
  const {
    data: users = [],
    isLoading,
    isFetching,
    refetch,
  } = useUsers();
  const deleteUser = useDeleteUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const metrics = useMemo(() => buildUserMetrics(users), [users]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const haystack = `${user.prenom} ${user.nom} ${user.email} ${
        user.telephone ?? ""
      }`.toLowerCase();
      const matchesSearch = normalizedQuery
        ? haystack.includes(normalizedQuery)
        : true;

      const normalizedRole = (user.role ?? "").toUpperCase();
      const matchesRole =
        roleFilter === "all"
          ? true
          : roleFilter === "admin"
          ? isAdminRole(normalizedRole)
          : roleFilter === "chauffeur"
          ? normalizedRole === "CHAUFFEUR"
          : normalizedRole === "CLIENT";

      const status = resolveUserStatus(user);
      const matchesStatus =
        statusFilter === "all" ? true : status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const columns = useMemo(
    () => [
      {
        key: "identity",
        header: "Utilisateur",
        render: (user: User) => (
          <div>
            <p className="font-medium">
              {user.prenom} {user.nom}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        ),
      },
      {
        key: "role",
        header: "Role",
        render: (user: User) => {
          const meta = getRoleMeta(user.role);
          return <Badge className={meta.className}>{meta.label}</Badge>;
        },
      },
      {
        key: "statut",
        header: "Statut",
        render: (user: User) => {
          const status = resolveUserStatus(user);
          const meta = STATUS_META[status];
          return <Badge className={meta.className}>{meta.label}</Badge>;
        },
      },
      {
        key: "last_login",
        header: "Derniere activite",
        render: (user: User) => (
          <span className="text-sm text-muted-foreground">
            {formatLastActivity(user.last_login)}
          </span>
        ),
      },
      {
        key: "telephone",
        header: "Telephone",
        render: (user: User) => user.telephone || "-",
      },
      {
        key: "mfa_enabled",
        header: "Securite",
        render: (user: User) =>
          user.mfa_enabled ? (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
              MFA activee
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">
              Mot de passe
            </span>
          ),
      },
    ],
    []
  );

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    deleteUser.mutate(userToDelete.id, {
      onSuccess: () => {
        toast({
          title: "Utilisateur supprime",
          description: `${userToDelete.prenom} ${userToDelete.nom} a ete retire.`,
        });
        setUserToDelete(null);
      },
      onError: (error: any) => {
        toast({
          title: "Suppression impossible",
          description:
            error?.message ?? "Une erreur est survenue pendant la suppression.",
          variant: "destructive",
        });
      },
    });
  };

  const isRefetching = isFetching && !isLoading;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground mt-1">
            Visualisez les profils et mettez a jour les acces en quelques clics.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => void refetch()}
          disabled={isRefetching}
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
          />
          Actualiser
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.label}
              </CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <Input
          className="max-w-lg flex-1"
          placeholder="Rechercher un nom, email, telephone..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <Select
          value={roleFilter}
          onValueChange={(value) =>
            setRoleFilter(value as RoleFilterValue)
          }
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrer par role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            setStatusFilter(value as StatusFilterValue)
          }
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-[420px] w-full" />
      ) : (
        <DataTable
          data={filteredUsers}
          columns={columns}
          onEdit={(user) => setUserToEdit(user)}
          onDelete={(user) => setUserToDelete(user)}
        />
      )}

      <UserEditDialog
        user={userToEdit}
        onOpenChange={(open) => {
          if (!open) {
            setUserToEdit(null);
          }
        }}
      />

      <AlertDialog
        open={Boolean(userToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setUserToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. {userToDelete?.prenom}{" "}
              {userToDelete?.nom} perdra l'acces a la plateforme.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleteUser.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUser.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

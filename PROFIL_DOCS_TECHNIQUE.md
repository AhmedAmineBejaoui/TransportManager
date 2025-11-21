# 🔧 Documentation Technique - Section Profil

## Architecture

```
client/
├── pages/
│   └── ProfilePage.tsx (Page principale avec tabs)
├── components/profile/
│   ├── PersonalInfoSection.tsx
│   ├── AccountSettingsSection.tsx
│   ├── PreferencesSection.tsx
│   ├── TransportDataSection.tsx
│   ├── SecuritySection.tsx
│   └── SupportSection.tsx
└── hooks/
    └── useProfile.ts (Hooks personnalisés)

server/
├── routes.ts (Routes API)
└── storage.ts (Accès BD)

shared/
└── schema.ts (Schéma Drizzle)
```

## Schéma de Base de Données

### Table: `users`

```typescript
export const users = pgTable("users", {
  // Existant
  id: varchar("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  nom: text("nom").notNull(),
  prenom: text("prenom").notNull(),
  role: text("role").default("CLIENT"),
  telephone: text("telephone"),
  permis_num: text("permis_num"),
  statut: text("statut").default("actif"),
  mfa_enabled: boolean("mfa_enabled").default(false),
  auth_provider: text("auth_provider").default("local"),
  provider_id: text("provider_id"),
  created_at: timestamp("created_at").defaultNow(),
  last_login: timestamp("last_login"),
  
  // Nouveau - Profil
  photo_profil: text("photo_profil"),
  langue_preferee: text("langue_preferee").default("fr"),
  fuseau_horaire: text("fuseau_horaire").default("Africa/Tunis"),
  adresse: text("adresse"),
  
  // Nouveau - Notifications
  notifications_email: boolean("notifications_email").default(true),
  notifications_reservations: boolean("notifications_reservations").default(true),
  notifications_alertes: boolean("notifications_alertes").default(true),
  
  // Nouveau - Paiement & RGPD
  moyens_paiement: jsonb("moyens_paiement"),
  donnees_suppression_demandee: timestamp("donnees_suppression_demandee"),
});
```

## API Endpoints

### Profil

#### GET /api/profile
Récupère le profil utilisateur complet

**Réponse (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "+216 70 123 456",
  "adresse": "123 Rue de la Paix, Tunis",
  "role": "CLIENT",
  "auth_provider": "local",
  "photo_profil": "base64_url_or_path",
  "langue_preferee": "fr",
  "fuseau_horaire": "Africa/Tunis",
  "notifications_email": true,
  "notifications_reservations": true,
  "notifications_alertes": true,
  "moyens_paiement": [...],
  "created_at": "2025-01-01T00:00:00Z",
  "last_login": "2025-11-21T10:00:00Z"
}
```

---

#### PUT /api/profile
Met à jour le profil utilisateur

**Body:**
```json
{
  "nom": "Nouveau Nom",
  "prenom": "Nouveau Prénom",
  "telephone": "+216 70 987 654",
  "adresse": "456 Rue de l'Indépendance, Sfax",
  "photo_profil": "data:image/jpeg;base64,...",
  "langue_preferee": "en",
  "fuseau_horaire": "Europe/Paris",
  "notifications_email": false,
  "notifications_reservations": true,
  "notifications_alertes": true
}
```

**Réponse (200):** Profil mis à jour

**Erreurs:**
- 401: Non authentifié
- 404: Utilisateur non trouvé
- 500: Erreur serveur

---

### Mot de Passe

#### POST /api/profile/change-password
Change le mot de passe utilisateur

**Body:**
```json
{
  "ancien_mot_de_passe": "AncienPassword123!",
  "nouveau_mot_de_passe": "NouveauPassword456!",
  "confirmation": "NouveauPassword456!"
}
```

**Validation:**
- Ancien mot de passe correct (vérifié avec bcrypt)
- Nouveau mot de passe ≥ 8 caractères
- Nouveau mot de passe = Confirmation
- Nouveau mot de passe ≠ Ancien mot de passe

**Réponse (200):**
```json
{
  "success": true,
  "message": "Mot de passe mis à jour avec succès"
}
```

**Erreurs:**
- 400: Validation échouée
- 401: Ancien mot de passe incorrect
- 401: Non authentifié
- 404: Utilisateur non trouvé

---

### Moyens de Paiement

#### GET /api/profile/payment-methods
Récupère tous les moyens de paiement

**Réponse (200):**
```json
[
  {
    "id": "uuid-1",
    "type": "carte",
    "nom": "Carte Visa",
    "derniersChiffres": "1234",
    "estParDefaut": true
  },
  {
    "id": "uuid-2",
    "type": "paypal",
    "nom": "PayPal Personnel",
    "estParDefaut": false
  }
]
```

---

#### POST /api/profile/payment-methods
Ajoute un moyen de paiement

**Body:**
```json
{
  "type": "carte|paypal|virement",
  "nom": "Carte MasterCard",
  "derniersChiffres": "5678",
  "estParDefaut": false
}
```

**Réponse (200):**
```json
{
  "id": "uuid-new",
  "type": "carte",
  "nom": "Carte MasterCard",
  "derniersChiffres": "5678",
  "estParDefaut": false
}
```

---

#### DELETE /api/profile/payment-methods/:id
Supprime un moyen de paiement

**Paramètres:**
- `id` (string, UUID) - ID du moyen de paiement

**Réponse (200):**
```json
{
  "success": true
}
```

**Erreurs:**
- 404: Moyen de paiement non trouvé

---

### Données & RGPD

#### GET /api/profile/export-data
Exporte toutes les données personnelles en JSON

**Réponse (200):** Fichier JSON
```json
{
  "exportDate": "2025-11-21T12:00:00Z",
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    ...
  }
}
```

**Headers de réponse:**
```
Content-Type: application/json
Content-Disposition: attachment; filename="donnees-personnelles-2025-11-21.json"
```

---

#### POST /api/profile/request-deletion
Demande la suppression du compte (RGPD)

**Body:** (vide)

**Réponse (200):**
```json
{
  "success": true,
  "message": "Demande de suppression enregistrée. Votre compte sera supprimé après 30 jours."
}
```

**Processus:**
1. Marque `donnees_suppression_demandee` avec timestamp
2. Email de confirmation envoyé à l'utilisateur
3. Compte restera accessible pendant 30 jours
4. Après 30 jours: suppression automatique (TODO)

---

#### GET /api/profile/export (Existant)
Exporte le profil en JSON (ancien endpoint)

---

#### GET /api/profile/history (Existant)
Récupère l'historique des versions du profil

---

## Hooks React

### useProfile()

```typescript
const { data: profile, isLoading } = useProfile();
```

**Propriétés:**
- `data` - Profil complet
- `isLoading` - Chargement en cours

---

### useUpdateProfile()

```typescript
const updateProfile = useUpdateProfile();

// Utilisation
updateProfile.mutate({
  nom: "Nouveau Nom",
  telephone: "+216 ...",
  ...
});
```

**Propriétés:**
- `mutate(data)` - Fonction pour mettre à jour
- `isPending` - Requête en cours
- `isError` - Erreur rencontrée
- `error` - Message d'erreur

---

### useChangePassword()

```typescript
const changePassword = useChangePassword();

changePassword.mutate({
  ancien_mot_de_passe: "old",
  nouveau_mot_de_passe: "new",
  confirmation: "new"
});
```

---

### usePaymentMethods()

```typescript
const { data: paymentMethods, isLoading } = usePaymentMethods();
```

---

### useAddPaymentMethod()

```typescript
const addPaymentMethod = useAddPaymentMethod();

addPaymentMethod.mutate({
  type: "carte",
  nom: "Ma Carte",
  derniersChiffres: "1234",
  estParDefaut: false
});
```

---

### useDeletePaymentMethod()

```typescript
const deletePaymentMethod = useDeletePaymentMethod();

deletePaymentMethod.mutate(paymentMethodId);
```

---

### useDownloadPersonalData()

```typescript
const downloadData = useDownloadPersonalData();

downloadData.mutate();
// Déclenche le téléchargement du fichier
```

---

### useRequestAccountDeletion()

```typescript
const requestDeletion = useRequestAccountDeletion();

requestDeletion.mutate();
// Demande la suppression du compte
```

---

## Flux d'Authentification

```
1. Utilisateur se connecte
   ↓
2. Session créée avec userId
   ↓
3. Middleware requireAuth vérifie la session
   ↓
4. Requête authentifiée traitée
   ↓
5. Données sensibles (passwords) filtrées
   ↓
6. Réponse JSON retournée au client
```

---

## Middleware

### requireAuth

Vérifie que l'utilisateur est authentifié

```typescript
function requireAuth(req: Request, res: Response, next: NextFunction)
```

Effets:
- Récupère l'utilisateur depuis la session
- Vérifie que le compte n'est pas en maintenance
- Enregistre l'activité utilisateur
- Appelle `next()` si valide, sinon retourne 401

---

## Gestion d'Erreurs

### Codes de Réponse

| Code | Signification |
|------|---------------|
| 200 | Succès |
| 400 | Validation échouée |
| 401 | Non authentifié |
| 404 | Ressource non trouvée |
| 500 | Erreur serveur |

### Messages d'Erreur

Tous les endpoints retournent une structure cohérente:

```json
{
  "error": "Description de l'erreur"
}
```

---

## Sécurité

### Chiffrement

```typescript
// Chiffrement du mot de passe
const hashedPassword = await bcrypt.hash(password, 10);

// Vérification
const validPassword = await bcrypt.compare(password, hashedPassword);
```

### Filtrage des Données

```typescript
// Toujours exclure le mot de passe
const { password, ...safe } = user;
res.json(safe);
```

### Validation des Entrées

- Email: Format email validé
- Mot de passe: ≥ 8 caractères
- Téléphone: Format international
- Types: Énumérations strictes

---

## Testing

### Tester Localement

```bash
# Démarrer le serveur
npm run dev

# Ouvrir l'app
http://localhost:5173

# Accéder au profil
http://localhost:5173/profile
```

### Tester une Route API

```bash
# Récupérer le profil
curl -X GET http://localhost:5000/api/profile \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_ID"

# Mettre à jour le profil
curl -X PUT http://localhost:5000/api/profile \
  -H "Content-Type: application/json" \
  -d '{"nom":"Nouveau"}' \
  -b "connect.sid=YOUR_SESSION_ID"
```

---

## Performance

### Optimisations

- ✅ React Query pour le caching
- ✅ Lazy loading des sections
- ✅ Memoization des composants
- ✅ Pagination des listes

### Considérations

- Fichiers de photo: À implémenter avec stockage cloud (S3, etc.)
- Suppression de compte: À automatiser après 30 jours
- Notifications: À implémenter avec système d'événements

---

## Déploiement

### Variables d'Environnement

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
NODE_ENV=production
```

### Migration

```bash
npm run db:push
```

### Build

```bash
npm run build
npm start
```

---

## Logs & Monitoring

### Activités Enregistrées

- Connexions
- Modifications de profil
- Changements de mot de passe
- Demandes de suppression
- Téléchargements de données

---

*Documentation complète pour les développeurs*
*Dernière mise à jour: Novembre 2025*

# TransportPro Driver - Application Scanner Chauffeur

Application mobile Android native pour les chauffeurs permettant de scanner et valider les tickets QR des passagers.

## 🎯 Fonctionnalités

- ✅ Scanner QR code via caméra
- ✅ Validation instantanée du ticket
- ✅ Check-in automatique des passagers
- ✅ Historique des derniers scans
- ✅ Interface mobile optimisée
- ✅ Fonctionne hors connexion (affiche erreur réseau)

## 🛠️ Technologies

- **React 19** - Interface utilisateur
- **Capacitor** - Build natif Android
- **html5-qrcode** - Scanner QR
- **Vite** - Build tool

## 📱 Installation pour développement

### 1. Installer les dépendances
```bash
cd driver-app
npm install
```

### 2. Configurer l'API
Copier `.env.example` vers `.env` et modifier l'URL de l'API :
```bash
cp .env.example .env
```

Modifier `VITE_API_URL` avec l'IP de votre serveur backend :
```
VITE_API_URL=http://192.168.1.XX:5000
```

### 3. Lancer en mode développement
```bash
npm run dev
```

## 📦 Build APK Android

### 1. Build du frontend
```bash
npm run build
```

### 2. Ajouter la plateforme Android (première fois)
```bash
npx cap add android
```

### 3. Synchroniser les fichiers
```bash
npx cap sync android
```

### 4. Ouvrir Android Studio
```bash
npx cap open android
```

### 5. Générer l'APK
Dans Android Studio :
- Menu → **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
- L'APK sera dans `android/app/build/outputs/apk/debug/`

## 🔧 Configuration réseau

### Sur le serveur backend
S'assurer que le serveur Express écoute sur `0.0.0.0` et pas seulement `localhost` :
```javascript
app.listen(5000, '0.0.0.0', () => {
  console.log('Server running on port 5000');
});
```

### Trouver l'IP du serveur
- **Windows** : `ipconfig` → Adresse IPv4
- **Linux/Mac** : `ifconfig` ou `ip addr`

### Configuration Android
Le fichier `capacitor.config.ts` est configuré pour permettre les connexions HTTP (cleartext).

## 📋 API Endpoint utilisé

```
POST /api/reservations/scan
Content-Type: application/json

{
  "qrCode": { ... }, // Payload du QR code
  "autoCheckin": true // Check-in automatique
}
```

**Réponse succès :**
```json
{
  "valid": true,
  "status": "valid",
  "reservation": { ... },
  "trip": { ... },
  "checkedIn": true
}
```

**Réponse erreur :**
```json
{
  "valid": false,
  "status": "invalid",
  "error": "Message d'erreur",
  "issues": ["Détail 1", "Détail 2"]
}
```

## 🚀 Déploiement sur téléphones chauffeurs

1. Générer l'APK en mode release (signé)
2. Transférer l'APK sur les téléphones
3. Activer "Sources inconnues" dans les paramètres Android
4. Installer l'APK
5. Accorder les permissions caméra

## 📝 Notes

- L'application nécessite une connexion réseau au serveur backend
- Les téléphones doivent être sur le même réseau que le serveur (WiFi)
- Pour une utilisation hors réseau local, configurer un domaine/VPN

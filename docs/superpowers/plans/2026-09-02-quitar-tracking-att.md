# Quitar tracking / declarar "no ATT" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La app deja de rastrear al usuario: anuncios solo no personalizados, sin `NSUserTrackingUsageDescription`, sin prompt de ATT, y Firebase Analytics sin señales de publicidad.

**Architecture:** Cambios de configuración (`app.json`, nuevo `firebase.json`) y un ajuste en el único componente que carga anuncios (`AdBanner.jsx`) para forzar `requestNonPersonalizedAdsOnly`. Se mantiene el flujo de consentimiento GDPR/UMP de Google (`AdsConsent`), que no es ATT. La ficha de App Privacy en App Store Connect se actualiza a mano.

**Tech Stack:** Expo (SDK según `package.json` — ver Global Constraints), `react-native-google-mobile-ads@16.0.0`, `@react-native-firebase/analytics@^26.2.0`.

**Spec:** `docs/superpowers/specs/2026-09-02-apple-rejections-design.md` (punto 3)

## Global Constraints

- **JavaScript, no TypeScript.** Archivos nuevos en `.js`/`.jsx`.
- **Expo SDK:** `package.json` fija `expo ~56.0.19`. `AGENTS.md` menciona
  `https://docs.expo.dev/versions/v57.0.0/`. Antes de tocar nada nativo,
  confirmar con el usuario qué SDK es el bueno y leer la doc de ESA versión.
  Para dependencias nativas usar siempre `npx expo install <pkg>` (resuelve la
  versión correcta), nunca `npm install <pkg>` a pelo.
- **AdMob App IDs** (no tocar): Android `ca-app-pub-8850172965752172~9010439949`,
  iOS `ca-app-pub-8850172965752172~2580762966`.
- **Banner Ad Unit IDs** (no tocar): Android
  `ca-app-pub-8850172965752172/7752398866`, iOS
  `ca-app-pub-8850172965752172/7928226901`.
- Textos de UI en español con acentos correctos.
- El proyecto no tiene tests de infraestructura ni de componentes; solo de
  `application/` y `shared/`. Seguir esa convención: lo que no sea lógica pura
  se valida con pasos manuales explícitos.

---

### Task 1: Quitar `userTrackingUsageDescription` de `app.json`

**Files:**
- Modify: `app.json` (bloque del plugin `react-native-google-mobile-ads`)

**Interfaces:**
- Consumes: nada.
- Produces: `app.json` sin la clave `userTrackingUsageDescription`; tras
  `expo prebuild` el `Info.plist` de iOS no lleva `NSUserTrackingUsageDescription`.

- [ ] **Step 1: Editar `app.json`**

En el array `plugins`, el bloque:

```json
[
  "react-native-google-mobile-ads",
  {
    "androidAppId": "ca-app-pub-8850172965752172~9010439949",
    "iosAppId": "ca-app-pub-8850172965752172~2580762966",
    "userTrackingUsageDescription": "Este identificador se usa para mostrarte anuncios más relevantes. Puedes seguir usando CuentaBirras igual si no lo permites."
  }
]
```

pasa a:

```json
[
  "react-native-google-mobile-ads",
  {
    "androidAppId": "ca-app-pub-8850172965752172~9010439949",
    "iosAppId": "ca-app-pub-8850172965752172~2580762966"
  }
]
```

- [ ] **Step 2: Verificar que el JSON sigue siendo válido**

Run: `node -e "JSON.parse(require('fs').readFileSync('app.json','utf8')); console.log('ok')"`
Expected: imprime `ok`

- [ ] **Step 3: Commit**

```bash
git add app.json
git commit -m "Quita el texto de uso de tracking del plugin de anuncios"
```

---

### Task 2: Forzar anuncios no personalizados en `AdBanner.jsx`

**Files:**
- Modify: `src/presentation/components/AdBanner.jsx`

**Interfaces:**
- Consumes: el módulo `react-native-google-mobile-ads` (cargado con `require`
  perezoso, ya existente en el archivo).
- Produces: `<BannerAd>` renderizado siempre con
  `requestOptions={{ requestNonPersonalizedAdsOnly: true }}`.

- [ ] **Step 1: Consultar la API exacta**

Abrir la doc de `react-native-google-mobile-ads` v16 (npm:
`react-native-google-mobile-ads`, sección "Displaying Ads" → "Request
options"). Confirmar el nombre de la prop `requestNonPersonalizedAdsOnly` en
`requestOptions` de `<BannerAd>` para esa versión. (En v16 es
`requestOptions={{ requestNonPersonalizedAdsOnly: true }}`.)

- [ ] **Step 2: Editar el render de `<BannerAd>`**

En `src/presentation/components/AdBanner.jsx`, el bloque actual:

```jsx
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.BANNER}
        onAdFailedToLoad={(error) => console.warn('El anuncio no se pudo cargar:', error)}
      />
```

pasa a:

```jsx
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.BANNER}
        // La app no pide permiso de tracking (ATT) y declara "no tracking" en
        // App Store Connect: por coherencia, nunca se piden anuncios
        // personalizados, ni en iOS ni en Android. El consentimiento GDPR de
        // Google (AdsConsent, arriba) es aparte y sí se mantiene.
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={(error) => console.warn('El anuncio no se pudo cargar:', error)}
      />
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores nuevos en `AdBanner.jsx`

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/AdBanner.jsx
git commit -m "Pide siempre anuncios no personalizados en el banner"
```

---

### Task 3: `firebase.json` — desactivar recogida de IDFA / señales de publicidad

**Files:**
- Create: `firebase.json` (raíz del repo)

**Interfaces:**
- Consumes: nada.
- Produces: flags de build de RNFirebase que impiden la recogida del IDFA y
  del AD_ID por parte de Google Analytics.

- [ ] **Step 1: Consultar la doc de RNFirebase v26**

En `https://rnfirebase.io/` (versión 26.x, que es la instalada) → "Analytics"
→ "Configure data collection / IDFA". Anotar los nombres EXACTOS de las claves
de `firebase.json` para: desactivar recogida de IDFA en iOS, desactivar
recogida de AD_ID, y (si existe) desactivar la personalización de anuncios.

- [ ] **Step 2: Crear `firebase.json`**

Con las claves confirmadas en el step 1. Valor de partida (ajustar nombres a
lo que diga la doc si difieren):

```json
{
  "react-native": {
    "analytics_auto_collection_enabled": true,
    "analytics_idfv_collection_enabled": true,
    "ios_analytics_idfa_collection_enabled": false,
    "google_analytics_adid_collection_enabled": false,
    "google_analytics_ssaid_collection_enabled": false
  }
}
```

Se deja la analítica de producto activa (`analytics_auto_collection_enabled`,
`idfv`), solo se corta lo que sirve para publicidad de terceros.

- [ ] **Step 3: Verificar JSON válido**

Run: `node -e "JSON.parse(require('fs').readFileSync('firebase.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add firebase.json
git commit -m "Corta la recogida de IDFA y AD_ID de Analytics"
```

---

### Task 4: Verificación del build nativo

**Files:**
- (ninguno — verificación)

**Interfaces:**
- Consumes: los cambios de las tasks 1-3.
- Produces: confirmación de que el `Info.plist` generado no declara ATT.

- [ ] **Step 1: Regenerar el proyecto nativo**

Run: `npx expo prebuild --platform ios --clean`
Expected: termina sin error.

- [ ] **Step 2: Comprobar que NO está la clave de ATT**

Run: `grep -R "NSUserTrackingUsageDescription" ios/ || echo "AUSENTE (correcto)"`
Expected: imprime `AUSENTE (correcto)`

- [ ] **Step 3: Comprobar que no hay código que pida ATT**

Run: `grep -R "requestTrackingPermission\|TrackingTransparency\|expo-tracking-transparency" src/ app/ package.json || echo "AUSENTE (correcto)"`
Expected: imprime `AUSENTE (correcto)`

- [ ] **Step 4: (manual) App Store Connect → App Privacy**

Con rol Account Holder o Admin: en App Store Connect → la app → App Privacy,
revisar cada tipo de dato declarado y quitar la marca "Used to Track You" /
"Usado para rastrearte". El resultado debe quedar como "Data Not Linked to
You" y sin ningún dato marcado como tracking. Guardar.

- [ ] **Step 5: (sin commit)**

Los artefactos de `ios/` no se commitean si el proyecto usa prebuild bajo
demanda (comprobar `.gitignore`). Si `ios/` está en `.gitignore`, no hay nada
que commitear en esta task.

---

## Self-Review

**Spec coverage (punto 3 del spec):**
- Quitar `userTrackingUsageDescription` → Task 1. ✓
- `requestNonPersonalizedAdsOnly` en `BannerAd` → Task 2. ✓
- Mantener `AdsConsent` (UMP) → no se toca, explícito en Task 2 comentario. ✓
- Firebase Analytics sin señales de publicidad → Task 3. ✓
- App Store Connect App Privacy → Task 4 Step 4. ✓
- No añadir `expo-tracking-transparency` → Task 4 Step 3 lo verifica. ✓

**Placeholder scan:** Tasks 1 y 3 tienen un step de "consultar doc" antes de
escribir config nativa — es un requisito real de `AGENTS.md`, no un
placeholder; el step siguiente da el contenido concreto a escribir.

**Type consistency:** No hay interfaces de código entre tasks (solo config).

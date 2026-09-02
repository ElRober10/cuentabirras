# Sign in with Apple (iOS) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ofrecer "Continuar con Apple" como alternativa a Google en la pantalla de login, solo en iOS, cumpliendo la guideline 4.8 de App Store.

**Architecture:** `expo-apple-authentication` obtiene un `identityToken` con un `nonce` hasheado; `supabase.auth.signInWithIdToken({ provider: 'apple', ... })` crea/recupera la sesión. Apple solo entrega el nombre en el primer login, así que si llega y el perfil está vacío se guarda con `updateProfile`. El botón se renderiza solo si `Platform.OS === 'ios'` y `AppleAuthentication.isAvailableAsync()`. Google y email/contraseña no se tocan.

**Tech Stack:** `expo-apple-authentication`, `expo-crypto`, `@supabase/supabase-js`, Expo Router, React Native Paper.

**Spec:** `docs/superpowers/specs/2026-09-02-apple-rejections-design.md` (punto 1)

## Global Constraints

- **JavaScript, no TypeScript.**
- **Expo SDK:** `package.json` fija `expo ~56.0.19`; `AGENTS.md` menciona
  `docs.expo.dev/versions/v57.0.0/`. Confirmar con el usuario cuál es el bueno
  y leer la doc de ESA versión antes de instalar. Instalar dependencias
  nativas SIEMPRE con `npx expo install <pkg>`.
- Arquitectura hexagonal: pantallas/hooks nunca importan `supabase` directo;
  van por `container.authRepository`. Contrato en
  `src/domain/repositories/IAuthRepository.js`.
- `bundleIdentifier` iOS: `com.elrober10.cuentabirras` (no cambiar).
- El botón de Apple usa el componente oficial
  `AppleAuthentication.AppleAuthenticationButton` (requisito de Apple sobre el
  aspecto del botón).
- El email de relay de Apple (`…@privaterelay.appleid.com`) es un email
  válido normal; no hay tratamiento especial.
- Textos de UI en español con acentos correctos.
- El proyecto solo testea `application/` y `shared/`. Igual que
  `signInWithGoogle` (que no tiene test), la parte nativa se valida con pasos
  manuales; se añade test solo a la lógica pura extraíble (generación de
  nonce).

---

### Task 1: Configuración externa (Apple Developer, App Store Connect, Supabase)

**Files:**
- (ninguno — configuración en paneles web)

**Interfaces:**
- Consumes: nada.
- Produces: proveedor Apple operativo en Supabase; capability activa en el App ID.

- [ ] **Step 1: Apple Developer — App ID**

developer.apple.com → Certificates, IDs & Profiles → Identifiers → el App ID
`com.elrober10.cuentabirras` → marcar la capability **Sign in with Apple** →
Save.

- [ ] **Step 2: Apple Developer — Service ID + clave para Supabase**

- Crear un **Services ID** (p. ej. `com.elrober10.cuentabirras.signin`),
  habilitar "Sign in with Apple", configurar el dominio y el Return URL de
  Supabase: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`.
- Crear una **Key** con "Sign in with Apple" habilitado, descargar el `.p8`.
- Anotar: Team ID, Key ID, Services ID.

- [ ] **Step 3: Supabase — proveedor Apple**

Dashboard de Supabase → Authentication → Providers → Apple → Enable. Rellenar:
- **Client IDs**: el bundle ID `com.elrober10.cuentabirras` **y** el Services
  ID, separados por coma (el bundle ID es el que valida el `identityToken` de
  la app nativa).
- **Secret Key (for OAuth)**: generar el JWT del cliente a partir del `.p8` +
  Team ID + Key ID + Services ID (Supabase da instrucciones en esa misma
  pantalla), o pegar los campos si la UI los pide sueltos.
- Save.

- [ ] **Step 4: App Store Connect**

App Store Connect → la app → en la configuración de la versión, asegurarse de
que "Sign in with Apple" queda declarado (suele detectarse solo del
entitlement al subir el build).

- [ ] **Step 5: (sin commit — configuración externa)**

Documentar en el PR / notas qué Services ID y Key ID se usaron.

---

### Task 2: Instalar dependencias y configurar `app.json`

**Files:**
- Modify: `package.json` (vía `expo install`)
- Modify: `app.json`

**Interfaces:**
- Consumes: nada.
- Produces: `expo-apple-authentication` y `expo-crypto` instalados; `app.json`
  con el plugin y `ios.usesAppleSignIn: true`; tras prebuild, entitlement
  `com.apple.developer.applesignin` en el target iOS.

- [ ] **Step 1: Instalar**

Run: `npx expo install expo-apple-authentication expo-crypto`
Expected: ambas añadidas a `package.json` con versiones compatibles con el SDK.

- [ ] **Step 2: `app.json` — plugin**

Añadir `"expo-apple-authentication"` al array `plugins` (junto a los demás
plugins string, p. ej. tras `"expo-web-browser"`).

- [ ] **Step 3: `app.json` — flag de iOS**

En el objeto `"ios"`, añadir `"usesAppleSignIn": true`:

```json
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.elrober10.cuentabirras",
      "googleServicesFile": "./GoogleService-Info.plist",
      "usesAppleSignIn": true
    },
```

- [ ] **Step 4: Validar JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('app.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "Añade expo-apple-authentication y activa usesAppleSignIn"
```

---

### Task 3: Helper de nonce en `src/shared`

**Files:**
- Create: `src/shared/utils/appleNonce.js`
- Test: `test/shared/utils/appleNonce.test.js`

**Interfaces:**
- Consumes: `expo-crypto`.
- Produces:
  - `generateRawNonce(): string` — cadena hex aleatoria (≥ 32 caracteres).
  - `hashNonce(rawNonce: string): Promise<string>` — SHA-256 en hex del input.

- [ ] **Step 1: Escribir el test que falla**

`test/shared/utils/appleNonce.test.js`:

```js
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_algo, input) => `hash(${input})`),
  randomUUID: jest.fn(() => '11111111-1111-1111-1111-111111111111'),
}));

import { generateRawNonce, hashNonce } from '../../../src/shared/utils/appleNonce';

describe('appleNonce', () => {
  it('generateRawNonce devuelve una cadena de al menos 32 caracteres sin guiones', () => {
    const nonce = generateRawNonce();
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThanOrEqual(32);
    expect(nonce).not.toContain('-');
  });

  it('hashNonce delega en expo-crypto con SHA-256', async () => {
    const result = await hashNonce('abc');
    expect(result).toBe('hash(abc)');
  });
});
```

- [ ] **Step 2: Ejecutar el test — debe fallar**

Run: `npm test -- appleNonce`
Expected: FAIL ("Cannot find module '.../appleNonce'").

- [ ] **Step 3: Implementar**

`src/shared/utils/appleNonce.js`:

```js
import * as Crypto from 'expo-crypto';

// Sign in with Apple con Supabase necesita un "nonce" (número usado una sola
// vez) para atar la petición nativa a Apple con el canje del token en
// Supabase, y que nadie pueda reutilizar un identityToken robado:
//  - a Apple se le manda el HASH (SHA-256) del nonce  -> signInAsync({ nonce })
//  - a Supabase se le manda el nonce EN CLARO         -> signInWithIdToken({ nonce })
// Supabase comprueba que el hash del que le damos coincide con el que Apple
// metió dentro del identityToken.

export function generateRawNonce() {
  // Dos UUID v4 concatenados sin guiones = 64 hex de entropía, de sobra.
  return (Crypto.randomUUID() + Crypto.randomUUID()).replace(/-/g, '');
}

export function hashNonce(rawNonce) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
}
```

- [ ] **Step 4: Ejecutar el test — debe pasar**

Run: `npm test -- appleNonce`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/utils/appleNonce.js test/shared/utils/appleNonce.test.js
git commit -m "Añade el helper de nonce para Sign in with Apple"
```

---

### Task 4: Contrato `IAuthRepository.signInWithApple`

**Files:**
- Modify: `src/domain/repositories/IAuthRepository.js`

**Interfaces:**
- Consumes: nada.
- Produces: entrada JSDoc `signInWithApple: () => Promise<UserProfile>`.

- [ ] **Step 1: Añadir al typedef**

Tras la línea de `signInWithGoogle` en el bloque `@typedef`:

```js
 * @property {() => Promise<UserProfile>} signInWithApple - Login/registro con Sign in with Apple (solo iOS) vía expo-apple-authentication + supabase.auth.signInWithIdToken. Apple solo entrega nombre y email en el PRIMER login de cada usuario; si llegan y el perfil los tiene vacíos, los guarda. Como no pasa por la casilla de términos, el llamador debe comprobar `user.termsAcceptedAt` igual que con Google.
```

- [ ] **Step 2: Commit**

```bash
git add src/domain/repositories/IAuthRepository.js
git commit -m "Documenta signInWithApple en el contrato de auth"
```

---

### Task 5: Implementación `SupabaseAuthRepository.signInWithApple`

**Files:**
- Modify: `src/infrastructure/supabase/repositories/SupabaseAuthRepository.js`

**Interfaces:**
- Consumes: `expo-apple-authentication`, `generateRawNonce`/`hashNonce`
  (Task 3), `supabase` (de `../client`), `fetchProfile` (helper existente en
  el archivo), `supabaseAuthRepository.updateProfile` (método existente en el
  mismo objeto).
- Produces: método `signInWithApple()` en `supabaseAuthRepository`.

- [ ] **Step 1: Añadir imports**

Al principio del archivo, junto a los imports existentes:

```js
import * as AppleAuthentication from 'expo-apple-authentication';

import { generateRawNonce, hashNonce } from '../../../shared/utils/appleNonce';
```

- [ ] **Step 2: Añadir el método**

Tras `signInWithGoogle` en el objeto `supabaseAuthRepository`:

```js
  // Se llama desde app/(auth)/login.jsx, SOLO en iOS (la pantalla oculta el
  // botón en Android). A diferencia de Google, no hace falta abrir un
  // navegador: expo-apple-authentication da un identityToken nativo que
  // Supabase canjea directamente con signInWithIdToken.
  async signInWithApple() {
    const rawNonce = generateRawNonce();
    const hashedNonce = await hashNonce(rawNonce);

    let credential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
    } catch (error) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        throw new Error('Inicio de sesión con Apple cancelado.');
      }
      throw error;
    }

    if (!credential.identityToken) {
      throw new Error('No se pudo completar el inicio de sesión con Apple.');
    }

    // A Supabase se le pasa el nonce EN CLARO (ver appleNonce.js).
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) throw error;

    let profile = await fetchProfile(data.user.id);

    // Apple solo manda el nombre en el PRIMER login, y casi nunca dentro del
    // token — llega aquí, en `credential.fullName`. Si lo tenemos y el perfil
    // aún está vacío, lo guardamos ahora (si no, se quedaría sin nombre hasta
    // que el usuario lo pusiera a mano en "Editar datos personales").
    const givenName = credential.fullName?.givenName?.trim();
    const familyName = credential.fullName?.familyName?.trim();
    if ((givenName || familyName) && !profile.firstName && !profile.lastName) {
      profile = await this.updateProfile({
        firstName: givenName ?? '',
        lastName: familyName ?? '',
        phone: profile.phone ?? null,
      });
    }

    return profile;
  },
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/supabase/repositories/SupabaseAuthRepository.js
git commit -m "Implementa signInWithApple con signInWithIdToken"
```

---

### Task 6: `useAuth.loginWithApple`

**Files:**
- Modify: `src/presentation/hooks/useAuth.js`

**Interfaces:**
- Consumes: `container.authRepository.signInWithApple` (Task 5), `setUser`.
- Produces: `loginWithApple` en el objeto que devuelve `useAuth()`.

- [ ] **Step 1: Añadir el callback**

Tras `loginWithGoogle` en `useAuth.js`:

```js
  const loginWithApple = useCallback(async () => {
    const nextUser = await container.authRepository.signInWithApple();
    setUser(nextUser);
    return nextUser;
  }, [setUser]);
```

- [ ] **Step 2: Exponerlo en el return**

Añadir `loginWithApple` al objeto que devuelve el hook (tras `loginWithGoogle`).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/hooks/useAuth.js
git commit -m "Expone loginWithApple desde useAuth"
```

---

### Task 7: Botón "Continuar con Apple" en `login.jsx`

**Files:**
- Modify: `app/(auth)/login.jsx`

**Interfaces:**
- Consumes: `useAuth().loginWithApple`, `expo-apple-authentication`,
  `Platform` de `react-native`.
- Produces: nada nuevo hacia otras tasks.

- [ ] **Step 1: Añadir imports**

```js
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, StyleSheet, View } from 'react-native';
```

(la línea de `react-native` ya existe con `StyleSheet, View` — añadir `Platform`).

- [ ] **Step 2: Estado y disponibilidad**

Dentro del componente, junto a los otros `useState`:

```js
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
```

Y un efecto (junto al de biometría):

```js
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
  }, []);
```

- [ ] **Step 3: Handler**

Junto a `handleGoogleLogin`:

```js
  const handleAppleLogin = async () => {
    setServerError(null);
    setIsAppleLoading(true);
    try {
      const user = await loginWithApple();
      router.replace(user.termsAcceptedAt ? '/(app)' : '/settings/edit-profile');
    } catch (error) {
      setServerError(error.message);
    } finally {
      setIsAppleLoading(false);
    }
  };
```

- [ ] **Step 4: Botón bajo el de Google**

Después del `<AppButton ... icon="google">` de Google:

```jsx
      {appleAuthAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={20}
          style={styles.appleButton}
          onPress={handleAppleLogin}
        />
      ) : null}
```

- [ ] **Step 5: Cruzar los `disabled` y añadir estilo**

- En el `<AppButton>` "Entrar": `disabled={isGoogleLoading || isAppleLoading}`.
- En el `<AppButton>` de Google: `disabled={isSubmitting || isAppleLoading}`.
- En `styles`, añadir:

```js
  appleButton: {
    height: 44,
    marginTop: 16,
  },
```

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 7: Commit**

```bash
git add "app/(auth)/login.jsx"
git commit -m "Añade el botón de Sign in with Apple en el login (iOS)"
```

---

### Task 8: `edit-profile.jsx` — ocultar "Cambiar contraseña" también para Apple

**Files:**
- Modify: `app/(app)/settings/edit-profile.jsx`

**Interfaces:**
- Consumes: `user.authProvider` (ya lo expone `fetchProfile`: `'email'` |
  `'google'` | `'apple'`).
- Produces: nada nuevo.

- [ ] **Step 1: Generalizar la comprobación**

Cambiar:

```js
  const isGoogleAccount = user?.authProvider === 'google';
```

por:

```js
  // Ni las cuentas de Google ni las de Apple tuvieron nunca contraseña
  // propia: el login es siempre por el proveedor.
  const isOAuthAccount = user?.authProvider === 'google' || user?.authProvider === 'apple';
```

Y su único uso, `{isGoogleAccount ? null : ( ... )}`, pasa a
`{isOAuthAccount ? null : ( ... )}`.

- [ ] **Step 2: Comprobar que no queda ningún `isGoogleAccount`**

Run: `grep -n "isGoogleAccount" "app/(app)/settings/edit-profile.jsx" || echo "limpio"`
Expected: `limpio`

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/settings/edit-profile.jsx"
git commit -m "Trata las cuentas de Apple como OAuth en editar perfil"
```

---

### Task 9: Build y verificación en dispositivo

**Files:**
- (ninguno — build y verificación)

**Interfaces:**
- Consumes: todo lo anterior + Task 1 (config externa).
- Produces: grabación de pantalla del flujo de Apple para App Review;
  screenshots actualizados si procede.

- [ ] **Step 1: Prebuild + build iOS**

Run: `npx expo prebuild --platform ios --clean`
Luego el build local en Mac (ver
`docs`/memoria de gotchas de iOS del proyecto) o EAS.

- [ ] **Step 2: Verificar el entitlement**

Run: `grep -R "com.apple.developer.applesignin" ios/ && echo "presente (correcto)"`
Expected: imprime la línea y `presente (correcto)`.

- [ ] **Step 3: Prueba manual en iPhone físico**

1. Instalar el build. Pantalla de login → debe verse el botón negro "Sign in
   with Apple" bajo el de Google.
2. Pulsarlo → aparece la hoja nativa de Apple (Face ID / contraseña) con la
   opción "Ocultar mi correo".
3. Completar → primera vez: entra y, al no tener términos aceptados, va a
   "Editar datos personales" con el nombre precargado (si se dio permiso de
   nombre). Aceptar términos → entra a la app.
4. Cerrar sesión y volver a entrar con Apple → entra directo a la app (ya no
   pide nombre ni términos).
5. Probar "Cancelar" en la hoja de Apple → mensaje "Inicio de sesión con
   Apple cancelado.", sin crash.
6. En un dispositivo/emulador Android: el botón de Apple NO aparece.

- [ ] **Step 4: Grabar el flujo para App Review**

Grabar login con Apple (pasos 1-3) en dispositivo físico. Guardar para las
notas de App Review Information.

- [ ] **Step 5: Screenshots**

Si algún screenshot de la ficha muestra la pantalla de login, recapturarlo
para que incluya el botón de Apple (App Review lo pidió explícitamente).

---

## Self-Review

**Spec coverage (punto 1 del spec):**
- Dependencia `expo-apple-authentication` + `app.json` (`plugin`,
  `usesAppleSignIn`) → Task 2. ✓
- Capability en App ID / App Store Connect / proveedor Supabase → Task 1. ✓
- `IAuthRepository.signInWithApple` → Task 4. ✓
- `SupabaseAuthRepository.signInWithApple` (nonce, `signInAsync`,
  `signInWithIdToken`, cancelación, captura de `fullName` en primer login) →
  Tasks 3 + 5. ✓
- `useAuth.loginWithApple` → Task 6. ✓
- Botón en `login.jsx`, solo iOS, bajo el de Google, con
  `router.replace(user.termsAcceptedAt ? ...)` → Task 7. ✓
- `edit-profile.jsx`: Apple tratado como OAuth (sin sección de contraseña) →
  Task 8. ✓
- Email de relay válido sin tratamiento especial → no requiere código; el
  flujo de email existente ya lo acepta. ✓
- `handle_new_user` no necesita migración → confirmado en el spec, sin task. ✓
- Tests: helper de nonce → Task 3. La lógica nativa se valida en Task 9 (igual
  que `signInWithGoogle`, que se envió sin test unitario). ✓

**Placeholder scan:** Task 1 son pasos de configuración web con valores
concretos a anotar, no placeholders de código. Tasks de código llevan el
contenido completo.

**Type consistency:**
- `signInWithApple: () => Promise<UserProfile>` idéntico en Tasks 4, 5, 6.
- `generateRawNonce` / `hashNonce`: firmas idénticas en Task 3 (definición) y
  Task 5 (uso).
- `loginWithApple` idéntico en Task 6 (definición) y Task 7 (uso).
- `isAppleLoading`, `appleAuthAvailable`, `handleAppleLogin`: nombres
  consistentes dentro de Task 7.
- `user.authProvider` valores `'email'|'google'|'apple'` coherentes con
  `fetchProfile` (spec) y Task 8.

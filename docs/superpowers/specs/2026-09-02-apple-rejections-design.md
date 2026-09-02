# Diseño — respuesta al rechazo de App Review (submission d2d25d43)

Fecha: 2026-09-02
Estado: aprobado para implementar

## Contexto

App Review rechazó la versión 1.0 (build 12) de CuentaBirras (iOS) por cinco
puntos. Este documento define los cambios para resolverlos. La versión Android
no se ve afectada por ninguno de ellos salvo, opcionalmente, el ajuste de
tracking (punto 3), que se aplica a ambas plataformas por simplicidad.

Rechazos:

1. **4.8 Login Services** — hay login de terceros (Google) pero ningún login
   alternativo que cumpla las tres condiciones de Apple (datos mínimos, email
   privado, sin tracking publicitario sin consentimiento). Solución: añadir
   Sign in with Apple.
2. **5.1.1(v) Account Deletion** — la app crea cuentas pero no ofrece
   borrarlas desde dentro. Solución: pantalla de borrado de cuenta in-app.
3. **2.1 Information Needed (ATT)** — el framework AppTrackingTransparency
   está enlazado pero el prompt nunca aparece. Solución: dejar de rastrear y
   declarar "no tracking" (no implementar el prompt).
4. **2.3.3 Accurate Metadata** — los screenshots de iPad 13" solo muestran el
   login. Solución: subir screenshots reales (solo App Store Connect, sin
   código).

Decisiones de producto tomadas durante el brainstorming:

- ATT: **opción B** (quitar tracking). Reevaluar cuando la app escale.
- Sign in with Apple: **solo iOS**, en la misma pantalla donde ya está Google
  (`login.jsx`). Google se mantiene igual en ambas plataformas.
- Borrado de cuenta: **inmediato**, sin periodo de gracia. Las aportaciones al
  catálogo colaborativo de precios se **conservan anonimizadas** (se pone
  `updated_by` a `null`); no se borran.

## No forma parte de este trabajo

- Implementar el prompt de ATT / anuncios personalizados (backlog futuro).
- Añadir Sign in with Apple en Android o en `register.jsx`.
- Rehacer el flujo de login de Google.
- Migrar la página web `docs/eliminar-cuenta.html` (se puede actualizar
  después para mencionar el borrado in-app; no bloquea la resubmisión).

---

## Punto 1 — Sign in with Apple

### Configuración externa (no es código de la app)

- **Apple Developer**: activar la capability "Sign in with Apple" en el App ID
  `com.elrober10.cuentabirras`.
- **App Store Connect**: activar Sign in with Apple para la app.
- **Supabase** → Authentication → Providers → Apple: registrar el Service ID,
  el Team ID, la Key ID y la clave privada `.p8` generada en Apple Developer.
- El build local en Mac (ver memoria de gotchas de iOS) necesitará la
  entitlement `com.apple.developer.applesignin` en el target; `expo prebuild`
  la añade a partir de `app.json` (ver abajo).

### `app.json`

- Añadir `"expo-apple-authentication"` a `plugins`.
- Añadir `"usesAppleSignIn": true` dentro de `"ios"`.

### Dependencia

- `expo-apple-authentication` (versión compatible con Expo SDK 57 — comprobar
  en https://docs.expo.dev/versions/v57.0.0/ antes de instalar).

### Capa de dominio — `IAuthRepository`

Nuevo método en el contrato (JSDoc):

```
signInWithApple: () => Promise<UserProfile>
```

Comportamiento documentado: login/registro con Apple vía
`expo-apple-authentication` + `supabase.auth.signInWithIdToken`. Apple solo
entrega nombre y email **en el primer inicio de sesión** de cada usuario; si
llegan, y el perfil aún los tiene vacíos, el método los guarda. Como Apple no
pasa por la casilla de términos, el llamador debe comprobar
`user.termsAcceptedAt` (igual que con Google).

### Capa de infraestructura — `SupabaseAuthRepository.signInWithApple()`

Flujo:

1. Generar `rawNonce` (cadena aleatoria, p. ej. 32 bytes en hex vía
   `expo-crypto`). Calcular `hashedNonce = SHA256(rawNonce)` (hex).
2. `AppleAuthentication.signInAsync({ requestedScopes: [FULL_NAME, EMAIL], nonce: hashedNonce })`.
   - Si el usuario cancela, Apple lanza con `code === 'ERR_REQUEST_CANCELED'`
     → traducir a `Error('Inicio de sesión con Apple cancelado.')`.
3. `supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: rawNonce })`.
   - Si `identityToken` es `null` → `Error('No se pudo completar el inicio de sesión con Apple.')`.
4. Con la sesión ya establecida: `profile = await fetchProfile(session.user.id)`.
5. Si `credential.fullName` trae `givenName`/`familyName` **y**
   `profile.firstName`/`profile.lastName` están vacíos → llamar a
   `updateProfile({ firstName, lastName, phone: profile.phone })` y devolver el
   perfil actualizado. Si no, devolver `profile` tal cual.
6. `authProvider` sale de `fetchProfile` como `'apple'` (ya lee
   `session.user.app_metadata.provider`).

Notas:

- El email de relay de Apple (`…@privaterelay.appleid.com`) es un email válido
  normal para la app; no hay tratamiento especial.
- `handle_new_user` (SQL) ya hace `coalesce(full_name, name, …)`. Apple
  normalmente **no** mete el nombre en el id_token, así que el perfil nacerá
  con nombre vacío y se completará en el paso 5 o, si el usuario no dio
  permiso de nombre, en la pantalla de completar perfil. **No hace falta
  migración SQL para este punto.**

### Capa de presentación

- `useAuth`: exponer `loginWithApple` (mismo patrón que `loginWithGoogle`:
  llama al repo, `setUser`, devuelve el usuario).
- `app/(auth)/login.jsx`:
  - Importar `expo-apple-authentication` y `react-native` `Platform`.
  - Bajo el botón "Continuar con Google", si `Platform.OS === 'ios'` y
    `AppleAuthentication.isAvailableAsync()` (guardado en estado con
    `useEffect`), renderizar
    `<AppleAuthentication.AppleAuthenticationButton>` con
    `buttonType=SIGN_IN`, `buttonStyle` según el tema, `cornerRadius` acorde
    al resto de botones, altura ~44.
  - `onPress`: `handleAppleLogin`, misma estructura que `handleGoogleLogin`
    (spinner con su propio `isAppleLoading`, `setServerError`, y al volver
    `router.replace(user.termsAcceptedAt ? '/(app)' : '/settings/edit-profile')`).
  - `disabled` cruzado entre los tres botones mientras cualquiera carga.
- `app/(app)/settings/edit-profile.jsx`: cambiar
  `const isGoogleAccount = user?.authProvider === 'google'` por una
  comprobación que incluya `'apple'` (p. ej. `isOAuthAccount`), para ocultar
  también ahí la sección "Cambiar contraseña" (una cuenta Apple nunca tuvo
  contraseña). Renombrar la variable y ajustar el único uso.

### Tests

- `SupabaseAuthRepository.signInWithApple`: test con `expo-apple-authentication`
  y `supabase` mockeados — verifica que el `rawNonce` (no el hash) se pasa a
  `signInWithIdToken`, que la cancelación se traduce al mensaje esperado, y
  que se llama a `updateProfile` solo cuando llega `fullName` y el perfil
  estaba vacío.
- `useAuth.loginWithApple`: test de que hace `setUser` con lo que devuelve el
  repo.

---

## Punto 2 — Borrado de cuenta in-app

### Problema de integridad referencial

`profiles.id → auth.users(id)` es `on delete cascade`, pero varias FKs
apuntan a `profiles(id)` **sin** cascada y con `not null`, así que un simple
`delete from auth.users` fallaría con violación de FK si el usuario tiene
datos:

| Tabla.columna              | not null | on delete | Acción en el borrado |
|----------------------------|----------|-----------|----------------------|
| `bars.created_by`          | sí       | NO ACTION | reasignar a otro `bar_member`, o borrar el bar |
| `tabs.created_by`          | sí       | NO ACTION | reasignar a otro `tab_participant`, o borrar la cuenta |
| `tab_participants.user_id` | sí       | NO ACTION | borrar las filas del usuario |
| `tab_items.added_by`       | sí       | NO ACTION | borrar las filas del usuario |
| `catalog_items.updated_by` | no       | NO ACTION | poner a `null` (conservar aportación) |
| `account_links.unlinked_by`| no       | NO ACTION | poner a `null` |

FKs que **sí** cascadean desde `profiles` (no requieren acción manual):
`bar_members.user_id`, `bar_photos.user_id`, `account_link_members.user_id`,
`account_link_requests.sender_id`, `account_link_requests.recipient_user_id`.

Cascadas encadenadas útiles: `bars → tabs` (0007), `bars → catalog_items`,
`tabs → tab_items`, `tabs → tab_participants`, `catalog_items → tab_items`
(0009). Es decir, borrar un bar limpia todo lo que cuelga de él.

### Migración `supabase/migrations/0039_delete_own_account.sql`

Función `security definer`, ejecutada como su dueño (rol con permiso sobre
`auth.users`), `search_path = public, auth`. Pasos en orden:

1. **Cerrar el vínculo de pareja.** Para el `link` activo del usuario:
   `update account_link_members set unlinked_at = now()` de **ambos** miembros
   (el propio y el de la pareja — la fila de la pareja no cascadea y se
   quedaría "activa", bloqueándole vincular otra cuenta). `update
   account_links set unlinked_at = now(), unlinked_by = v_uid`.
2. `update account_links set unlinked_by = null where unlinked_by = v_uid` (las
   ya cerradas por el usuario en el pasado).
3. **Bares creados por el usuario:**
   - `update bars set created_by = (otro bar_member más antiguo) where
     created_by = v_uid and existe otro miembro`.
   - `delete from bars where created_by = v_uid` (ya solo quedan los que no
     tienen otro miembro; la cascada se lleva catalog_items, bar_members,
     bar_photos, tabs, tab_items, tab_participants de ese bar).
4. **Cuentas (tabs) creadas por el usuario que hayan sobrevivido:**
   - `update tabs set created_by = (otro tab_participant) where created_by =
     v_uid and existe otro participante`.
   - `delete from tabs where created_by = v_uid` (cascada: tab_items,
     tab_participants).
5. `delete from tab_items where added_by = v_uid` (sus consumiciones en tabs
   ajenas/compartidas que sobreviven).
6. `delete from tab_participants where user_id = v_uid` (deja las tabs
   compartidas solo con la otra persona).
7. `update catalog_items set updated_by = null where updated_by = v_uid`.
8. `delete from auth.users where id = v_uid` (cascada final: profiles,
   bar_members, bar_photos, account_link_members, account_link_requests).

`revoke all ... from public, anon; grant execute ... to authenticated;`.

Lanza excepción si `auth.uid()` es `null`.

### Capa de dominio — `IAuthRepository`

```
deleteAccount: () => Promise<void>
```

### Capa de infraestructura — `SupabaseAuthRepository.deleteAccount()`

```js
const { error } = await supabase.rpc('delete_own_account');
if (error) throw error;
await supabase.auth.signOut();  // limpia la sesión local; el usuario en auth ya no existe
```

### Capa de presentación

- `useAuth`: `deleteAccount` → llama al repo y `clearUser()`.
- **Nueva pantalla** `app/(app)/settings/delete-account.jsx`:
  - Título "Borrar mi cuenta" y explicación:
    - Se borra de forma permanente e inmediata: perfil (nombre, email,
      teléfono), cuentas de bar y consumiciones, histórico, vínculo de pareja.
    - Se conserva de forma anónima: los precios que hayas aportado al catálogo
      compartido de cada bar.
    - Si tiene cuenta vinculada (`useAuth`/hook de link ya existente), añadir:
      "Se desvinculará tu cuenta de la de {nombre pareja}".
  - Confirmación en dos pasos:
    1. `TextInput` "Escribe BORRAR para confirmar" — el botón se habilita solo
       con el texto exacto `BORRAR`.
    2. Al pulsar, `Alert` nativo "¿Seguro? Esta acción no se puede deshacer"
       con botones "Cancelar" / "Borrar" (destructivo).
  - Estado de carga mientras corre el RPC; `serverError` si falla.
  - Al terminar: `router.replace('/(auth)/login')`.
- `app/(app)/settings/index.jsx`: nueva entrada al final, icono
  `account-remove-outline`, texto en `theme.colors.error`, navega a
  `/settings/delete-account`.

### Tests

- `SupabaseAuthRepository.deleteAccount`: llama a `rpc('delete_own_account')` y
  luego a `signOut`; propaga el error si el RPC falla.
- `useAuth.deleteAccount`: llama al repo y a `clearUser`.
- La lógica SQL se valida a mano en una rama de Supabase / proyecto de pruebas
  (ver plan): crear usuario con bar propio, bar compartido, tab compartida,
  vínculo de pareja, entradas de catálogo; ejecutar la función; comprobar que
  `auth.users` queda sin la fila, que la pareja puede volver a vincularse, que
  el bar compartido conserva `created_by` válido, y que los precios del
  catálogo siguen ahí con `updated_by = null`.

---

## Punto 3 — Quitar tracking / declarar "no ATT"

### `app.json`

- En el plugin `react-native-google-mobile-ads`, **eliminar** la clave
  `userTrackingUsageDescription`. Sin ella, `expo` no añade
  `NSUserTrackingUsageDescription` al `Info.plist`.
- No añadir `expo-tracking-transparency`.

### `src/presentation/components/AdBanner.jsx`

- Tras `googleMobileAds.default().initialize()`, fijar la configuración de
  request global para anuncios no personalizados:
  ```js
  await googleMobileAds.default().setRequestConfiguration({
    maxAdContentRating: googleMobileAds.MaxAdContentRating.PG, // opcional, revisar
  });
  ```
  y, lo esencial, pasar en la `BannerAd`:
  ```jsx
  <BannerAd
    unitId={BANNER_AD_UNIT_ID}
    size={BannerAdSize.BANNER}
    requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    onAdFailedToLoad={…}
  />
  ```
  (Confirmar la API exacta de `requestNonPersonalizedAdsOnly` para
  `react-native-google-mobile-ads@16` en su documentación antes de
  implementar.)
- **Mantener** el flujo `AdsConsent.requestInfoUpdate()` +
  `loadAndShowConsentFormIfRequired()`: es el consentimiento GDPR/UMP de
  Google (obligatorio en la UE), **no** es ATT.

### Firebase Analytics

- Desactivar la recogida con fines publicitarios. En SDK 57 con
  `@react-native-firebase/analytics`, valorar:
  - `setAnalyticsCollectionEnabled(true)` está bien para analítica de producto,
    pero hay que asegurarse de **no** habilitar señales de publicidad
    (`setConsent` con `ad_storage`/`ad_user_data`/`ad_personalization` a
    `denied`), y de no recoger el IDFA.
  - Concretar la llamada exacta al implementar, consultando la doc de RNFirebase
    para SDK 57.
- El objetivo declarable: la app **no** enlaza datos con terceros para
  publicidad ni comparte con data brokers.

### App Store Connect (no es código)

- App Privacy → revisar cada tipo de dato declarado y quitar la marca "Used to
  Track You". El resultado debe ser "Data Not Linked to You" / sin tracking.
- Requiere rol Account Holder o Admin.

### Tests

- `AdBanner`: el test existente (si lo hay) debe seguir pasando; añadir aserción
  de que `BannerAd` recibe `requestNonPersonalizedAdsOnly: true`.

---

## Punto 4 — Screenshots de iPad (solo App Store Connect)

Sin cambios de código. Procedimiento (se detalla en el plan):

1. Levantar la app en el simulador de iPad Pro 13" (M4) y iPad de 11".
2. Capturar 4-5 pantallas que muestren la app **en uso**:
   - Lista de bares cercanos con datos.
   - Una cuenta de bar abierta con varias consumiciones y el reparto.
   - El catálogo de precios de un bar.
   - Histórico de cuentas.
   - Pantalla de vincular cuenta.
3. Nada de splash ni login como screenshot principal.
4. Subir en App Store Connect → Previews and Screenshots → "View All Sizes in
   Media Manager", para 13" y para 11".

---

## Notas para la resubmisión (App Review Information → Notes)

- Explicar que Sign in with Apple está disponible como alternativa a Google en
  la pantalla de inicio de sesión (iOS).
- Adjuntar screen recording del flujo de borrado de cuenta en dispositivo
  físico: iniciar sesión con la cuenta demo → Ajustes → Borrar mi cuenta →
  escribir BORRAR → confirmar → vuelta al login.
- Indicar que la app ya **no** hace tracking y que la ficha de App Privacy se
  ha actualizado a "no tracking"; por eso el prompt de ATT no aparece.
- Confirmar cuenta demo válida en las notas.

## Orden de implementación

1. Punto 3 (ATT / tracking) — rápido, poco riesgo.
2. Punto 2 (borrado de cuenta) — migración SQL + pantalla + validación manual.
3. Punto 1 (Sign in with Apple) — dependencia, `app.json`, config Apple +
   Supabase, código, tests.
4. `expo prebuild` + build en Mac + subir a App Store Connect.
5. Punto 4 (screenshots) + notas de review.
6. Resubir.

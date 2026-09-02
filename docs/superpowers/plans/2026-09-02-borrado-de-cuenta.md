# Borrado de cuenta in-app — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El usuario puede borrar su cuenta y todos sus datos personales desde Ajustes, de forma inmediata y permanente, con confirmación en dos pasos.

**Architecture:** Un RPC de Postgres `security definer` (`delete_own_account`) limpia todas las FKs sin cascada que apuntan a `profiles` y luego borra la fila de `auth.users` (la cascada se lleva el resto). Una capa de repositorio fina lo llama y hace `signOut`. Una pantalla nueva en `app/(app)/settings/` orquesta la confirmación.

**Tech Stack:** Supabase (Postgres + RLS + RPC), Expo Router, React Native Paper, Zustand (`sessionStore`).

**Spec:** `docs/superpowers/specs/2026-09-02-apple-rejections-design.md` (punto 2)

## Global Constraints

- **JavaScript, no TypeScript.**
- Arquitectura hexagonal del proyecto: las pantallas/hooks NUNCA importan
  `supabase` directo. Van por `container.authRepository` (DI en
  `src/di/container.js`), cuyo contrato está en
  `src/domain/repositories/IAuthRepository.js`.
- Migraciones SQL: archivo nuevo numerado en `supabase/migrations/`, se
  ejecuta a mano en el SQL Editor de Supabase. Estilo: comentarios en
  español explicando el porqué, como las migraciones existentes.
- Borrado **inmediato**, sin periodo de gracia ni "desactivar".
- El catálogo colaborativo de precios (`catalog_items`) se **conserva**: solo
  se pone `updated_by = null`.
- Textos de UI en español con acentos correctos.
- El proyecto solo testea `application/` y `shared/`. La lógica SQL y la
  pantalla se validan con pasos manuales explícitos.
- La `revoke`/`grant` de cada función va SIEMPRE junto a la función (patrón de
  todas las migraciones del repo).

---

### Task 1: Migración `0039_delete_own_account.sql`

**Files:**
- Create: `supabase/migrations/0039_delete_own_account.sql`

**Interfaces:**
- Consumes: esquema existente (`auth.users`, `public.profiles`, `bars`,
  `bar_members`, `tabs`, `tab_participants`, `tab_items`, `catalog_items`,
  `account_links`, `account_link_members`, `bar_official_photos`).
- Produces: función SQL `public.delete_own_account() returns void`, ejecutable
  por el rol `authenticated`. Sin argumentos. Usa `auth.uid()`.

- [ ] **Step 1: Crear el archivo con la función**

```sql
-- Borrado de cuenta iniciado por el propio usuario (App Store guideline
-- 5.1.1(v) y Google Play). El cliente llama a este RPC y después a
-- supabase.auth.signOut().
--
-- profiles.id -> auth.users(id) es "on delete cascade", pero varias FKs
-- apuntan a profiles(id) SIN cascada y con NOT NULL (bars.created_by,
-- tabs.created_by, tab_participants.user_id, tab_items.added_by), así que un
-- "delete from auth.users" a secas fallaría por violación de FK. Esta
-- función limpia esas referencias en orden antes del borrado final.
--
-- Las aportaciones al catálogo colaborativo (catalog_items.updated_by) se
-- CONSERVAN, poniendo updated_by a null: es dato compartido en el que
-- confían el resto de usuarios del bar.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado.';
  end if;

  -- 1. Cerrar el vínculo de pareja activo (si lo hay). La fila de la OTRA
  --    persona en account_link_members no cascadea al borrar este usuario y
  --    se quedaría "activa" (unlinked_at is null), bloqueándole vincular otra
  --    cuenta. Cerramos las dos filas del link y el propio account_links.
  update public.account_link_members m
  set unlinked_at = now()
  where m.unlinked_at is null
    and m.link_id in (
      select me.link_id
      from public.account_link_members me
      where me.user_id = v_uid and me.unlinked_at is null
    );

  update public.account_links l
  set unlinked_at = now(), unlinked_by = v_uid
  where l.unlinked_at is null
    and l.id in (
      select me.link_id
      from public.account_link_members me
      where me.user_id = v_uid
    );

  -- 2. account_links.unlinked_by es FK a profiles sin cascada: soltar las
  --    referencias de vínculos que este usuario cerró en el pasado.
  update public.account_links
  set unlinked_by = null
  where unlinked_by = v_uid;

  -- 3. bar_official_photos.set_by es FK a profiles sin cascada (nullable).
  update public.bar_official_photos
  set set_by = null
  where set_by = v_uid;

  -- 4. Bares creados por el usuario:
  --    a) si hay otro miembro, se traspasa created_by al más antiguo;
  update public.bars b
  set created_by = (
    select bm.user_id
    from public.bar_members bm
    where bm.bar_id = b.id and bm.user_id <> v_uid
    order by bm.joined_at asc
    limit 1
  )
  where b.created_by = v_uid
    and exists (
      select 1 from public.bar_members bm
      where bm.bar_id = b.id and bm.user_id <> v_uid
    );

  --    b) los que quedan (sin ningún otro miembro) se borran; la cascada se
  --       lleva catalog_items, bar_members, bar_photos, bar_official_photos,
  --       y tabs -> tab_items, tab_participants de ese bar.
  delete from public.bars b
  where b.created_by = v_uid;

  -- 5. Cuentas (tabs) creadas por el usuario que hayan sobrevivido (en bares
  --    de otros): traspasar a otro participante, o borrar si no queda nadie.
  update public.tabs t
  set created_by = (
    select tp.user_id
    from public.tab_participants tp
    where tp.tab_id = t.id and tp.user_id <> v_uid
    order by tp.joined_at asc
    limit 1
  )
  where t.created_by = v_uid
    and exists (
      select 1 from public.tab_participants tp
      where tp.tab_id = t.id and tp.user_id <> v_uid
    );

  delete from public.tabs t
  where t.created_by = v_uid;

  -- 6. Consumiciones que añadió el usuario en cuentas ajenas/compartidas que
  --    sobreviven (tab_items.added_by es NOT NULL, no admite null).
  delete from public.tab_items
  where added_by = v_uid;

  -- 7. Quitar al usuario como participante de las cuentas compartidas que quedan.
  delete from public.tab_participants
  where user_id = v_uid;

  -- 8. Conservar las aportaciones al catálogo, anonimizadas.
  update public.catalog_items
  set updated_by = null
  where updated_by = v_uid;

  -- 9. Borrado final. Cascada: profiles, bar_members, bar_photos,
  --    account_link_members, account_link_requests (sender_id y recipient_user_id).
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
```

- [ ] **Step 2: Ejecutar la migración en un proyecto/rama de PRUEBAS de Supabase**

En el SQL Editor de una rama de Supabase (no producción). Debe ejecutar sin
error de sintaxis.

- [ ] **Step 3: Prueba manual de integridad (rama de pruebas)**

Preparar con SQL o con la app dos usuarios A y B:
- A crea un bar propio con 1 entrada de catálogo y 1 tab cerrada.
- A y B comparten otro bar (ambos en `bar_members`); B es `created_by` de ese
  bar; A abre una tab ahí y añade 1 `tab_item`.
- A y B vinculan cuentas (pareja).
- A añade 1 entrada de catálogo en el bar compartido.

Ejecutar como A: `select public.delete_own_account();` (con la sesión de A —
en el SQL Editor, usar `set request.jwt.claims` o probar vía la app en la
task 4). Comprobar:

```sql
-- A ya no existe
select count(*) from auth.users where id = '<A>';            -- 0
select count(*) from public.profiles where id = '<A>';        -- 0
-- el bar solo-de-A y su catálogo y su tab: borrados
-- el bar compartido sigue, con created_by = B (válido)
select created_by from public.bars where id = '<bar_compartido>';  -- <B>
-- el tab_item de A en el bar compartido: borrado
-- la entrada de catálogo de A en el bar compartido: sigue, updated_by null
select updated_by from public.catalog_items where id = '<cat_de_A>';  -- null
-- B puede volver a vincularse: su fila de members está unlinked
select unlinked_at from public.account_link_members where user_id = '<B>';  -- not null
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0039_delete_own_account.sql
git commit -m "Añade el RPC delete_own_account para el borrado de cuenta"
```

---

### Task 2: Contrato `IAuthRepository.deleteAccount`

**Files:**
- Modify: `src/domain/repositories/IAuthRepository.js`

**Interfaces:**
- Consumes: nada.
- Produces: entrada JSDoc `deleteAccount: () => Promise<void>` en el typedef
  `IAuthRepository`.

- [ ] **Step 1: Añadir la línea al typedef**

Tras la línea de `updateEmail` en el bloque `@typedef`:

```js
 * @property {() => Promise<void>} deleteAccount - Borra la cuenta del usuario autenticado y todos sus datos personales de forma inmediata y permanente (RPC delete_own_account + signOut local). Las aportaciones al catálogo colaborativo de precios se conservan anonimizadas. Tras llamarla no hay sesión: el llamador debe navegar al login.
```

- [ ] **Step 2: Commit**

```bash
git add src/domain/repositories/IAuthRepository.js
git commit -m "Documenta deleteAccount en el contrato de auth"
```

---

### Task 3: Implementación `SupabaseAuthRepository.deleteAccount`

**Files:**
- Modify: `src/infrastructure/supabase/repositories/SupabaseAuthRepository.js`

**Interfaces:**
- Consumes: `supabase` (de `../client`), función SQL `delete_own_account`
  (Task 1).
- Produces: método `deleteAccount()` en el objeto `supabaseAuthRepository`.

- [ ] **Step 1: Añadir el método**

Al final del objeto `supabaseAuthRepository` (tras `updateEmail`):

```js
  // Se llama desde app/(app)/settings/delete-account.jsx. El RPC
  // delete_own_account (migración 0039) hace TODO el borrado en el servidor
  // (incluida la fila de auth.users). Después ya no hay usuario, pero el
  // token sigue en el almacenamiento local del dispositivo: signOut lo
  // limpia para que onAuthStateChange dispare y la app mande al login.
  async deleteAccount() {
    const { error } = await supabase.rpc('delete_own_account');
    if (error) throw error;
    await supabase.auth.signOut();
  },
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/supabase/repositories/SupabaseAuthRepository.js
git commit -m "Implementa deleteAccount llamando al RPC delete_own_account"
```

---

### Task 4: `useAuth.deleteAccount`

**Files:**
- Modify: `src/presentation/hooks/useAuth.js`

**Interfaces:**
- Consumes: `container.authRepository.deleteAccount` (Task 3),
  `clearUser` del `sessionStore`.
- Produces: `deleteAccount` en el objeto que devuelve `useAuth()`.

- [ ] **Step 1: Añadir el callback**

Tras `updateEmail` en `useAuth.js`:

```js
  // Se usa desde settings/delete-account.jsx. El repo ya hace signOut, que
  // dispararía onAuthStateChange -> clearUser solo; lo llamamos también aquí
  // a mano para que el store quede vacío de inmediato, sin esperar al evento.
  const deleteAccount = useCallback(async () => {
    await container.authRepository.deleteAccount();
    clearUser();
  }, [clearUser]);
```

- [ ] **Step 2: Exponerlo en el return**

Añadir `deleteAccount` al objeto que devuelve el hook (tras `updateEmail`).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add src/presentation/hooks/useAuth.js
git commit -m "Expone deleteAccount desde useAuth"
```

---

### Task 5: Pantalla `settings/delete-account.jsx`

**Files:**
- Create: `app/(app)/settings/delete-account.jsx`
- Modify: `app/(app)/_layout.jsx` (añadir `<Stack.Screen>`)

**Interfaces:**
- Consumes: `useAuth().deleteAccount`, `container.accountLinkRepository.getMyLink()`
  vía `useQuery(['myAccountLink'])` (patrón de `settings/link-account.jsx`;
  `getMyLink()` devuelve `{ linkId, partnerFirstName, partnerLastName, ... }`
  o `null`), `router` de `expo-router`, componentes de `react-native-paper`
  y `AppButton`.
- Produces: ruta `/settings/delete-account`.

- [ ] **Step 1: Crear la pantalla**

`app/(app)/settings/delete-account.jsx`:

```jsx
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { HelperText, Text, TextInput, useTheme } from 'react-native-paper';

import { container } from '../../../src/di/container';
import { AppButton } from '../../../src/presentation/components/AppButton';
import { KeyboardAwareScreen } from '../../../src/presentation/components/KeyboardAwareScreen';
import { useAuth } from '../../../src/presentation/hooks/useAuth';

// Palabra que el usuario debe teclear para habilitar el botón: una barrera
// simple contra borrados accidentales (Apple permite pasos de confirmación,
// lo que no permite es exigir llamar/escribir a soporte).
const CONFIRM_WORD = 'BORRAR';

export default function DeleteAccountScreen() {
  const theme = useTheme();
  const { deleteAccount } = useAuth();
  const linkQuery = useQuery({
    queryKey: ['myAccountLink'],
    queryFn: () => container.accountLinkRepository.getMyLink(),
  });
  const partner = linkQuery.data ?? null;

  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const canDelete = confirmText.trim() === CONFIRM_WORD && !isDeleting;

  const runDeletion = async () => {
    setServerError(null);
    setIsDeleting(true);
    try {
      await deleteAccount();
      router.replace('/(auth)/login');
    } catch (error) {
      setServerError(error.message ?? 'No se pudo borrar la cuenta. Inténtalo de nuevo.');
      setIsDeleting(false);
    }
  };

  const confirmAndDelete = () => {
    Alert.alert(
      '¿Seguro que quieres borrar tu cuenta?',
      'Esta acción es permanente y no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: runDeletion },
      ],
    );
  };

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.content}>
      <Text variant="headlineSmall">Borrar mi cuenta</Text>

      <Text style={styles.paragraph}>
        Se borrará de forma permanente e inmediata: tu perfil (nombre, email y
        teléfono), tus cuentas de bar y consumiciones, tu histórico y tu
        vínculo con otra cuenta.
      </Text>
      <Text style={styles.paragraph}>
        Se conservan de forma anónima los precios que hayas aportado al
        catálogo compartido de cada bar, porque son datos que usa el resto de
        gente del bar.
      </Text>
      {partner ? (
        <Text style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
          Tu cuenta está vinculada con la de {partner.partnerFirstName}. Al
          borrarte, se desvinculará automáticamente.
        </Text>
      ) : null}

      <TextInput
        label={`Escribe ${CONFIRM_WORD} para confirmar`}
        value={confirmText}
        onChangeText={setConfirmText}
        autoCapitalize="characters"
        autoCorrect={false}
        style={styles.input}
      />

      {serverError ? (
        <HelperText type="error" visible>
          {serverError}
        </HelperText>
      ) : null}

      <AppButton
        mode="contained"
        buttonColor={theme.colors.error}
        onPress={confirmAndDelete}
        disabled={!canDelete}
        loading={isDeleting}
        style={styles.button}
      >
        Borrar mi cuenta
      </AppButton>

      <AppButton mode="text" onPress={() => router.back()} disabled={isDeleting}>
        Cancelar
      </AppButton>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'flex-start',
  },
  paragraph: {
    marginTop: 12,
  },
  input: {
    marginTop: 24,
  },
  button: {
    marginTop: 16,
  },
});
```

- [ ] **Step 2: Registrar la pantalla en `_layout.jsx`**

En `app/(app)/_layout.jsx`, dentro del `<Stack>`, tras la línea de
`settings/edit-profile`:

```jsx
        <Stack.Screen name="settings/delete-account" options={{ headerShown: true, title: 'Borrar mi cuenta' }} />
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/settings/delete-account.jsx" "app/(app)/_layout.jsx"
git commit -m "Añade la pantalla de borrado de cuenta"
```

---

### Task 6: Entrada "Borrar mi cuenta" en Ajustes

**Files:**
- Modify: `app/(app)/settings/index.jsx`

**Interfaces:**
- Consumes: `router` de `expo-router`, `MaterialCommunityIcons`,
  `useTheme` (todos ya importados en el archivo).
- Produces: nada nuevo hacia otras tasks.

- [ ] **Step 1: Añadir el `Pressable`**

En `app/(app)/settings/index.jsx`, como último elemento dentro del `<View>`
contenedor (después del bloque `user?.isAdmin`), añadir:

```jsx
      <Pressable
        onPress={() => router.push('/settings/delete-account')}
        style={[styles.option, { borderColor: theme.colors.outlineVariant }]}
      >
        <MaterialCommunityIcons name="account-remove-outline" size={26} color={theme.colors.error} />
        <View style={styles.optionText}>
          <Text variant="titleMedium" style={{ color: theme.colors.error }}>
            Borrar mi cuenta
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Elimina tu cuenta y tus datos de forma permanente
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
      </Pressable>
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/settings/index.jsx"
git commit -m "Añade la entrada de borrar cuenta en Ajustes"
```

---

### Task 7: Aplicar la migración en producción y verificación end-to-end

**Files:**
- (ninguno — despliegue y verificación)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: grabación de pantalla para App Review.

- [ ] **Step 1: Ejecutar `0039_delete_own_account.sql` en el proyecto de Supabase de producción**

SQL Editor → pegar el contenido → Run. Confirmar "Success".

- [ ] **Step 2: Prueba end-to-end en un build de desarrollo (dispositivo físico)**

Con una cuenta de prueba desechable:
1. Iniciar sesión.
2. Ajustes → "Borrar mi cuenta".
3. Escribir `BORRAR`, pulsar el botón rojo, confirmar en el diálogo.
4. La app vuelve al login.
5. Intentar iniciar sesión de nuevo con esa cuenta → debe fallar
   ("credenciales no válidas").

- [ ] **Step 3: Grabar la pantalla en dispositivo físico para App Review**

Grabar el flujo del Step 2 (login con la cuenta demo → Ajustes → borrado →
confirmación → vuelta al login). Guardar el vídeo para adjuntarlo en las
notas de App Review Information.

- [ ] **Step 4: (opcional) Actualizar `docs/eliminar-cuenta.html`**

Añadir un párrafo indicando que el borrado también puede hacerse desde la
propia app en Ajustes → "Borrar mi cuenta". No bloquea la resubmisión.

```bash
git add docs/eliminar-cuenta.html
git commit -m "Menciona el borrado in-app en la página de eliminar cuenta"
```

---

## Self-Review

**Spec coverage (punto 2 del spec):**
- Problema de FKs sin cascada (tabla del spec) → Task 1, pasos 3-8 de la
  función. ✓ (incluye `bar_official_photos.set_by`, hallado al revisar 0024.)
- Cierre del vínculo de pareja del otro miembro → Task 1 paso 1. ✓
- `account_links.unlinked_by` → Task 1 paso 2. ✓
- Bares huérfanos → Task 1 paso 4b (borrado con cascada). ✓
- Catálogo conservado con `updated_by = null` → Task 1 paso 8. ✓
- `IAuthRepository.deleteAccount` → Task 2. ✓
- `SupabaseAuthRepository.deleteAccount` (rpc + signOut) → Task 3. ✓
- `useAuth.deleteAccount` (repo + clearUser) → Task 4. ✓
- Pantalla con doble confirmación (texto `BORRAR` + Alert) → Task 5. ✓
- Aviso de desvinculación si hay pareja → Task 5 Step 2 (`partner`). ✓
- Navegación a `/(auth)/login` al terminar → Task 5 `runDeletion`. ✓
- Entrada en Ajustes, icono `account-remove-outline`, color `error` → Task 6. ✓
- Borrado inmediato, sin periodo de gracia → función sin `deleted_at`. ✓
- Screen recording para Apple → Task 7 Step 3. ✓
- Validación manual de integridad SQL → Task 1 Step 3 y Task 7 Step 2. ✓

**Placeholder scan:** Task 5 Step 1 es una localización real de un símbolo
existente (el hook de vínculo), con fallback concreto (`useQuery` +
`getMyAccountLink`) — no es un "TODO". El resto de steps llevan el código
completo.

**Type consistency:**
- `deleteAccount: () => Promise<void>` idéntico en Tasks 2, 3, 4.
- `delete_own_account` (nombre del RPC) idéntico en Task 1 y Task 3.
- `CONFIRM_WORD = 'BORRAR'` usado en label y en la condición `canDelete`
  (Task 5).
- Ruta `/settings/delete-account` idéntica en Task 5 (`_layout`) y Task 6
  (`router.push`).

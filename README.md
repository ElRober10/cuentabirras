# CuentaBirras 🍺

App móvil para llevar la cuenta de las cervezas. Disponible para iOS y Android.

## Descarga

| Plataforma | Enlace |
|---|---|
| iOS | [App Store](https://apps.apple.com/app/cuentabirras/id6803855713) |
| Android | [Google Play](https://play.google.com/store/apps/details?id=com.elrober10.cuentabirras) (próximamente, pendiente de aprobación) |

## Funcionalidades

* Registro y seguimiento de las cervezas.
* Inicio de sesión con Apple.
* Datos sincronizados en la nube con Supabase.
* Aplicación multiplataforma (iOS y Android) con un único código base.

## Stack

| Capa | Tecnología |
|---|---|
| App móvil | React Native (JavaScript) con Expo |
| Compilación y publicación | EAS Build / EAS Submit |
| Backend | Supabase |
| Autenticación | Sign in with Apple |

## Requisitos

* Node.js 20+
* Cuenta de Expo (EAS)
* Proyecto de Supabase
* Xcode (iOS) o Android Studio (Android) para ejecutar en simulador

## Arranque local

1. Instalar dependencias:

```
   npm install
```

2. Crear un archivo `.env` en la raíz con la URL y la clave pública (anon) de tu proyecto de Supabase. Este archivo no se sube a git.

3. Arrancar la app:

```
   npx expo start
```

## Publicación

* **iOS:** `eas build --platform ios` y `eas submit --platform ios`.
* **Android:** `eas build --platform android` y envío a Google Play.

## 🤖 Cómo se ha desarrollado este proyecto

Este proyecto está desarrollado con **asistencia de IA (Claude Code)**, usada como herramienta bajo mi dirección. Yo decido qué se construye, cómo y con qué criterios; la IA ejecuta y automatiza la parte mecánica. Nada entra en el repositorio sin que yo lo haya revisado, entendido y validado.

### Reparto de responsabilidades

| Lo hago yo | Lo automatizo con la IA |
|---|---|
| Definir alcance y funcionalidades de la app | Generar código repetitivo y boilerplate (pantallas, componentes, servicios) |
| Decidir la arquitectura y el stack (React Native + Expo, Supabase) | Implementar las decisiones ya tomadas siguiendo mis instrucciones |
| Configurar la publicación: cuentas de Apple y Google, EAS, fichas de las tiendas | Escribir configuración inicial (`app.json`, `eas.json`) que yo reviso |
| Decidir qué es dato sensible y qué no entra en git (claves, `.env`) | Proponer cambios de configuración que yo valido |
| **Revisar, retocar y adaptar cada archivo** a las necesidades del proyecto | Proponer refactors y mejoras que yo acepto o rechazo |
| **Probar cada archivo** en simulador y dispositivo antes de pasar al siguiente | Proponer hipótesis y aplicar correcciones que yo valido |
| Depurar y decidir cuando algo falla | Ejecutar tareas acotadas bajo mis instrucciones |
| **Ordenar el commit** cuando todo está revisado y verificado | Ejecutar el commit y el push bajo mi orden |

### Flujo de trabajo

1. **Especifico** la funcionalidad y sus restricciones.
2. **Encargo** a la IA una tarea concreta y acotada, archivo a archivo.
3. **Reviso** el archivo generado: lógica, seguridad, estructura y estilo.
4. **Retoco y adapto** lo que haga falta hasta que encaje con lo que necesito.
5. **Pruebo** el resultado y compruebo que entiendo qué hace y por qué.
6. **No paso al siguiente archivo** hasta cerrar el anterior.
7. **Cuando todo está revisado y verificado, ordeno a Claude que haga el commit.**

### Por qué lo explico

Usar IA es una herramienta legítima y prefiero ser transparente: por eso Claude figura como colaborador en el historial. Lo que aporto yo es lo que la IA no sustituye: criterio, arquitectura, revisión y responsabilidad sobre el resultado. Puedo explicar y defender cada decisión técnica de este repositorio.

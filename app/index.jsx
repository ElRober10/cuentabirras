import { Redirect } from 'expo-router';

// Esta es la pantalla de la ruta "/", la que se abre la primera vez que
// arranca la app. No dibuja nada por sí misma: simplemente redirige al grupo
// `(app)`. Es ese grupo (concretamente su _layout.jsx) quien de verdad
// decide si hay sesión o no y, si no la hay, te manda a `(auth)/login`. Aquí
// solo elegimos "por dónde empezar a preguntar".
export default function Index() {
  return <Redirect href="/(app)" />;
}

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

// Una fila del menú de Ajustes: icono + título + descripción, y a la
// derecha una flecha (si es pulsable, `onPress`) o lo que se pase en
// `right` (p. ej. el campo del radio de bares cercanos, que no navega a
// ningún sitio). Antes cada fila de settings/index.jsx repetía este mismo
// bloque de JSX con solo los textos/colores cambiados — 5 copias del mismo
// patrón en un único archivo.
export function SettingsOptionRow({ icon, title, description, onPress, destructive = false, right }) {
  const theme = useTheme();
  const color = destructive ? theme.colors.error : theme.colors.primary;
  // Sin onPress (caso del radio de bares cercanos) la fila no es un
  // control pulsable — un <View> en vez de <Pressable> evita el feedback
  // táctil de "botón" en algo que no hace nada al tocarlo.
  const Row = onPress ? Pressable : View;

  return (
    <Row onPress={onPress} style={[styles.option, { borderColor: theme.colors.outlineVariant }]}>
      <MaterialCommunityIcons name={icon} size={26} color={color} />
      <View style={styles.optionText}>
        <Text variant="titleMedium" style={destructive ? { color: theme.colors.error } : undefined}>
          {title}
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>{description}</Text>
      </View>
      {right ??
        (onPress ? (
          <MaterialCommunityIcons
            testID="settings-option-chevron"
            name="chevron-right"
            size={22}
            color={theme.colors.onSurfaceVariant}
          />
        ) : null)}
    </Row>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionText: {
    flex: 1,
  },
});

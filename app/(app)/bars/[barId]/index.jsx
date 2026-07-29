import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { openOrResumeTab } from '../../../../src/application/tabs/openOrResumeTab';
import { startNewTab } from '../../../../src/application/tabs/startNewTab';
import { AppButton } from '../../../../src/presentation/components/AppButton';

// Pantalla "/bars/[barId]": no se ve casi nunca, decide sola y navega. Solo
// se queda visible (mostrando la pregunta) cuando ya había una cuenta abierta.
export default function BarEntryScreen() {
  const { barId } = useLocalSearchParams();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [openTab, setOpenTab] = useState(null); // solo se rellena si hay que preguntar

  useEffect(() => {
    let cancelled = false;

    openOrResumeTab(barId).then(({ tab, alreadyOpen }) => {
      if (cancelled) return;
      if (!alreadyOpen) {
        // No había cuenta abierta: entramos directo, sin preguntar nada.
        router.replace(`/bars/${barId}/tab/${tab.id}`);
        return;
      }
      setOpenTab(tab);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [barId]);

  const handleContinue = () => {
    router.replace(`/bars/${barId}/tab/${openTab.id}`);
  };

  const handleStartNew = async () => {
    setLoading(true);
    const newTab = await startNewTab({ barId, currentOpenTabId: openTab.id });
    router.replace(`/bars/${barId}/tab/${newTab.id}`);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
      <Text variant="titleMedium" style={styles.text}>
        Ya tienes una cuenta abierta en este bar
      </Text>
      <AppButton mode="contained" onPress={handleContinue} style={styles.button}>
        Continuar con la abierta
      </AppButton>
      <AppButton mode="outlined" onPress={handleStartNew} style={styles.button}>
        Empezar una nueva
      </AppButton>
      <AppButton mode="text" onPress={() => router.back()} style={styles.backButton}>
        Volver
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  text: {
    textAlign: 'center',
    marginBottom: 8,
  },
  button: {
    alignSelf: 'stretch',
  },
  // Igual que "Cerrar sesión" en la pantalla principal: un botón de texto
  // secundario no se estira como los de arriba, se queda centrado y
  // compacto — así se nota que es la opción de menos peso, no una tercera
  // acción al mismo nivel.
  backButton: {
    alignSelf: 'center',
    marginTop: 4,
  },
});

import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface ComingSoonProps {
  title: string;
  description: string;
}

/** Placeholder for screens that are navigable but not implemented yet. */
export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <View style={styles.container}>
      <Text style={typography.heading}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  description: {
    ...typography.caption,
    textAlign: 'center',
  },
});

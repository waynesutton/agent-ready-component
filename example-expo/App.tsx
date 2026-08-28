import { AgentReadyExpoWidget } from "@waynesutton/agent-ready/expo";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const agentReadyUrl = process.env.EXPO_PUBLIC_AGENT_READY_URL ?? "";
const publicAppUrl = process.env.EXPO_PUBLIC_SITE_URL;

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Agent Ready Expo demo</Text>
          <Text style={styles.title}>Bring agent-readable pages into mobile apps.</Text>
          <Text style={styles.copy}>
            Expo uses the same Convex .site routes as React and Svelte. Point the widget at
            your Agent Ready deployment and it shows machine files plus the markdown site.
          </Text>
        </View>

        {agentReadyUrl ? (
          <AgentReadyExpoWidget appUrl={agentReadyUrl} publicAppUrl={publicAppUrl} />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Set EXPO_PUBLIC_AGENT_READY_URL</Text>
            <Text style={styles.emptyCopy}>
              Use your Convex site URL, for example https://your-deployment.convex.site.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  page: {
    alignItems: "center",
    gap: 28,
    padding: 24,
  },
  hero: {
    maxWidth: 360,
    paddingTop: 48,
  },
  eyebrow: {
    color: "#9ca3af",
    fontFamily: "Courier",
    fontSize: 12,
    letterSpacing: 1.4,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  title: {
    color: "#f5f5f5",
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 39,
    marginBottom: 14,
  },
  copy: {
    color: "#c7c7c7",
    fontSize: 16,
    lineHeight: 23,
  },
  empty: {
    backgroundColor: "#191919",
    borderColor: "#333333",
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 360,
    padding: 18,
  },
  emptyTitle: {
    color: "#f5f5f5",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyCopy: {
    color: "#a3a3a3",
    fontSize: 14,
    lineHeight: 20,
  },
});

import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { MarkdownIndexEntry } from "../client/types.js";
import { useAgentReadyMarkdownIndex } from "../react/useAgentReadyMarkdownIndex.js";
import { useAgentReadyStatus } from "../react/useAgentReadyStatus.js";

export { useAgentReadyMarkdownIndex } from "../react/useAgentReadyMarkdownIndex.js";
export type { UseAgentReadyMarkdownIndexOptions } from "../react/useAgentReadyMarkdownIndex.js";
export { useAgentReadyStatus } from "../react/useAgentReadyStatus.js";
export type { UseAgentReadyStatusOptions } from "../react/useAgentReadyStatus.js";

type Tab = "HUMAN" | "MACHINE" | "MARKDOWN";

export type AgentReadyExpoWidgetProps = {
  appUrl: string;
  publicAppUrl?: string;
  visible?: boolean;
  showHumanTab?: boolean;
  showMachineTab?: boolean;
  showMarkdownTab?: boolean;
  statusPath?: string;
  markdownIndexPath?: string;
  markdownSitePath?: string;
};

function normalizeBase(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

function openUrl(url: string): void {
  void Linking.openURL(url);
}

export function AgentReadyExpoWidget(props: AgentReadyExpoWidgetProps) {
  const statusPath = props.statusPath ?? "/llms-status";
  const markdownIndexPath = props.markdownIndexPath ?? "/llms-markdown-index";
  const markdownSitePath = props.markdownSitePath ?? "/markdown";
  const endpointBase = normalizeBase(props.appUrl);
  const status = useAgentReadyStatus({ appUrl: endpointBase, statusPath });
  const markdownTabVisible =
    props.showMarkdownTab ?? status?.widgetShowMarkdownTab ?? status?.markdownSiteEnabled ?? false;
  const pages = useAgentReadyMarkdownIndex({
    appUrl: endpointBase,
    markdownIndexPath,
    enabled: markdownTabVisible,
  });

  const humanTabVisible = props.showHumanTab ?? status?.widgetShowHumanTab ?? true;
  const machineTabVisible = props.showMachineTab ?? status?.widgetShowMachineTab ?? true;
  const visible = props.visible ?? status?.widgetVisible ?? true;
  const tabs = useMemo(
    () =>
      [
        humanTabVisible && "HUMAN",
        machineTabVisible && "MACHINE",
        markdownTabVisible && "MARKDOWN",
      ].filter(Boolean) as Array<Tab>,
    [humanTabVisible, machineTabVisible, markdownTabVisible],
  );
  const [tab, setTab] = useState<Tab>(tabs[0] ?? "HUMAN");

  const visibleBase = normalizeBase(props.publicAppUrl ?? status?.appUrl ?? endpointBase);
  const urls = {
    llms: `${visibleBase}/llms.txt`,
    agents: `${visibleBase}/agents.md`,
    full: `${visibleBase}/llms-full.txt`,
    status: `${endpointBase}${statusPath}`,
    markdown: `${endpointBase}${markdownSitePath}`,
  };

  if (!visible || tabs.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.tabs}>
        {tabs.map((item) => (
          <Pressable
            key={item}
            onPress={() => setTab(item)}
            style={[styles.tab, tab === item ? styles.activeTab : undefined]}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.toLowerCase()} tab`}
          >
            <Text style={[styles.tabText, tab === item ? styles.activeTabText : undefined]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === "HUMAN" ? (
        <HumanPanel appName={status?.appName ?? "Agent Ready"} />
      ) : tab === "MACHINE" ? (
        <MachinePanel urls={urls} fullTxtEnabled={status?.fullTxtEnabled ?? true} />
      ) : (
        <MarkdownPanel pages={pages} siteUrl={urls.markdown} />
      )}
    </View>
  );
}

function HumanPanel(props: { appName: string }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{props.appName}</Text>
      <Text style={styles.copy}>Agent-readable files and markdown pages for this app.</Text>
    </View>
  );
}

function MachinePanel(props: {
  urls: { llms: string; agents: string; full: string; status: string };
  fullTxtEnabled: boolean;
}) {
  return (
    <View style={styles.panel}>
      <LinkRow label="llms.txt" url={props.urls.llms} />
      <LinkRow label="agents.md" url={props.urls.agents} />
      {props.fullTxtEnabled ? <LinkRow label="llms-full.txt" url={props.urls.full} /> : null}
      <LinkRow label="status" url={props.urls.status} />
    </View>
  );
}

function MarkdownPanel(props: { pages: Array<MarkdownIndexEntry> | null; siteUrl: string }) {
  return (
    <ScrollView style={styles.panel} contentContainerStyle={styles.scrollContent}>
      <LinkRow label="markdown site" url={props.siteUrl} />
      {props.pages === null ? <ActivityIndicator color="#888888" size="small" /> : null}
      {props.pages?.slice(0, 8).map((page) => (
        <LinkRow key={page.slug} label={page.title} url={page.htmlUrl} />
      ))}
      {props.pages && props.pages.length === 0 ? (
        <Text style={styles.muted}>No markdown pages yet. Add fullContent and regenerate.</Text>
      ) : null}
    </ScrollView>
  );
}

function LinkRow(props: { label: string; url: string }) {
  return (
    <Pressable onPress={() => openUrl(props.url)} style={styles.row} accessibilityRole="link">
      <Text style={styles.link}>{props.label}</Text>
      <Text style={styles.icon}>open</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1a1a1a",
    borderColor: "#333333",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    width: 320,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#111111",
  },
  tab: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  activeTab: {
    backgroundColor: "#2a2a2a",
  },
  tabText: {
    color: "#777777",
    fontFamily: "Courier",
    fontSize: 11,
    letterSpacing: 1.2,
    textAlign: "center",
  },
  activeTabText: {
    color: "#f4f4f4",
  },
  panel: {
    maxHeight: 260,
    padding: 14,
  },
  scrollContent: {
    gap: 8,
  },
  title: {
    color: "#f4f4f4",
    fontFamily: "Courier",
    fontSize: 14,
    marginBottom: 8,
  },
  copy: {
    color: "#a3a3a3",
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 32,
  },
  link: {
    color: "#d8d8d8",
    fontFamily: "Courier",
    fontSize: 12,
  },
  icon: {
    color: "#888888",
    fontSize: 11,
  },
  muted: {
    color: "#777777",
    fontSize: 12,
    lineHeight: 17,
  },
});

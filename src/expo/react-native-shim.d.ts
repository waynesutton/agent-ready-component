declare module "react-native" {
  import type { ComponentType, ReactNode } from "react";

  export type ViewStyle = Record<string, string | number | undefined>;
  export type TextStyle = Record<string, string | number | undefined>;
  export type StyleProp<T> = T | ReadonlyArray<T | undefined> | undefined;

  export const View: ComponentType<{ style?: StyleProp<ViewStyle>; children?: ReactNode }>;
  export const Text: ComponentType<{
    style?: StyleProp<TextStyle>;
    children?: ReactNode;
    numberOfLines?: number;
  }>;
  export const Pressable: ComponentType<{
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
    onPress?: () => void;
    accessibilityRole?: string;
    accessibilityLabel?: string;
  }>;
  export const ScrollView: ComponentType<{
    style?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
    children?: ReactNode;
  }>;
  export const ActivityIndicator: ComponentType<{ color?: string; size?: "small" | "large" }>;
  export const StyleSheet: {
    create<T extends Record<string, ViewStyle | TextStyle>>(styles: T): T;
  };
  export const Linking: {
    openURL(url: string): Promise<unknown>;
  };
}

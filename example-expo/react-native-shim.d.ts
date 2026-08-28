declare module "react-native" {
  import type { ComponentType, ReactNode } from "react";

  export type ViewStyle = Record<string, string | number | undefined>;
  export type TextStyle = Record<string, string | number | undefined>;
  export type StyleProp<T> = T | ReadonlyArray<T | undefined> | undefined;

  export const SafeAreaView: ComponentType<{ style?: StyleProp<ViewStyle>; children?: ReactNode }>;
  export const View: ComponentType<{ style?: StyleProp<ViewStyle>; children?: ReactNode }>;
  export const Text: ComponentType<{ style?: StyleProp<TextStyle>; children?: ReactNode }>;
  export const ScrollView: ComponentType<{
    style?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
    children?: ReactNode;
  }>;
  export const StyleSheet: {
    create<T extends Record<string, ViewStyle | TextStyle>>(styles: T): T;
  };
}

import React from "react";
import { PixelRatio, Text as RNText, StyleSheet, TextProps } from "react-native";
import { useFontPrefs } from "../context/FontSizeContext";

export default function AppText({ style, children, ...props }: TextProps) {
  const { scale, respectSystem } = useFontPrefs();
  const systemScale = respectSystem ? PixelRatio.getFontScale() : 1;
  const effective = scale * systemScale;

  const flat = StyleSheet.flatten(style) || {};
  const baseSize = typeof flat.fontSize === "number" ? flat.fontSize : 16;

  return (
    <RNText
      {...props}
      allowFontScaling={false}
      style={[style, { fontSize: baseSize * effective }]}
    >
      {children}
    </RNText>
  );
}
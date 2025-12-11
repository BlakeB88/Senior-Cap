/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform, StyleSheet } from 'react-native';
const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const styles = StyleSheet.create({

  //start of home.tsx style 

  root: { flex: 1, backgroundColor: "#fff" },
  mapArea: { borderRadius: 16, backgroundColor: "#e5e7eb", alignItems: "center", justifyContent: "center" },
  select: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#aca7a7ff",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#f8f9fb",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  },
  controlbtns: { padding: 20, gap: 12 },
  pin: { marginRight: 8 },
  text: { flex: 1, fontSize: 16, fontWeight: "700", marginLeft: 15 },
  controlriders: { flexDirection: "row", alignItems: "center", gap: 12, marginLeft: "auto" },
  riderbtn: {
    width: 35,
    height: 35,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  confirmbtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    zIndex: 10,
  },
  count: { minWidth: 18, textAlign: "center", fontWeight: "800" },
  continue: {
    alignSelf: "center",
    marginTop: 0,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#aca7a7ff",
  },
  picker: { flex: 1, height: 40 },
  continueDisabled: { opacity: 0.5 },
  continueText: { fontSize: 16, fontWeight: "700", color: "#fff"},
  navBtn: {
    position: "absolute",
    backgroundColor: "#fff",
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  midRow: { marginVertical: 0, height: 18, justifyContent: "center" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB" },
  dots: { marginLeft: 14, gap: 3, position: "absolute", top: 1 },
  line: { position: "absolute", left: 42, right: 0, height: 1, backgroundColor: "#E5E7EB" },
  sheetModal: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", marginBottom: 8 },
  fab: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  badge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    backgroundColor: "#1f57d6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
    helpOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
 helpBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.3)" },
 helpCard: { backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
 helpHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
 helpTitle: { fontWeight: "600", fontSize: 18 },
 helpStepCount: { fontSize: 14, color: "#777" },
 helpDescription: { fontSize: 16, color: "#444", marginBottom: 12 },
 helpDotsRow: { flexDirection: "row", marginBottom: 12 },
 helpDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ccc", marginHorizontal: 2 },
 helpDotActive: { backgroundColor: "#14B8A6" },
 helpButtonsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
 helpBackText: { fontSize: 16, color: "#777" },
 helpPrimaryButton: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#14B8A6", borderRadius: 8, marginLeft: 8 },
 helpPrimaryText: { color: "#fff", fontWeight: "600" },
 helpSecondaryButton: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#E5E7EB", borderRadius: 8 },
 helpSecondaryText: { color: "#111", fontWeight: "600" },

  // booking modal in home

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "85%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },

    //end of booking modal in home

  // end of home.tsx style

  // start of
  container: {
        flex: 1,
        backgroundColor: "#fff"
    },
    
    flex: {
        paddingHorizontal: 30,
        flex: 1,
        justifyContent: "center",
    },

    title: {
        fontSize: 40,
        fontWeight: "bold",
        marginBottom: 50,
        textAlign: "center"
    },

    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 25,
        position: "relative",
    },

    icon: {
        marginRight: 15,
    },

    input: {
        borderBottomWidth: 1.5,
        flex: 1,
        paddingBottom: 10,
        borderBottomColor: "#eee",
        fontSize: 16,
    },
    passwordVisibleButton: {
        position: "absolute",
        right: 0,
    },

    forgotPasswordButton: {
        marginTop: 15,
        alignSelf: "flex-end",
    },

    forgotPasswordButtonText: {
        color: "#3662AA",
        fontSize: 16,
        fontWeight: "500",
    },

    loginButton: {
        backgroundColor: "#3662AA",
        padding: 15,
        borderRadius: 20,
        marginTop: 15,
        marginBottom: 10,
        alignSelf: "center",
        width: "70%", paddingHorizontal: 20, marginHorizontal: 20
    },

    loginButtonText: {
        color: "#fff",
        textAlign: "center",
        fontWeight: "bold",
    },

    orContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 20,
        marginBottom: 20,
    },

    orLine: {
        height: 1,
        backgroundColor: "#eee",
        flex: 1,
    },

    orText: {
        color: "#7C8808D",
        marginRight: 10,
        marginLeft: 10,
        fontSize: 14,
    },

    registerButtonText: {
        fontSize: 16,
        color: "#7C808D",
    },

    registerButton: {
        alignSelf: "center",
        marginTop: 20,
    },

    registerButtonHighlight: {
        fontSize: 16,
        color: "#3662AA",
        fontWeight: "500",
    },

    subTitle: {
        fontSize: 30,
        fontWeight: "bold",
        marginBottom: 50,
        textAlign: "center"
    },

    header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    },

    backButton: {
        flexDirection: "row",
        alignItems: "center",
    },

    backButtonText: {
        fontSize: 16,
        marginLeft: 5,
        color: "black",
    },

    // start of ProfileScreen.tsx style

  profileSection: {
    alignItems: "center",
    marginTop: 40, // push logo down a little if needed
  },

  userInfoSection: {
    paddingHorizontal: 30,
    marginBottom: 15,
  },

  profileTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#000",
  },

  profilehHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },

  profileBackButton: {
    flexDirection: "row",
    alignItems: "center",
  },

  profileBackButtonText: {
    fontSize: 16,
    marginLeft: 5,
    color: "black",
  },

  caption: {
    fontSize: 16,
    color: "#7C808D",
    fontWeight: "500",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  rowText: {
    color: "#777777",
    fontSize: 16,
    marginLeft: 15,
  },

  infoBoxWrapper: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopColor: "#eee",
    borderTopWidth: 1,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
    paddingVertical: 20,
    marginHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
    marginBottom: 10,
  },

  infoBox: {
    alignItems: "center",
  },

  infoNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },

  infoLabel: {
    fontSize: 14,
    color: "#7C808D",
    marginTop: 4,
  },

  button: { padding: 15, backgroundColor: '#3662AA', borderRadius: 20, paddingHorizontal: 20, marginHorizontal: 20, marginVertical: 5, },
  buttonText: { color: '#fff', fontSize: 16, textAlign: 'center', fontWeight: '600' },

  logoutButton: {
    backgroundColor: "#3662AA",
    padding: 14,
    borderRadius: 10,
    marginTop: 30,
    marginHorizontal: 30,
  },

  logoutButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
  profileNavBtn: {position: 'absolute',
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  rideBox: {
  backgroundColor: "#F3F4F6",  // very light grey
  borderRadius: 12,
  paddingVertical: 15,
  paddingHorizontal: 25,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: "#E5E7EB",      // subtle grey border
  alignSelf: "center",     // keeps box compact instead of full-width
  marginTop: 12,
  alignContent: 'center',
},

rideLabel: {
  fontSize: 14,
  fontWeight: "600",
  color: "#777",   
  textAlign: 'center',         
},

rideValue: {
  fontSize: 22,
  fontWeight: "700",
  color: "#777",
  marginTop: 4,
},

// end of ProfileScreen.tsx style 

heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    paddingHorizontal: 40,
    width: "80%",
    alignItems: "center",
    justifyContent: "center",
  },

  // start of SettingsScreen.tsx
  settingsContainer: { flex: 1, paddingVertical: 10, paddingHorizontal: 20, gap: 14,backgroundColor: "#fff",},
  SettingsTitle: { fontSize: 30, fontWeight: "600"},

  SettingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
  },

  SettingsBackButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  SettingsBackButtonText: {
    fontSize: 16,
    marginLeft: 5,
    color: "black",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },

  menuItemText: {
    color: "#000",
    marginLeft: 20,
    fontWeight: "500",
    fontSize: 16,
  },

  //end of SettingScreen.tsx

});


export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
  actionBtn: {
  flex: 1,
  borderRadius: 8,
  paddingVertical: 12,
  alignItems: "center",
},
btnText: {
  color: "white",
  fontWeight: "700",
},
grabber: {
  width: 40,
  height: 5,
  borderRadius: 3,
  backgroundColor: "#E5E7EB",
  alignSelf: "center",
  marginBottom: 12,
},

};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

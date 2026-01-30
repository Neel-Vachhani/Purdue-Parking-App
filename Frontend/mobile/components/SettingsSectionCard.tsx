import React from 'react'
import { Pressable, View } from 'react-native';
import { ThemeContext } from '../theme/ThemeProvider';
import { Ionicons } from "@expo/vector-icons";
import ThemedText from './ThemedText';


  type SectionId = typeof SECTION_IDS[number];
  const SECTION_IDS = ["account", "travel", "notifications", "about"] as const;
  


  type SectionCardProps = {
    id: SectionId;
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    expanded: boolean;
    onToggle: (id: SectionId) => void;
    children: React.ReactNode;
  };


const SettingsSectionCard = ({ id, title, icon, expanded, onToggle, children }: SectionCardProps) => {
    const theme = React.useContext(ThemeContext);
    
    return (
      <View
        style={{
          borderRadius: 16,
          backgroundColor: theme.sectionBg,
          borderWidth: 1,
          borderColor: theme.sectionBorder,
          shadowColor: theme.cardShadowColor,
          shadowOpacity: theme.mode === "dark" ? 0.3 : 0.1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }}
      >
        <Pressable
          onPress={() => onToggle(id)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${title} section`}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: theme.sectionHeaderBg,
            flexDirection: "row",
            alignItems: "center",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            gap: 12,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: theme.sectionIconBg,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name={icon} size={20} color={theme.primaryText} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontSize: 17, fontWeight: "700", color: theme.sectionHeaderText }}>{title}</ThemedText>
          </View>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={theme.sectionHeaderText} />
        </Pressable>
        {expanded ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 16, backgroundColor: theme.sectionBg, borderRadius: 16, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
            {children}
          </View>
        ) : null}
      </View>
    );
  };

  export default SettingsSectionCard;
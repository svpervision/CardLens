import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Colors, Fonts } from '../../constants/theme';

function TabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconFocused]}>
      {children}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => <View style={styles.tabBarBg} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <ScanIcon color={focused ? Colors.gold : Colors.textSecondary} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Collection',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <CollectionIcon color={focused ? Colors.gold : Colors.textSecondary} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="graders"
        options={{
          title: 'Graders',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <GradersIcon color={focused ? Colors.gold : Colors.textSecondary} />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

function ScanIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 18, height: 18, borderWidth: 2, borderColor: color, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 8, height: 8, borderWidth: 1.5, borderColor: color, borderRadius: 1 }} />
      </View>
    </View>
  );
}

function CollectionIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 24, height: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: 9, height: 9, backgroundColor: color, borderRadius: 1 }} />
      ))}
    </View>
  );
}

function GradersIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: 'space-around', padding: 3 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ height: 2, backgroundColor: color, borderRadius: 1 }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBar,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
  },
  tabBarBg: {
    flex: 1,
    backgroundColor: Colors.tabBar,
  },
  tabLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
  },
  iconWrap: {
    padding: 4,
    borderRadius: 8,
  },
  iconFocused: {
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
});

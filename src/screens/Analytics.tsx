import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { BarChart, DonutLegend } from '../components/Charts';
import { inr } from '../utils/helpers';

export default function Analytics() {
  const { theme } = useTheme();

  // Mock analytics data
  const monthlyRevenue = [
    { label: 'Jan', value: 120000 },
    { label: 'Feb', value: 145000 },
    { label: 'Mar', value: 132000 },
    { label: 'Apr', value: 180000 },
    { label: 'May', value: 195000 },
    { label: 'Jun', value: 210000 },
  ];

  const categorySplits = [
    { label: 'Hotel & Rooms', value: 450000, color: theme.primary },
    { label: 'F&B Kitchen', value: 320000, color: theme.amber },
    { label: 'Bar', value: 215000, color: theme.red },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: theme.text, marginBottom: 20 }}>
        Business Analytics & Projections
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
        {/* Revenue Chart */}
        <View style={{ flex: 1, minWidth: 300, backgroundColor: theme.card, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 24 }}>6-Month Revenue Trend</Text>
          <BarChart data={monthlyRevenue} height={180} />
        </View>

        {/* Category Split */}
        <View style={{ flex: 1, minWidth: 300, backgroundColor: theme.card, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 24 }}>Revenue by Department</Text>
          <DonutLegend data={categorySplits} total={985000} />
          
          <View style={{ marginTop: 30, padding: 16, backgroundColor: theme.cardAlt, borderRadius: 8 }}>
            <Text style={{ color: theme.sub, fontSize: 13, marginBottom: 4 }}>YTD Total Revenue</Text>
            <Text style={{ color: theme.green, fontSize: 28, fontWeight: '900' }}>{inr(985000)}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { inr } from '../utils/helpers';

export interface BarDataItem {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  data: BarDataItem[];
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, height = 140 }) => {
  const { theme } = useTheme();
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: height + 26,
        gap: 6
      }}
    >
      {data.map((item, index) => {
        const barHeight = Math.max(4, (item.value / maxVal) * height);
        return (
          <View
            key={index}
            style={{
              flex: 1,
              alignItems: 'center'
            }}
          >
            <View
              style={{
                width: '72%',
                height: barHeight,
                backgroundColor: item.color || theme.primary,
                borderRadius: 6,
                opacity: item.value === 0 ? 0.25 : 1
              }}
            />
            <Text
              style={{
                fontSize: 10,
                color: theme.faint,
                marginTop: 6
              }}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export interface HBarDataItem {
  label: string;
  value: number;
  color?: string;
}

export interface HBarChartProps {
  data: HBarDataItem[];
}

export const HBarChart: React.FC<HBarChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={{ gap: 12 }}>
      {data.map((item, index) => {
        const percentage = Math.max(2, (item.value / maxVal) * 100);
        return (
          <View key={index}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 5
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: theme.sub,
                  fontWeight: '600'
                }}
              >
                {item.label}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: theme.text,
                  fontWeight: '700'
                }}
              >
                {inr(item.value)}
              </Text>
            </View>
            <View
              style={{
                height: 8,
                backgroundColor: theme.cardAlt,
                borderRadius: 4,
                overflow: 'hidden'
              }}
            >
              <View
                style={{
                  width: `${percentage}%`,
                  height: 8,
                  backgroundColor: item.color || theme.primary,
                  borderRadius: 4
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

export interface DonutDataItem {
  label: string;
  value: number;
  color: string;
}

export interface DonutLegendProps {
  data: DonutDataItem[];
  total: number;
}

export const DonutLegend: React.FC<DonutLegendProps> = ({ data, total }) => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: 10 }}>
      {/* Horizontal segmented progress bar */}
      <View
        style={{
          flexDirection: 'row',
          height: 14,
          borderRadius: 7,
          overflow: 'hidden',
          backgroundColor: theme.cardAlt
        }}
      >
        {data
          .filter((item) => item.value > 0)
          .map((item, index) => (
            <View
              key={index}
              style={{
                flex: item.value,
                backgroundColor: item.color
              }}
            />
          ))}
      </View>

      {/* Grid of legend items and calculated percentages */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        {data.map((item, index) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: item.color
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: theme.sub
                }}
              >
                {item.label}{' '}
                <Text
                  style={{
                    fontWeight: '700',
                    color: theme.text
                  }}
                >
                  {percentage}%
                </Text>
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

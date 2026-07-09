import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
  KeyboardTypeOptions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 16,
          shadowColor: '#000',
          shadowOpacity: theme.dark ? 0 : 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2
        },
        style
      ]}
    >
      {children}
    </View>
  );
};

export interface SectionTitleProps {
  children: React.ReactNode;
  right?: React.ReactNode;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ children, right }) => {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 10
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '700',
          color: theme.sub,
          letterSpacing: 0.6,
          textTransform: 'uppercase'
        }}
      >
        {children}
      </Text>
      {right}
    </View>
  );
};

export interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
}

export const Chip: React.FC<ChipProps> = ({ label, active, onPress, color }) => {
  const { theme } = useTheme();
  const activeColor = color || theme.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: active ? activeColor : theme.card,
        borderWidth: 1,
        borderColor: active ? activeColor : theme.border,
        marginRight: 8
      }}
    >
      <Text
        style={{
          color: active ? '#fff' : theme.sub,
          fontWeight: '600',
          fontSize: 13
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
  editable?: boolean;
}

export const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  placeholder,
  multiline = false,
  disabled = false,
  editable = true
}) => {
  const { theme } = useTheme();
  const isEditable = editable && !disabled;
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: theme.sub,
          marginBottom: 6
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={theme.faint}
        multiline={multiline}
        editable={isEditable}
        style={{
          backgroundColor: theme.cardAlt,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          color: theme.text,
          minHeight: multiline ? 70 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
          opacity: isEditable ? 1 : 0.55
        }}
      />
    </View>
  );
};

export interface SegmentedProps {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}

export const Segmented: React.FC<SegmentedProps> = ({ options, value, onChange }) => {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.cardAlt,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: 14
      }}
    >
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          onPress={() => onChange(opt.key)}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: 9,
            backgroundColor: value === opt.key ? theme.primary : 'transparent',
            alignItems: 'center'
          }}
        >
          <Text
            style={{
              color: value === opt.key ? '#fff' : theme.sub,
              fontWeight: '600',
              fontSize: 13
            }}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({ title, onPress, color, icon }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: color || theme.primary,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8
      }}
    >
      {icon && <Ionicons name={icon} size={18} color="#fff" />}
      <Text
        style={{
          color: '#fff',
          fontWeight: '700',
          fontSize: 16
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ visible, onClose, title, children }) => {
  const { theme } = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.45)'
        }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={onClose}
          activeOpacity={1}
        />
        <View
          style={{
            backgroundColor: theme.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '88%'
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 8
            }}
          >
            <Text
              style={{
                fontSize: 19,
                fontWeight: '800',
                color: theme.text
              }}
            >
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                padding: 6,
                backgroundColor: theme.cardAlt,
                borderRadius: 20
              }}
            >
              <Ionicons name="close" size={20} color={theme.sub} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={{
              padding: 20,
              paddingBottom: 40
            }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export interface SelectOption {
  value: string;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  sub?: string;
}

export interface SelectProps {
  label?: string;
  value: string;
  options: (SelectOption | string)[];
  onChange: (value: string) => void;
  placeholder?: string;
  color?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder,
  color
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const formattedOptions: SelectOption[] = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOpt = formattedOptions.find((o) => o.value === value);
  const activeColor = color || theme.primary;

  return (
    <View style={{ marginBottom: 14 }}>
      {label && (
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: theme.sub,
            marginBottom: 6
          }}
        >
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          backgroundColor: theme.cardAlt,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10
        }}
      >
        {selectedOpt?.icon && (
          <Ionicons name={selectedOpt.icon} size={17} color={activeColor} />
        )}
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            color: selectedOpt ? theme.text : theme.faint
          }}
          numberOfLines={1}
        >
          {selectedOpt ? selectedOpt.label || selectedOpt.value : placeholder || 'Select...'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.faint} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            padding: 24
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 18,
              maxHeight: '72%',
              overflow: 'hidden',
              alignSelf: 'center',
              width: '100%',
              maxWidth: 420
            }}
          >
            <View
              style={{
                paddingHorizontal: 18,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Text
                style={{
                  fontWeight: '800',
                  color: theme.text,
                  fontSize: 16
                }}
              >
                {label || 'Select'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color={theme.sub} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {formattedOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      onChange(opt.value);
                      setModalVisible(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingHorizontal: 18,
                      paddingVertical: 13,
                      backgroundColor: isSelected
                        ? theme.dark
                          ? theme.cardAlt
                          : theme.primarySoft
                        : 'transparent',
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border
                    }}
                  >
                    {opt.icon && (
                      <Ionicons
                        name={opt.icon}
                        size={18}
                        color={isSelected ? activeColor : theme.sub}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? activeColor : theme.text
                        }}
                      >
                        {opt.label || opt.value}
                      </Text>
                      {opt.sub && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.faint,
                            marginTop: 1
                          }}
                        >
                          {opt.sub}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={19} color={activeColor} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, text }) => {
  const { theme } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: 48
      }}
    >
      <Ionicons name={icon} size={44} color={theme.faint} />
      <Text
        style={{
          color: theme.faint,
          marginTop: 12,
          fontSize: 15
        }}
      >
        {text}
      </Text>
    </View>
  );
};

export interface BadgeProps {
  text: string;
  color: string;
  soft?: string | boolean;
}

export const Badge: React.FC<BadgeProps> = ({ text, color, soft }) => {
  const bg = typeof soft === 'string' ? soft : (soft ? color + '22' : 'transparent');
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 8
      }}
    >
      <Text
        style={{
          color,
          fontSize: 11,
          fontWeight: '700'
        }}
      >
        {text}
      </Text>
    </View>
  );
};

export interface RowProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Row: React.FC<RowProps> = ({ children, style }) => {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center'
        },
        style
      ]}
    >
      {children}
    </View>
  );
};

export interface StatPillProps {
  label: string;
  value: string;
  color?: string;
}

export const StatPill: React.FC<StatPillProps> = ({ label, value, color }) => {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: 12,
          color: theme.sub,
          marginBottom: 3
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 17,
          fontWeight: '800',
          color: color || theme.text
        }}
      >
        {value}
      </Text>
    </View>
  );
};

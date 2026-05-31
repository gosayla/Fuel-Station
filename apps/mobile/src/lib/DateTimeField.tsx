import React, { useMemo, useState } from 'react';
import { TouchableOpacity, Text, StyleProp, ViewStyle, TextStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DatePicker from 'react-native-date-picker';
import { format } from 'date-fns';
import { Colors } from '../theme';

type DateTimeFieldProps = {
  value: Date;
  onChange: (value: Date) => void;
  locale: string;
  title: string;
  confirmText: string;
  cancelText: string;
  formatPattern?: string;
  iconName?: string;
  containerStyle?: StyleProp<ViewStyle>;
  valueTextStyle?: StyleProp<TextStyle>;
};

export function DateTimeField({
  value,
  onChange,
  locale,
  title,
  confirmText,
  cancelText,
  formatPattern = 'yyyy-MM-dd HH:mm',
  iconName = 'calendar-clock',
  containerStyle,
  valueTextStyle,
}: DateTimeFieldProps) {
  const [open, setOpen] = useState(false);

  const displayValue = useMemo(() => format(value, formatPattern), [value, formatPattern]);

  return (
    <>
      <TouchableOpacity style={containerStyle} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <MaterialCommunityIcons name={iconName} size={18} color={Colors.textMuted} />
        <Text style={valueTextStyle}>{displayValue}</Text>
      </TouchableOpacity>

      <DatePicker
        modal
        open={open}
        mode="datetime"
        date={value}
        onConfirm={(nextDate) => {
          setOpen(false);
          onChange(nextDate);
        }}
        onCancel={() => setOpen(false)}
        title={title}
        confirmText={confirmText}
        cancelText={cancelText}
        locale={locale}
      />
    </>
  );
}

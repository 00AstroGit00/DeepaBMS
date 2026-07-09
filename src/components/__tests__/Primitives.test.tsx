import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card, Row, Badge, PrimaryButton } from '../Primitives';

describe('UI Primitives Components', () => {
  test('Card renders child elements correctly', () => {
    const { getByText } = render(
      <Card>
        <Text>Inside Card</Text>
      </Card>
    );
    expect(getByText('Inside Card')).toBeTruthy();
  });

  test('Row arranges items horizontally', () => {
    const { getByText } = render(
      <Row>
        <Text>Left</Text>
        <Text>Right</Text>
      </Row>
    );
    expect(getByText('Left')).toBeTruthy();
    expect(getByText('Right')).toBeTruthy();
  });

  test('Badge displays correct status text', () => {
    const { getByText } = render(
      <Badge text="ACTIVE" color="#1E7E4E" soft="#E3F3EA" />
    );
    expect(getByText('ACTIVE')).toBeTruthy();
  });

  test('PrimaryButton responds to user press events', () => {
    const mockPress = jest.fn();
    const { getByText } = render(
      <PrimaryButton title="Submit Data" onPress={mockPress} />
    );

    const button = getByText('Submit Data');
    expect(button).toBeTruthy();

    fireEvent.press(button);
    expect(mockPress).toHaveBeenCalledTimes(1);
  });
});

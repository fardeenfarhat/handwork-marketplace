import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@/types/navigation';
import { PaymentStackParamList } from '@/types';
import { Button, Input, LoadingSpinner } from '@/components/common';
import apiService from '@/services/api';

type NavigationProp = StackNavigationProp<PaymentStackParamList, 'AddPaymentMethod'>;

type PaymentMethodType = 'card' | 'paypal' | 'bank_account';

const AddPaymentMethodScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [selectedType, setSelectedType] = useState<PaymentMethodType>('card');
  const [loading, setLoading] = useState(false);
  
  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  
  // PayPal form state
  const [paypalEmail, setPaypalEmail] = useState('');
  
  // Bank account form state
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  
  const [isDefault, setIsDefault] = useState(false);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const validateCardForm = () => {
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
      Alert.alert('Error', 'Please enter a valid card number');
      return false;
    }
    if (!expiryDate || expiryDate.length < 5) {
      Alert.alert('Error', 'Please enter a valid expiry date');
      return false;
    }
    if (!cvv || cvv.length < 3) {
      Alert.alert('Error', 'Please enter a valid CVV');
      return false;
    }
    if (!cardholderName.trim()) {
      Alert.alert('Error', 'Please enter the cardholder name');
      return false;
    }
    return true;
  };

  const validatePayPalForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!paypalEmail || !emailRegex.test(paypalEmail)) {
      Alert.alert('Error', 'Please enter a valid PayPal email');
      return false;
    }
    return true;
  };

  const validateBankForm = () => {
    if (!accountNumber || accountNumber.length < 4) {
      Alert.alert('Error', 'Please enter a valid account number');
      return false;
    }
    if (!routingNumber || routingNumber.length !== 9) {
      Alert.alert('Error', 'Please enter a valid 9-digit routing number');
      return false;
    }
    if (!accountHolderName.trim()) {
      Alert.alert('Error', 'Please enter the account holder name');
      return false;
    }
    if (!bankName.trim()) {
      Alert.alert('Error', 'Please enter the bank name');
      return false;
    }
    return true;
  };

  const handleAddPaymentMethod = async () => {
    let isValid = false;
    let paymentData: any = {
      type: selectedType,
      isDefault,
    };

    switch (selectedType) {
      case 'card':
        isValid = validateCardForm();
        if (isValid) {
          // In a real app, you would tokenize the card with Stripe
          paymentData.token = 'mock_card_token';
          paymentData.last4 = cardNumber.replace(/\s/g, '').slice(-4);
          paymentData.brand = 'visa'; // Would be detected from card number
          paymentData.expiryMonth = parseInt(expiryDate.split('/')[0]);
          paymentData.expiryYear = parseInt(`20${expiryDate.split('/')[1]}`);
        }
        break;
      case 'paypal':
        isValid = validatePayPalForm();
        if (isValid) {
          paymentData.token = 'mock_paypal_token';
          paymentData.email = paypalEmail;
        }
        break;
      case 'bank_account':
        isValid = validateBankForm();
        if (isValid) {
          paymentData.token = 'mock_bank_token';
          paymentData.last4 = accountNumber.slice(-4);
          paymentData.bankName = bankName;
        }
        break;
    }

    if (!isValid) return;

    setLoading(true);
    try {
      await apiService.addPaymentMethod(paymentData);
      Alert.alert('Success', 'Payment method added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error adding payment method:', error);
      Alert.alert('Error', 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  const renderCardForm = () => (
    <View style={styles.formSection}>
      <Input
        label="Card Number"
        value={cardNumber}
        onChangeText={(text) => setCardNumber(formatCardNumber(text))}
        placeholder="1234 5678 9012 3456"
        keyboardType="numeric"
        maxLength={19}
      />
      
      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Input
            label="Expiry Date"
            value={expiryDate}
            onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
            placeholder="MM/YY"
            keyboardType="numeric"
            maxLength={5}
          />
        </View>
        <View style={styles.halfWidth}>
          <Input
            label="CVV"
            value={cvv}
            onChangeText={setCvv}
            placeholder="123"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
          />
        </View>
      </View>
      
      <Input
        label="Cardholder Name"
        value={cardholderName}
        onChangeText={setCardholderName}
        placeholder="John Doe"
        autoCapitalize="words"
      />
    </View>
  );

  const renderPayPalForm = () => (
    <View style={styles.formSection}>
      <Input
        label="PayPal Email"
        value={paypalEmail}
        onChangeText={setPaypalEmail}
        placeholder="your-email@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
    </View>
  );

  const renderBankForm = () => (
    <View style={styles.formSection}>
      <Input
        label="Bank Name"
        value={bankName}
        onChangeText={setBankName}
        placeholder="Chase Bank"
        autoCapitalize="words"
      />
      
      <Input
        label="Account Number"
        value={accountNumber}
        onChangeText={setAccountNumber}
        placeholder="1234567890"
        keyboardType="numeric"
        secureTextEntry
      />
      
      <Input
        label="Routing Number"
        value={routingNumber}
        onChangeText={setRoutingNumber}
        placeholder="123456789"
        keyboardType="numeric"
        maxLength={9}
      />
      
      <Input
        label="Account Holder Name"
        value={accountHolderName}
        onChangeText={setAccountHolderName}
        placeholder="John Doe"
        autoCapitalize="words"
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Add Payment Method</Text>
        
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === 'card' && styles.typeButtonActive,
            ]}
            onPress={() => setSelectedType('card')}
          >
            <Text
              style={[
                styles.typeButtonText,
                selectedType === 'card' && styles.typeButtonTextActive,
              ]}
            >
              Credit Card
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === 'paypal' && styles.typeButtonActive,
            ]}
            onPress={() => setSelectedType('paypal')}
          >
            <Text
              style={[
                styles.typeButtonText,
                selectedType === 'paypal' && styles.typeButtonTextActive,
              ]}
            >
              PayPal
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === 'bank_account' && styles.typeButtonActive,
            ]}
            onPress={() => setSelectedType('bank_account')}
          >
            <Text
              style={[
                styles.typeButtonText,
                selectedType === 'bank_account' && styles.typeButtonTextActive,
              ]}
            >
              Bank Account
            </Text>
          </TouchableOpacity>
        </View>

        {selectedType === 'card' && renderCardForm()}
        {selectedType === 'paypal' && renderPayPalForm()}
        {selectedType === 'bank_account' && renderBankForm()}

        <TouchableOpacity
          style={styles.defaultCheckbox}
          onPress={() => setIsDefault(!isDefault)}
        >
          <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
            {isDefault && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.defaultLabel}>Set as default payment method</Text>
        </TouchableOpacity>

        <Button
          title="Add Payment Method"
          onPress={handleAddPaymentMethod}
          style={styles.addButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeButtonActive: {
    backgroundColor: '#2196F3',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  formSection: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  defaultCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  defaultLabel: {
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    marginBottom: 32,
  },
});

export default AddPaymentMethodScreen;
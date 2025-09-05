import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {

  const handleLogin = () => {
    Alert.alert('Login', 'Login functionality will be implemented here');
  };

  const handleRegister = () => {
    Alert.alert(
      'Register',
      'Registration functionality will be implemented here'
    );
  };

  const handleBrowseJobs = () => {
    Alert.alert(
      'Browse Jobs',
      'Job browsing functionality will be implemented here'
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>🔨 Handwork Marketplace</Text>
        <Text style={styles.subtitle}>
          Connect with skilled workers for any job
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleRegister}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Register
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.tertiaryButton]}
            onPress={handleBrowseJobs}
          >
            <Text style={[styles.buttonText, styles.tertiaryButtonText]}>
              Browse Jobs
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Features:</Text>
          <Text style={styles.infoText}>
            • Find skilled workers for construction, plumbing, electrical work
          </Text>
          <Text style={styles.infoText}>
            • Post jobs and get quotes from professionals
          </Text>
          <Text style={styles.infoText}>• Secure payment processing</Text>
          <Text style={styles.infoText}>• Rating and review system</Text>
          <Text style={styles.infoText}>• Real-time messaging</Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            🟢 Backend API: Running on localhost:8000
          </Text>
          <Text style={styles.statusText}>
            🟢 Admin Dashboard: Running on localhost:3000
          </Text>
          <Text style={styles.statusText}>🟢 Mobile App: You're here!</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  tertiaryButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  tertiaryButtonText: {
    color: 'white',
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    width: '100%',
    maxWidth: 350,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 22,
  },
  statusContainer: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    maxWidth: 350,
  },
  statusText: {
    fontSize: 14,
    color: '#2d5a2d',
    marginBottom: 5,
  },
});

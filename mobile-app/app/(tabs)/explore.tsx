import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ExploreScreen() {
  const router = useRouter();

  const handleFeaturePress = (feature: string) => {
    switch (feature) {
      case 'repair':
        router.push('/book-repair');
        break;
      case 'rental':
        router.push('/book-rental');
        break;
      case 'requests':
        router.push('/my-requests');
        break;
      case 'profile':
        router.push('/profile');
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore Services</Text>
        <Text style={styles.subtitle}>Discover what Cycle-Bees has to offer</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Services Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Services</Text>
          
          <View style={styles.serviceCard}>
            <View style={styles.serviceIcon}>
              <Ionicons name="construct" size={32} color="#FFD11E" />
            </View>
            <View style={styles.serviceContent}>
              <Text style={styles.serviceTitle}>Bicycle Repair</Text>
              <Text style={styles.serviceDescription}>
                Professional repair services for all types of bicycles. From tire punctures to complete tune-ups.
              </Text>
              <TouchableOpacity 
                style={styles.serviceButton}
                onPress={() => handleFeaturePress('repair')}
              >
                <Text style={styles.serviceButtonText}>Book Repair</Text>
                <Ionicons name="arrow-forward" size={16} color="#2D3E50" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.serviceCard}>
            <View style={styles.serviceIcon}>
              <Ionicons name="bicycle" size={32} color="#FFD11E" />
            </View>
            <View style={styles.serviceContent}>
              <Text style={styles.serviceTitle}>Bicycle Rental</Text>
              <Text style={styles.serviceDescription}>
                Quality bicycles available for daily and weekly rentals. Perfect for exploring the city.
              </Text>
              <TouchableOpacity 
                style={styles.serviceButton}
                onPress={() => handleFeaturePress('rental')}
              >
                <Text style={styles.serviceButtonText}>Rent Bicycle</Text>
                <Ionicons name="arrow-forward" size={16} color="#2D3E50" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose Cycle-Bees?</Text>
          
          <View style={styles.featuresGrid}>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={24} color="#FFD11E" />
              <Text style={styles.featureTitle}>Quality Service</Text>
              <Text style={styles.featureDescription}>Professional mechanics and well-maintained bicycles</Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="time" size={24} color="#FFD11E" />
              <Text style={styles.featureTitle}>Quick Service</Text>
              <Text style={styles.featureDescription}>Fast turnaround times for repairs and rentals</Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="card" size={24} color="#FFD11E" />
              <Text style={styles.featureTitle}>Flexible Payment</Text>
              <Text style={styles.featureDescription}>Online and offline payment options available</Text>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="location" size={24} color="#FFD11E" />
              <Text style={styles.featureTitle}>Home Delivery</Text>
              <Text style={styles.featureDescription}>Convenient delivery and pickup services</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => handleFeaturePress('requests')}
            >
              <Ionicons name="list" size={24} color="#FFD11E" />
              <Text style={styles.quickActionText}>My Requests</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => handleFeaturePress('profile')}
            >
              <Ionicons name="person" size={24} color="#FFD11E" />
              <Text style={styles.quickActionText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#2D3E50',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD11E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 20,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FBE9A0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
    marginBottom: 16,
  },
  serviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  serviceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3E50',
    marginRight: 8,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#4A4A4A',
    textAlign: 'center',
    lineHeight: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAction: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3E50',
    marginTop: 8,
  },
});

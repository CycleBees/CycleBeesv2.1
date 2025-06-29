import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface PromotionalCard {
  id: number;
  title: string;
  description: string;
  image_url: string;
  external_link: string;
  display_order: number;
}

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  pincode: string;
  address: string;
  profile_photo: string;
}

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const [promotionalCards, setPromotionalCards] = useState<PromotionalCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    fetchPromotionalCards();
  }, []);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('userToken');
    if (token) {
      fetchUserProfile();
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch('http://localhost:3000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchPromotionalCards = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/promotional/cards');
      
      if (response.ok) {
        const data = await response.json();
        setPromotionalCards(data);
      }
    } catch (error) {
      console.error('Error fetching promotional cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchPromotionalCards(),
      checkAuthStatus()
    ]);
    setRefreshing(false);
  };

  const handleCardPress = (card: PromotionalCard) => {
    if (card.external_link) {
      Linking.openURL(card.external_link);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            localStorage.removeItem('userToken');
            setUser(null);
            navigation.navigate('Login');
          }
        }
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>🚲 Welcome to Cycle-Bees</Text>
          <Text style={styles.welcomeSubtitle}>
            Your trusted partner for bicycle repair and rental services
          </Text>
          
          <View style={styles.authButtons}>
            <TouchableOpacity
              style={styles.authButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.authButtonText}>Login / Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Hello, {user.full_name}!</Text>
              <Text style={styles.subtitle}>What would you like to do today?</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={24} color="#2D3E50" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Promotional Cards */}
        {promotionalCards.length > 0 && (
          <View style={styles.promotionalSection}>
            <Text style={styles.sectionTitle}>Special Offers</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsContainer}
            >
              {promotionalCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.promotionalCard}
                  onPress={() => handleCardPress(card)}
                >
                  {card.image_url && (
                    <Image
                      source={{ uri: `http://localhost:3000/${card.image_url}` }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardDescription}>{card.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('BookRepair')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="construct-outline" size={32} color="#FFD11E" />
              </View>
              <Text style={styles.actionTitle}>Book Repair</Text>
              <Text style={styles.actionSubtitle}>Professional repair services</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('BookRental')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="bicycle-outline" size={32} color="#FFD11E" />
              </View>
              <Text style={styles.actionTitle}>Rent Bicycle</Text>
              <Text style={styles.actionSubtitle}>Quality bicycles for rent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('MyRequests')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="list-outline" size={32} color="#FFD11E" />
              </View>
              <Text style={styles.actionTitle}>My Requests</Text>
              <Text style={styles.actionSubtitle}>Track your bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Profile')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="person-outline" size={32} color="#FFD11E" />
              </View>
              <Text style={styles.actionTitle}>Profile</Text>
              <Text style={styles.actionSubtitle}>Manage your account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Services Overview */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Our Services</Text>
          <View style={styles.serviceCards}>
            <View style={styles.serviceCard}>
              <Ionicons name="construct" size={24} color="#2D3E50" />
              <Text style={styles.serviceTitle}>Repair Services</Text>
              <Text style={styles.serviceDescription}>
                Professional bicycle repair with experienced mechanics
              </Text>
            </View>
            
            <View style={styles.serviceCard}>
              <Ionicons name="bicycle" size={24} color="#2D3E50" />
              <Text style={styles.serviceTitle}>Bicycle Rental</Text>
              <Text style={styles.serviceDescription}>
                Quality bicycles available for daily and weekly rental
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3E50',
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#4A4A4A',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  authButtons: {
    width: '100%',
  },
  authButton: {
    backgroundColor: '#FFD11E',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#2D3E50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#FFD11E',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  subtitle: {
    fontSize: 14,
    color: '#4A4A4A',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  promotionalSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 15,
  },
  cardsContainer: {
    paddingRight: 20,
  },
  promotionalCard: {
    width: width * 0.8,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardContent: {
    padding: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  quickActionsSection: {
    padding: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#FFF5CC',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 5,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#4A4A4A',
    textAlign: 'center',
    lineHeight: 16,
  },
  servicesSection: {
    padding: 20,
    paddingBottom: 40,
  },
  serviceCards: {
    gap: 15,
  },
  serviceCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginLeft: 15,
    flex: 1,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#4A4A4A',
    marginLeft: 15,
    flex: 2,
    lineHeight: 20,
  },
}); 
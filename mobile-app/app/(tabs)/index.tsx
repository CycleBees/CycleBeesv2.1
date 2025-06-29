import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface PromotionalCard {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  externalLink: string;
  displayOrder: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [promotionalCards, setPromotionalCards] = useState<PromotionalCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPromotionalCards();
  }, []);

  const fetchPromotionalCards = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/promotional/cards');
      if (response.ok) {
        const data = await response.json();
        setPromotionalCards(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Error fetching promotional cards:', error);
      setPromotionalCards([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPromotionalCards();
    setRefreshing(false);
  };

  const handleCardPress = (card: PromotionalCard) => {
    if (card.externalLink) {
      Alert.alert(
        'External Link',
        'This will open an external website. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open', onPress: () => console.log('Open external link:', card.externalLink) }
        ]
      );
    }
  };

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
        <View>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.appName}>Cycle-Bees</Text>
        </View>
        <TouchableOpacity onPress={() => handleFeaturePress('profile')}>
          <Ionicons name="person-circle-outline" size={40} color="#2D3E50" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Promotional Cards Section */}
        {promotionalCards.length > 0 && (
          <View style={styles.promotionalSection}>
            <Text style={styles.sectionTitle}>Featured Offers</Text>
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
                  {card.imageUrl && (
                    <Image
                      source={{ uri: `http://localhost:3000/${card.imageUrl}` }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardDescription}>{card.description}</Text>
                    {card.externalLink && (
                      <View style={styles.externalLinkIndicator}>
                        <Ionicons name="open-outline" size={16} color="#FFD11E" />
                        <Text style={styles.externalLinkText}>Learn More</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Actions Section */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleFeaturePress('repair')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="construct" size={32} color="#FFD11E" />
              </View>
              <Text style={styles.actionTitle}>Book Repair</Text>
              <Text style={styles.actionSubtitle}>Professional bicycle repair services</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleFeaturePress('rental')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="bicycle" size={32} color="#FFD11E" />
              </View>
              <Text style={styles.actionTitle}>Rent Bicycle</Text>
              <Text style={styles.actionSubtitle}>Quality bicycles for rent</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleFeaturePress('requests')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="list" size={32} color="#FFD11E" />
              </View>
              <Text style={styles.actionTitle}>My Requests</Text>
              <Text style={styles.actionSubtitle}>Track your bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => handleFeaturePress('profile')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="person" size={32} color="#FFD11E" />
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
              <View style={styles.serviceIcon}>
                <Ionicons name="construct" size={24} color="#FFD11E" />
              </View>
              <View style={styles.serviceContent}>
                <Text style={styles.serviceTitle}>Professional Repair Services</Text>
                <Text style={styles.serviceDescription}>
                  Expert mechanics provide comprehensive bicycle repair and maintenance services
                </Text>
              </View>
            </View>

            <View style={styles.serviceCard}>
              <View style={styles.serviceIcon}>
                <Ionicons name="bicycle" size={24} color="#FFD11E" />
              </View>
              <View style={styles.serviceContent}>
                <Text style={styles.serviceTitle}>Quality Bicycle Rentals</Text>
                <Text style={styles.serviceDescription}>
                  Well-maintained bicycles available for daily and weekly rentals
                </Text>
              </View>
            </View>

            <View style={styles.serviceCard}>
              <View style={styles.serviceIcon}>
                <Ionicons name="car" size={24} color="#FFD11E" />
              </View>
              <View style={styles.serviceContent}>
                <Text style={styles.serviceTitle}>Home Delivery</Text>
                <Text style={styles.serviceDescription}>
                  Convenient delivery and pickup services for rentals and repairs
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Need Help?</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Ionicons name="call" size={20} color="#FFD11E" />
              <Text style={styles.contactText}>Call us: +91 98765 43210</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={20} color="#FFD11E" />
              <Text style={styles.contactText}>Email: support@cyclebees.com</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="time" size={20} color="#FFD11E" />
              <Text style={styles.contactText}>Hours: 6 AM - 10 PM</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFD11E',
  },
  welcomeText: {
    fontSize: 16,
    color: '#2D3E50',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  scrollView: {
    flex: 1,
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
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 15,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
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
  externalLinkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  externalLinkText: {
    fontSize: 14,
    color: '#FFD11E',
    fontWeight: '600',
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
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
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
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  serviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF5CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  serviceContent: {
    flex: 1,
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
  contactSection: {
    padding: 20,
    paddingBottom: 40,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  contactText: {
    fontSize: 16,
    color: '#2D3E50',
  },
});

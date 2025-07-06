import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Linking,
  Platform,
  Modal,
  Pressable,
  Animated,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import SplashAnimation from '@/components/SplashAnimation';
import AuthGuard from '@/components/AuthGuard';
import { Colors } from '@/constants/Colors';

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

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [promotionalCards, setPromotionalCards] = useState<PromotionalCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
  // Carousel state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchUserProfile();
    fetchPromotionalCards();
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (promotionalCards.length > 1 && isAutoScrolling) {
      autoScrollTimer.current = setInterval(() => {
        setCurrentCardIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % promotionalCards.length;
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
          return nextIndex;
        });
      }, 5000);
    }

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [promotionalCards.length, isAutoScrolling]);

  const fetchUserProfile = async () => {
    try {
      setIsLoadingUser(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://localhost:3000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
      } else {
        // Token is invalid, redirect to login
        await AsyncStorage.removeItem('userToken');
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      await AsyncStorage.removeItem('userToken');
      router.replace('/login');
    } finally {
      setIsLoadingUser(false);
    }
  };

  const fetchPromotionalCards = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/promotional/cards');
      
      if (response.ok) {
        const data = await response.json();
        setPromotionalCards(data.data || []);
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
      fetchUserProfile()
    ]);
    setRefreshing(false);
  };

  const handleCardPress = (card: PromotionalCard) => {
    if (card.external_link) {
      // Check if it's an internal route (starts with /)
      if (card.external_link.startsWith('/')) {
        // Navigate to internal route
        router.push(card.external_link as any);
      } else {
        // Open external URL
        Linking.openURL(card.external_link);
      }
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await AsyncStorage.clear();
      setUser(null);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  // Carousel handlers
  const handleScrollBeginDrag = () => {
    setIsAutoScrolling(false);
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }
  };

  const handleScrollEndDrag = () => {
    // Resume auto-scroll after 3 seconds of no interaction
    setTimeout(() => {
      setIsAutoScrolling(true);
    }, 3000);
  };

  // Memoized onViewableItemsChanged
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentCardIndex(viewableItems[0].index);
    }
  }, []);

  // Memoized viewabilityConfig
  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50,
  }), []);

  const renderPromotionalCard = ({ item }: { item: PromotionalCard }) => (
    <TouchableOpacity
      style={styles.promotionalCard}
      onPress={() => handleCardPress(item)}
      activeOpacity={0.9}
    >
      <View style={styles.cardImageContainer}>
        {item.image_url ? (
          <Image
            source={{ uri: `http://localhost:3000/${item.image_url}` }}
            style={styles.cardImage}
            resizeMode="cover"
            onError={() => {
              // Image failed to load, will show placeholder
            }}
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="image" size={48} color="#4A4A4A" />
          </View>
        )}
        <View style={styles.cardOverlay}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDescription}>{item.description}</Text>
            {item.external_link && (
              <View style={styles.cardAction}>
                <Text style={styles.cardActionText}>
                  {item.external_link.startsWith('/') ? 'Open Page' : 'Learn More'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFD11E" />
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPaginationDots = () => {
    if (promotionalCards.length <= 1) return null;
    
    return (
      <View style={styles.paginationContainer}>
        {promotionalCards.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentCardIndex && styles.paginationDotActive
            ]}
          />
        ))}
      </View>
    );
  };

  // Show splash animation if user is not loaded yet
  if (isLoadingUser || !user) {
    return <SplashAnimation message="Loading your dashboard..." />;
  }

  return (
    <AuthGuard message="Loading your dashboard...">
      <SafeAreaView style={styles.container}>
        {/* Modern, concise header */}
        <View style={styles.headerNew}>
          {/* Avatar/Profile Icon */}
          <View style={styles.avatarContainer}>
            {user.profile_photo ? (
              <Image
                source={{ uri: `http://localhost:3000/${user.profile_photo}` }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person-circle" size={56} color="#2D3E50" />
            )}
          </View>
          {/* Greeting and Name */}
          <View style={styles.headerTextContainer}>
            <Text style={styles.greetingText}>Welcome back,</Text>
            <Text style={styles.userNameText}>{user.full_name}</Text>
          </View>
          {/* Logout Button */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButtonNew}>
            <Ionicons name="log-out-outline" size={28} color="#2D3E50" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Modern Promotional Cards Section */}
          {promotionalCards.length > 0 && (
            <View style={styles.promotionalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Special Offers</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>New</Text>
                </View>
              </View>
              
              <View style={styles.carouselContainer}>
                <FlatList
                  ref={flatListRef}
                  data={promotionalCards}
                  renderItem={renderPromotionalCard}
                  keyExtractor={(item) => item.id.toString()}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScrollBeginDrag={handleScrollBeginDrag}
                  onScrollEndDrag={handleScrollEndDrag}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={viewabilityConfig}
                  getItemLayout={(_, index) => ({
                    length: width - 40,
                    offset: (width - 40) * index,
                    index,
                  })}
                />
                {renderPaginationDots()}
              </View>
            </View>
          )}

          {/* Modern Quick Actions Section */}
          <View style={styles.quickActionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>4</Text>
              </View>
            </View>
            
            <View style={styles.actionsGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/book-repair')}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="construct" size={32} color="#FFD11E" />
                </View>
                <Text style={styles.actionTitle}>Book Repair</Text>
                <Text style={styles.actionSubtitle}>Professional repair services</Text>
                <View style={styles.actionArrow}>
                  <Ionicons name="arrow-forward" size={16} color="#2D3E50" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/book-rental')}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="bicycle" size={32} color="#FFD11E" />
                </View>
                <Text style={styles.actionTitle}>Rent Bicycle</Text>
                <Text style={styles.actionSubtitle}>Quality bicycles for rent</Text>
                <View style={styles.actionArrow}>
                  <Ionicons name="arrow-forward" size={16} color="#2D3E50" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/my-requests')}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="list" size={32} color="#FFD11E" />
                </View>
                <Text style={styles.actionTitle}>My Requests</Text>
                <Text style={styles.actionSubtitle}>Track your bookings</Text>
                <View style={styles.actionArrow}>
                  <Ionicons name="arrow-forward" size={16} color="#2D3E50" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/profile')}
                activeOpacity={0.8}
              >
                <View style={styles.actionIconContainer}>
                  <Ionicons name="person" size={32} color="#FFD11E" />
                </View>
                <Text style={styles.actionTitle}>Profile</Text>
                <Text style={styles.actionSubtitle}>Manage your account</Text>
                <View style={styles.actionArrow}>
                  <Ionicons name="arrow-forward" size={16} color="#2D3E50" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Modern Contact Section */}
          <View style={styles.contactSection}>
            <View style={styles.contactCard}>
              <View style={styles.contactIcon}>
                <Ionicons name="call" size={28} color="#FFD11E" />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>Need Help?</Text>
                <Text style={styles.contactDescription}>
                  Contact our support team for assistance
                </Text>
              </View>
              <TouchableOpacity style={styles.contactButton}>
                <Text style={styles.contactButtonText}>Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        
        {/* Enhanced Logout Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showLogoutModal}
          onRequestClose={cancelLogout}
        >
          <Pressable style={styles.modalOverlay} onPress={cancelLogout}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="log-out-outline" size={32} color={Colors.light.primary} />
                </View>
                <Text style={styles.modalTitle}>Logout</Text>
              </View>
              
              <Text style={styles.modalMessage}>
                Are you sure you want to logout from Cycle-Bees?
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={cancelLogout}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalLogoutButton]}
                  onPress={confirmLogout}
                >
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: {
    flex: 1,
  },
  headerNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFD11E',
    height: 90,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 8,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF5CC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    resizeMode: 'cover',
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 4,
  },
  greetingText: {
    fontSize: 15,
    color: '#2D3E50',
    opacity: 0.8,
    fontWeight: '500',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 20,
    color: '#2D3E50',
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  logoutButtonNew: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFF5CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promotionalSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.secondary,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.light.gray,
    marginTop: 4,
  },
  sectionBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.light.background,
  },
  carouselContainer: {
    position: 'relative',
  },
  promotionalCard: {
    width: width - 40,
    height: 180,
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    marginRight: 15,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      default: {
        shadowColor: Colors.light.shadow,
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 1,
        shadowRadius: 32,
        elevation: 8,
      },
    }),
  },
  cardImageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.secondary,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.light.gray,
    lineHeight: 20,
    marginBottom: 10,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '600',
    marginRight: 4,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionCard: {
    width: (width - 50) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 0.12,
        shadowRadius: 32,
        elevation: 8,
      },
    }),
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: '#FFF5CC',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFD11E',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 4,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6C757D',
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  actionArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  contactSection: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 24,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 0.12,
        shadowRadius: 32,
        elevation: 8,
      },
    }),
  },
  contactIcon: {
    width: 56,
    height: 56,
    backgroundColor: '#FFF5CC',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFD11E',
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  contactDescription: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },
  contactButton: {
    backgroundColor: '#FFD11E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFD11E',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    shadowColor: Colors.light.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
    minWidth: 320,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: Colors.light.accent1,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.secondary,
  },
  modalMessage: {
    fontSize: 16,
    color: Colors.light.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.light.accent2,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cancelButtonText: {
    color: Colors.light.gray,
    fontSize: 16,
    fontWeight: '600',
  },
  modalLogoutButton: {
    backgroundColor: Colors.light.error,
  },
  logoutButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.accent2,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: Colors.light.primary,
  },
  cardImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.cardBackground,
  },
}); 
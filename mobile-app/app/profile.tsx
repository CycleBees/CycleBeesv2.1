import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import AuthGuard from '@/components/AuthGuard';


interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  age: number;
  pincode: string;
  address: string;
  profilePhoto: string;
  created_at?: string;
  last_login?: string;
}

export default function ProfileScreen() {
  const router = useRouter();

  const handleBackPress = () => {
    // Check if we can go back, if not navigate to home
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  };
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [editData, setEditData] = useState({
    full_name: '',
    email: '',
    age: '',
    pincode: '',
    address: ''
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('No token found');
        return;
      }

      const response = await fetch('http://localhost:3000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Profile data received:', data); // Debug log
        
        if (data.success && data.data && data.data.user) {
          const userData = data.data.user;
          console.log('User data extracted:', userData); // Debug log
          setUser(userData);
          setEditData({
            full_name: userData.fullName || '',
            email: userData.email || '',
            age: userData.age ? userData.age.toString() : '',
            pincode: userData.pincode || '',
            address: userData.address || ''
          });
        } else {
          console.error('Invalid profile data format:', data);
        }
      } else {
        console.error('Failed to fetch profile:', response.status);
        const errorData = await response.json();
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserProfile();
    setRefreshing(false);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadProfilePhoto = async (imageUri: string) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      
      formData.append('profile_photo', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile_photo.jpg',
      } as any);

      const response = await fetch('http://localhost:3000/api/auth/profile/photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Success', 'Profile photo updated successfully!');
        fetchUserProfile(); // Refresh profile data
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to update profile photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    // Validate data
    if (!editData.full_name || !editData.email || !editData.age || !editData.pincode || !editData.address) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: editData.full_name,
          email: editData.email,
          age: parseInt(editData.age),
          pincode: editData.pincode,
          address: editData.address
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Alert.alert('Success', 'Profile updated successfully!');
          setEditing(false);
          fetchUserProfile(); // Refresh profile data
        } else {
          Alert.alert('Error', data.message || 'Failed to update profile');
        }
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      console.log('Logging out from profile...');
      
      // Clear all storage
      await AsyncStorage.clear();
      console.log('All storage cleared');
      
      // Platform-specific navigation
      if (Platform.OS === 'web') {
        // Force page reload for web
        window.location.href = '/login';
        console.log('Web: Reloaded to login page');
      } else {
        // Use router for native
        setTimeout(() => {
          router.push('/login');
          console.log('Native: Navigated to login');
        }, 100);
      }
      
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  if (loading && !user) {
    return (
      <AuthGuard message="Loading your profile...">
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD11E" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </AuthGuard>
    );
  }

  if (!user) {
    return (
      <AuthGuard message="Loading your profile...">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={24} color="#2D3E50" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>My Profile</Text>
              <Text style={styles.headerSubtitle}>Manage your account</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.errorContainer}>
            <Ionicons name="person-outline" size={60} color="#4A4A4A" />
            <Text style={styles.errorTitle}>Failed to load profile</Text>
            <Text style={styles.errorSubtitle}>Please check your connection and try again</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
              <Ionicons name="refresh-outline" size={20} color="#2D3E50" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard message="Loading your profile...">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#2D3E50" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>My Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your account</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#2D3E50" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Profile Photo Section */}
          <View style={styles.profileCard}>
            <View style={styles.profileImageContainer}>
                          {user.profilePhoto ? (
              <Image
                source={{ uri: `http://localhost:3000/${user.profilePhoto}` }}
                style={styles.profileImage}
              />
            ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={50} color="#4A4A4A" />
                </View>
              )}
              <TouchableOpacity style={styles.editImageButton} onPress={pickImage}>
                <Ionicons name="camera" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{user.fullName || 'User'}</Text>
            <Text style={styles.userEmail}>{user.email || 'No email'}</Text>
            <Text style={styles.userPhone}>{user.phone || 'No phone'}</Text>
          </View>

          {/* Edit Profile Button */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(!editing)}
            >
              <Ionicons 
                name={editing ? "close-outline" : "create-outline"} 
                size={20} 
                color="#2D3E50" 
              />
              <Text style={styles.editButtonText}>
                {editing ? 'Cancel Edit' : 'Edit Profile'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Personal Information Card */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-outline" size={18} color="#FFD11E" />
              <Text style={styles.cardTitle}>Personal Information</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Full Name</Text>
                {editing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editData.full_name}
                    onChangeText={(text) => setEditData({...editData, full_name: text})}
                    placeholder="Enter full name"
                    placeholderTextColor="#6c757d"
                  />
                ) : (
                  <Text style={styles.infoValue}>{user.fullName || 'Not provided'}</Text>
                )}
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email Address</Text>
                {editing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editData.email}
                    onChangeText={(text) => setEditData({...editData, email: text})}
                    placeholder="Enter email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#6c757d"
                  />
                ) : (
                  <Text style={styles.infoValue}>{user.email || 'Not provided'}</Text>
                )}
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                <Text style={styles.infoValue}>{user.phone || 'Not provided'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Age</Text>
                {editing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editData.age}
                    onChangeText={(text) => setEditData({...editData, age: text})}
                    placeholder="Enter age"
                    keyboardType="number-pad"
                    placeholderTextColor="#6c757d"
                  />
                ) : (
                  <Text style={styles.infoValue}>{user.age ? `${user.age} years` : 'Not provided'}</Text>
                )}
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pincode</Text>
                {editing ? (
                  <TextInput
                    style={styles.editInput}
                    value={editData.pincode}
                    onChangeText={(text) => setEditData({...editData, pincode: text})}
                    placeholder="Enter pincode"
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholderTextColor="#6c757d"
                  />
                ) : (
                  <Text style={styles.infoValue}>{user.pincode || 'Not provided'}</Text>
                )}
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                {editing ? (
                  <TextInput
                    style={[styles.editInput, styles.textArea]}
                    value={editData.address}
                    onChangeText={(text) => setEditData({...editData, address: text})}
                    placeholder="Enter address"
                    multiline
                    numberOfLines={3}
                    placeholderTextColor="#6c757d"
                  />
                ) : (
                  <Text style={styles.infoValue}>{user.address || 'Not provided'}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Account Information Card */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle-outline" size={18} color="#FFD11E" />
              <Text style={styles.cardTitle}>Account Information</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Login</Text>
                <Text style={styles.infoValue}>
                  {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                </Text>
              </View>
            </View>
          </View>

          {/* Save Button */}
          {editing && (
            <View style={styles.saveContainer}>
              <TouchableOpacity
                style={[styles.saveButton, loading && styles.disabledButton]}
                onPress={handleSaveProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
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
                  <Ionicons name="log-out-outline" size={32} color="#FFD11E" />
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFD11E',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#2D3E50',
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
    padding: 12,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF5CC',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dee2e6',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFD11E',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: '#4A4A4A',
    marginBottom: 4,
    textAlign: 'center',
  },
  userPhone: {
    fontSize: 16,
    color: '#4A4A4A',
    textAlign: 'center',
  },
  actionsContainer: {
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3E50',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginLeft: 10,
  },
  cardContent: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3E50',
    flex: 1,
  },
  infoValue: {
    fontSize: 15,
    color: '#4A4A4A',
    flex: 2,
    textAlign: 'right',
  },
  editInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#2D3E50',
    flex: 2,
    textAlign: 'right',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    textAlign: 'left',
  },
  saveContainer: {
    paddingHorizontal: 12,
    paddingBottom: 30,
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(40, 167, 69, 0.3)',
      },
      default: {
        shadowColor: '#28a745',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4A4A4A',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#4A4A4A',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#FFD11E',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  retryButtonText: {
    color: '#2D3E50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
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
    backgroundColor: '#FFF5CC',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  modalMessage: {
    fontSize: 16,
    color: '#4A4A4A',
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
    backgroundColor: '#FFF5CC',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#4A4A4A',
    fontSize: 16,
    fontWeight: '600',
  },
  modalLogoutButton: {
    backgroundColor: '#dc3545',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 
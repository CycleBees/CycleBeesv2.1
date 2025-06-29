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
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  pincode: string;
  address: string;
  profile_photo: string;
  created_at: string;
  last_login: string;
}

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
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
        setEditData({
          full_name: userData.full_name,
          email: userData.email,
          age: userData.age.toString(),
          pincode: userData.pincode,
          address: userData.address
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadProfilePhoto(result.assets[0].uri);
    }
  };

  const uploadProfilePhoto = async (imageUri: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
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
        Alert.alert('Error', 'Failed to update profile photo');
      }
    } catch (error) {
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
      const token = localStorage.getItem('userToken');
      const response = await fetch('http://localhost:3000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: editData.full_name,
          email: editData.email,
          age: parseInt(editData.age),
          pincode: editData.pincode,
          address: editData.address
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Profile updated successfully!');
        setEditing(false);
        fetchUserProfile(); // Refresh profile data
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
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
            navigation.navigate('Login');
          }
        }
      ]
    );
  };

  if (loading && !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD11E" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={60} color="#4A4A4A" />
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2D3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#2D3E50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            {user.profile_photo ? (
              <Image
                source={{ uri: `http://localhost:3000/${user.profile_photo}` }}
                style={styles.profilePhoto}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={60} color="#4A4A4A" />
              </View>
            )}
            <TouchableOpacity style={styles.editPhotoButton} onPress={pickImage}>
              <Ionicons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user.full_name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        {/* Profile Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setEditing(!editing)}
          >
            <Ionicons name="create-outline" size={20} color="#2D3E50" />
            <Text style={styles.actionButtonText}>
              {editing ? 'Cancel Edit' : 'Edit Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              {editing ? (
                <TextInput
                  style={styles.editInput}
                  value={editData.full_name}
                  onChangeText={(text) => setEditData({...editData, full_name: text})}
                  placeholder="Enter full name"
                />
              ) : (
                <Text style={styles.infoValue}>{user.full_name}</Text>
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              {editing ? (
                <TextInput
                  style={styles.editInput}
                  value={editData.email}
                  onChangeText={(text) => setEditData({...editData, email: text})}
                  placeholder="Enter email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.infoValue}>{user.email}</Text>
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user.phone}</Text>
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
                />
              ) : (
                <Text style={styles.infoValue}>{user.age} years</Text>
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
                />
              ) : (
                <Text style={styles.infoValue}>{user.pincode}</Text>
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              {editing ? (
                <TextInput
                  style={[styles.editInput, styles.addressInput]}
                  value={editData.address}
                  onChangeText={(text) => setEditData({...editData, address: text})}
                  placeholder="Enter address"
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text style={styles.infoValue}>{user.address}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {new Date(user.created_at).toLocaleDateString()}
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
          <View style={styles.saveSection}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.disabledButton]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4A4A4A',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#4A4A4A',
    marginTop: 20,
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#FFD11E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#2D3E50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFD11E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3E50',
  },
  scrollView: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFD11E',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#4A4A4A',
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 10,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3E50',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3E50',
    marginBottom: 15,
  },
  infoCard: {
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#2D3E50',
    flex: 2,
    textAlign: 'right',
  },
  editInput: {
    flex: 2,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    color: '#2D3E50',
  },
  addressInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  saveSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  saveButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
}); 
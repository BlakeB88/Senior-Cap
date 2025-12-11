import { FontAwesome6, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from "expo-image-picker";
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { TouchableRipple } from "react-native-paper";
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from "../../constants/theme";


export default function SettingsScreen() {

  const [avatar, setAvatar] = useState<string>(
      "https://api.adorable.io/avatars/80/abott@adorable.png"
  );

  const pickImage = async () => {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatar(result.assets[0].uri);
      }
  };

  const router = useRouter();

  return (
    <SafeAreaView style={styles.settingsContainer}>
      

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} style={styles.SettingsBackButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
          <Text style={styles.SettingsBackButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.SettingsTitle}>Settings</Text>

      <View style={{marginTop: 10}}>
        <TouchableRipple onPress={pickImage}>
          <View style={styles.menuItem}>
            <MaterialCommunityIcons name="camera" color="#3662AA" size={25} />
            <Text style={styles.menuItemText}>Change Profile Picture</Text>
          </View>
        </TouchableRipple>
        <TouchableRipple onPress={() => router.push('../ProfileViews/editProfile')}>
          <View style={styles.menuItem}>
            <FontAwesome6 name="person" color="#3662AA" size={25} />
            <Text style={styles.menuItemText}>Edit Profile</Text>
          </View>
        </TouchableRipple>
        <TouchableRipple onPress={() => router.push('/ProfileViews/change-password')}>
          <View style={styles.menuItem}>
            <MaterialCommunityIcons name="lock" color="#3662AA" size={25} />
            <Text style={styles.menuItemText}>Change Password</Text>
          </View>
        </TouchableRipple>
      </View>
    </SafeAreaView>
  );
}

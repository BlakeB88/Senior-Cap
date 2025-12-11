import { Feather, FontAwesome6, MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    ImageBackground,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const EditProfileScreen = () => {
  const [image, setImage] = useState('https://api.adorable.io/avatars/80/abott@adorable.png');
  const { colors } = useTheme();
  const bs = useRef<BottomSheet>(null);

  // Shared value for fade-in
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    margin: 20,
    opacity: opacity.value,
  }));

  const takePhotoFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Camera permission is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri);
      bs.current?.close();
    }
  };

  const choosePhotoFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Media library permission is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri);
      bs.current?.close();
    }
  };

  const renderInner = () => (
    <View style={styles.panel}>
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.panelTitle}>Upload Photo</Text>
        <Text style={styles.panelSubtitle}>Choose Your Profile Picture</Text>
      </View>
      <TouchableOpacity style={styles.panelButton} onPress={takePhotoFromCamera}>
        <Text style={styles.panelButtonTitle}>Take Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.panelButton} onPress={choosePhotoFromLibrary}>
        <Text style={styles.panelButtonTitle}>Choose From Library</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.panelButton} onPress={() => bs.current?.close()}>
        <Text style={styles.panelButtonTitle}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <BottomSheet
        ref={bs}
        snapPoints={['50%']}
        index={-1}
        enablePanDownToClose={true}
      >
        {renderInner()}
      </BottomSheet>

      <Animated.View style={animatedStyle}>
        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity onPress={() => bs.current?.expand()}>
            <View
              style={{
                height: 100,
                width: 100,
                borderRadius: 15,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ImageBackground
                source={{ uri: image }}
                style={{ height: 100, width: 100 }}
                imageStyle={{ borderRadius: 15 }}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Icon
                    name="camera"
                    size={35}
                    color="#fff"
                    style={{
                      opacity: 0.7,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: '#fff',
                      borderRadius: 10,
                    }}
                  />
                </View>
              </ImageBackground>
            </View>
          </TouchableOpacity>
          <Text style={{ marginTop: 10, fontSize: 18, fontWeight: 'bold' }}>
            John Doe
          </Text>
        </View>

        <View style={styles.action}>
          <Feather name="user" color={colors.onSurface} size={20} />
          <TextInput
            placeholder="First Name"
            placeholderTextColor="#666"
            style={[styles.textInput, { color: colors.onSurface }]}
          />
        </View>

        <View style={styles.action}>
          <FontAwesome6 name="user" color={colors.onSurface} size={20} />
          <TextInput
            placeholder="Last Name"
            placeholderTextColor="#666"
            style={[styles.textInput, { color: colors.onSurface }]}
          />
        </View>

        <View style={styles.action}>
          <Feather name="phone" color={colors.onSurface} size={20} />
          <TextInput
            placeholder="Phone"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            style={[styles.textInput, { color: colors.onSurface }]}
          />
        </View>

        <View style={styles.action}>
          <Feather name="mail" color={colors.onSurface} size={20} />
          <TextInput
            placeholder="Email"
            placeholderTextColor="#666"
            keyboardType="email-address"
            style={[styles.textInput, { color: colors.onSurface }]}
          />
        </View>

        <View style={styles.action}>
          <Icon name="map-marker-outline" color={colors.onSurface} size={20} />
          <TextInput
            placeholder="City"
            placeholderTextColor="#666"
            style={[styles.textInput, { color: colors.onSurface }]}
          />
        </View>

        <TouchableOpacity style={styles.commandButton} onPress={() => {}}>
          <Text style={styles.panelButtonTitle}>Submit</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  commandButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#FF6347',
    alignItems: 'center',
    marginTop: 10,
  },
  panel: {
    padding: 20,
    backgroundColor: '#fff',
    paddingTop: 20,
    flex: 1,
  },
  panelTitle: { fontSize: 27, height: 35 },
  panelSubtitle: { fontSize: 14, color: 'gray', height: 30, marginBottom: 10 },
  panelButton: {
    padding: 13,
    borderRadius: 10,
    backgroundColor: '#FF6347',
    alignItems: 'center',
    marginVertical: 7,
  },
  panelButtonTitle: { fontSize: 17, fontWeight: 'bold', color: 'white' },
  action: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    paddingBottom: 5,
  },
  textInput: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 0 : -12,
    paddingLeft: 10,
  },
});
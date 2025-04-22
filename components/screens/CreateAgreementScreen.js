import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Image, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Picker } from '@react-native-picker/picker';

export default function CreateAgreementScreen({ navigation, route }) {
  const { userId } = route.params;
  const [agreementType, setAgreementType] = useState('');
  const [recording, setRecording] = useState(null);
  const [audioURI, setAudioURI] = useState(null);
  const [face1URI, setFace1URI] = useState(null);
  const [face2URI, setFace2URI] = useState(null);
  const [loading, setLoading] = useState(false);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Microphone access is needed.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not start recording.');
    }
  };

  const stopRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioURI(uri);
      setRecording(null);
      Alert.alert('Voice Recorded', `Saved at: ${uri}`);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not stop recording.');
    }
  };

  const captureFace = async (setter) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission denied', 'Camera permission is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      cameraType: ImagePicker.CameraType.front,
      quality: 0.5,
    });

    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const uploadData = async () => {
    if (!agreementType || !audioURI || !face1URI || !face2URI) {
      Alert.alert('Missing Info', 'Please complete all steps before submitting.');
      return;
    }

    try {
      setLoading(true);

      const agreementData = {
        userId: parseInt(userId),
        type: agreementType,
        status: 'in_progress',
        createdAt: new Date().toISOString(),
      };

      const response = await fetch('http://192.168.43.30:8000/api/agreements/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agreementData),
      });

      if (!response.ok) {
        setLoading(false);
        Alert.alert('Error', 'Failed to create agreement.');
        return;
      }

      const agreement = await response.json();
      const agreementId = agreement.id;

      const audioData = new FormData();
      audioData.append('agreementId', agreementId);
      audioData.append('files', {
        uri: audioURI,
        type: 'audio/x-wav',
        name: 'recording.wav',
      });

      await fetch('http://192.168.43.30:8000/api/audiorecords/save', {
        method: 'POST',
        body: audioData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const faceData = new FormData();
      faceData.append('agreementId', agreementId);
      faceData.append('file1', {
        uri: face1URI,
        type: 'image/jpeg',
        name: 'face1.jpg',
      });
      faceData.append('file2', {
        uri: face2URI,
        type: 'image/jpeg',
        name: 'face2.jpg',
      });

      await fetch('http://192.168.43.30:8000/api/faceidentities/save', {
        method: 'POST',
        body: faceData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setLoading(false);
      Alert.alert('Success', 'All data uploaded successfully!');
      navigation.navigate('Home');
    } catch (err) {
      setLoading(false);
      console.error(err);
      Alert.alert('Upload Failed', 'Something went wrong.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>Create Agreement</Text>

      <Text style={styles.label}>Select Agreement Type:</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={agreementType}
          onValueChange={(itemValue) => setAgreementType(itemValue)}
        >
          <Picker.Item label="Select Agreement Type" value="" />
          <Picker.Item label="Rental Agreement" value="rental" />
          <Picker.Item label="Loan Agreement" value="loan" />
          <Picker.Item label="Exchange of Goods" value="exchange" />
          <Picker.Item label="Business Agreement" value="business" />
          <Picker.Item label="Custom Agreement" value="custom" />
        </Picker>
      </View>

      <TouchableOpacity style={styles.optionButton} onPress={recording ? stopRecording : startRecording}>
        <Ionicons name="mic-outline" size={20} color="#000" />
        <Text style={styles.optionText}>{recording ? 'Stop Recording' : 'Record Voice'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionButton} onPress={() => captureFace(setFace1URI)}>
        <Ionicons name="person-circle-outline" size={20} color="#000" />
        <Text style={styles.optionText}>Capture Face (Party 1)</Text>
      </TouchableOpacity>
      {face1URI && <Image source={{ uri: face1URI }} style={styles.facePreview} />}

      <TouchableOpacity style={styles.optionButton} onPress={() => captureFace(setFace2URI)}>
        <Ionicons name="person-circle-outline" size={20} color="#000" />
        <Text style={styles.optionText}>Capture Face (Party 2)</Text>
      </TouchableOpacity>
      {face2URI && <Image source={{ uri: face2URI }} style={styles.facePreview} />}

      <TouchableOpacity
        style={styles.submitButton}
        onPress={uploadData}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Next</Text>
        )}
      </TouchableOpacity>

      {/* Bottom Navigation */}
      <View style={styles.nav}>
        <Ionicons name="home" size={24} color="#2563eb" />
        <Ionicons name="newspaper-outline" size={24} color="#777" />
        <Ionicons name="document-text-outline" size={24} color="#777" />
        <Ionicons name="person-outline" size={24} color="#777" />
        <Ionicons name="settings-outline" size={24} color="#777" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafa', padding: 20 },
  backButton: { position: 'absolute', top: 40, left: 20, zIndex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 60, marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#edf2f7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  optionText: { marginLeft: 10, fontSize: 16 },
  submitButton: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  submitText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  facePreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    alignSelf: 'center',
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#fff',
  },
});

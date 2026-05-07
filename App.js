import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, Button, TextInput, Alert, ScrollView, Image, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import io from 'socket.io-client';

const Stack = createStackNavigator();
// Cambia esta IP por la de tu computadora en la red local
const API_URL = 'http://192.168.1.100:3000/api'; 
const socket = io('http://192.168.1.100:3000');

// ==================== PANTALLA LOGIN ====================
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('demo@siac-tr.com');
  const [password, setPassword] = useState('123456');

  const login = async () => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      if (res.data.success) {
        global.token = res.data.token;
        global.usuario = res.data.usuario;
        navigation.replace('Home');
      }
    } catch (e) {
      Alert.alert('Error', 'Credenciales inválidas o servidor no disponible');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SIAC-TR</Text>
      <Text style={styles.subtitle}>Alertas Comunitarias Autopista Sur</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />
      <Button title="INGRESAR" onPress={login} color="#d32f2f" />
      <Text style={{marginTop: 20, color: '#666'}}>TRL 5 - Prototipo Funcional UNAD 2026</Text>
    </View>
  );
}

// ==================== PANTALLA HOME ====================
function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Bienvenido, {global.usuario?.nombre || 'Vecino'}</Text>
      <View style={styles.menuGrid}>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Reportar')}>
          <Text style={styles.cardTitle}>🚨 Reportar Incidente</Text>
          <Text style={styles.cardDesc}>Alerta vecinal con GPS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Mapa')}>
          <Text style={styles.cardTitle}>🗺️ Mapa de Incidentes</Text>
          <Text style={styles.cardDesc}>Visualiza zonas de riesgo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Chat')}>
          <Text style={styles.cardTitle}>💬 Chat Vecinal</Text>
          <Text style={styles.cardDesc}>Comunicación en tiempo real</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Estadisticas')}>
          <Text style={styles.cardTitle}>📊 Estadísticas</Text>
          <Text style={styles.cardDesc}>Análisis de patrones</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ==================== PANTALLA REPORTAR ====================
function ReportarScreen() {
  const [tipo, setTipo] = useState('hurto_persona');
  const [descripcion, setDescripcion] = useState('');
  const [location, setLocation] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
    })();
  }, []);

  const enviarReporte = async () => {
    if (!location) { Alert.alert('Error', 'Obteniendo ubicación GPS...'); return; }
    try {
      await axios.post(`${API_URL}/incidentes`, {
        tipo, descripcion,
        latitud: location.latitude,
        longitud: location.longitude,
        direccion_texto: 'Ubicación GPS automática'
      }, { headers: { Authorization: `Bearer ${global.token}` } });
      Alert.alert('Éxito', 'Incidente reportado. Los vecinos cercanos han sido notificados.');
      setDescripcion('');
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar el reporte');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reportar Incidente</Text>
      <Text style={styles.label}>Tipo:</Text>
      <TextInput style={styles.input} value={tipo} onChangeText={setTipo} />
      <Text style={styles.label}>Descripción:</Text>
      <TextInput style={[styles.input, {height: 80}]} multiline value={descripcion} onChangeText={setDescripcion} />
      <Text style={styles.label}>📍 Ubicación GPS:</Text>
      <Text style={styles.info}>
        {location ? `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}` : 'Obteniendo...'}
      </Text>
      <Button title="ENVIAR ALERTA VECINAL" onPress={enviarReporte} color="#d32f2f" />
    </View>
  );
}

// ==================== PANTALLA MAPA ====================
function MapaScreen() {
  const [incidentes, setIncidentes] = useState([]);
  const [region, setRegion] = useState({
    latitude: 4.6123, longitude: -74.1234, // Autopista Sur aprox
    latitudeDelta: 0.01, longitudeDelta: 0.01
  });

  useEffect(() => {
    cargarIncidentes();
    socket.on('nuevo_incidente', () => cargarIncidentes());
  }, []);

  const cargarIncidentes = async () => {
    try {
      const res = await axios.get(`${API_URL}/incidentes`);
      setIncidentes(res.data.incidentes);
    } catch (e) { console.log(e); }
  };

  return (
    <View style={{flex: 1}}>
      <MapView style={{flex: 1}} region={region} onRegionChangeComplete={setRegion}>
        {incidentes.map(inc => (
          <Marker key={inc.id} coordinate={{ latitude: parseFloat(inc.latitud), longitude: parseFloat(inc.longitud) }}>
            <View style={styles.marker}>
              <Text style={styles.markerText}>⚠️</Text>
            </View>
          </Marker>
        ))}
        <Circle center={{latitude: 4.6123, longitude: -74.1234}} radius={500} strokeColor="rgba(255,0,0,0.3)" fillColor="rgba(255,0,0,0.1)" />
      </MapView>
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>Incidentes activos: {incidentes.length}</Text>
      </View>
    </View>
  );
}

// ==================== PANTALLA CHAT ====================
function ChatScreen() {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');

  useEffect(() => {
    cargarMensajes();
    socket.on('nuevo_mensaje', (msg) => setMensajes(prev => [...prev, msg]));
  }, []);

  const cargarMensajes = async () => {
    try {
      const res = await axios.get(`${API_URL}/chat`);
      setMensajes(res.data.mensajes);
    } catch (e) { console.log(e); }
  };

  const enviar = async () => {
    if (!texto) return;
    try {
      await axios.post(`${API_URL}/chat`, { mensaje: texto, zona: 'general' },
        { headers: { Authorization: `Bearer ${global.token}` } });
      setTexto('');
    } catch (e) { Alert.alert('Error', 'No se pudo enviar'); }
  };

  return (
    <View style={{flex: 1, padding: 10}}>
      <ScrollView style={{flex: 1}}>
        {mensajes.map((m, i) => (
          <View key={i} style={styles.msgBubble}>
            <Text style={styles.msgUser}>{m.usuario_nombre}:</Text>
            <Text>{m.mensaje}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={{flexDirection: 'row'}}>
        <TextInput style={[styles.input, {flex: 1}]} value={texto} onChangeText={setTexto} placeholder="Escribe un mensaje..." />
        <Button title="Enviar" onPress={enviar} />
      </View>
    </View>
  );
}

// ==================== PANTALLA ESTADÍSTICAS ====================
function EstadisticasScreen() {
  const [stats, setStats] = useState({ por_tipo: [], por_fecha: [] });

  useEffect(() => {
    axios.get(`${API_URL}/estadisticas`).then(r => setStats(r.data));
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Análisis de Patrones - Autopista Sur</Text>
      <Text style={styles.label}>Incidentes por tipo:</Text>
      {stats.por_tipo.map((item, i) => (
        <View key={i} style={styles.statRow}>
          <Text>{item.tipo}</Text>
          <Text style={styles.statNum}>{item.total}</Text>
        </View>
      ))}
      <Text style={styles.label}>Últimos 7 días:</Text>
      {stats.por_fecha.map((item, i) => (
        <View key={i} style={styles.statRow}>
          <Text>{item.fecha}</Text>
          <Text style={styles.statNum}>{item.total}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ==================== NAVEGACIÓN PRINCIPAL ====================
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{headerShown: false}} />
        <Stack.Screen name="Home" component={HomeScreen} options={{title: 'SIAC-TR Inicio'}} />
        <Stack.Screen name="Reportar" component={ReportarScreen} options={{title: 'Nueva Alerta'}} />
        <Stack.Screen name="Mapa" component={MapaScreen} options={{title: 'Mapa de Calor'}} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{title: 'Chat Vecinal'}} />
        <Stack.Screen name="Estadisticas" component={EstadisticasScreen} options={{title: 'Estadísticas'}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ==================== ESTILOS ====================
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#d32f2f' },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15, backgroundColor: '#fafafa' },
  label: { fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  info: { color: '#2e7d32', marginBottom: 20 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#d32f2f' },
  cardTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 5 },
  cardDesc: { fontSize: 12, color: '#666' },
  marker: { backgroundColor: '#d32f2f', padding: 5, borderRadius: 20 },
  markerText: { color: '#fff', fontSize: 16 },
  overlay: { position: 'absolute', top: 40, left: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 8 },
  overlayText: { color: '#fff', fontWeight: 'bold' },
  msgBubble: { backgroundColor: '#e3f2fd', padding: 10, borderRadius: 8, marginBottom: 8 },
  msgUser: { fontWeight: 'bold', color: '#1565c0' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#fafafa', marginBottom: 6, borderRadius: 6 },
  statNum: { fontWeight: 'bold', color: '#d32f2f' }
});

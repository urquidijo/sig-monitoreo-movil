import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { io, Socket } from 'socket.io-client';
import { apiFetch } from '../lib/auth';
import { API_URL } from '../lib/config';
import { AppHeader } from '../components/ui';
import { colors } from '../lib/theme';

type Zona = {
  id: number;
  activo: boolean;
  geojson: { type: 'Polygon'; coordinates: number[][][] } | null;
};

type PosicionUpdate = {
  ninoId: number;
  latitud: number;
  longitud: number;
  dentroArea: boolean;
};

type PuntoTrayectoria = {
  latitud: number;
  longitud: number;
  dentroArea: boolean;
};

type Props = {
  token: string;
  ninoId: number;
  nombreNino: string;
  onVolver: () => void;
};

// Genera la página Leaflet embebida con los datos iniciales ya incrustados.
function construirHtml(
  zonasRings: number[][][],
  trail: number[][],
  pos: { lat: number; lng: number; dentro: boolean } | null,
) {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;padding:0;background:#e5e7eb;}</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var ZONAS = ${JSON.stringify(zonasRings)};
  var TRAIL = ${JSON.stringify(trail)};
  var POS = ${JSON.stringify(pos)};

  var centro = POS ? [POS.lat, POS.lng] : [-17.791771, -63.182385];
  var map = L.map('map').setView(centro, 17);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  ZONAS.forEach(function (ring) {
    L.polygon(ring, { color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.2, weight: 2 }).addTo(map);
  });

  var trail = TRAIL.slice();
  var poly = L.polyline(trail, { color: '#0891b2', weight: 3 }).addTo(map);

  function colorFor(dentro) { return dentro === false ? '#ef4444' : '#a855f7'; }

  var marker = null;
  if (POS) {
    marker = L.circleMarker([POS.lat, POS.lng], {
      radius: 10, color: '#ffffff', weight: 3, fillColor: colorFor(POS.dentro), fillOpacity: 1,
    }).addTo(map);
  }

  window.__setPos = function (lat, lng, dentro) {
    var ll = [lat, lng];
    if (!marker) {
      marker = L.circleMarker(ll, { radius: 10, color: '#ffffff', weight: 3, fillColor: colorFor(dentro), fillOpacity: 1 }).addTo(map);
    } else {
      marker.setLatLng(ll);
      marker.setStyle({ fillColor: colorFor(dentro) });
    }
    trail.push(ll);
    if (trail.length > 200) trail = trail.slice(-200);
    poly.setLatLngs(trail);
    map.panTo(ll);
  };
</script>
</body>
</html>`;
}

export default function MapaNinoScreen({
  token,
  ninoId,
  nombreNino,
  onVolver,
}: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [dentroArea, setDentroArea] = useState<boolean | null>(null);
  const [tienePosicion, setTienePosicion] = useState(false);
  const webRef = useRef<WebView>(null);

  // Carga inicial: zonas + recorrido histórico → arma el HTML una sola vez
  useEffect(() => {
    let activo = true;

    (async () => {
      let zonasRings: number[][][] = [];
      let trail: number[][] = [];
      let pos: { lat: number; lng: number; dentro: boolean } | null = null;

      try {
        const [zonasData, tray] = await Promise.all([
          apiFetch('/zonas', token) as Promise<Zona[]>,
          apiFetch(
            `/monitoreo/nino/${ninoId}/trayectoria`,
            token,
          ) as Promise<PuntoTrayectoria[]>,
        ]);

        zonasRings = zonasData
          .filter((z) => z.activo && z.geojson)
          .map((z) => z.geojson!.coordinates[0].map(([lng, lat]) => [lat, lng]));

        trail = tray.map((p) => [p.latitud, p.longitud]);

        if (tray.length > 0) {
          const ult = tray[tray.length - 1];
          pos = { lat: ult.latitud, lng: ult.longitud, dentro: ult.dentroArea };
          if (activo) {
            setDentroArea(ult.dentroArea);
            setTienePosicion(true);
          }
        }
      } catch {
        // sin datos; igual se muestra el mapa vacío
      }

      if (activo) setHtml(construirHtml(zonasRings, trail, pos));
    })();

    return () => {
      activo = false;
    };
  }, [ninoId, token]);

  // En vivo: mueve el marcador inyectando JS en el WebView
  useEffect(() => {
    const socket = io(API_URL, {
      transports: ['websocket'],
      auth: { jwt: token },
    });

    socket.on('auth:ok', () => socket.emit('join-nino', { ninoId }));

    socket.on('posicion:update', (data: PosicionUpdate) => {
      if (data.ninoId !== ninoId) return;

      setDentroArea(data.dentroArea);
      setTienePosicion(true);
      webRef.current?.injectJavaScript(
        `window.__setPos && window.__setPos(${data.latitud}, ${data.longitud}, ${data.dentroArea}); true;`,
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [ninoId, token]);

  return (
    <View style={styles.container}>
      <AppHeader title={nombreNino} onBack={onVolver} />

      {dentroArea === false && (
        <View style={styles.alerta}>
          <Text style={styles.alertaTexto}>🚨 Fuera del área segura</Text>
        </View>
      )}

      {html === null ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.map}
        />
      )}

      {html !== null && !tienePosicion && (
        <View style={styles.sinDatos}>
          <Text style={styles.sinDatosTexto}>
            Aún no hay ubicaciones registradas para {nombreNino}.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  alerta: { backgroundColor: '#dc2626', paddingVertical: 10 },
  alertaTexto: { color: 'white', fontWeight: '800', textAlign: 'center' },
  map: { flex: 1 },
  loader: { flex: 1 },
  sinDatos: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: 12,
    padding: 14,
  },
  sinDatosTexto: { color: 'white', textAlign: 'center' },
});

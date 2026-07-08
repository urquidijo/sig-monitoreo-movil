import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { apiFetch } from '../lib/auth';
import { AppHeader } from '../components/ui';
import { colors } from '../lib/theme';

type Zona = {
  id: number;
  nombre: string;
  activo: boolean;
  geojson: { type: 'Polygon'; coordinates: number[][][] } | null;
};

type Props = {
  token: string;
  onVolver: () => void;
};

function construirHtml(zonas: { ring: number[][]; nombre: string }[]) {
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
  var ZONAS = ${JSON.stringify(zonas)};
  var map = L.map('map');
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  var capas = [];
  ZONAS.forEach(function (z) {
    var p = L.polygon(z.ring, { color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.25, weight: 2 }).addTo(map);
    p.bindPopup(z.nombre);
    capas.push(p);
  });

  if (capas.length > 0) {
    var grupo = L.featureGroup(capas);
    map.fitBounds(grupo.getBounds(), { padding: [30, 30], maxZoom: 17 });
  } else {
    map.setView([-17.791771, -63.182385], 13);
  }
</script>
</body>
</html>`;
}

export default function ZonasScreen({ token, onVolver }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(0);

  useEffect(() => {
    let activo = true;

    (async () => {
      let zonas: { ring: number[][]; nombre: string }[] = [];

      try {
        const data: Zona[] = await apiFetch('/zonas', token);
        zonas = data
          .filter((z) => z.activo && z.geojson)
          .map((z) => ({
            nombre: z.nombre,
            ring: z.geojson!.coordinates[0].map(([lng, lat]) => [lat, lng]),
          }));
      } catch {
        // sin zonas; se muestra el mapa vacío
      }

      if (activo) {
        setCantidad(zonas.length);
        setHtml(construirHtml(zonas));
      }
    })();

    return () => {
      activo = false;
    };
  }, [token]);

  return (
    <View style={styles.container}>
      <AppHeader title="Zonas seguras" onBack={onVolver} />

      {html === null ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={styles.map}
        />
      )}

      {html !== null && cantidad === 0 && (
        <View style={styles.sinDatos}>
          <Text style={styles.sinDatosTexto}>
            No hay zonas de monitoreo activas todavía.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
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

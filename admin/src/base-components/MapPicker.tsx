import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function ClickCatcher({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const map = useMap();
  useEffect(() => { if (lat != null && lng != null) map.setView([lat, lng]); }, [lat, lng]); // eslint-disable-line
  return null;
}

// Free OpenStreetMap tiles, no API key. Click to set the gym's coordinates.
export function MapPicker({ lat, lng, onChange }: { lat?: number | null; lng?: number | null; onChange: (lat: number, lng: number) => void }) {
  const hasPoint = lat != null && lng != null;
  const center: [number, number] = hasPoint ? [lat!, lng!] : [31.9539, 35.9106]; // Amman default
  return (
    <div className="rounded-xl overflow-hidden border border-line">
      <MapContainer center={center} zoom={hasPoint ? 14 : 11} style={{ height: 260, width: "100%" }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickCatcher onPick={onChange} />
        {hasPoint && <CircleMarker center={[lat!, lng!]} radius={9} pathOptions={{ color: "#00C896", fillColor: "#00C896", fillOpacity: 0.6 }} />}
        <Recenter lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}

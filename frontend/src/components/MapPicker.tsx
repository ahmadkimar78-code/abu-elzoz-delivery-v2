import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// مركز مدينة اللاذقية تقريبًا
const LATAKIA_CENTER: [number, number] = [35.5317, 35.7797];
// حدود تقريبية لمدينة اللاذقية عشان نمنع المستخدم يزوّغ برا المدينة على الخريطة
const LATAKIA_BOUNDS: [[number, number], [number, number]] = [
  [35.45, 35.68],
  [35.62, 35.88],
];

// أيقونة الدبوس الافتراضية في Leaflet بتيجي بمسارات صور مكسورة مع الـ bundlers —
// بنصلحها يدويًا بروابط CDN عشان الأيقونة تظهر صح
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onChange: (lat: number, lng: number) => void;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({ initialLat, initialLng, onChange }: MapPickerProps) {
  const [position, setPosition] = useState<[number, number]>([
    initialLat ?? LATAKIA_CENTER[0],
    initialLng ?? LATAKIA_CENTER[1],
  ]);

  function handlePick(lat: number, lng: number) {
    setPosition([lat, lng]);
    onChange(lat, lng);
  }

  return (
    <div className="rounded-lg overflow-hidden border">
      <MapContainer
        center={position}
        zoom={13}
        minZoom={11}
        maxBounds={LATAKIA_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: "300px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={markerIcon} />
        <ClickHandler onPick={handlePick} />
      </MapContainer>
      <p className="text-xs text-gray-400 p-2 bg-gray-50">اضغط على الخريطة لتحديد موقع التوصيل بدقة</p>
    </div>
  );
}

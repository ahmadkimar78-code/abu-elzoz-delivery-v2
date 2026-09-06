import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import MapPicker from "../components/MapPicker";

// إحداثيات وسط اللاذقية كقيمة افتراضية لحد ما المستخدم يحدد موقعه فعليًا على الخريطة
const DEFAULT_LAT = 35.5317;
const DEFAULT_LNG = 35.7797;

export default function AddAddress() {
  const navigate = useNavigate();
  const [label, setLabel] = useState("المنزل");
  const [street, setStreet] = useState("");
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      // بقت الإحداثيات مأخوذة فعليًا من نقطة المستخدم على خريطة اللاذقية، مش قيمة ثابتة
      await api.post("/addresses", {
        label,
        street,
        city: "اللاذقية",
        lat,
        lng,
        isDefault: true,
      });
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">إضافة عنوان توصيل — اللاذقية</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6">
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <input
          placeholder="اسم العنوان (مثلاً: المنزل)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full border rounded-lg p-3 mb-3"
        />
        <input
          placeholder="الشارع / أقرب علامة مميزة"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          className="w-full border rounded-lg p-3 mb-3"
          required
        />

        <div className="mb-4">
          <MapPicker initialLat={lat} initialLng={lng} onChange={(newLat, newLng) => {
            setLat(newLat);
            setLng(newLng);
          }} />
        </div>

        <button className="w-full bg-orange-500 text-white rounded-lg p-3 font-semibold">
          حفظ العنوان
        </button>
      </form>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { api } from "../api/client";
import { ORDER_STATUS_LABELS_AR, type OrderDTO } from "@abuelzoz/shared";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";
// كانت الحالات دي متكررة يدويًا هنا وبرضه في الـ backend enum — دلوقتي مصدر واحد في @abuelzoz/shared

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    api.get(`/orders/${id}`).then(setOrder);

    const socket: Socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("accessToken") },
    });

    socket.emit("order:subscribe", id);
    socket.on("order:statusUpdate", (payload) => {
      setOrder((prev) => (prev ? { ...prev, status: payload.status } : prev));
    });
    socket.on("order:driverLocation", (loc) => setDriverLocation(loc));

    return () => {
      socket.disconnect();
    };
  }, [id]);

  if (!order) return <p className="p-6 text-center">جاري التحميل...</p>;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">تتبع طلبك</h1>
      <div className="bg-white rounded-xl shadow p-6 text-center">
        <p className="text-lg font-semibold text-orange-600">
          {ORDER_STATUS_LABELS_AR[order.status] || order.status}
        </p>
        {driverLocation && (
          <p className="text-gray-400 text-sm mt-2">
            موقع السائق الحالي: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
          </p>
        )}
      </div>
      <p className="text-gray-500 mt-4">رقم الطلب: {order.id}</p>
      <p className="text-gray-500">الإجمالي: {order.total} ج.م</p>
    </div>
  );
}

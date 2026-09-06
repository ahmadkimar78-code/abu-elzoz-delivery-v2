import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { RestaurantWithMenuDTO, AddressDTO } from "@abuelzoz/shared";

export default function RestaurantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<RestaurantWithMenuDTO | null>(null);
  const [addresses, setAddresses] = useState<AddressDTO[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    api.get(`/restaurants/${id}`).then(setRestaurant);
    // كانت العناوين مفقودة تمامًا من قبل — كان فيه معرف عنوان وهمي هارد-كودد في الكود
    api.get("/addresses").then((data: AddressDTO[]) => {
      setAddresses(data);
      const defaultAddr = data.find((a) => a.isDefault) || data[0];
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
    });
  }, [id]);

  function updateQty(itemId: string, delta: number) {
    setCart((prev) => {
      const next = { ...prev, [itemId]: Math.max(0, (prev[itemId] || 0) + delta) };
      if (next[itemId] === 0) delete next[itemId];
      return next;
    });
  }

  const total = restaurant
    ? Object.entries(cart).reduce((sum, [itemId, qty]) => {
        const item = restaurant.menuItems.find((m) => m.id === itemId);
        return sum + (item ? Number(item.price) * qty : 0);
      }, 0)
    : 0;

  async function placeOrder() {
    if (!selectedAddressId) {
      alert("من فضلك أضف عنوان توصيل الأول");
      navigate("/addresses/new");
      return;
    }
    const items = Object.entries(cart).map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
    const order = await api.post("/orders", { restaurantId: id, addressId: selectedAddressId, items });
    navigate(`/orders/${order.id}`);
  }

  if (!restaurant) return <p className="p-6 text-center">جاري التحميل...</p>;

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24">
      <h1 className="text-2xl font-bold mb-1">{restaurant.name}</h1>
      <p className="text-gray-500 mb-4">{restaurant.description}</p>

      {addresses.length > 0 ? (
        <select
          className="w-full border rounded-lg p-2 mb-4"
          value={selectedAddressId}
          onChange={(e) => setSelectedAddressId(e.target.value)}
        >
          {addresses.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} — {a.street}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-amber-600 bg-amber-50 rounded-lg p-3 mb-4 text-sm">
          مفيش عناوين محفوظة. هتحتاج تضيف عنوان قبل تأكيد أي طلب.
        </p>
      )}

      <div className="grid gap-3">
        {restaurant.menuItems.map((item) => (
          <div key={item.id} className="flex justify-between items-center bg-white rounded-xl shadow p-4">
            <div>
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-gray-400 text-sm">{item.price} ج.م</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 bg-gray-100 rounded-full">
                −
              </button>
              <span>{cart[item.id] || 0}</span>
              <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 bg-orange-100 rounded-full">
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center">
          <span className="font-semibold">الإجمالي: {total} ج.م</span>
          <button onClick={placeOrder} className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold">
            تأكيد الطلب
          </button>
        </div>
      )}
    </div>
  );
}

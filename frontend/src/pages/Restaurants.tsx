import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { RestaurantDTO, PaginatedResult } from "@abuelzoz/shared";

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState<RestaurantDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    setLoading(true);
    // الـ endpoint بقى بيرجع شكل paginated { data, page, pageSize, total } بدل array خام
    api
      .get(`/restaurants?page=${page}&pageSize=${pageSize}`)
      .then((res: PaginatedResult<RestaurantDTO>) => {
        setRestaurants(res.data);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <p className="p-6 text-center">جاري التحميل...</p>;

  const hasNextPage = page * pageSize < total;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">المطاعم القريبة منك</h1>
      <div className="grid gap-4">
        {restaurants.map((r) => (
          <Link
            key={r.id}
            to={`/restaurants/${r.id}`}
            className="block bg-white rounded-xl shadow p-4 hover:shadow-md transition"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-lg">{r.name}</h2>
                <p className="text-gray-500 text-sm">{r.description}</p>
              </div>
              <span className="text-yellow-500 font-medium">⭐ {r.rating.toFixed(1)}</span>
            </div>
          </Link>
        ))}
        {restaurants.length === 0 && <p className="text-gray-400">لا توجد مطاعم متاحة حاليًا</p>}
      </div>

      {(page > 1 || hasNextPage) && (
        <div className="flex justify-center gap-4 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-lg bg-gray-100 disabled:opacity-40"
          >
            السابق
          </button>
          <button
            disabled={!hasNextPage}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-lg bg-gray-100 disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}

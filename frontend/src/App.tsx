import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Restaurants from "./pages/Restaurants";
import RestaurantDetail from "./pages/RestaurantDetail";
import OrderTracking from "./pages/OrderTracking";
import AddAddress from "./pages/AddAddress";

// كانت بتتحقق بس إن فيه user مسجل دخول — أي حد بأي دور يقدر يفتح أي صفحة.
// دلوقتي بتتحقق من الدور كمان لو اتحدد.
function ProtectedRoute({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/restaurants" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/restaurants"
            element={
              <ProtectedRoute roles={["CUSTOMER"]}>
                <Restaurants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurants/:id"
            element={
              <ProtectedRoute roles={["CUSTOMER"]}>
                <RestaurantDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/addresses/new"
            element={
              <ProtectedRoute roles={["CUSTOMER"]}>
                <AddAddress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderTracking />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/restaurants" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

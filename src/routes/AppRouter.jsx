import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import RoleRoute from "./RoleRoute.jsx";
import Home from "../pages/Home.jsx";
import Login from "../pages/Login.jsx";
import Register from "../pages/Register.jsx";
import Creators from "../pages/Creators.jsx";
import CreatorPublicProfile from "../pages/CreatorPublicProfile.jsx";
import CreatorDashboard from "../pages/CreatorDashboard.jsx";
import FollowerDashboard from "../pages/FollowerDashboard.jsx";
import NotFound from "../pages/NotFound.jsx";

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="creators" element={<Creators />} />
        <Route path="creators/:creatorId" element={<CreatorPublicProfile />} />
        <Route path="creator/dashboard" element={<ProtectedRoute><RoleRoute role="CREADOR"><CreatorDashboard /></RoleRoute></ProtectedRoute>} />
        <Route path="follower/dashboard" element={<ProtectedRoute><RoleRoute role="SEGUIDOR"><FollowerDashboard /></RoleRoute></ProtectedRoute>} />
        <Route path="dashboard" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

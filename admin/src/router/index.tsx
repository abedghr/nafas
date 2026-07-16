import { useRoutes, Navigate } from "react-router-dom";
import { PrivateRoute } from "./PrivateRoute";
import { SideMenuLayout } from "../layouts/SideMenu";
import { Login } from "../pages/Login";
import { Dashboard } from "../pages/Dashboard";
import { Placeholder } from "../pages/Placeholder";
import { Countries } from "../pages/Countries";
import { Users } from "../pages/Users";
import { Exercises } from "../pages/Exercises";
import { Localization } from "../pages/Localization";
import { Foods } from "../pages/Foods";
import { Gyms } from "../pages/Gyms";
import { GymProfile } from "../pages/GymProfile";
import { Facilities } from "../pages/Facilities";
import { Restaurants } from "../pages/Restaurants";
import { RestaurantProfile } from "../pages/RestaurantProfile";
import { Coaches } from "../pages/Coaches";
import { CoachProfile } from "../pages/CoachProfile";
import { Events } from "../pages/Events";

export function Router() {
  return useRoutes([
    { path: "/login", element: <Login /> },
    {
      path: "/app",
      element: (
        <PrivateRoute>
          <SideMenuLayout />
        </PrivateRoute>
      ),
      children: [
        { index: true, element: <Dashboard /> },
        // Sections fill in per feature (router stays the single source of nav).
        { path: "users", element: <Users /> },
        { path: "countries", element: <Countries /> },
        { path: "exercises", element: <Exercises /> },
        { path: "localization", element: <Localization /> },
        { path: "foods", element: <Foods /> },
        { path: "gyms", element: <Gyms /> },
        { path: "gyms/:id", element: <GymProfile /> },
        { path: "facilities", element: <Facilities /> },
        { path: "restaurants", element: <Restaurants /> },
        { path: "restaurants/:id", element: <RestaurantProfile /> },
        { path: "coaches", element: <Coaches /> },
        { path: "coaches/:id", element: <CoachProfile /> },
        { path: "events", element: <Events /> },
      ],
    },
    { path: "*", element: <Navigate to="/app" replace /> },
  ]);
}

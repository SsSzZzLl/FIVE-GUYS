import { lazy } from "react";
import { useRoutes } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";

const HomePage = lazy(() => import("@/pages/HomePage"));
const DrawPage = lazy(() => import("@/pages/DrawPage"));
const CollectionPage = lazy(() => import("@/pages/CollectionPage"));
const MarketPage = lazy(() => import("@/pages/MarketPage"));
const RankingPage = lazy(() => import("@/pages/RankingPage"));
const SynthesisPage = lazy(() => import("@/pages/SynthesisPage"));
const ConnectPage = lazy(() => import("@/pages/ConnectPage"));

export default function AppRouter() {
  return useRoutes([
    {
      element: <AppLayout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: "/draw", element: <DrawPage /> },
        { path: "/collection", element: <CollectionPage /> },
        { path: "/market", element: <MarketPage /> },
        { path: "/ranking", element: <RankingPage /> },
        { path: "/synthesis", element: <SynthesisPage /> },
        { path: "/connect", element: <ConnectPage /> },
      ],
    },
  ]);
}


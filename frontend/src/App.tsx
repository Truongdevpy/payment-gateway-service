import React, { Suspense, lazy, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import LoadingState from './components/LoadingState';
import { ThemeProvider } from './hooks/useTheme';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 5 * 60 * 1000,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

const RouteProgressBar: React.FC<{ active: boolean; routeKey: string }> = ({ active, routeKey }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timers: number[] = [];

    if (active) {
      setVisible(true);
      setProgress(10);
      timers.push(window.setTimeout(() => setProgress(34), 60));
      timers.push(window.setTimeout(() => setProgress(58), 180));
      timers.push(window.setTimeout(() => setProgress(82), 360));
    } else if (visible) {
      setProgress(100);
      timers.push(
        window.setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 260),
      );
    }

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [active, routeKey, visible]);

  return (
    <div className={`route-progress ${visible ? 'route-progress--visible' : ''}`}>
      <span className="route-progress__bar" style={{ transform: `scaleX(${progress / 100})` }} />
    </div>
  );
};

const AppRouteFallback: React.FC<{ onVisibilityChange?: (visible: boolean) => void }> = ({ onVisibilityChange }) => {
  useEffect(() => {
    onVisibilityChange?.(true);
    return () => {
      onVisibilityChange?.(false);
    };
  }, [onVisibilityChange]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_45%),linear-gradient(180deg,#f8fcff_0%,#eef7ff_100%)]">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
        <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200/80 bg-white/80 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.08)] backdrop-blur">
          <LoadingState
            description="Chúng tôi đang tải màn hình mới và giữ nguyên trải nghiệm mượt mà trong lúc chuyển trang."
            slowMessage="Đang tải dữ liệu..."
            title="Đang chuyển trang"
          />
          <div className="mt-6 space-y-4">
            <div className="dashboard-skeleton h-12 rounded-2xl" />
            <div className="dashboard-skeleton h-12 rounded-2xl" />
            <div className="dashboard-skeleton h-48 rounded-[1.5rem]" />
          </div>
        </div>
      </div>
    </div>
  );
};

const AppRouter: React.FC = () => {
  const location = useLocation();
  const [routePulse, setRoutePulse] = useState(false);
  const [suspenseLoading, setSuspenseLoading] = useState(false);
  const routeKey = `${location.pathname}${location.search}${location.hash}`;

  useEffect(() => {
    setRoutePulse(true);
    const timer = window.setTimeout(() => {
      setRoutePulse(false);
    }, 520);

    return () => {
      window.clearTimeout(timer);
    };
  }, [routeKey]);

  return (
    <>
      <RouteProgressBar active={routePulse || suspenseLoading} routeKey={routeKey} />
      <Suspense fallback={<AppRouteFallback onVisibilityChange={setSuspenseLoading} />}>
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route element={<LoginPage />} path="/login" />
          <Route element={<RegisterPage />} path="/register" />
          <Route element={<DashboardPage />} path="/dashboard/*" />
        </Routes>
      </Suspense>
    </>
  );
};

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

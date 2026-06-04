import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Toaster } from 'sonner';

export default function App() {
  const path = window.location.pathname;
  const isAuthenticated = !!localStorage.getItem('mouseforge:token');

  return (
    <>
      <Toaster position="top-right" richColors />
      {path === '/home' && isAuthenticated ? <Home /> : <Login />}
    </>
  );
}

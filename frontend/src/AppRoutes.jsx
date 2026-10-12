import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Personal from './pages/Personal';
import CuentasZoom from './pages/CuentasZoom';
import Programas from './pages/Programas';
import CursoDetalle from './pages/CursoDetalle';
import Programacion from './pages/Programacion';
import AsignacionZoom from './pages/AsignacionZoom';
import Calendario from './pages/Calendario';

function AppRoutes({ usuario, setUsuario }) {
  return (
    <BrowserRouter>

      <Routes>

        {/* LOGIN */}
        <Route
          path="/login"
          element={
            <Login
              onLogin={setUsuario}
            />
          }
        />


        {/* SISTEMA */}
        <Route
          path="/app"
          element={
            usuario ? (
              <Dashboard
                usuario={usuario}
                onLogout={() => setUsuario(null)}
              />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        >

          <Route
            index
            element={
              <Navigate
                to="/app/calendario"
                replace
              />
            }
          />

<Route
  path="calendario"
  element={<Calendario />}
/>
          {/* PROGRAMAS */}
<Route
  path="programas"
  element={<Programas />}
/>


          {/* ASIGNACIÓN ZOOM */}
{/* ASIGNACIÓN ZOOM */}
<Route
  path="zoom"
  element={<AsignacionZoom />}
/>


          {/* CUENTAS ZOOM */}
          <Route
  path="zoom-cuentas"
  element={
    <CuentasZoom />
  }
/>


          {/* PERSONAL */}
          <Route
            path="personal"
            element={<Personal />}
          />

          <Route
  path="programas/:id"
  element={<CursoDetalle />}
/>

<Route
  path="programas/:id/programacion"
  element={<Programacion />}
/>

        </Route>


        {/* CUALQUIER OTRA URL */}
        <Route
          path="*"
          element={
            <Navigate
              to={usuario ? '/app' : '/login'}
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default AppRoutes;
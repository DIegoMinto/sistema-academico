import {
  Outlet,
  NavLink,
  useNavigate
} from 'react-router-dom';

import { logout } from '../services/auth';

function Dashboard({ usuario, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();

    onLogout();

    navigate('/login');
  };

  return (
    <div className="app-layout">

      {/* HEADER */}
      <header className="app-header">

        <div className="app-brand">
          <h1>Posicionate Académico</h1>
        </div>

        <div className="user-area">
          <span>{usuario?.usuario}</span>

          <button onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>

      </header>


      {/* CUERPO */}
      <div className="app-body">

        {/* SIDEBAR */}
        <aside className="app-sidebar">

          <nav className="sidebar-nav">

            <NavLink
              to="/app/calendario"
              className="sidebar-link"
            >

              <span>Calendario</span>
            </NavLink>


            <NavLink
              to="/app/programas"
              className="sidebar-link"
            >
              <span>Programas</span>
            </NavLink>


            <NavLink
              to="/app/zoom"
              className="sidebar-link"
            >
              <span>Asignación Zoom</span>
            </NavLink>


            {/* GESTIÓN DE DATOS */}
            <div className="sidebar-group">

              <div className="sidebar-group-title">
                <span>Gestión de datos</span>
              </div>

              <NavLink
                to="/app/zoom-cuentas"
                className="sidebar-sub-link"
              >
                Cuentas Zoom
              </NavLink>

              <NavLink
                to="/app/personal"
                className="sidebar-sub-link"
              >
                Personal
              </NavLink>

            </div>

          </nav>

        </aside>


        {/* CONTENIDO */}
        <main className="app-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default Dashboard;
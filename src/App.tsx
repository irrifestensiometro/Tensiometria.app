/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Contato from './pages/Contato';

import ProdutorLayout from './layouts/ProdutorLayout';
import ProdutorDashboard from './pages/produtor/Dashboard';
import DetalhesArea from './pages/produtor/DetalhesArea';
import NovaLeitura from './pages/produtor/NovaLeitura';

import AgronomoLayout from './layouts/AgronomoLayout';
import AgronomoDashboard from './pages/agronomo/Dashboard';
import AgronomoDetalhesArea from './pages/agronomo/DetalhesArea';
import NovaArea from './pages/agronomo/NovaArea';

function RootRedirect() {
  const { userRole, loading } = useAppContext();

  if (loading) return null;
  if (userRole === 'produtor') return <Navigate to="/produtor/dashboard" replace />;
  if (userRole === 'agronomo') return <Navigate to="/agronomo/dashboard" replace />;
  return <Landing />;
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login/:type" element={<Login />} />
          <Route path="/contato" element={<Contato />} />
          
          {/* Rotas Produtor */}
          <Route path="/produtor" element={<ProdutorLayout />}>
            <Route path="dashboard" element={<ProdutorDashboard />} />
            <Route path="areas/:areaId" element={<DetalhesArea />} />
            <Route path="leituras/nova" element={<NovaLeitura />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Rotas Agrônomo */}
          <Route path="/agronomo" element={<AgronomoLayout />}>
            <Route path="dashboard" element={<AgronomoDashboard />} />
            <Route path="areas/nova" element={<NovaArea />} />
            <Route path="areas/:areaId" element={<AgronomoDetalhesArea />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

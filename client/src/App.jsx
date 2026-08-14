// client/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CreateIncident from './pages/CreateIncident';
import IncidentDetail from './pages/IncidentDetail';
import KnowledgeBase from './pages/KnowledgeBase';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/incidents/new" element={<CreateIncident />} />
            <Route path="/incidents/:id" element={<IncidentDetail />} />
            <Route path="/knowledge" element={<KnowledgeBase />} />
            <Route path="*" element={
              <div className="max-w-xl mx-auto px-6 py-20 text-center">
                <p className="text-6xl mb-4">404</p>
                <p className="text-slate-400">Page not found</p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

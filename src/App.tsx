import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import StudyRoom from "@/pages/StudyRoom";
import Notebook from "@/pages/Notebook";
import Library from "@/pages/Library";
import Settings from "@/pages/Settings";
// Dev-only: Persona Test Harness（Phase 14.4）
// 在生产构建中 import.meta.env.DEV 为 false，此路由不会注册
import PersonaTest from "@/pages/PersonaTest";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<StudyRoom />} />
          <Route path="/notebook" element={<Notebook />} />
          <Route path="/library" element={<Library />} />
          <Route path="/settings" element={<Settings />} />
          {import.meta.env.DEV && (
            <Route path="/persona-test" element={<PersonaTest />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

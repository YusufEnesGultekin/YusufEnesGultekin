import { HashRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Overview from "./pages/Overview";
import ClassDetail from "./pages/ClassDetail";
import BoilerControl from "./pages/BoilerControl";
import Alarms from "./pages/Alarms";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Simulation from "./pages/Simulation";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="sinif" element={<ClassDetail />} />
          <Route path="kombi" element={<BoilerControl />} />
          <Route path="alarmlar" element={<Alarms />} />
          <Route path="raporlar" element={<Reports />} />
          <Route path="simulasyon" element={<Simulation />} />
          <Route path="ayarlar" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

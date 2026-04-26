import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { WardrobeProvider } from './context/WardrobeContext';
import WardrobePage from './pages/WardrobePage';
import AddClothingPage from './pages/AddClothingPage';
import ComposePage from './pages/ComposePage';
import TryOnPage from './pages/TryOnPage';
import AITryOnPage from './pages/AITryOnPage';
import StyleComposerPage from './pages/StyleComposerPage';
import LibraryPage from './pages/LibraryPage';
import InsightsPage from './pages/InsightsPage';
import ShufflePage from './pages/ShufflePage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <WardrobeProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<WardrobePage />} />
            <Route path="add" element={<AddClothingPage />} />
            <Route path="compose" element={<ComposePage />} />
            <Route path="tryon" element={<TryOnPage />} />
            <Route path="tryon/:outfitId" element={<TryOnPage />} />
            <Route path="ai-tryon" element={<AITryOnPage />} />
            <Route path="style" element={<StyleComposerPage />} />
            <Route path="style/:styleId" element={<StyleComposerPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="shuffle" element={<ShufflePage />} />
            {/* legacy routes redirect to the unified library */}
            <Route path="outfits" element={<Navigate to="/library" replace />} />
            <Route path="styles" element={<Navigate to="/library" replace />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </WardrobeProvider>
  );
}

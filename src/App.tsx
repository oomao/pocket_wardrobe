import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { WardrobeProvider } from './context/WardrobeContext';
import WardrobePage from './pages/WardrobePage';
import AddClothingPage from './pages/AddClothingPage';
import TryOnPage from './pages/TryOnPage';
import AITryOnPage from './pages/AITryOnPage';
import OutfitsPage from './pages/OutfitsPage';
import SettingsPage from './pages/SettingsPage';
import StyleComposerPage from './pages/StyleComposerPage';
import StylesGalleryPage from './pages/StylesGalleryPage';

export default function App() {
  return (
    <WardrobeProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<WardrobePage />} />
            <Route path="add" element={<AddClothingPage />} />
            <Route path="tryon" element={<TryOnPage />} />
            <Route path="tryon/:outfitId" element={<TryOnPage />} />
            <Route path="ai-tryon" element={<AITryOnPage />} />
            <Route path="style" element={<StyleComposerPage />} />
            <Route path="style/:styleId" element={<StyleComposerPage />} />
            <Route path="styles" element={<StylesGalleryPage />} />
            <Route path="outfits" element={<OutfitsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </WardrobeProvider>
  );
}

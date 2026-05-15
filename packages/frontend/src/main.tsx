import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerCustomCombo } from './components/DependencyGraph/DependencyGraph';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme';

const rootElement = document.getElementById('root');

registerCustomCombo();

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ThemeProvider>
    </StrictMode>
  );
}

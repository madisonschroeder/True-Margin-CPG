import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { StandaloneApp } from './StandaloneApp';
const root = document.getElementById('root')!;
root.setAttribute('data-managed', 'true');
createRoot(root).render(<StandaloneApp />);

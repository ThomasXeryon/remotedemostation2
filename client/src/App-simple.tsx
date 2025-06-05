import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { materialTheme } from "./theme/material-theme";
import { DndProvider } from 'react-dnd';
import { MultiBackend, HTML5toTouch } from './lib/dnd-backend';
import { queryClient } from "./lib/queryClient";
import StationEditor from "./pages/station-editor";
import ReactDndDemo from "./pages/react-dnd-demo";
import { SimpleLogin } from "./pages/simple-login";
import { useState } from "react";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return (
      <ThemeProvider theme={materialTheme}>
        <CssBaseline />
        <SimpleLogin onLogin={() => setIsLoggedIn(true)} />
      </ThemeProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DndProvider backend={MultiBackend} options={HTML5toTouch}>
        <ThemeProvider theme={materialTheme}>
          <CssBaseline />
          <div style={{ minHeight: '100vh' }}>
            <Switch>
              <Route path="/" component={() => (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h1>Remote Demo Station</h1>
                  <div style={{ marginTop: '20px' }}>
                    <a href="/station-editor/demo-station-1" style={{ 
                      display: 'inline-block', 
                      padding: '10px 20px', 
                      background: '#1976d2', 
                      color: 'white', 
                      textDecoration: 'none', 
                      borderRadius: '4px',
                      margin: '0 10px'
                    }}>
                      Station Editor (New Control Builder)
                    </a>
                    <a href="/react-dnd-demo" style={{ 
                      display: 'inline-block', 
                      padding: '10px 20px', 
                      background: '#388e3c', 
                      color: 'white', 
                      textDecoration: 'none', 
                      borderRadius: '4px',
                      margin: '0 10px'
                    }}>
                      React DnD Demo
                    </a>
                  </div>
                </div>
              )} />
              <Route path="/station-editor/:id" component={StationEditor} />
              <Route path="/react-dnd-demo" component={ReactDndDemo} />
              <Route component={() => <div>404 - Page not found</div>} />
            </Switch>
          </div>
        </ThemeProvider>
      </DndProvider>
    </QueryClientProvider>
  );
}
import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import AboutPage from './components/AboutPage'
import DailyPuzzlePage from './components/DailyPuzzlePage'
import CurrentDayPuzzle from './components/CurrentDayPuzzle'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CurrentDayPuzzle />} />
        <Route path="/d" element={<LandingPage />} />
        <Route path="/d/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/d/:number" element={<DailyPuzzlePage />} />
      </Routes>
    </Router>
  )
}

export default App

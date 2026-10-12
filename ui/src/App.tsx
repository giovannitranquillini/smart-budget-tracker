import { Route, Routes } from 'react-router'
import HomePage from './pages/HomePage'
import CategoriesPage from './pages/CategoriesPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/categories" element={<CategoriesPage />} />
    </Routes>
  )
}

export default App

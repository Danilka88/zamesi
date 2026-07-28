import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import DashboardPage from './pages/DashboardPage'
import PassportPage from './pages/PassportPage'
import MixPage from './pages/MixPage'
import SearchPage from './pages/SearchPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/passport/:jobId" element={<PassportPage />} />
        <Route path="/passport/:jobId/:tab" element={<PassportPage />} />
        <Route path="/mix/:mixId" element={<MixPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </Layout>
  )
}

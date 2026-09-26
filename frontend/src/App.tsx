import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'

import AppLayout from './components/layout/AppLayout'
import { SearchProvider } from './components/layout/SearchProvider'
import RequireRole from './components/RequireRole'
import { AuthProvider } from './context/AuthContext'
import { ALL_ROLES } from './lib/roles'
import AboutPage from './pages/AboutPage'
import AuthorityPage from './pages/AuthorityPage'
import AuthorityIssuePage from './pages/AuthorityIssuePage'
import AuditLogsPage from './pages/AuditLogsPage'
import CivicWatchPage from './pages/CivicWatchPage'
import ComparePage from './pages/ComparePage'
import ContractorPage from './pages/ContractorPage'
import DashboardPage from './pages/DashboardPage'
import EvidencePage from './pages/EvidencePage'
import GovernmentPage from './pages/GovernmentPage'
import InspectorSubmitPage from './pages/InspectorSubmitPage'
import LoginPage from './pages/LoginPage'
import MyReportsPage from './pages/MyReportsPage'
import NotFoundPage from './pages/NotFoundPage'
import ProjectPage from './pages/ProjectPage'
import ProjectsPage from './pages/ProjectsPage'
import ReportsPage from './pages/ReportsPage'
import ReviewPage from './pages/ReviewPage'
import SubmitEvidencePage from './pages/SubmitEvidencePage'
import TenderPage from './pages/TenderPage'

const CITIZEN_ROLES = ['citizen', 'admin']
const AUTHORITY_ROLES = ['inspector', 'admin']
const GOVERNMENT_ROLES = ['department_official', 'admin']
const TEAM_ROLES = ['admin', 'reviewer']

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <ScrollToTop />
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectPage />} />
            <Route path="projects/:id/evidence-graph" element={<ProjectPage />} />
            <Route path="contractors/:id" element={<ContractorPage />} />
            <Route path="tenders/:id" element={<TenderPage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="evidence" element={<EvidencePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="login" element={<LoginPage />} />

            <Route
              path="civicwatch"
              element={
                <RequireRole roles={ALL_ROLES}>
                  <CivicWatchPage />
                </RequireRole>
              }
            />
            <Route
              path="submit-evidence"
              element={
                <RequireRole roles={CITIZEN_ROLES}>
                  <SubmitEvidencePage />
                </RequireRole>
              }
            />
            <Route
              path="submit-inspection"
              element={
                <RequireRole roles={AUTHORITY_ROLES}>
                  <InspectorSubmitPage />
                </RequireRole>
              }
            />
            <Route
              path="my-reports"
              element={
                <RequireRole roles={CITIZEN_ROLES}>
                  <MyReportsPage />
                </RequireRole>
              }
            />

            <Route path="authority" element={<RequireRole roles={AUTHORITY_ROLES}><AuthorityPage /></RequireRole>} />
            <Route path="authority/issues" element={<RequireRole roles={AUTHORITY_ROLES}><AuthorityPage /></RequireRole>} />
            <Route path="authority/issues/:id" element={<RequireRole roles={AUTHORITY_ROLES}><AuthorityIssuePage /></RequireRole>} />

            <Route path="government" element={<RequireRole roles={GOVERNMENT_ROLES}><GovernmentPage /></RequireRole>} />
            <Route path="government/projects" element={<RequireRole roles={GOVERNMENT_ROLES}><GovernmentPage /></RequireRole>} />
            <Route path="government/reports" element={<RequireRole roles={GOVERNMENT_ROLES}><GovernmentPage /></RequireRole>} />

            <Route path="review" element={<RequireRole roles={TEAM_ROLES}><ReviewPage /></RequireRole>} />
            <Route path="review/evidence" element={<RequireRole roles={TEAM_ROLES}><ReviewPage /></RequireRole>} />
            <Route path="review/decisions" element={<RequireRole roles={TEAM_ROLES}><ReviewPage /></RequireRole>} />

            <Route
              path="audit-logs"
              element={
                <RequireRole roles={TEAM_ROLES}>
                  <AuditLogsPage />
                </RequireRole>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </SearchProvider>
    </AuthProvider>
  )
}
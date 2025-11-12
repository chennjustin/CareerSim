import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import InterviewRoom from './pages/InterviewRoom';
import InterviewReport from './pages/InterviewReport';
import InterviewList from './pages/InterviewList';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/interview/:id" element={<InterviewRoom />} />
        <Route path="/report/:interviewId" element={<InterviewReport />} />
        <Route path="/list" element={<InterviewList />} />
      </Routes>
    </Router>
  );
}

export default App;

